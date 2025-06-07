import { Queue } from "bullmq";
import { Redis } from "ioredis";

const connection = new Redis();
export const videoQueue = new Queue("video-processing", { connection });
