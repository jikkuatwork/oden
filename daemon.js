import { getPidFilePath, isProcessRunning } from "./utils.js";
import { DEFAULT_PORT } from "./constants.js";

/**
 * Starts the server as a daemon process
 */
export async function startDaemon() {
  const pidFilePath = getPidFilePath();
  
  // Check if daemon is already running
  try {
    const existingPid = await Deno.readTextFile(pidFilePath);
    if (await isProcessRunning(existingPid.trim())) {
      console.log("Daemon is already running.");
      return;
    }
  } catch (error) {
    // PID file doesn't exist or cannot be read, which is fine
  }
  
  // Start a new daemon process
  console.log("Starting daemon...");
  
  // Prepare command to run the server script
  const command = new Deno.Command(Deno.execPath(), {
    args: [
      "run",
      "--allow-net",
      "--allow-read",
      "--allow-write",
      "server.js"
    ],
    stdin: "null",
    stdout: "null",
    stderr: "null",
    detached: true,
  });
  
  // Start the process
  const child = command.spawn();
  
  // Write the PID to file
  try {
    await Deno.writeTextFile(pidFilePath, child.pid.toString());
    console.log(`Daemon started with PID: ${child.pid}`);
    console.log(`Server running at http://localhost:${DEFAULT_PORT}`);
  } catch (error) {
    console.error("Failed to write PID file:", error);
    console.error("Daemon may not be properly tracked.");
  }
}

/**
 * Checks the status of the daemon
 */
export async function checkStatus() {
  const pidFilePath = getPidFilePath();
  
  try {
    const pid = await Deno.readTextFile(pidFilePath);
    if (await isProcessRunning(pid.trim())) {
      console.log(`Daemon is running with PID: ${pid.trim()}`);
      console.log(`Server available at http://localhost:${DEFAULT_PORT}`);
    } else {
      console.log("Daemon is not running.");
    }
  } catch (error) {
    console.log("Daemon is not running.");
  }
}

/**
 * Stops the running daemon
 */
export async function stopDaemon() {
  const pidFilePath = getPidFilePath();
  
  try {
    const pid = await Deno.readTextFile(pidFilePath);
    const pidNum = parseInt(pid.trim());
    
    if (await isProcessRunning(pid.trim())) {
      console.log(`Stopping daemon with PID: ${pidNum}`);
      
      // Different kill method based on platform
      if (Deno.build.os === "windows") {
        new Deno.Command("taskkill", {
          args: ["/PID", pidNum.toString(), "/F"],
        }).output();
      } else {
        Deno.kill(pidNum, "SIGTERM");
      }
      
      // Remove the PID file
      await Deno.remove(pidFilePath);
      console.log("Daemon stopped successfully.");
    } else {
      console.log("Daemon is not running.");
      // Clean up stale PID file
      await Deno.remove(pidFilePath).catch(() => {});
    }
  } catch (error) {
    console.log("Daemon is not running.");
  }
}