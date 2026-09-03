const express = require("express");
const { YtDlpWrap } = require("yt-dlp-wrap");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

// Create express app
const app = express();
app.use(express.json());
app.use(cors());

// Supabase
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://xofocbnjdkyxamftndxm.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// =========================
// 🔥 DOWNLOAD ROUTE
// =========================
app.post("/download", async (req, res) => {
  try {
    console.log("🔥 /download hit!");
    console.log("📥 Incoming body:", req.body);

    const { url } = req.body;

    if (!url) {
      console.log("❌ No URL provided");
      return res.status(400).json({ error: "No URL provided" });
    }

    const outputPath = path.join(__dirname, "video.mp4");
    console.log("📁 Output path:", outputPath);

    // Check cookies.txt exists
    const cookiesPath = path.join(__dirname, "cookies.txt");
    console.log("🍪 Cookies path:", cookiesPath);

    if (!fs.existsSync(cookiesPath)) {
      console.log("❌ cookies.txt NOT FOUND!");
    } else {
      console.log("✅ cookies.txt FOUND");
    }

    // Check yt-dlp binary exists
    const ytdlpPath = path.join(__dirname, "yt-dlp");
    console.log("🔧 yt-dlp path:", ytdlpPath);

    if (!fs.existsSync(ytdlpPath)) {
      console.log("❌ yt-dlp binary NOT FOUND!");
    } else {
      console.log("✅ yt-dlp binary FOUND");
    }

    const ytdlp = new YtDlpWrap(ytdlpPath);

    console.log("🚀 Running yt-dlp...");

    await ytdlp.exec([
      url,
      "--cookies", cookiesPath,
      "--no-check-certificates",
      "--force-ipv4",
      "-f", "mp4",
      "-o", outputPath
    ]);

    console.log("🎉 yt-dlp finished downloading!");

    // Read file
    console.log("📖 Reading downloaded file...");
    const fileBuffer = fs.readFileSync(outputPath);

    console.log("☁️ Uploading to Supabase...");
    const { data, error } = await supabase.storage
      .from("videos")
      .upload(`video-${Date.now()}.mp4`, fileBuffer, {
        contentType: "video/mp4",
        upsert: true
      });

    // Delete temp file
    console.log("🗑️ Deleting temp file...");
    fs.unlinkSync(outputPath);

    if (error) {
      console.log("❌ Supabase upload error:", error);
      return res.status(500).json({ error: error.message });
    }

    const publicURL = supabase.storage
      .from("videos")
      .getPublicUrl(data.path).data.publicUrl;

    console.log("✅ Final public URL:", publicURL);

    return res.json({ url: publicURL });

  } catch (err) {
    console.log("💥 ERROR IN /download ROUTE 💥");
    console.log("Full error:", err);
    return res.status(500).json({ error: "Download failed" });
  }
});

// =========================
// ROOT ROUTE
// =========================
app.get("/", (req, res) => {
  res.send("yt-cloud-downloader server is running!");
});

// =========================
// START SERVER
// =========================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
