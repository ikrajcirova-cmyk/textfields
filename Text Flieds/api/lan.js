module.exports = (req, res) => {
  const host = req.headers["x-forwarded-host"] || req.headers.host || "";
  const proto = (req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  const origin = host ? `${proto}://${host}` : "";
  const vercel = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "";
  const base = origin || vercel;
  const payload = {
    port: 443,
    host,
    urls: base ? [`${base.replace(/\/$/, "")}/`] : [],
    hint: "Vercel HTTPS catalog.",
  };
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.statusCode = 200;
  res.end(JSON.stringify(payload));
};
