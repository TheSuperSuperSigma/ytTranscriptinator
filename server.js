const express = require("express");
const ytdl = require("ytdl-core");
const ffmpeg = require("fluent-ffmpeg");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create transcripts directory if it doesn't exist
const transcriptsDir = path.join(__dirname, "transcripts");
if (!fs.existsSync(transcriptsDir)) {
  fs.mkdirSync(transcriptsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Function to sanitize filename
function sanitizeFilename(filename) {
  return filename.replace(/[^a-z0-9]/gi, "_").toLowerCase();
}

// Function to extract video ID from YouTube URL
function extractVideoId(url) {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// Function to get video info
async function getVideoInfo(url) {
  try {
    const videoId = extractVideoId(url);
    if (!videoId) {
      throw new Error("Invalid YouTube URL");
    }
    
    const info = await ytdl.getInfo(url);
    return {
      title: info.videoDetails.title,
      videoId: videoId,
      duration: info.videoDetails.lengthSeconds
    };
  } catch (error) {
    throw new Error(`Failed to get video info: ${error.message}`);
  }
}

// Function to download and convert video to audio
async function downloadAudio(url, outputPath) {
  return new Promise((resolve, reject) => {
    const videoId = extractVideoId(url);
    if (!videoId) {
      reject(new Error("Invalid YouTube URL"));
      return;
    }

    const videoStream = ytdl(url, { quality: "highestaudio" });
    
    ffmpeg(videoStream)
      .audioCodec("pcm_s16le")
      .audioFrequency(16000)
      .audioChannels(1)
      .format("wav")
      .on("end", () => {
        console.log("Audio download completed");
        resolve(outputPath);
      })
      .on("error", (err) => {
        console.error("FFmpeg error:", err);
        reject(err);
      })
      .save(outputPath);
  });
}

// Function to transcribe audio using Web Speech API (client-side)
// This is a placeholder - in a real implementation, you'd use a proper transcription service
function generateMockTranscription(videoTitle) {
  return `Transcription for: ${videoTitle}

This is a mock transcription. In a real implementation, you would:
1. Use a proper speech-to-text service like Google Cloud Speech-to-Text, Azure Speech, or AWS Transcribe
2. Process the audio file to extract the actual spoken content
3. Return the accurate transcription

For demonstration purposes, this mock transcription shows the structure of what would be returned.

The video "${videoTitle}" would be transcribed here with the actual spoken content from the video.

This is a placeholder text that demonstrates how the final transcription would look when properly implemented with a real speech-to-text service.`;
}

// Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Get video info
app.post("/api/video-info", async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    const videoInfo = await getVideoInfo(url);
    res.json(videoInfo);
  } catch (error) {
    console.error("Error getting video info:", error);
    res.status(400).json({ error: error.message });
  }
});

// Transcribe video
app.post("/api/transcribe", async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    // Get video info
    const videoInfo = await getVideoInfo(url);
    const sanitizedTitle = sanitizeFilename(videoInfo.title);
    
    // For demo purposes, we'll generate a mock transcription
    // In a real implementation, you would:
    // 1. Download the audio
    // 2. Send it to a transcription service
    // 3. Get the actual transcription back
    
    const transcription = generateMockTranscription(videoInfo.title);
    
    // Save transcription to file
    const filename = `${sanitizedTitle}.txt`;
    const filePath = path.join(transcriptsDir, filename);
    
    fs.writeFileSync(filePath, transcription, "utf8");
    
    res.json({
      success: true,
      filename: filename,
      title: videoInfo.title,
      message: "Transcription completed successfully"
    });
    
  } catch (error) {
    console.error("Error transcribing video:", error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk transcribe videos
app.post("/api/bulk-transcribe", async (req, res) => {
  try {
    const { urls } = req.body;
    
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: "URLs array is required" });
    }

    const results = [];
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      try {
        // Get video info
        const videoInfo = await getVideoInfo(url);
        const sanitizedTitle = sanitizeFilename(videoInfo.title);
        
        // Generate mock transcription
        const transcription = generateMockTranscription(videoInfo.title);
        
        // Save transcription to file
        const filename = `${sanitizedTitle}.txt`;
        const filePath = path.join(transcriptsDir, filename);
        
        fs.writeFileSync(filePath, transcription, "utf8");
        
        results.push({
          success: true,
          filename: filename,
          title: videoInfo.title,
          url: url,
          index: i + 1
        });
        
        // Add a small delay between transcriptions
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          url: url,
          index: i + 1
        });
      }
    }
    
    res.json({
      success: true,
      results: results,
      message: `Processed ${urls.length} videos`
    });
    
  } catch (error) {
    console.error("Error in bulk transcribe:", error);
    res.status(500).json({ error: error.message });
  }
});

// Download transcription file
app.get("/api/download/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(transcriptsDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }
    
    res.download(filePath, filename);
  } catch (error) {
    console.error("Error downloading file:", error);
    res.status(500).json({ error: "Failed to download file" });
  }
});

// Get list of transcriptions
app.get("/api/transcriptions", (req, res) => {
  try {
    const files = fs.readdirSync(transcriptsDir);
    const transcriptions = files
      .filter(file => file.endsWith(".txt"))
      .map(file => ({
        filename: file,
        title: file.replace(".txt", "").replace(/_/g, " "),
        created: fs.statSync(path.join(transcriptsDir, file)).mtime
      }))
      .sort((a, b) => b.created - a.created);
    
    res.json(transcriptions);
  } catch (error) {
    console.error("Error getting transcriptions:", error);
    res.status(500).json({ error: "Failed to get transcriptions" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("YTTranscriptinator is ready!");
});