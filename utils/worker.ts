import { Worker, Job } from "bullmq";
import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";
import dotenv from "dotenv";
import { connection } from "./queue";

dotenv.config();

const resolutions = [
  {
    name: "360p",
    width: 640,
    height: 360,
    bitrate: "800k",
    audioBitrate: "96k",
  },
  {
    name: "480p",
    width: 854,
    height: 480,
    bitrate: "1200k",
    audioBitrate: "96k",
  },
  {
    name: "720p",
    width: 1280,
    height: 720,
    bitrate: "2500k",
    audioBitrate: "128k",
  },
  {
    name: "1080p",
    width: 1920,
    height: 1080,
    bitrate: "5000k",
    audioBitrate: "192k",
  },
];

async function runFFmpeg(
  inputFile: string,
  baseOutputDir: string,
  res: (typeof resolutions)[0]
) {
  const outputDir = path.join(baseOutputDir, res.name);
  await fs.mkdir(outputDir, { recursive: true });

  return new Promise<void>((resolve, reject) => {
    const segmentFile = path.join(outputDir, `${res.name}_segment%03d.ts`);
    const playlistFile = path.join(outputDir, `${res.name}.m3u8`);

    const args = [
      "-i",
      inputFile,
      "-vf",
      `scale=w=${res.width}:h=${res.height}`,
      "-c:v",
      "libx264",
      "-b:v",
      res.bitrate,
      "-c:a",
      "aac",
      "-b:a",
      res.audioBitrate,
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

    const ffmpeg = spawn("ffmpeg", args);

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

async function generateMasterPlaylist(baseOutputDir: string) {
  const masterPath = path.join(baseOutputDir, "master.m3u8");
  let content = "#EXTM3U\n";

  for (const res of resolutions) {
    const bandwidth = parseInt(res.bitrate) * 8;
    content += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${res.width}x${res.height}\n`;
    content += `${res.name}/${res.name}.m3u8\n`;
  }

  await fs.writeFile(masterPath, content);
}

export const worker = new Worker(
  "video-processing",
  async (job: Job) => {
    const { filePath, outputDir } = job.data;

    try {
      await Promise.all(
        resolutions.map((res) => runFFmpeg(filePath, outputDir, res))
      );
      console.log("completed all the resolutions in the video");

      await generateMasterPlaylist(outputDir);

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
