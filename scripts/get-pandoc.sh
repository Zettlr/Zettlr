#!/usr/bin/env bash

# This script downloads and extracts the pandoc releases. This script needs
# to be updated in order to ship newer versions. The versions are hardcoded here
# because this gives us more control over the built-in pandoc binary.

# Retrieve the versions from https://github.com/jgm/pandoc/releases/latest
VERSION="2.18"

BASE_PATH="https://github.com/jgm/pandoc/releases/download/$VERSION"

PANDOC_LINUX_X64="$BASE_PATH/pandoc-$VERSION-linux-amd64.tar.gz"
PANDOC_LINUX_ARM="$BASE_PATH/pandoc-$VERSION-linux-arm64.tar.gz"
PANDOC_WIN32_X64="$BASE_PATH/pandoc-$VERSION-windows-x86_64.zip"
PANDOC_MACOS_X64="$BASE_PATH/pandoc-$VERSION-macOS.zip"

# Prepare our global variables
PLATFORM="$1"
ARCH="$2"
RELEASE=""

# Now check the arguments. This script requires one parameter, and takes an
# optional second one. Also make sure to check the required one
if [ "$#" -eq 0 ] || ([ "$PLATFORM" != "darwin" ] && [ "$PLATFORM" != "win32" ] && [ "$PLATFORM" != "linux" ])
then
    # Print out usage information
    echo "Pandoc retrieval script"
    echo ""
    echo "This script can download Pandoc directly from GitHub for all supported operating systems."
    echo ""
    echo "USAGE:"
    echo "    ./get-pandoc.sh linux|darwin|win32 x64|arm"
    echo ""
    echo "    The first parameter (the platform) is required."
    echo "    The second parameter (the architecture) defaults to x64, if not provided."
    exit
fi

# This script now makes use of output redirection. In general, these are numbers:
# 0: stdin | 1: stdout | 2: stderr
#
# General syntax: "from">"to"
# So to redirect output to files, we can append 1> log or 2> error.log to a command
#
# To redirect output in between the streams, we basically need to "point" to
# the desired target, e.g. 1>&2 (stdout to stderr) or 2>&1 (stderr to stdout).
#
# To suppress output, simply redirect to /dev/null, e.g. 1> /dev/null
# (Note the space after the >, which is required for file NAMES instead of numbers)
#
# For a good explanation of redirection rules: https://linuxize.com/post/bash-redirect-stderr-stdout/

if [ "$ARCH" != "x64" ] && [ "$ARCH" != "arm" ]
then
    # If no (or a non-existing) architecture is given, assume x64
    if [ "$ARCH" != "" ]
    then
        # Give out a warning
        echo "WARNING: Unknown architecture: $ARCH. Falling back to x64"
    fi
    ARCH="x64"
fi

if [ "$PLATFORM" == "darwin" ] && [ "$ARCH" == "arm" ]
then
    # There's no ARM Pandoc. However, x64 Pandoc binaries work well on macOS ARM
    # due to the existence of Rosetta. So we can safely take that one.
    echo "Currently there is no ARM-release for macOS. Falling back to x64 ..."
    ARCH="x64" # In case we're at some point referring to ARCH again.
    RELEASE="$PANDOC_MACOS_X64"
elif [ "$PLATFORM" == "darwin" ] && [ "$ARCH" == "x64" ]
then
    RELEASE="$PANDOC_MACOS_X64"
elif [ "$PLATFORM" == "linux" ] && [ "$ARCH" == "arm" ]
then
    RELEASE="$PANDOC_LINUX_ARM"
elif [ "$PLATFORM" == "linux" ] && [ "$ARCH" == "x64" ]
then
    RELEASE="$PANDOC_LINUX_X64"
elif [ "$PLATFORM" == "win32" ] && [ "$ARCH" == "arm" ]
then
    echo "Currently there is no ARM-release for Windows. Aborting." 1>&2 # Redirect echo's stdout to stderr
    exit
elif [ "$PLATFORM" == "win32" ] && [ "$ARCH" == "x64" ]
then
  RELEASE="$PANDOC_WIN32_X64"
fi

# First, cd into the resources directory
cd "$(dirname "$0")"
cd ../resources

echo "Working directory is $(pwd)"

# Retrieve only the basename of the full path
BASENAME="${RELEASE##*/}"
echo "Downloading: $BASENAME ..."
curl -sL "$RELEASE" -o "$BASENAME" # Download to current working dir
echo "Extracting ..."

# Now we need to extract it and handle it appropriately
if [ "$PLATFORM" == "darwin" ]
then
    # macOS builds are a zip file where the binary is in ./bin
    unzip -qq $BASENAME # -qq makes unzip quiet
    EXTRACTEDFOLDER="$(unzip -Z -1 $BASENAME | head -1)"
    echo "Extracted to: $EXTRACTEDFOLDER"
    echo "Moving binary from ./bin/pandoc to resources directory ..."
    # Now move the binary
    cd $EXTRACTEDFOLDER
    mv ./bin/pandoc ../pandoc-darwin-$ARCH
    cd ..
elif [ "$PLATFORM" == "linux" ]
then
    # Linux builds are a tar.gz file where the binary is in ./bin
    tar -xzf $BASENAME
    EXTRACTEDFOLDER="$(tar -tf $BASENAME | head -1)"
    echo "Extracted to: $EXTRACTEDFOLDER"
    echo "Moving binary from ./bin/pandoc to resources directory ..."
    cd $EXTRACTEDFOLDER
    mv ./bin/pandoc ../pandoc-linux-$ARCH
    cd ..
elif [ "$PLATFORM" == "win32" ]
then
    # Windows builds are a zip file where the binary is in .
    unzip -qq $BASENAME # -qq makes unzip quiet
    EXTRACTEDFOLDER="$(unzip -Z -1 $BASENAME | head -1)"
    echo "Extracted to: $EXTRACTEDFOLDER"
    cd $EXTRACTEDFOLDER
    echo "Moving binary from ./ to resources directory ..."
    mv ./pandoc.exe ../pandoc-win32-$ARCH.exe
    cd ..
fi

# Cleanup
echo "Cleaning up ..."
rm -rf $BASENAME $EXTRACTEDFOLDER
echo "Successfully downloaded Pandoc for $PLATFORM/$ARCH!"
