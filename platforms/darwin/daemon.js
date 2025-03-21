// macOS-specific daemon implementation using launchd

import { join, dirname } from "https://deno.land/std/path/mod.ts";
import { DEFAULT_PORT, VERSION, APP_NAME } from "../../core/constants.js";
import { createLogger } from "../../core/utils.js";
import { 
  getPidFilePath, 
  getLogFilePath, 
  isPlistInstalled,
  getLaunchAgentPath,
  execCommand,
  isProcessRunning
} from "./utils.js";

/**
 * Starts the server as a macOS launch agent
 */
export async function startDaemon() {
  const pidFilePath = await getPidFilePath();
  const logFilePath = await getLogFilePath();
  const launchAgentPath = await getLaunchAgentPath();
  const logger = createLogger(logFilePath);
  
  // Check if daemon is already running
  try {
    if (await isPlistInstalled()) {
      // Check if it's loaded
      const output = await execCommand("launchctl", ["list"]);
      if (output.includes(`${APP_NAME}Server`)) {
        console.log("Launch agent is already running.");
        console.log(`Server available at http://localhost:${DEFAULT_PORT}`);
        await logger.info("Attempted to start launch agent, but it's already running.");
        return;
      }
    }
  } catch (error) {
    // Plist doesn't exist or cannot be checked, which is fine
  }
  
  console.log("Starting launch agent...");
  await logger.info("Starting launch agent...");
  
  // Get the path to the executable (the compiled binary)
  const execPath = Deno.execPath();
  
  // Create the launch agent plist file
  const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${APP_NAME}Server</string>
    <key>ProgramArguments</key>
    <array>
        <string>${execPath}</string>
        <string>server</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${logFilePath}</string>
    <key>StandardErrorPath</key>
    <string>${logFilePath}</string>
    <key>WorkingDirectory</key>
    <string>${dirname(execPath)}</string>
</dict>
</plist>`;

  // Make sure the directory exists
  await Deno.mkdir(dirname(launchAgentPath), { recursive: true });
  
  // Write the plist file
  await Deno.writeTextFile(launchAgentPath, plistContent);
  
  try {
    // Load the launch agent
    await execCommand("launchctl", ["load", "-w", launchAgentPath]);
    
    // Wait briefly for the agent to start
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if it's running
    const output = await execCommand("launchctl", ["list"]);
    if (output.includes(`${APP_NAME}Server`)) {
      console.log("Launch agent started successfully.");
      console.log(`Server running at http://localhost:${DEFAULT_PORT}`);
      console.log(`Logs available at: ${logFilePath}`);
      await logger.info("Launch agent started successfully.");
      
      // Try to get PID
      try {
        const matches = output.match(new RegExp(`(\\d+).*${APP_NAME}Server`));
        if (matches && matches[1]) {
          const pid = matches[1];
          await Deno.writeTextFile(pidFilePath, pid);
          console.log(`Running with PID: ${pid}`);
          await logger.info(`Running with PID: ${pid}`);
        }
      } catch (error) {
        await logger.error(`Failed to get PID: ${error.message}`);
      }
    } else {
      console.error("Failed to start launch agent.");
      await logger.error("Failed to start launch agent.");
    }
  } catch (error) {
    console.error(`Failed to start launch agent: ${error.message}`);
    await logger.error(`Failed to start launch agent: ${error.message}`);
  }
}

/**
 * Checks the status of the launch agent
 */
export async function checkStatus() {
  const pidFilePath = await getPidFilePath();
  const logFilePath = await getLogFilePath();
  const launchAgentPath = await getLaunchAgentPath();
  
  try {
    if (await isPlistInstalled()) {
      // Check if it's loaded
      const output = await execCommand("launchctl", ["list"]);
      if (output.includes(`${APP_NAME}Server`)) {
        console.log("Launch agent is running.");
        console.log(`Server available at http://localhost:${DEFAULT_PORT}`);
        console.log(`Log file: ${logFilePath}`);
        
        // Try to get PID
        try {
          const matches = output.match(new RegExp(`(\\d+).*${APP_NAME}Server`));
          if (matches && matches[1]) {
            const pid = matches[1];
            console.log(`Running with PID: ${pid}`);
          }
        } catch (error) {
          // Ignore PID errors
        }
        
        // Display the last few log entries
        try {
          const logOutput = await execCommand("tail", ["-n", "5", logFilePath]);
          
          if (logOutput.trim()) {
            console.log("\nLast few log entries:");
            console.log(logOutput);
          }
        } catch (error) {
          // Ignore tail errors
        }
        
        return;
      }
    }
    
    console.log("Launch agent is not running.");
  } catch (error) {
    console.log("Launch agent is not installed.");
  }
}

/**
 * Stops the running launch agent
 */
export async function stopDaemon() {
  const pidFilePath = await getPidFilePath();
  const logFilePath = await getLogFilePath();
  const launchAgentPath = await getLaunchAgentPath();
  const logger = createLogger(logFilePath);
  
  try {
    if (await isPlistInstalled()) {
      // Check if it's loaded
      const output = await execCommand("launchctl", ["list"]);
      if (output.includes(`${APP_NAME}Server`)) {
        console.log("Stopping launch agent...");
        await logger.info("Stopping launch agent...");
        
        // Unload the launch agent
        await execCommand("launchctl", ["unload", "-w", launchAgentPath]);
        
        // Wait briefly for the agent to stop
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if it's still running
        const newOutput = await execCommand("launchctl", ["list"]);
        if (!newOutput.includes(`${APP_NAME}Server`)) {
          console.log("Launch agent stopped successfully.");
          await logger.info("Launch agent stopped successfully.");
          
          // Try to clean up the PID file
          try {
            await Deno.remove(pidFilePath);
          } catch (error) {
            // Ignore errors removing PID file
          }
          
          return;
        }
        
        console.error("Failed to stop launch agent.");
        await logger.error("Failed to stop launch agent.");
        return;
      }
    }
    
    console.log("Launch agent is not running.");
  } catch (error) {
    console.log("Launch agent is not installed.");
  }
}