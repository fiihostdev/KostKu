process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err.message);
  console.error(err.stack);
  // Jangan exit agar bisa baca log
});

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
});

console.log("Node version:", process.version);
console.log("Starting requires...");

let express, cron, supabaseJs;

try { express = require("express"); console.log("express: OK"); }
catch(e) { console.error("express FAILED:", e.message); }

try { cron = require("node-cron"); console.log("node-cron: OK"); }
catch(e) { console.error("node-cron FAILED:", e.message); }

try { supabaseJs = require("@supabase/supabase-js"); console.log("@supabase/supabase-js: OK"); }
catch(e) { console.error("@supabase/supabase-js FAILED:", e.message); }

const http = require("http");
const PORT = process.env.PORT || 4000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    status: "debug",
    express: !!express,
    cron: !!cron,
    supabase: !!supabaseJs,
    node: process.version,
  }));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Debug server running on port ${PORT}`);
});
