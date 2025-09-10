git add .

git commit -m "Change to what you did"

git push origin main



# YouTube Transcriber

A web application that transcribes YouTube videos to text files. Built with Node.js, Express, and a modern web interface.

## Features

- 🎥 Extract video information from YouTube URLs
- 📝 Transcribe videos to text files
- 💾 Download transcriptions as .txt files
- �� Modern, responsive UI with animations
- 📱 Mobile-friendly design
- 📋 View previous transcriptions

## Installation

1. Install Node.js (if not already installed)
2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

1. Start the server:
   ```bash
   npm start
   ```

2. Open your browser and go to `http://localhost:3000`

3. Paste a YouTube URL and click "Get Video Info"

4. Click "Transcribe Video" to generate the transcription

5. Download the resulting .txt file

## Requirements

- Node.js
- FFmpeg (for audio processing)
- Internet connection

## Note

This is a demo application. For production use, you would need to integrate with a proper speech-to-text service like:
- Google Cloud Speech-to-Text
- Azure Speech Services
- AWS Transcribe
- OpenAI Whisper API

## License

MIT