const fs = require("fs");
const axios = require("axios");
const os = require("os");
const idle = require("desktop-idle");
require("dotenv").config();

const hostname = os.hostname();

function getIPAddress() {
  const interfaces = os.networkInterfaces();

  for (const name in interfaces) {
    for (const net of interfaces[name]) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }

  return "Unknown";
}

const ip_address = getIPAddress();

// Default values
let idleTimeout = 30; // seconds
let heartbeatInterval = 5000; // milliseconds

let currentStatus = "Active";
let lastHeartbeat = Date.now();

// Fetch latest settings from backend
async function fetchSettings() {
  try {
    const res = await axios.get(`${process.env.SERVER_URL}/settings`);

    idleTimeout = res.data.idle_timeout;
    heartbeatInterval = res.data.heartbeat_interval;
  } catch (err) {
    console.log("Using previous settings.");
  }
}

// Send status to backend
async function sendStatus(status) {
  try {
    await axios.post(`${process.env.SERVER_URL}/register`, {
      hostname,
      ip_address,
      status,
    });

    fs.appendFileSync(
      __dirname + "\\agent.log",
      `[${new Date().toLocaleTimeString()}] Status: ${status}\n`
    );
  } catch (err) {
    console.error(err.message);

    fs.appendFileSync(
      __dirname + "\\agent.log",
      `[${new Date().toLocaleTimeString()}] ERROR: ${err.message}\n`
    );
  }
}

// Main monitor
async function monitor() {
  await fetchSettings();

  const idleTime = idle.getIdleTime();
  fs.appendFileSync(
  __dirname + "\\agent.log",
  `[${new Date().toLocaleTimeString()}] Idle Time: ${idleTime}\n`
);

  const newStatus = idleTime >= idleTimeout ? "Idle" : "Active";

  // Send immediately on status change
  if (newStatus !== currentStatus) {
    currentStatus = newStatus;
    lastHeartbeat = Date.now();
    await sendStatus(currentStatus);
    return;
  }

  // Heartbeat
  if (Date.now() - lastHeartbeat >= heartbeatInterval) {
    lastHeartbeat = Date.now();
    await sendStatus(currentStatus);
  }
}

// Initial run
monitor();

// Check every second
setInterval(monitor, 1000);