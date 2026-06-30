const Service = require("node-windows").Service;
const path = require("path");

const svc = new Service({
  name: "SysWatch Agent",
  description: "Monitors user activity and reports system status to the SysWatch server.",
  script: path.join(__dirname, "agent.js"),
});

svc.on("install", () => {
  console.log("SysWatch Agent installed successfully.");
  svc.start();
});

svc.on("alreadyinstalled", () => {
  console.log("SysWatch Agent is already installed.");
});

svc.on("start", () => {
  console.log("SysWatch Agent service started.");
});

svc.install();