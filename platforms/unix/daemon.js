// Unix-specific daemon implementation

import { dirname, join } from "https://deno.land/std/path/mod.ts";
import { DEFAULT_PORT, VERSION, APP_NAME } from "../../core/constants.js";
import { createLogger } from "../../core/utils.js";
import { getPidFilePath, getLogFilePath, isProcessRunning, getDaemonScriptPath, execCommand } from "./utils.js";

/**
 * Starts the server as a daemon process
 */
export async function startDaemon() {
  const pidFilePath = await getPidFilePath();
  const logFilePath = await getLogFilePath();
  const logger = createLogger(logFilePath);
  
  // Check if daemon is already running
  try {
    const existingPid = await Deno.readTextFile(pidFilePath);
    if (await isProcessRunning(existingPid.trim())) {
      console.log("Daemon is already running.");
      console.log(`Server available at http://localhost:${DEFAULT_PORT}`);
      await logger.info("Attempted to start daemon, but it's already running.");
      return;
    }
  } catch (error) {
    // PID file doesn't exist or cannot be read, which is fine
  }
  
  console.log("Starting daemon...");
  await logger.info("Starting daemon...");
  
  // Get the path to the executable (the compiled binary)
  const execPath = Deno.execPath();
  
  // Create a shell script to launch the daemon
  const scriptPath = await getDaemonScriptPath();
  const scriptDir = dirname(scriptPath);
  
  // The script will use nohup to daemonize the process
  const scriptContent = `#!/bin/bash
# Auto-generated daemon script for ${APP_NAME} Server v${VERSION}

# Make sure the directory exists
mkdir -p "${scriptDir}"

# Start the server with nohup
nohup "${execPath}" server > "${logFilePath}" 2>&1 &

# Save the PID
echo $! > "${pidFilePath}"

# Exit successfully
exit 0
`;

  // Write and make executable
  await Deno.writeTextFile(scriptPath, scriptContent);
  await Deno.chmod(scriptPath, 0o755);
  
  // Execute the shell script
  try {
    const command = new Deno.Command("/bin/bash", {
      args: [scriptPath],
    });
    
    const { code } = await command.output();
    
    if (code === 0) {
      // Wait briefly for the PID file to be written
      await new Promise(resolve => setTimeout(resolve, 500));
      
      try {
        const pid = await Deno.readTextFile(pidFilePath);
        console.log(`Daemon started with PID: ${pid.trim()}`);
        console.log(`Server running at http://localhost:${DEFAULT_PORT}`);
        console.log(`Logs available at: ${logFilePath}`);
        await logger.info(`Daemon started with PID: ${pid.trim()}`);
      } catch (error) {
        console.error("Daemon started but failed to read PID file:", error.message);
        await logger.error(`Daemon started but failed to read PID file: ${error.message}`);
      }
    } else {
      console.error(`Failed to start daemon (exit code: ${code})`);
      await logger.error(`Failed to start daemon (exit code: ${code})`);
    }
    
    // Clean up the script
    await Deno.remove(scriptPath).catch(async (err) => {
      await logger.error(`Failed to clean up script: ${err.message}`);
    });
  } catch (error) {
    console.error("Failed to start daemon:", error.message);
    await logger.error(`Failed to start daemon: ${error.message}`);
  }
}

/**
 * Checks the status of the daemon
 */
export async function checkStatus() {
  const pidFilePath = await getPidFilePath();
  const logFilePath = await getLogFilePath();
  
  try {
    const pid = await Deno.readTextFile(pidFilePath);
    
    if (await isProcessRunning(pid.trim())) {
      console.log(`Daemon is running with PID: ${pid.trim()}`);
      console.log(`Server available at http://localhost:${DEFAULT_PORT}`);
      console.log(`Log file: ${logFilePath}`);
      
      // Display the last few log entries
      try {
        const output = await execCommand("tail", ["-n", "5", logFilePath]);
        
        if (output.trim()) {
          console.log("\nLast few log entries:");
          console.log(output);
        }
      } catch (error) {
        // Ignore tail errors
      }
    } else {
      console.log("Daemon is not running.");
      // Clean up stale PID file
      await Deno.remove(pidFilePath).catch(() => {});
    }
  } catch (error) {
    console.log("Daemon is not running.");
  }
}

/**
 * Stops the running daemon
 */
export async function stopDaemon() {
  const pidFilePath = await getPidFilePath();
  const logFilePath = await getLogFilePath();
  const logger = createLogger(logFilePath);
  
  try {
    const pid = await Deno.readTextFile(pidFilePath);
    const pidNum = parseInt(pid.trim());
    
    if (await isProcessRunning(pid.trim())) {
      console.log(`Stopping daemon with PID: ${pidNum}`);
      await logger.info(`Stopping daemon with PID: ${pidNum}`);
      
      // Send SIGTERM to the process
      Deno.kill(pidNum, "SIGTERM");
      
      // Wait a moment for the process to terminate
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if it's still running
      if (await isProcessRunning(pid.trim())) {
        console.log("Process didn't terminate, sending SIGKILL...");
        await logger.warn("Process didn't terminate with SIGTERM, sending SIGKILL");
        Deno.kill(pidNum, "SIGKILL");
      }
      
      // Remove the PID file
      await Deno.remove(pidFilePath);
      console.log("Daemon stopped successfully.");
      await logger.info("Daemon stopped successfully.");
    } else {
      console.log("Daemon is not running.");
      // Clean up stale PID file
      await Deno.remove(pidFilePath).catch(() => {});
    }
  } catch (error) {
    console.log("Daemon is not running.");
  }
}