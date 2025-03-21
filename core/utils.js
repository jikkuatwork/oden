// Core utilities used across the application
// Platform-agnostic functionality only

import { exists } from "https://deno.land/std/fs/mod.ts";
import { APP_DATA_DIR } from "./constants.js";

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

/**
 * Ensures the application data directory exists
 * @returns {Promise<void>}
 */
export async function ensureAppDir() {
  try {
    await Deno.mkdir(APP_DATA_DIR, { recursive: true });
  } catch (error) {
    if (!(error instanceof Deno.errors.AlreadyExists)) {
      throw error;
    }
  }
  return APP_DATA_DIR;
}

/**
 * Get the current OS platform in a normalized format
 * @returns {string} - 'linux', 'windows', or 'darwin'
 */
export function getPlatform() {
  return Deno.build.os;
}

/**
 * Creates a simple logger that writes to a file
 * @param {string} logPath - Path to the log file
 * @returns {Object} - Logger object with info, error, and warn methods
 */
export function createLogger(logPath) {
  return {
    async info(message) {
      await appendLog(logPath, "INFO", message);
    },
    async error(message) {
      await appendLog(logPath, "ERROR", message);
    },
    async warn(message) {
      await appendLog(logPath, "WARN", message);
    }
  };
}

/**
 * Append a log entry to the log file
 * @param {string} logPath - Path to the log file
 * @param {string} level - Log level (INFO, ERROR, WARN)
 * @param {string} message - Log message
 */
async function appendLog(logPath, level, message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level}] ${message}\n`;
  
  try {
    await Deno.writeTextFile(logPath, logEntry, { append: true });
  } catch (error) {
    // If the file doesn't exist, create it
    if (error instanceof Deno.errors.NotFound) {
      await Deno.writeTextFile(logPath, logEntry);
    } else {
      console.error(`Failed to write to log: ${error.message}`);
    }
  }
}