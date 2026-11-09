const http = require("http");

const PORT = process.env.PORT || 4000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    status: "online",
    service: "KOSTKU WA Bot",
    port: PORT,
    env: process.env.NODE_ENV || "unknown",
    supabase_configured: !!(process.env.SUPABASE_URL),
    timestamp: new Date().toISOString(),
  }));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("================================================");
  console.log(`KOSTKU WA Bot running on port ${PORT}`);
  console.log("================================================");
});

server.on("error", (err) => {
  console.error("Server error:", err);
  process.exit(1);
});
