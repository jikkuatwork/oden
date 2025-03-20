# Oden - Deno Web Server CLI

A simple, cross-platform CLI tool built with Deno that serves web content and can run as a daemon.

## Features

- Serve static web content from a bundled directory
- Run as a daemon or in the foreground
- Automatic port selection if the default port is unavailable
- Cross-platform support (Windows, macOS, Linux)

## Installation

### Prerequisites

- [Deno](https://deno.land/) installed on your system

### Building the Executable

```bash
# Clone the repository
git clone https://github.com/yourusername/oden.git
cd oden

# Compile to a standalone binary
deno compile --allow-net --allow-read --allow-write --allow-run --allow-env -o executable/oden main.js
```

This will create an executable named `oden` (or `oden.exe` on Windows) in your current directory.

## Usage

```
oden - A simple Deno CLI for serving web content

USAGE:
  oden [COMMAND]

COMMANDS:
  start       Start the server as a daemon
  server      Start the web server in the foreground (PORT 7423 by default)
  status      Show the status of the daemon
  stop        Stop the running daemon
  help        Show this help message

EXAMPLES:
  oden start
  oden server
  oden server --port 8000
  oden status
  oden stop
```

## Static Content

Place your web files in the `static` directory before compiling. The directory structure should be:

```
static/
├── index.html
├── style.css
└── script.js
```

## Compiling for Different Platforms

Deno can compile for different target platforms:

```bash
# For Windows
deno compile --target x86_64-pc-windows-msvc --allow-net --allow-read --allow-write --allow-run --allow-env -o oden.exe main.js

# For macOS
deno compile --target x86_64-apple-darwin --allow-net --allow-read --allow-write --allow-run --allow-env -o oden main.js

# For Linux
deno compile --target x86_64-unknown-linux-gnu --allow-net --allow-read --allow-write --allow-run --allow-env -o oden main.js
```

## License

MIT
