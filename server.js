import express from "express";
import { YtDlpWrap } from "yt-dlp-wrap";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const app = express();
app.use(express.json());

// Supabase client
const supabase = createClient(
  "https://xofocbnjdkyxamftndxm.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.post("/download", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "Missing URL" });

    const filename = `${Date.now()}.mp4`;

    // Download video
    await new YtDlpWrap().exec([
      url,
      "-o",
      filename,
      "-f",
      "mp4"
    ]);

    const fileBuffer = fs.readFileSync(filename);

    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from("videos")
      .upload(filename, fileBuffer, {
        contentType: "video/mp4"
      });

    fs.unlinkSync(filename);

    if (error) return res.status(500).json(error);

    const publicURL =
      `https://xofocbnjdkyxamftndxm.supabase.co/storage/v1/object/public/videos/${filename}`;

    res.json({ url: publicURL });

  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
