import { join } from "https://deno.land/std/path/mod.ts";
import { getHomeDir } from "./utils.js";

// Default port for the web server
export const DEFAULT_PORT = 7423;

// Directory to store PID files
export const PID_FILE_DIR = join(getHomeDir(), ".oden");

// Directory containing static web files
// This will be resolved relative to the executable location
export const STATIC_DIR = new URL("./static", import.meta.url).pathname;