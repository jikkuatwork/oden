// Windows-specific service implementation

import { DEFAULT_PORT, VERSION, APP_NAME } from "../../core/constants.js";
import { createLogger } from "../../core/utils.js";
import { 
  getPidFilePath, 
  getLogFilePath, 
  isProcessRunning, 
  getServiceScriptPath, 
  execPowerShell,
  isAdmin,
  serviceExists
} from "./utils.js";

// Windows service name
const SERVICE_NAME = `${APP_NAME}Server`;

/**
 * Starts the server as a Windows service
 */
export async function startDaemon() {
  const pidFilePath = await getPidFilePath();
  const logFilePath = await getLogFilePath();
  const logger = createLogger(logFilePath);
  
  // Check if the service is already running
  try {
    if (await isServiceRunning()) {
      console.log(`${SERVICE_NAME} service is already running.`);
      console.log(`Server available at http://localhost:${DEFAULT_PORT}`);
      await logger.info(`Attempted to start service, but it's already running.`);
      return;
    }
  } catch (error) {
    // Service doesn't exist or cannot be checked, which is fine
  }
  
  // Check if running as admin
  if (!(await isAdmin())) {
    console.error("This command requires administrator privileges.");
    console.error("Please run the command prompt as Administrator and try again.");
    await logger.error("Failed to start service: Administrator privileges required.");
    return;
  }
  
  console.log(`Starting ${SERVICE_NAME} service...`);
  await logger.info(`Starting ${SERVICE_NAME} service...`);
  
  // Get the path to the executable (the compiled binary)
  const execPath = Deno.execPath();
  
  // Create PowerShell script to install and start the service
  const scriptPath = await getServiceScriptPath();
  
  const scriptContent = `
# PowerShell script to install and start ${APP_NAME} Server v${VERSION} as a Windows service

# Check if NSSM (Non-Sucking Service Manager) is installed
$nssmPath = "C:\\Windows\\System32\\nssm.exe"
if (-not (Test-Path $nssmPath)) {
    Write-Host "NSSM is not installed. Installing the service manually..."
    
    # Create a Windows service using SC
    & sc.exe create "${SERVICE_NAME}" binPath= "${execPath} server" start= auto DisplayName= "${APP_NAME} Web Server v${VERSION}"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to create the service. Error code: $LASTEXITCODE"
        exit 1
    }
    
    # Set service description
    & sc.exe description "${SERVICE_NAME}" "Serves web content via HTTP. Part of ${APP_NAME} v${VERSION}"
    
    # Configure service to restart on failure
    & sc.exe failure "${SERVICE_NAME}" reset= 86400 actions= restart/60000/restart/60000/restart/60000
} else {
    # Use NSSM for better service management
    Write-Host "Installing service using NSSM..."
    
    # Remove service if it exists
    & $nssmPath remove "${SERVICE_NAME}" confirm
    
    # Install the service
    & $nssmPath install "${SERVICE_NAME}" "${execPath}"
    & $nssmPath set "${SERVICE_NAME}" AppParameters "server"
    & $nssmPath set "${SERVICE_NAME}" DisplayName "${APP_NAME} Web Server v${VERSION}"
    & $nssmPath set "${SERVICE_NAME}" Description "Serves web content via HTTP. Part of ${APP_NAME} v${VERSION}"
    & $nssmPath set "${SERVICE_NAME}" AppStdout "${logFilePath}"
    & $nssmPath set "${SERVICE_NAME}" AppStderr "${logFilePath}"
    & $nssmPath set "${SERVICE_NAME}" Start "SERVICE_AUTO_START"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install the service. Error code: $LASTEXITCODE"
        exit 1
    }
}

# Start the service
Write-Host "Starting service..."
Start-Service "${SERVICE_NAME}"

# Get the service status
$service = Get-Service "${SERVICE_NAME}"
if ($service.Status -eq "Running") {
    # Get the PID and save it
    $process = Get-WmiObject Win32_Service -Filter "Name='${SERVICE_NAME}'" | Select-Object -ExpandProperty ProcessId
    if ($process) {
        Set-Content -Path "${pidFilePath}" -Value $process
    }
    
    Write-Host "Service started successfully."
    exit 0
} else {
    Write-Host "Failed to start the service. Status: $($service.Status)"
    exit 1
}
`;

  // Write the script
  await Deno.writeTextFile(scriptPath, scriptContent);
  
  // Execute the PowerShell script
  try {
    const output = await execPowerShell(`& '${scriptPath}'`);
    console.log(output);
    
    // Check if service is running
    if (await isServiceRunning()) {
      console.log(`${SERVICE_NAME} service started successfully.`);
      console.log(`Server running at http://localhost:${DEFAULT_PORT}`);
      console.log(`Logs available at: ${logFilePath}`);
      await logger.info(`${SERVICE_NAME} service started successfully.`);
      
      // If PID file exists, log it
      try {
        const pid = await Deno.readTextFile(pidFilePath);
        console.log(`Service running with PID: ${pid.trim()}`);
        await logger.info(`Service running with PID: ${pid.trim()}`);
      } catch (error) {
        // PID file might not be created, which is fine for services
      }
    } else {
      console.error(`Failed to start the ${SERVICE_NAME} service.`);
      await logger.error(`Failed to start the ${SERVICE_NAME} service.`);
    }
    
  } catch (error) {
    console.error(`Failed to start the service: ${error.message}`);
    await logger.error(`Failed to start the service: ${error.message}`);
  }
}

/**
 * Checks if the service is currently running
 * @returns {Promise<boolean>} - Whether the service is running
 */
async function isServiceRunning() {
  try {
    const script = `
      $service = Get-Service -Name "${SERVICE_NAME}" -ErrorAction SilentlyContinue
      if ($service -and $service.Status -eq "Running") {
        Write-Output "true"
      } else {
        Write-Output "false"
      }
    `;
    
    const result = await execPowerShell(script);
    return result.trim().toLowerCase() === "true";
  } catch (error) {
    return false;
  }
}

/**
 * Checks the status of the daemon service
 */
export async function checkStatus() {
  const pidFilePath = await getPidFilePath();
  const logFilePath = await getLogFilePath();
  
  try {
    if (await isServiceRunning()) {
      console.log(`${SERVICE_NAME} service is running.`);
      console.log(`Server available at http://localhost:${DEFAULT_PORT}`);
      console.log(`Log file: ${logFilePath}`);
      
      // Display the last few log entries
      try {
        const script = `Get-Content -Path "${logFilePath}" -Tail 5`;
        const output = await execPowerShell(script);
        
        if (output.trim()) {
          console.log("\nLast few log entries:");
          console.log(output);
        }
      } catch (error) {
        // Ignore errors getting log entries
      }
      
      // Show PID if available
      try {
        const pid = await Deno.readTextFile(pidFilePath);
        console.log(`Service running with PID: ${pid.trim()}`);
      } catch (error) {
        // PID file might not exist, which is okay for services
      }
    } else {
      console.log(`${SERVICE_NAME} service is not running.`);
    }
  } catch (error) {
    console.log(`${SERVICE_NAME} service is not installed.`);
  }
}

/**
 * Stops the running daemon service
 */
export async function stopDaemon() {
  const logFilePath = await getLogFilePath();
  const logger = createLogger(logFilePath);
  
  // Check if running as admin
  if (!(await isAdmin())) {
    console.error("This command requires administrator privileges.");
    console.error("Please run the command prompt as Administrator and try again.");
    await logger.error("Failed to stop service: Administrator privileges required.");
    return;
  }
  
  try {
    if (await isServiceRunning()) {
      console.log(`Stopping ${SERVICE_NAME} service...`);
      await logger.info(`Stopping ${SERVICE_NAME} service...`);
      
      // Stop the service
      const script = `Stop-Service -Name "${SERVICE_NAME}" -Force`;
      await execPowerShell(script);
      
      // Wait a moment for the service to stop
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (!(await isServiceRunning())) {
        console.log(`${SERVICE_NAME} service stopped successfully.`);
        await logger.info(`${SERVICE_NAME} service stopped successfully.`);
      } else {
        console.error(`Failed to stop ${SERVICE_NAME} service.`);
        await logger.error(`Failed to stop ${SERVICE_NAME} service.`);
      }
    } else {
      console.log(`${SERVICE_NAME} service is not running.`);
    }
  } catch (error) {
    console.log(`${SERVICE_NAME} service is not installed.`);
  }
}