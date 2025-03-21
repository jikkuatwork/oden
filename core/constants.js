// Common constants used throughout the application

import { join } from "https://deno.land/std/path/mod.ts";
import { getHomeDir } from "./utils.js";

// Version number to track changes
export const VERSION = "0.3.0";

// Default port for the web server
export const DEFAULT_PORT = 7423;

// Directory to store PID files and other application data
export const APP_DATA_DIR = join(getHomeDir(), ".oden");

// Directory containing static web files
// This will be resolved relative to the executable location
export const STATIC_DIR = new URL("../static", import.meta.url).pathname;

// Application name
export const APP_NAME = "oden";

// Default logging settings
export const LOG_SETTINGS = {
  fileName: "oden.log",
  maxSize: 1024 * 1024 * 5, // 5MB
  maxFiles: 3
};