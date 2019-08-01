##!/usr/bin/env bash

if [ -z "$(command -v yarn)" ]; then
  echo "You need yarn to run this file. Please make sure to install it."
  exit 1 # Exit with general error
fi

# First switch to the correct working directory, regardless
# of where this script was called from.
cd "$(dirname "$0")" # Now we're in /scripts
cd ".." # Now we're in /Zettlr

# Next, simply run everything in order

echo "Making a full Zettlr release."
echo ""
echo "This script will run the following commands in order:"
echo ""
echo "    1. Re-compile the LESS files to the final CSS"
echo "    2. Re-compile the Handlebars templates"
echo "    3. Re-compile the revealJS templates"
echo "    4. Download the built-in language files"
echo "    5. Compile Zettlr for Windows"
echo "    6. Compile Zettlr for macOS"
echo "    7. Compile Zettlr for Debian and Fedora"
echo "    8. Generate SHA 256 checksums"
echo "    9. Check the correctness of the checksums"
echo ""
echo ""

# First we need the version number. We will
# use the get-pkg-version helper, which simply
# logs the version field from package.json
# to the console.
pkgver=$(node ./scripts/get-pkg-version.js)
echo "Package version is: $pkgver"
echo ""

read -p "Press enter to continue (Ctrl+C to abort)"

echo ""

# Rebuild Stylesheets
yarn less

# Rebuild Templates
yarn handlebars

# Rebuild revealJS
yarn reveal:build

# fetch the most recent translations
yarn lang:refresh

# Build NSIS EXE installer
yarn release:win

# Build DMG installer
yarn release:mac

# Build .deb + .rpm
yarn release:linux

# Switch working directory to the release folder.
cd ./release

# Generate the checksums
echo "Generating SHA 256 checksums for all installers ..."
shasum -a 256 "Zettlr-win32-x64-$pkgver.exe" > "SHA256SUMS.txt"
shasum -a 256 "Zettlr-macos-x64-$pkgver.dmg" >> "SHA256SUMS.txt"
shasum -a 256 "Zettlr-linux-x64-$pkgver.deb" >> "SHA256SUMS.txt"
shasum -a 256 "Zettlr-linux-x64-$pkgver.rpm" >> "SHA256SUMS.txt"

echo ""

# Test the checksums
echo "Testing the checksums ..."
shasum -a 256 -c SHA256SUMS.txt

echo ""
echo "Done."
