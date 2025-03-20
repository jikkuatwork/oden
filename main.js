#!/usr/bin/env -S deno run

import { startServer } from "./server.js";
import { startDaemon, checkStatus, stopDaemon } from "./daemon.js";
import { DEFAULT_PORT } from "./constants.js";

async function printHelp() {
  console.log(`
oden - A simple Deno CLI for serving web content

USAGE:
  oden [COMMAND]

COMMANDS:
  start       Start the server as a daemon
  server      Start the web server in the foreground (PORT 7423 by default)
  status      Show the status of the daemon
  stop        Stop the running daemon
  help        Show this help message

EXAMPLES:
  oden start
  oden server
  oden server --port 8000
  oden status
  oden stop
  `);
}

async function main() {
  const args = Deno.args;
  const command = args[0];

  if (!command || command === "help" || command === "--help") {
    await printHelp();
    return;
  }

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
  main();
}