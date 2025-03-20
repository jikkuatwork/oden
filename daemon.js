import { getPidFilePath, isProcessRunning } from "./utils.js";
import { DEFAULT_PORT, VERSION } from "./constants.js";
import { dirname, fromFileUrl, join } from "https://deno.land/std/path/mod.ts";

/**
 * Starts the server as a daemon process using Linux-specific techniques
 */
export async function startDaemon() {
  const pidFilePath = getPidFilePath();
  const logFilePath = join(dirname(pidFilePath), "oden.log");
  
  // Check if daemon is already running
  try {
    const existingPid = await Deno.readTextFile(pidFilePath);
    if (await isProcessRunning(existingPid.trim())) {
      console.log("Daemon is already running.");
      console.log(`Server available at http://localhost:${DEFAULT_PORT}`);
      return;
    }
  } catch (error) {
    // PID file doesn't exist or cannot be read, which is fine
  }
  
  console.log("Starting daemon...");
  
  // Get the path to the executable (the compiled binary)
  const execPath = Deno.execPath();
  
  // Create a shell script to launch the daemon
  const scriptDir = dirname(pidFilePath);
  const scriptPath = join(scriptDir, "oden_daemon.sh");
  
  // The script will use nohup to daemonize the process
  const scriptContent = `#!/bin/bash
# Auto-generated daemon script for Oden Server v${VERSION}

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
      } catch (error) {
        console.error("Daemon started but failed to read PID file:", error.message);
      }
    } else {
      console.error(`Failed to start daemon (exit code: ${code})`);
    }
    
    // Clean up the script
    await Deno.remove(scriptPath).catch(() => {});
  } catch (error) {
    console.error("Failed to start daemon:", error.message);
  }
}

/**
 * Checks the status of the daemon
 */
export async function checkStatus() {
  const pidFilePath = getPidFilePath();
  const logFilePath = join(dirname(pidFilePath), "oden.log");
  
  try {
    const pid = await Deno.readTextFile(pidFilePath);
    
    if (await isProcessRunning(pid.trim())) {
      console.log(`Daemon is running with PID: ${pid.trim()}`);
      console.log(`Server available at http://localhost:${DEFAULT_PORT}`);
      console.log(`Log file: ${logFilePath}`);
      
      // Display the last few log entries
      try {
        const command = new Deno.Command("tail", {
          args: ["-n", "5", logFilePath],
        });
        
        const { stdout } = await command.output();
        const output = new TextDecoder().decode(stdout);
        
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
  const pidFilePath = getPidFilePath();
  
  try {
    const pid = await Deno.readTextFile(pidFilePath);
    const pidNum = parseInt(pid.trim());
    
    if (await isProcessRunning(pid.trim())) {
      console.log(`Stopping daemon with PID: ${pidNum}`);
      
      // Send SIGTERM to the process
      Deno.kill(pidNum, "SIGTERM");
      
      // Wait a moment for the process to terminate
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if it's still running
      if (await isProcessRunning(pid.trim())) {
        console.log("Process didn't terminate, sending SIGKILL...");
        Deno.kill(pidNum, "SIGKILL");
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