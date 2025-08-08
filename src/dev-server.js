#!/usr/bin/env node

/**
 * Development server for SVC files with content negotiation
 *
 * This server provides:
 * - Content negotiation (serves JSON or HTML based on Accept header)
 * - Static file serving for generated SVC structure
 * - CORS support for development
 * - Proper MIME types
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

class SVCDevServer {
  constructor(options = {}) {
    this.port = options.port || 3000;
    this.host = options.host || "localhost";
    this.rootDir = options.rootDir || "./dist";
    this.verbose = options.verbose || false;

    // MIME type mappings
    this.mimeTypes = {
      ".html": "text/html",
      ".json": "application/json",
      ".js": "application/javascript",
      ".css": "text/css",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".svg": "image/svg+xml",
    };
  }

  /**
   * Start the development server
   */
  start() {
    const server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    server.listen(this.port, this.host, () => {
      console.log(
        `🚀 SVC Development Server running at http://${this.host}:${this.port}/`,
      );
      console.log(`📁 Serving files from: ${path.resolve(this.rootDir)}`);
      console.log(`🔄 Content negotiation enabled (HTML/JSON)`);
      if (this.verbose) {
        console.log(`📝 Verbose logging enabled`);
      }
    });

    return server;
  }

  /**
   * Handle incoming HTTP requests
   */
  async handleRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    this.log(`${req.method} ${pathname} - ${req.headers["user-agent"]}`);

    // Enable CORS for development
    this.setCorsHeaders(res);

    // Handle OPTIONS requests for CORS
    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    try {
      // Determine if this is a content-negotiated request
      const acceptsJson = this.acceptsContentType(req, "application/json");
      const acceptsHtml = this.acceptsContentType(req, "text/html");

      // Try to serve content with negotiation
      if (
        await this.tryServeContentNegotiated(
          req,
          res,
          pathname,
          acceptsJson,
          acceptsHtml,
        )
      ) {
        return;
      }

      // Try to serve static file directly
      if (await this.tryServeStaticFile(req, res, pathname)) {
        return;
      }

      // Directory listings disabled to prioritize index.html serving
      // This allows browsers to automatically serve index.html for directories

      // 404 - Not found
      this.serve404(res, pathname);
    } catch (error) {
      this.log(`Error handling request: ${error.message}`);
      this.serve500(res, error.message);
    }
  }

  /**
   * Try to serve content with negotiation (JSON vs HTML)
   */
  async tryServeContentNegotiated(
    req,
    res,
    pathname,
    acceptsJson,
    acceptsHtml,
  ) {
    const filePath = path.join(this.rootDir, pathname);

    // Check if this path corresponds to a directory with index files
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      const jsonFile = path.join(filePath, "index.json");
      const htmlFile = path.join(filePath, "index.html");

      const hasJson = fs.existsSync(jsonFile);
      const hasHtml = fs.existsSync(htmlFile);

      if (!hasJson && !hasHtml) {
        return false;
      }

      // Determine which content to serve based on Accept header
      let serveJson = false;
      let serveHtml = false;

      if (acceptsJson && acceptsHtml) {
        // Both accepted, prefer JSON for API clients, HTML for browsers
        const userAgent = req.headers["user-agent"] || "";
        serveJson = !userAgent.includes("Mozilla");
      } else if (acceptsJson) {
        serveJson = true;
      } else if (acceptsHtml) {
        serveHtml = true;
      } else {
        // No specific preference, serve JSON if available, else HTML
        serveJson = hasJson;
        serveHtml = !hasJson && hasHtml;
      }

      if (serveJson && hasJson) {
        this.serveFile(res, jsonFile, "application/json");
        return true;
      } else if (serveHtml && hasHtml) {
        this.serveFile(res, htmlFile, "text/html");
        return true;
      }
    }

    return false;
  }

  /**
   * Try to serve a static file directly
   */
  async tryServeStaticFile(req, res, pathname) {
    const filePath = path.join(this.rootDir, pathname);

    // Check if it's a file directly
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      const mimeType = this.mimeTypes[ext] || "application/octet-stream";
      this.serveFile(res, filePath, mimeType);
      return true;
    }

    // If it's a directory, try to serve index.html
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      const indexPath = path.join(filePath, "index.html");
      if (fs.existsSync(indexPath)) {
        this.serveFile(res, indexPath, "text/html");
        return true;
      }
    }

    return false;
  }

  /**
   * Try to serve a directory listing (disabled to prioritize index.html)
   */
  async tryServeDirectoryListing(req, res, pathname) {
    // Directory listings disabled to ensure index.html is served by default
    // This prevents directory listings from interfering with index.html serving
    return false;
  }

  /**
   * Serve a file with the specified content type
   */
  serveFile(res, filePath, contentType) {
    const content = fs.readFileSync(filePath);

    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": content.length,
      "Cache-Control": "no-cache", // For development
    });

    res.end(content);

    this.log(`Served: ${filePath} (${contentType})`);
  }

  /**
   * Serve directory listing
   */
  serveDirectoryListing(res, dirPath, urlPath) {
    const items = fs.readdirSync(dirPath);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Directory: ${urlPath}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica', 'Arial', sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
        }
        .directory-item {
            padding: 0.5rem 0;
            border-bottom: 1px solid #eee;
        }
        .directory-item:last-child {
            border-bottom: none;
        }
        .directory-item a {
            text-decoration: none;
            color: #0366d6;
        }
        .directory-item a:hover {
            text-decoration: underline;
        }
        .folder::before {
            content: "📁 ";
        }
        .file::before {
            content: "📄 ";
        }
        .back {
            margin-bottom: 2rem;
        }
        .back a {
            color: #586069;
        }
    </style>
</head>
<body>
    <h1>Directory: ${urlPath}</h1>

    ${
      urlPath !== "/"
        ? `
        <div class="back">
            <a href="${path.dirname(urlPath)}">&larr; Parent Directory</a>
        </div>
    `
        : ""
    }

    <div class="directory-listing">
        ${items
          .map((item) => {
            const itemPath = path.join(dirPath, item);
            const isDirectory = fs.statSync(itemPath).isDirectory();
            const href = path.join(urlPath, item).replace(/\\/g, "/");
            const className = isDirectory ? "folder" : "file";

            return `<div class="directory-item ${className}">
                <a href="${href}">${item}</a>
            </div>`;
          })
          .join("")}
    </div>
</body>
</html>`;

    res.writeHead(200, {
      "Content-Type": "text/html",
      "Content-Length": Buffer.byteLength(html),
    });

    res.end(html);

    this.log(`Served directory listing: ${dirPath}`);
  }

  /**
   * Serve 404 Not Found
   */
  serve404(res, pathname) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 - Not Found</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica', 'Arial', sans-serif;
            line-height: 1.6;
            max-width: 600px;
            margin: 0 auto;
            padding: 2rem;
            text-align: center;
        }
        .error-code {
            font-size: 4rem;
            color: #d73a49;
            margin: 0;
        }
        .error-message {
            color: #586069;
        }
        .back-link {
            margin-top: 2rem;
        }
        .back-link a {
            color: #0366d6;
            text-decoration: none;
        }
        .back-link a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <h1 class="error-code">404</h1>
    <p class="error-message">The requested path <code>${pathname}</code> was not found.</p>
    <div class="back-link">
        <a href="/">&larr; Back to Root</a>
    </div>
</body>
</html>`;

    res.writeHead(404, {
      "Content-Type": "text/html",
      "Content-Length": Buffer.byteLength(html),
    });

    res.end(html);

    this.log(`404: ${pathname}`);
  }

  /**
   * Serve 500 Internal Server Error
   */
  serve500(res, error) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>500 - Internal Server Error</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica', 'Arial', sans-serif;
            line-height: 1.6;
            max-width: 600px;
            margin: 0 auto;
            padding: 2rem;
            text-align: center;
        }
        .error-code {
            font-size: 4rem;
            color: #d73a49;
            margin: 0;
        }
    </style>
</head>
<body>
    <h1 class="error-code">500</h1>
    <p>Internal Server Error</p>
    <p><code>${error}</code></p>
</body>
</html>`;

    res.writeHead(500, {
      "Content-Type": "text/html",
      "Content-Length": Buffer.byteLength(html),
    });

    res.end(html);
  }

  /**
   * Set CORS headers for development
   */
  setCorsHeaders(res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS",
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, Accept",
    );
  }

  /**
   * Check if request accepts a specific content type
   */
  acceptsContentType(req, contentType) {
    const accept = req.headers.accept || "*/*";
    return accept.includes(contentType) || accept.includes("*/*");
  }

  /**
   * Log message if verbose mode is enabled
   */
  log(message) {
    if (this.verbose) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ${message}`);
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};

  // Parse options
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--port":
        options.port = parseInt(args[++i]);
        break;
      case "--host":
        options.host = args[++i];
        break;
      case "--root-dir":
        options.rootDir = args[++i];
        break;
      case "--verbose":
        options.verbose = true;
        break;
      case "--help":
        console.log(`
SVC Development Server

Usage: node dev-server.js [options]

Options:
  --port <number>        Port to listen on (default: 3000)
  --host <string>        Host to bind to (default: localhost)
  --root-dir <path>      Root directory to serve (default: ./generated)
  --verbose              Enable verbose logging
  --help                 Show this help message

Examples:
  node dev-server.js                           # Start with defaults
  node dev-server.js --port 8080 --verbose    # Custom port with logging
  node dev-server.js --root-dir ./dist        # Custom root directory

Content Negotiation:
  The server automatically serves JSON or HTML based on the Accept header:
  - API clients (Accept: application/json) get JSON
  - Browsers (Accept: text/html) get HTML
  - URLs ending in .json or .html are served directly
                `);
        process.exit(0);
    }
  }

  const server = new SVCDevServer(options);
  server.start();

  // Graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n👋 Shutting down SVC Development Server...");
    process.exit(0);
  });
}

module.exports = SVCDevServer;
