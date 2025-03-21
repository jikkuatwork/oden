// Unix-specific utilities

import { join } from "https://deno.land/std/path/mod.ts";
import { APP_DATA_DIR, APP_NAME } from "../../core/constants.js";
import { ensureAppDir } from "../../core/utils.js";

/**
 * Gets the path to the PID file for this application
 * @returns {string} - The path to the PID file
 */
export async function getPidFilePath() {
  await ensureAppDir();
  return join(APP_DATA_DIR, `${APP_NAME}.pid`);
}

/**
 * Gets the path to the log file
 * @returns {string} - The path to the log file
 */
export async function getLogFilePath() {
  await ensureAppDir();
  return join(APP_DATA_DIR, `${APP_NAME}.log`);
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
    // On Unix-like systems, we can just try to send signal 0
    // which doesn't actually send a signal but checks if process exists
    Deno.kill(numericPid, "SIGCONT");
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Gets the path to the daemon script
 * @returns {Promise<string>} - The path to the daemon script
 */
export async function getDaemonScriptPath() {
  await ensureAppDir();
  return join(APP_DATA_DIR, `${APP_NAME}_daemon.sh`);
}

/**
 * Executes a shell command and returns the output
 * @param {string} command - The command to execute
 * @param {string[]} args - The arguments to pass to the command
 * @returns {Promise<string>} - The stdout output from the command
 */
export async function execCommand(command, args = []) {
  try {
    const cmd = new Deno.Command(command, {
      args: args,
      stdout: "piped",
      stderr: "piped",
    });
    
    const output = await cmd.output();
    
    if (output.code !== 0) {
      const errorStr = new TextDecoder().decode(output.stderr);
      throw new Error(`Command "${command} ${args.join(' ')}" failed: ${errorStr}`);
    }
    
    return new TextDecoder().decode(output.stdout);
  } catch (error) {
    console.error(`Error executing command: ${error.message}`);
    throw error;
  }
}