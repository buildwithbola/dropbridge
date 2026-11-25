const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("dropbridgeDesktop", {
  isDesktop: true,
  platform: process.platform,
  arch: process.arch,
});
