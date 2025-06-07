import { Worker, Job } from "bullmq";
import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";
import dotenv from "dotenv";

dotenv.config();

const connection = {
  url: process.env.REDIS_URL,
};

const resolutions = [
  { name: "360p", width: 640, height: 360, bitrate: "400k" },
  { name: "480p", width: 854, height: 480, bitrate: "700k" },
  { name: "720p", width: 1280, height: 720, bitrate: "1400k" },
  { name: "1080p", width: 1920, height: 1080, bitrate: "2800k" },
];

async function runFFmpeg(
  inputFile: string,
  outputDir: string,
  res: (typeof resolutions)[0]
) {
  await fs.mkdir(outputDir, { recursive: true });

  return new Promise<void>((resolve, reject) => {
    const segmentFile = path.join(outputDir, `${res.name}_segment%03d.ts`);
    const playlistFile = path.join(outputDir, `${res.name}.m3u8`);

    const args = [
      "-i",
      inputFile,
      "-vf",
      `scale=w=${res.width}:h=${res.height}:force_original_aspect_ratio=decrease`,
      "-c:a",
      "aac",
      "-c:v",
      "libx264",
      "-b:v",
      res.bitrate,
      "-hls_time",
      "10",
      "-hls_playlist_type",
      "vod",
      "-hls_segment_filename",
      segmentFile,
      "-start_number",
      "0",
      playlistFile,
    ];

    console.log(`Starting ffmpeg for ${res.name}`);

    const ffmpeg = spawn("ffmpeg", args);

    ffmpeg.stdout.on("data", (data) => {
      console.log(`[${res.name} stdout]: ${data}`);
    });

    ffmpeg.stderr.on("data", (data) => {
      console.log(`[${res.name} stderr]: ${data}`);
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        console.log(`ffmpeg finished for ${res.name}`);
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with code ${code} for ${res.name}`));
      }
    });
  });
}

const worker = new Worker(
  "video-processing",
  async (job: Job) => {
    const { filePath, outputDir } = job.data;

    try {
      // Run all ffmpeg jobs in parallel for different resolutions
      await Promise.all(
        resolutions.map((res) => runFFmpeg(filePath, outputDir, res))
      );

      console.log("All resolutions processed successfully.");
    } catch (error) {
      console.error("Error processing video:", error);
      throw error;
    }
  },
  { connection }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed!`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});
