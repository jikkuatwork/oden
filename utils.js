import { join } from "https://deno.land/std/path/mod.ts";
import { exists } from "https://deno.land/std/fs/mod.ts";
import { PID_FILE_DIR } from "./constants.js";

/**
 * Finds an available port starting from the given port
 * @param {number} startPort - The port to start checking from
 * @returns {Promise<number>} - An available port
 */
export async function findAvailablePort(startPort) {
  let port = startPort;
  while (port < 65535) {
    try {
      // Try to create a listener on the port
      const listener = Deno.listen({ port });
      // If successful, close the listener and return the port
      listener.close();
      return port;
    } catch (error) {
      // If the port is in use, try the next one
      port++;
    }
  }
  throw new Error("No available ports found");
}

/**
 * Gets the path to the PID file
 * @returns {string} - The path to the PID file
 */
export function getPidFilePath() {
  // Ensure PID directory exists
  try {
    Deno.mkdirSync(PID_FILE_DIR, { recursive: true });
  } catch (error) {
    if (!(error instanceof Deno.errors.AlreadyExists)) {
      throw error;
    }
  }
  
  return join(PID_FILE_DIR, "oden.pid");
}

/**
 * Checks if a process with the given PID is running
 * @param {string|number} pid - The PID to check
 * @returns {Promise<boolean>} - Whether the process is running
 */
export async function isProcessRunning(pid) {
  if (!pid) return false;
  
  const numericPid = parseInt(pid);
  if (isNaN(numericPid)) return false;
  
  try {
    // Different approach based on platform
    if (Deno.build.os === "windows") {
      const command = new Deno.Command("tasklist", {
        args: ["/FI", `PID eq ${numericPid}`, "/NH"],
      });
      const { stdout } = await command.output();
      const output = new TextDecoder().decode(stdout);
      return output.includes(numericPid.toString());
    } else {
      // On Unix-like systems, we can just try to send signal 0
      // which doesn't actually send a signal but checks if process exists
      Deno.kill(numericPid, "SIGCONT");
      return true;
    }
  } catch (error) {
    return false;
  }
}

/**
 * Gets the home directory for the current user
 * @returns {string} - The user's home directory
 */
export function getHomeDir() {
  switch (Deno.build.os) {
    case "windows":
      return Deno.env.get("USERPROFILE") || "C:\\";
    default:
      return Deno.env.get("HOME") || "/tmp";
  }
}