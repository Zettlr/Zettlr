#!/bin/zsh

# This script updates Zettlr's APT repository. It uses a "shallow" repository
# style which puts all files at a single directory level. This way, the
# repository can be added to Debian and Ubuntu installs with a line such as:
# deb [signed-by=/etc/apt/trusted.gpg.d/zettlr_ppa.gpg] https://ppa.zettlr.com ./

# REQUIRED ENVIRONMENT VARIABLES
#
# Set the following environment variables:
#
# $TARGET_DIR : Where the APT is located (e.g., /var/www/apt)
# $REPO       : The GitHub repository in user/repo syntax (e.g., Zettlr/Zettlr)
# $KEY_USER   : The user for the key used to sign the files (GPG wants a user,
#               not the key itself, e.g., the email-address for the key)

# Before we do anything, switch to the correct folder.
cd $TARGET_DIR
echo "Starting APT Repository Update."
echo ""
# Some debug output, just in case
echo "Working Directory: $TARGET_DIR"
echo "Using Repo:        $REPO"
echo "Using Key User:    $KEY_USER"
echo ""

# First, retrieve the newest releases, and extract only the assets which end
# with *.deb, and from those only the browser_download_url
# cf. https://docs.github.com/en/rest/releases/releases?apiVersion=2022-11-28#list-releases
DOWNLOAD_URLS=("$(curl https://api.github.com/repos/$REPO/releases | jq -r '.[].assets | .[]|select(.name|endswith(".deb")).browser_download_url')")

# Then, for each download URL, do:
# 1. Does this file already exist?
# 2. If not, download it
DOWNLOADED_FILES=0

echo "$DOWNLOAD_URLS" |
while read -r line
do
  NAME=$(basename  $line)
  if ! test -f $NAME
  then
    echo "Downloading file $NAME..."
    wget $line > /dev/null
    echo "File downloaded."
    DOWNLOADED_FILES=$((DOWNLOADED_FILES+1))
  else
    echo "Skipping existing file $NAME."
  fi
done

echo ""
echo "Download complete. Downloaded $DOWNLOADED_FILES new files."

# Now, we can update all the files as necessary to update the repository.

# Packages & Packages.gz
echo "Generating Packages and Packages.gz"
dpkg-scanpackages --multiversion . > Packages
gzip -k -f Packages

# Release, Release.gpg & InRelease
echo "Generating Release, Release.gpg, and InRelease"
apt-ftparchive release . > Release
# NOTE: The `- In-file > Out-file` construction is needed to prevent GPG to
# interactively complain if the file already exists.
gpg --default-key $KEY_USER -abs -o - Release > Release.gpg
gpg --default-key $KEY_USER --clearsign -o - Release > InRelease

echo ""
echo "Repository Update complete."
