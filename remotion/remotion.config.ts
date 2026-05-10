import { Config } from "@remotion/cli/config";

// TikTok / Reels native: 9:16 vertical, 1080×1920, 30fps. Higher fps
// adds render time without algo benefit on either platform in 2026.
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// Mac silicon ships with hardware H.264; lean on it for 4-5x faster
// renders vs the default x264 software encoder.
Config.setCodec("h264");
Config.setPixelFormat("yuv420p");
