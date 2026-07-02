const { Service } = require("node-windows");
const path = require("path");

const svc = new Service({
  name: "SysWatch Agent",
  description: "Monitors user activity and reports system status to the SysWatch server.",
  script: path.join(__dirname, "agent.js"),
  wait: 2,
  grow: 0.5,
  maxRetries: 40,
});

svc.on("install", () => {
  console.log("✅ Service installed successfully.");
  svc.start();
});

svc.on("start", () => {
  console.log("✅ Service started.");
});

svc.on("alreadyinstalled", () => {
  console.log("⚠ Service is already installed.");
});

svc.on("error", (err) => {
  console.error("❌ Service Error:", err);
});

svc.install();