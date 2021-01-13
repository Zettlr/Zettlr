#!/usr/bin/env bash

# This script downloads and extracts the pandoc releases. This script needs
# to be updated in order to ship newer versions. The versions are hardcoded here
# because this gives us more control over the built-in pandoc binary.

# Retrieve the versions from https://github.com/jgm/pandoc/releases/latest
PANDOC_LINUX="https://github.com/jgm/pandoc/releases/download/2.11.3.2/pandoc-2.11.3.2-linux-amd64.tar.gz"
PANDOC_WIN32="https://github.com/jgm/pandoc/releases/download/2.11.3.2/pandoc-2.11.3.2-windows-x86_64.zip"
PANDOC_MACOS="https://github.com/jgm/pandoc/releases/download/2.11.3.2/pandoc-2.11.3.2-macOS.zip"

PLATFORM="$1"
RELEASE=""

if [ "$PLATFORM" == "darwin" ]
then
    RELEASE="$PANDOC_MACOS"
elif [ "$PLATFORM" == "linux" ]
then
    RELEASE="$PANDOC_LINUX"
elif [ "$PLATFORM" == "win32" ]
then
  RELEASE="$PANDOC_WIN32"
fi

if [ "$RELEASE" == "" ]
then
  echo "No release given! Please provide a release: linux, win32, darwin"
  exit
fi

# First, cd into the resources directory
cd "$(dirname "$0")"
cd ../resources

echo "Working directory is $(pwd)"

# Retrieve only the basename of the full path
BASENAME="${RELEASE##*/}"
echo "Downloading: $BASENAME"
curl -L $RELEASE -o $BASENAME # Download to current working dir

# Now we need to extract it and handle it appropriately
if [ "$PLATFORM" == "darwin" ]
then
    # macOS builds are a zip file where the binary is in ./bin
    unzip $BASENAME
    EXTRACTEDFOLDER="$(unzip -Z -1 $BASENAME | head -1)"
    echo "Extracted to: $EXTRACTEDFOLDER"
    # Now move the binary
    cd $EXTRACTEDFOLDER
    mv ./bin/pandoc ../
    cd ..
elif [ "$PLATFORM" == "linux" ]
then
    # Linux builds are a tar.gz file where the binary is in ./bin
    tar -xzf $BASENAME
    EXTRACTEDFOLDER="$(tar -tf $BASENAME | head -1)"
    cd $EXTRACTEDFOLDER
    mv ./bin/pandoc ../
    cd ..
elif [ "$PLATFORM" == "win32" ]
then
    # Windows builds are a zip file where the binary is in .
    unzip $BASENAME
    EXTRACTEDFOLDER="$(unzip -Z -1 $BASENAME | head -1)"
    echo "Extracted to: $EXTRACTEDFOLDER"
    cd $EXTRACTEDFOLDER
    mv ./pandoc.exe ../
    cd ..
fi

# Cleanup
rm -rf $BASENAME $EXTRACTEDFOLDER
echo "Successfully downloaded Pandoc into ./resources!"
