# PowerShell installer script for Oden on Windows
# Run with: iwr -useb https://your-domain.com/install.ps1 | iex

# Configuration
$GithubUser = "yourusername"
$RepoName = "oden"
$InstallDir = "$env:LOCALAPPDATA\Oden"
$Version = "latest" # Can be set to specific version like "v0.3.0"

# Create function to show colored output
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

# Welcome message
Write-ColorOutput Blue "Installing Oden for Windows..."

# Create temp directory
$TempDir = Join-Path $env:TEMP "oden-installer"
if (Test-Path $TempDir) {
    Remove-Item -Recurse -Force $TempDir
}
New-Item -ItemType Directory -Path $TempDir | Out-Null

# Clean up on exit
trap {
    if (Test-Path $TempDir) {
        Remove-Item -Recurse -Force $TempDir
    }
    break
}

# Function to get latest release
function Get-LatestVersion {
    if ($Version -eq "latest") {
        Write-ColorOutput Blue "Fetching latest release..."
        try {
            $LatestRelease = Invoke-RestMethod -Uri "https://api.github.com/repos/$GithubUser/$RepoName/releases/latest"
            $Version = $LatestRelease.tag_name
            if (-not $Version) {
                throw "Failed to get version"
            }
            Write-ColorOutput Green "Latest version is $Version"
            return $Version
        }
        catch {
            Write-ColorOutput Red "Failed to fetch latest version: $_"
            exit 1
        }
    }
    return $Version
}

# Function to download the binary
function Download-Binary {
    $AssetName = "oden-$($Version.TrimStart('v'))-windows-x86_64.exe"
    $Url = "https://github.com/$GithubUser/$RepoName/releases/download/$Version/$AssetName"
    
    Write-ColorOutput Blue "Downloading from: $Url"
    
    try {
        $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri $Url -OutFile "$TempDir\oden.exe"
        $ProgressPreference = 'Continue'
    }
    catch {
        Write-ColorOutput Red "Failed to download binary: $_"
        exit 1
    }
}

# Function to install the binary
function Install-Binary {
    Write-ColorOutput Blue "Installing to $InstallDir..."
    
    # Create installation directory if it doesn't exist
    if (-not (Test-Path $InstallDir)) {
        New-Item -ItemType Directory -Path $InstallDir | Out-Null
    }
    
    # Copy executable
    try {
        Copy-Item "$TempDir\oden.exe" "$InstallDir\oden.exe" -Force
    }
    catch {
        Write-ColorOutput Red "Failed to install binary: $_"
        exit 1
    }
    
    # Add to PATH if not already there
    $EnvPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if (-not $EnvPath.Contains($InstallDir)) {
        Write-ColorOutput Blue "Adding to PATH..."
        [Environment]::SetEnvironmentVariable("Path", "$EnvPath;$InstallDir", "User")
    }
    
    # Verify installation
    if (Test-Path "$InstallDir\oden.exe") {
        Write-ColorOutput Green "Installation successful!"
        Write-ColorOutput Blue "Oden has been installed to: $InstallDir\oden.exe"
    }
    else {
        Write-ColorOutput Red "Installation failed."
        exit 1
    }
}

# Main execution flow
$Version = Get-LatestVersion
Download-Binary
Install-Binary

Write-ColorOutput Green "Oden is now installed!"
Write-ColorOutput Blue "Run 'oden help' to get started."
Write-ColorOutput Yellow "Note: You may need to restart your terminal or use a new terminal for the PATH changes to take effect."