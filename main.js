#!/usr/bin/env -S deno run

import { startServer } from "./core/server.js";
import { DEFAULT_PORT, VERSION, APP_NAME } from "./core/constants.js";
import { getPlatform } from "./core/utils.js";

// Dynamically import platform-specific modules
let platformManager;

async function loadPlatformModules() {
  const platform = getPlatform();
  
  switch (platform) {
    case "windows":
      platformManager = await import("./platforms/windows/service.js");
      break;
    case "darwin":
      platformManager = await import("./platforms/darwin/daemon.js");
      break;
    default:
      // Default to unix for linux and other unix-like systems
      platformManager = await import("./platforms/unix/daemon.js");
  }
  
  return platformManager;
}

async function printHelp() {
  console.log(`
${APP_NAME} v${VERSION} - A simple Deno CLI for serving web content

USAGE:
  ${APP_NAME} [COMMAND]

COMMANDS:
  start       Start the server as a daemon/service
  server      Start the web server in the foreground (PORT ${DEFAULT_PORT} by default)
  status      Show the status of the daemon/service
  stop        Stop the running daemon/service
  help        Show this help message

EXAMPLES:
  ${APP_NAME} start
  ${APP_NAME} server
  ${APP_NAME} server --port 8000
  ${APP_NAME} status
  ${APP_NAME} stop
  `);
}

async function main() {
  const args = Deno.args;
  const command = args[0];

  if (!command || command === "help" || command === "--help") {
    await printHelp();
    return;
  }

  // Load platform-specific modules
  await loadPlatformModules();
  
  // Extract methods from the platform-specific module
  const { startDaemon, checkStatus, stopDaemon } = platformManager;

  switch (command) {
    case "start":
      await startDaemon();
      break;
    
    case "server":
      // Check for custom port
      let port = DEFAULT_PORT;
      const portIndex = args.indexOf("--port");
      if (portIndex !== -1 && args[portIndex + 1]) {
        port = parseInt(args[portIndex + 1]);
      }
      await startServer(port);
      break;
    
    case "status":
      await checkStatus();
      break;
    
    case "stop":
      await stopDaemon();
      break;
    
    default:
      console.error(`Unknown command: ${command}`);
      await printHelp();
      Deno.exit(1);
  }
}

if (import.meta.main) {
  main().catch(error => {
    console.error(`Error: ${error.message}`);
    Deno.exit(1);
  });
}