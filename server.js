const express = require("express");
const { YtDlpWrap } = require("yt-dlp-wrap");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// Supabase
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://xofocbnjdkyxamftndxm.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

app.post("/download", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "No URL provided" });
    }

    const outputPath = path.join(__dirname, "video.mp4");

    // Use local yt-dlp binary
    const ytdlp = new YtDlpWrap(path.join(__dirname, "yt-dlp"));

    // Use cookies.txt to bypass YouTube blocking
    await ytdlp.exec([
      url,
      "--cookies", path.join(__dirname, "cookies.txt"),
      "--no-check-certificates",
      "--force-ipv4",
      "-f", "mp4",
      "-o", outputPath
    ]);

    // Read file
    const fileBuffer = fs.readFileSync(outputPath);

    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from("videos")
      .upload(`video-${Date.now()}.mp4`, fileBuffer, {
        contentType: "video/mp4",
        upsert: true
      });

    // Delete temp file
    fs.unlinkSync(outputPath);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const publicURL = supabase.storage
      .from("videos")
      .getPublicUrl(data.path).data.publicUrl;

    return res.json({ url: publicURL });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Download failed" });
  }
});

app.get("/", (req, res) => {
  res.send("yt-cloud-downloader server is running!");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
