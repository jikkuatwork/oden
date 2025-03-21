{ lib, stdenv, fetchurl }:

let
  version = "0.3.0";
  
  # Define platform-specific settings
  platformMap = {
    x86_64-linux = {
      system = "linux-x86_64";
      sha256 = "0000000000000000000000000000000000000000000000000000"; # Replace with actual hash after build
    };
    x86_64-darwin = {
      system = "macos-x86_64";
      sha256 = "0000000000000000000000000000000000000000000000000000"; # Replace with actual hash after build
    };
    aarch64-darwin = {
      system = "macos-arm64";
      sha256 = "0000000000000000000000000000000000000000000000000000"; # Replace with actual hash after build
    };
    x86_64-windows = {
      system = "windows-x86_64";
      sha256 = "0000000000000000000000000000000000000000000000000000"; # Replace with actual hash after build
      extension = ".exe";
    };
  };

  # Get current system or throw error
  currentSystem = platformMap.${stdenv.hostPlatform.system} or (throw "Unsupported system: ${stdenv.hostPlatform.system}");
  
  # Get extension for the platform (empty string for Unix, .exe for Windows)
  extension = currentSystem.extension or "";
in

stdenv.mkDerivation {
  pname = "oden";
  inherit version;
  
  src = fetchurl {
    url = "https://github.com/yourusername/oden/releases/download/v${version}/oden-${version}-${currentSystem.system}${extension}";
    sha256 = currentSystem.sha256;
  };
  
  # Unpack phase is not needed for binary-only packages
  dontUnpack = true;
  
  # Skip unnecessary phases
  dontConfigure = true;
  dontBuild = true;
  
  # Installation phase
  installPhase = ''
    mkdir -p $out/bin
    cp $src $out/bin/oden${extension}
    chmod +x $out/bin/oden${extension}
  '';
  
  meta = with lib; {
    description = "A simple, cross-platform CLI tool built with Deno that serves web content";
    homepage = "https://github.com/yourusername/oden";
    license = licenses.mit;
    maintainers = with maintainers; [ /* add your name here */ ];
    platforms = builtins.attrNames platformMap;
    mainProgram = "oden";
  };
}