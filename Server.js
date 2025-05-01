require("dotenv").config();

const express = require("express");
const AWS = require("aws-sdk");
const cors = require("cors");

const app = express();
const port = 3000;

// Enable CORS for frontend access
app.use(cors());
app.use(express.json());

// Optional: Health check route
app.get("/", (req, res) => {
  res.send("✅ Polly TTS API is running");
});

// Configure AWS Polly
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const polly = new AWS.Polly();

// Get available Polly voices
app.get("/voices", async (req, res) => {
  try {
    const data = await polly.describeVoices({}).promise();
    const neuralVoices = data.Voices.filter((v) =>
      v.SupportedEngines.includes("neural")
    );
    res.json(neuralVoices);
  } catch (error) {
    console.error("Error fetching voices:", error);
    res.status(500).json({ error: "Failed to fetch voices" });
  }
});

// Convert text to speech and return MP3 audio buffer
app.post("/speak", async (req, res) => {
  const { text, voiceId = "Joanna", format = "mp3" } = req.body;

  if (!text || text.trim().length === 0) {
    return res
      .status(400)
      .json({ error: "Text is required for speech synthesis" });
  }

  if (text.length > 3000) {
    return res
      .status(400)
      .json({ error: "Text exceeds AWS Polly 3000 character limit" });
  }

  const params = {
    Text: text,
    VoiceId: voiceId,
    OutputFormat: format,
    Engine: "neural", // You can change to "standard" if needed
  };

  try {
    const data = await polly.synthesizeSpeech(params).promise();

    if (data.AudioStream) {
      res.set({
        "Content-Type": "audio/mpeg",
        "Content-Disposition": 'inline; filename="speech.mp3"',
      });
      res.send(data.AudioStream); // Or use: data.AudioStream.pipe(res)
    } else {
      res.status(500).json({ error: "Invalid audio stream received" });
    }
  } catch (error) {
    console.error("Polly error:", error.message || error);
    res.status(500).json({ error: "Failed to synthesize speech" });
  }
});

// Start server
app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});

// require("dotenv").config();

// const express = require("express");
// const AWS = require("aws-sdk");
// const cors = require("cors");
// const fs = require("fs");
// const path = require("path");
// const ffmpeg = require("fluent-ffmpeg");
// const ffmpegPath = require("ffmpeg-static");
// const { randomUUID } = require("crypto");

// const app = express();
// const port = 3000;

// ffmpeg.setFfmpegPath(ffmpegPath);

// // Enable CORS and JSON parsing
// app.use(cors());
// app.use(express.json());

// // Configure AWS Polly
// AWS.config.update({
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   region: process.env.AWS_REGION,
// });

// const polly = new AWS.Polly();

// // Get available Polly voices
// app.get("/voices", async (req, res) => {
//   try {
//     const data = await polly.describeVoices({}).promise();
//     res.json(data.Voices);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Failed to fetch voices" });
//   }
// });

// // Convert long text to speech in chunks and merge the audio
// app.post("/speak", async (req, res) => {
//   const { text, voiceId = "Joanna", format = "mp3" } = req.body;

//   if (!text || text.trim().length === 0) {
//     return res.status(400).json({ error: "Text is required" });
//   }

//   const CHUNK_SIZE = 3000;
//   const MAX_CHUNKS = 5;

//   const splitText = (text, size) => {
//     const chunks = [];
//     let remaining = text;

//     while (remaining.length > 0 && chunks.length < MAX_CHUNKS) {
//       let chunk = remaining.slice(0, size);
//       const lastSpace = chunk.lastIndexOf(" ");
//       if (lastSpace > 0) chunk = chunk.slice(0, lastSpace);
//       chunks.push(chunk.trim());
//       remaining = remaining.slice(chunk.length).trim();
//     }

//     return chunks;
//   };

//   const textChunks = splitText(text, CHUNK_SIZE);
//   const tempFiles = [];

//   const requestId = randomUUID();
//   const outputPath = path.join(__dirname, `merged_output_${requestId}.mp3`);

//   try {
//     // Generate each chunk's audio
//     for (let i = 0; i < textChunks.length; i++) {
//       const params = {
//         Text: textChunks[i],
//         VoiceId: voiceId,
//         OutputFormat: format,
//         Engine: "neural",
//       };

//       const data = await polly.synthesizeSpeech(params).promise();
//       const tempPath = path.join(__dirname, `chunk_${requestId}_${i}.mp3`);
//       fs.writeFileSync(tempPath, data.AudioStream);
//       tempFiles.push(tempPath);
//     }

//     // Merge chunks
//     const merged = ffmpeg();

//     tempFiles.forEach((file) => {
//       merged.input(file);
//     });

//     merged
//       .on("end", () => {
//         const outputBuffer = fs.readFileSync(outputPath);

//         res.set({
//           "Content-Type": "audio/mpeg",
//           "Content-Disposition": 'inline; filename="speech.mp3"',
//         });

//         res.send(outputBuffer);

//         // Cleanup
//         tempFiles.forEach((file) => fs.unlinkSync(file));
//         fs.unlinkSync(outputPath);
//       })
//       .on("error", (err) => {
//         console.error("FFmpeg error:", err);
//         res.status(500).json({ error: "Audio merging failed" });
//       })
//       .mergeToFile(outputPath);
//   } catch (error) {
//     console.error("Polly or merge error:", error);
//     res.status(500).json({ error: "Failed to synthesize or merge speech" });
//   }
// });

// // Start the server
// app.listen(port, () => {
//   console.log(`✅ Server running at http://localhost:${port}`);
// });
