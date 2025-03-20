import { join, extname, dirname, fromFileUrl } from "https://deno.land/std/path/mod.ts";
import { findAvailablePort } from "./utils.js";
import { DEFAULT_PORT, VERSION } from "./constants.js";

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
  try {
    // Find an available port if the default is taken
    const availablePort = await findAvailablePort(port);
    if (availablePort !== port) {
      console.log(`Port ${port} is unavailable, using port ${availablePort} instead`);
      port = availablePort;
    }

    console.log(`Oden v${VERSION} - Starting server on http://localhost:${port}`);
    
    // Determine the static directory
    let staticDir;
    try {
      // Try to get the directory from the current module URL
      const scriptDir = dirname(fromFileUrl(import.meta.url));
      staticDir = join(scriptDir, "static");
    } catch (error) {
      // Fallback to current working directory
      staticDir = join(Deno.cwd(), "static");
    }
    
    console.log(`Serving files from: ${staticDir}`);
    
    // Create static directory if it doesn't exist
    try {
      await Deno.stat(staticDir);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        console.log("Static directory not found, creating it...");
        await Deno.mkdir(staticDir, { recursive: true });
        
        // Create a simple index.html file
        const indexPath = join(staticDir, "index.html");
        const indexContent = `<!DOCTYPE html>
<html>
<head>
    <title>Oden Server v${VERSION}</title>
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
    <h1>Oden Server is Running</h1>
    <p>This is a default page created by the Oden server.</p>
    <p>Version: ${VERSION}</p>
    <p>Current time: ${new Date().toISOString()}</p>
</body>
</html>`;
        await Deno.writeTextFile(indexPath, indexContent);
        console.log(`Created default index.html at ${indexPath}`);
      }
    }
    
    // Create the server
    const handler = async (request) => {
      const url = new URL(request.url);
      let path = url.pathname;
      
      console.log(`[${new Date().toISOString()}] ${request.method} ${path}`);
      
      // Default to index.html for root path
      if (path === "/" || path === "") {
        path = "/index.html";
      }
      
      try {
        // Resolve the file path
        const filePath = join(staticDir, path);
        
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
    };
    
    // Listen for requests using the Deno.serve API
    const server = Deno.serve({ port: availablePort }, handler);
    
    console.log(`Server running at http://localhost:${availablePort}`);
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