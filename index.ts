import express, { type Request, type Response } from "express";
import multer from "multer";
import path from "path";

import dotenv from "dotenv";
import { videoQueue } from "./utils/queue";
import { worker } from "./utils/worker";
import fs from "fs/promises";

dotenv.config();

const app = express();
const PORT = 3000;

// const connection = new Redis();
// connection.connect();
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + path.extname(file.originalname); // e.g., 1717757464923.mp4
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

app.use(express.static("public"));
app.use("/hls", express.static("hls"));

app.post(
  "/upload",
  upload.single("video"),
  async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).send("No video uploaded");
    await videoQueue.add("video-processing", {
      filePath: req.file.path,
      outputDir: path.join("hls", path.parse(req.file.filename).name),
    });

    res.status(200).send("Video uploaded and processing started");
  }
);

app.get("/videos", async (_req: Request, res: Response) => {
  const dirs = await fs.readdir("hls", { withFileTypes: true });
  const videos = dirs
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  const html = `
    <html>
    <head><title>All Videos</title></head>
    <body>
      <h1>Available Videos</h1>
      <ul>
        ${videos
          .map((id) => `<li><a href="/watch/${id}">${id}</a></li>`)
          .join("")}
      </ul>
    </body>
    </html>
  `;
  res.send(html);
});
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
