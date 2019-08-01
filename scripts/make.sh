##!/usr/bin/env bash

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
echo "    3. Download the built-in language files"
echo "    4. Compile Zettlr for Windows"
echo "    5. Compile Zettlr for macOS"
echo "    6. Compile Zettlr for Debian and Fedora"
echo "    7. Generate SHA 256 checksums"
echo "    8. Check the correctness of the checksums"
echo ""
echo ""

# First we need the version number. We will
# use the get-pkg-version helper, which simply
# logs the version field from package.json
# to the console.
pkgver=$(node ./scripts/get-pkg-version.js)
echo "Package version is: $pkgver"
echo ""

# Rebuild Stylesheets
yarn less

# Rebuild Templates
yarn handlebars

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
