// Windows-specific utilities

import { join } from "https://deno.land/std/path/mod.ts";
import { APP_DATA_DIR, APP_NAME } from "../../core/constants.js";
import { ensureAppDir } from "../../core/utils.js";

/**
 * Gets the path to the PID file for this application
 * @returns {Promise<string>} - The path to the PID file
 */
export async function getPidFilePath() {
  await ensureAppDir();
  return join(APP_DATA_DIR, `${APP_NAME}.pid`);
}

/**
 * Gets the path to the log file
 * @returns {Promise<string>} - The path to the log file
 */
export async function getLogFilePath() {
  await ensureAppDir();
  return join(APP_DATA_DIR, `${APP_NAME}.log`);
}

/**
 * Gets the path to the Windows service script
 * @returns {Promise<string>} - The path to the service script
 */
export async function getServiceScriptPath() {
  await ensureAppDir();
  return join(APP_DATA_DIR, `${APP_NAME}_service.ps1`);
}

/**
 * Checks if a process with the given PID is running on Windows
 * @param {string|number} pid - The PID to check
 * @returns {Promise<boolean>} - Whether the process is running
 */
export async function isProcessRunning(pid) {
  if (!pid) return false;
  
  const numericPid = parseInt(pid);
  if (isNaN(numericPid)) return false;
  
  try {
    // Use tasklist to check if process exists
    const command = new Deno.Command("tasklist", {
      args: ["/FI", `PID eq ${numericPid}`, "/NH"],
      stdout: "piped",
    });
    const { stdout } = await command.output();
    const output = new TextDecoder().decode(stdout);
    return output.includes(numericPid.toString());
  } catch (error) {
    console.error(`Error checking process: ${error.message}`);
    return false;
  }
}

/**
 * Executes a PowerShell command with given arguments
 * @param {string} script - The PowerShell script to execute
 * @returns {Promise<string>} - The stdout output from the command
 */
export async function execPowerShell(script) {
  try {
    const command = new Deno.Command("powershell", {
      args: ["-ExecutionPolicy", "Bypass", "-Command", script],
      stdout: "piped",
      stderr: "piped",
    });
    
    const output = await command.output();
    
    if (output.code !== 0) {
      const errorText = new TextDecoder().decode(output.stderr);
      throw new Error(`PowerShell command failed: ${errorText}`);
    }
    
    return new TextDecoder().decode(output.stdout);
  } catch (error) {
    console.error(`Error executing PowerShell: ${error.message}`);
    throw error;
  }
}

/**
 * Checks if the current process has administrator privileges
 * @returns {Promise<boolean>} - Whether the process has admin privileges
 */
export async function isAdmin() {
  try {
    const script = `
      $currentUser = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
      $currentUser.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)
    `;
    
    const result = await execPowerShell(script);
    return result.trim().toLowerCase() === "true";
  } catch (error) {
    console.error(`Error checking admin status: ${error.message}`);
    return false;
  }
}

/**
 * Checks if a Windows service exists
 * @param {string} serviceName - The name of the service to check
 * @returns {Promise<boolean>} - Whether the service exists
 */
export async function serviceExists(serviceName) {
  try {
    const script = `Get-Service -Name "${serviceName}" -ErrorAction SilentlyContinue`;
    await execPowerShell(script);
    return true;
  } catch (error) {
    return false;
  }
}