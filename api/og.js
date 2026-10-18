// og.js · v1.0 · 18 Oct 2026 — link-preview image for /og.jpg (rewritten here in vercel.json).
// Until Sun 18 Oct 23:59 Israel time: the Office Hours banner. From Mon 19 Oct 00:00: the all-events banner.
// ?show=oh or ?show=all forces one image (for checking).
const fs = require("fs");
const path = require("path");
const SWITCH = Date.parse("2026-10-19T00:00:00+03:00");
module.exports = (req, res) => {
  const q = (req.url || "").split("?")[1] || "";
  const force = new URLSearchParams(q).get("show");
  const all = force === "all" ? true : force === "oh" ? false : Date.now() >= SWITCH;
  const file = all ? "og-all-events-v1.0.jpg" : "og-office-hours-v2.0.jpg";
  const buf = fs.readFileSync(path.join(process.cwd(), "og", file));
  res.statusCode = 200;
  res.setHeader("Content-Type", "image/jpeg");
  res.setHeader("Content-Length", buf.length);
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
  res.end(buf);
};
