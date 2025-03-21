# Oden - Deno Web Server CLI

A simple, cross-platform CLI tool built with Deno that serves web content and can run as a daemon or service.

## Features

- Serve static web content from a bundled directory
- Run as a daemon/service or in the foreground
- Cross-platform support with platform-specific implementations:
  - Linux/Unix: Uses nohup for daemon management
  - macOS: Uses launchd for launch agent configuration
  - Windows: Implements Windows Service (SC or NSSM if available)
- Automatic port selection if the default port is unavailable
- Logging capabilities

## Installation

### Prerequisites

- [Deno](https://deno.land/) installed on your system

### Building From Source

Clone the repository:

```bash
git clone https://github.com/yourusername/oden.git
cd oden
```

#### Building for Specific Platforms

For Unix/Linux/macOS:

```bash
# Make build script executable
chmod +x build.sh

# Build for specific platform
./build.sh linux    # Build for Linux
./build.sh mac      # Build for macOS
./build.sh windows  # Build for Windows
./build.sh          # Build for all platforms (default)
```

For Windows:

```cmd
build.bat linux     # Build for Linux
build.bat mac       # Build for macOS
build.bat windows   # Build for Windows
build.bat           # Build for all platforms (default)
```

This will create executables in the `releases/v{version}/` directory.

## Usage

```
oden - A simple Deno CLI for serving web content

USAGE:
  oden [COMMAND]

COMMANDS:
  start       Start the server as a daemon/service
  server      Start the web server in the foreground (PORT 7423 by default)
  status      Show the status of the daemon/service
  stop        Stop the running daemon/service
  help        Show this help message

EXAMPLES:
  oden start
  oden server
  oden server --port 8000
  oden status
  oden stop
```

### Running as Daemon/Service

#### Linux/Unix

Start the daemon:
```bash
./oden start
```

Check status:
```bash
./oden status
```

Stop the daemon:
```bash
./oden stop
```

#### macOS

The macOS implementation uses launchd to create a launch agent:
```bash
./oden start   # Creates and loads a launchd plist
./oden status  # Checks the status of the launch agent
./oden stop    # Unloads the launch agent
```

#### Windows

The Windows implementation creates a Windows service:
```cmd
oden start    # Creates and starts a Windows service (requires admin)
oden status   # Checks the status of the service
oden stop     # Stops the service (requires admin)
```

Note: Windows service commands require administrator privileges.

### Static Content

Place your web files in the `static` directory before compiling. The directory structure should be:

```
static/
├── index.html
├── style.css
└── script.js
```

If no static content is found, a simple default page will be created.

## Project Structure

```
oden/
├── build/            # Build scripts
├── core/             # Platform-agnostic core functionality
├── platforms/        # Platform-specific implementations
│   ├── unix/         # Linux/Unix implementation
│   ├── windows/      # Windows implementation
│   └── darwin/       # macOS implementation
├── static/           # Static web content
└── releases/         # Compiled executables by version
```

## License

MIT