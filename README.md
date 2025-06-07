# 📼 Video Transcoder with HLS

A full-stack video uploader and HLS (HTTP Live Streaming) transcoder pipeline using **Node.js**, **BullMQ**, **Redis**, **FFmpeg**, and **Video.js**. Users can upload videos via the frontend, which are then processed into multiple resolutions for adaptive streaming.

---

## 🔧 Features

- 🎞 Upload raw video files via the frontend UI
- ⚙️ Background transcoding pipeline (BullMQ + Redis)
- 📺 HLS packaging with multiple resolutions (240p, 480p, 720p, etc.)
- 🗃 Videos stored locally on the server in accessible folders
- 💡 Frontend player with dynamic video loading and quality selector using Video.js
- 📂 Organized queue management and background worker separation

---

## Architecture
