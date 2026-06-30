const Service = require("node-windows").Service;
const path = require("path");

const svc = new Service({
  name: "SysWatch Agent",
  script: path.join(__dirname, "agent.js"),
});

svc.on("uninstall", () => {
  console.log("Service uninstalled.");
});

svc.uninstall();