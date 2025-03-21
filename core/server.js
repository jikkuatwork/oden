// Core server functionality

import { join, extname } from "https://deno.land/std/path/mod.ts";
import { findAvailablePort, createLogger, ensureAppDir } from "./utils.js";
import { DEFAULT_PORT, VERSION, STATIC_DIR, APP_DATA_DIR, APP_NAME } from "./constants.js";

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
  [".ico", "image/x-icon"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
  [".ttf", "font/ttf"],
  [".otf", "font/otf"],
  [".eot", "application/vnd.ms-fontobject"],
]);

/**
 * Starts the HTTP server on the specified port or finds an available one
 */
export async function startServer(port = DEFAULT_PORT) {
  try {
    // Ensure app directory exists
    await ensureAppDir();
    
    // Set up logging
    const logPath = join(APP_DATA_DIR, "oden.log");
    const logger = createLogger(logPath);
    
    // Find an available port if the default is taken
    const availablePort = await findAvailablePort(port);
    if (availablePort !== port) {
      await logger.info(`Port ${port} is unavailable, using port ${availablePort} instead`);
      console.log(`Port ${port} is unavailable, using port ${availablePort} instead`);
      port = availablePort;
    }

    await logger.info(`${APP_NAME} v${VERSION} - Starting server on http://localhost:${port}`);
    console.log(`${APP_NAME} v${VERSION} - Starting server on http://localhost:${port}`);
    
    // Log static directory
    await logger.info(`Serving files from: ${STATIC_DIR}`);
    console.log(`Serving files from: ${STATIC_DIR}`);
    
    // Create static directory if it doesn't exist
    try {
      await Deno.stat(STATIC_DIR);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        await logger.info("Static directory not found, creating it...");
        console.log("Static directory not found, creating it...");
        await Deno.mkdir(STATIC_DIR, { recursive: true });
        
        // Create a simple index.html file
        const indexPath = join(STATIC_DIR, "index.html");
        const indexContent = `<!DOCTYPE html>
<html>
<head>
    <title>${APP_NAME} Server v${VERSION}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 40px;
            line-height: 1.6;
        }
        h1 {
            color: #333;
        }
    </style>
</head>
<body>
    <h1>${APP_NAME} Server is Running</h1>
    <p>This is a default page created by the ${APP_NAME} server.</p>
    <p>Version: ${VERSION}</p>
    <p>Current time: ${new Date().toISOString()}</p>
</body>
</html>`;
        await Deno.writeTextFile(indexPath, indexContent);
        await logger.info(`Created default index.html at ${indexPath}`);
        console.log(`Created default index.html at ${indexPath}`);
      }
    }
    
    // Create the server
    const handler = async (request) => {
      const url = new URL(request.url);
      let path = url.pathname;
      
      const logMessage = `${request.method} ${path}`;
      await logger.info(logMessage);
      console.log(`[${new Date().toISOString()}] ${logMessage}`);
      
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
          await logger.warn(`404 Not Found: ${path}`);
          return new Response("Not Found", {
            status: 404,
            headers: {
              "content-type": "text/plain",
            },
          });
        }
        
        // Other error
        await logger.error(`Error serving request: ${e.message}`);
        console.error("Error serving request:", e);
        return new Response("Internal Server Error", {
          status: 500,
          headers: {
            "content-type": "text/plain",
          },
        });
      }
    };
    
    // Listen for requests using the Deno.serve API
    const server = Deno.serve({ port: port }, handler);
    
    await logger.info(`Server running at http://localhost:${port}`);
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Press Ctrl+C to stop`);
    
    // Keep the server running until explicitly stopped
    await server.finished;
    
  } catch (error) {
    console.error("Failed to start server:", error);
  }
}

// If this file is run directly, start the server
if (import.meta.main) {
  startServer();
}