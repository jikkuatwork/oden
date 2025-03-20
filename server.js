import { serve } from "https://deno.land/std/http/server.ts";
import { join, extname } from "https://deno.land/std/path/mod.ts";
import { contentType } from "https://deno.land/std/media_types/mod.ts";
import { findAvailablePort } from "./utils.js";
import { DEFAULT_PORT, STATIC_DIR } from "./constants.js";

// Map of file extensions to content types
const MIME_TYPES = new Map([
  [".html", "text/html"],
  [".css", "text/css"],
  [".js", "application/javascript"],
  [".json", "application/json"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".gif", "image/gif"],
  [".svg", "image/svg+xml"],
]);

/**
 * Starts the HTTP server on the specified port or finds an available one
 */
export async function startServer(port = DEFAULT_PORT) {
  // Find an available port if the default is taken
  const availablePort = await findAvailablePort(port);
  if (availablePort !== port) {
    console.log(`Port ${port} is unavailable, using port ${availablePort} instead`);
    port = availablePort;
  }

  console.log(`Starting server on http://localhost:${port}`);
  
  // Create and start the server
  serve(handleRequest, { port });
  console.log(`Server running at http://localhost:${port}`);
  
  return port;
}

/**
 * Handles incoming HTTP requests
 */
async function handleRequest(request) {
  const url = new URL(request.url);
  let path = url.pathname;
  
  // Default to index.html for root path
  if (path === "/" || path === "") {
    path = "/index.html";
  }
  
  try {
    // Resolve the file path
    const filePath = join(STATIC_DIR, path);
    
    // Try to read the file
    const data = await Deno.readFile(filePath);
    
    // Determine content type based on file extension
    const ext = extname(filePath);
    const contentTypeValue = MIME_TYPES.get(ext) || "application/octet-stream";
    
    // Return the file content
    return new Response(data, {
      status: 200,
      headers: {
        "content-type": contentTypeValue,
      },
    });
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      // File not found
      return new Response("Not Found", {
        status: 404,
        headers: {
          "content-type": "text/plain",
        },
      });
    }
    
    // Other error
    console.error("Error serving request:", e);
    return new Response("Internal Server Error", {
      status: 500,
      headers: {
        "content-type": "text/plain",
      },
    });
  }
}