#!/usr/bin/env -S deno run --allow-run --allow-read --allow-write --allow-env

// Build script for Oden
// Usage: deno run --allow-run --allow-read --allow-write --allow-env build/build.js [platform]
// Where platform is one of: linux, mac, windows, all

import { parse } from "https://deno.land/std/flags/mod.ts";
import { join, dirname } from "https://deno.land/std/path/mod.ts";
import { ensureDir } from "https://deno.land/std/fs/mod.ts";

// Platform configurations
const platforms = {
  linux: {
    target: "x86_64-unknown-linux-gnu",
    outputName: "oden-{version}-linux-x86_64",
    platformName: "linux"
  },
  mac: {
    target: "x86_64-apple-darwin",
    outputName: "oden-{version}-macos-x86_64",
    platformName: "macos"
  },
  windows: {
    target: "x86_64-pc-windows-msvc",
    outputName: "oden-{version}-windows-x86_64.exe",
    platformName: "windows"
  }
};

// Get the script directory
const scriptDir = dirname(new URL(import.meta.url).pathname);
const projectRoot = join(scriptDir, "..");

// Parse command line arguments
const args = parse(Deno.args);
const requestedPlatform = args._[0]?.toString().toLowerCase() || "all";

if (!["linux", "mac", "windows", "all"].includes(requestedPlatform)) {
  console.error("Invalid platform specified.");
  console.log("Usage: deno run --allow-run --allow-read --allow-write --allow-env build/build.js [platform]");
  console.log("Where platform is one of: linux, mac, windows, all");
  Deno.exit(1);
}

// Main function
async function main() {
  const version = await getVersion();
  console.log(`🏗️  Building Oden v${version}`);

  // Create version directory in releases
  const versionDir = `v${version}`;
  const releasesDir = join(projectRoot, "releases", versionDir);
  await ensureDir(releasesDir);

  const platformsToBuild = requestedPlatform === "all" 
    ? Object.keys(platforms) 
    : [requestedPlatform];

  // Build for each requested platform
  for (const platform of platformsToBuild) {
    await buildForPlatform(platform, version, releasesDir);
  }

  console.log("✅ Build complete!");
}

// Build for a specific platform
async function buildForPlatform(platform, version, releasesDir) {
  const config = platforms[platform];
  console.log(`\n🔨 Building for ${platform}...`);
  
  // Replace version in output name
  const outputName = config.outputName.replace("{version}", version);
  const outputPath = join(releasesDir, outputName);
  
  // Compile the application
  const command = new Deno.Command("deno", {
    args: [
      "compile",
      "--target", config.target,
      "--allow-net",
      "--allow-read",
      "--allow-write",
      "--allow-run",
      "--allow-env",
      "-o", outputPath,
      join(projectRoot, "main.js")
    ],
    stdout: "inherit",
    stderr: "inherit"
  });

  const { code } = await command.output();
  
  if (code === 0) {
    console.log(`✅ Successfully built for ${platform}: ${outputPath}`);
  } else {
    console.error(`❌ Failed to build for ${platform}`);
    Deno.exit(1);
  }
}

// Get version from constants.js
async function getVersion() {
  try {
    const constantsPath = join(projectRoot, "core", "constants.js");
    const text = await Deno.readTextFile(constantsPath);
    const versionMatch = text.match(/export const VERSION = ["'](.+)["']/);
    return versionMatch ? versionMatch[1] : "unknown";
  } catch (error) {
    console.warn("Warning: Could not determine version from constants.js");
    return "unknown";
  }
}

// Run the main function
if (import.meta.main) {
  main();
}