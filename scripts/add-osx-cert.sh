#!/usr/bin/env sh

# This script takes the macOS code sign certificate from the secret env
# variable, saves it on the runner, and finally adds it to the keychain
# so that electron-forge can access it to sign the built app.

# Original source of this script:
# https://dev.to/rwwagner90/signing-electron-apps-with-github-actions-4cof

# According to https://github.com/actions/virtual-environments/issues/1820,
# the command must be in a different (here: temp) directory, since apparently
# there's a modal popping up if we attempt to codesign anything.
# KEY_CHAIN=build.keychain
KEYCHAIN_PATH=$RUNNER_TEMP/build.keychain
CERT_FILE=certificate.p12

# Recreate the certificate from the secure environment variable
echo "$MACOS_CERT" | base64 --decode > $CERT_FILE

# Create a new keychain using the password "actions"
security create-keychain -p actions $KEYCHAIN_PATH

# Make the keychain the default so that electron-forge finds it
security default-keychain -s $KEYCHAIN_PATH

# Unlock the keychain using the previously chosen, very secure password
security unlock-keychain -p actions $KEYCHAIN_PATH

# The next line comes from https://github.com/MarshallOfSound/Google-Play-Music-Desktop-Player-UNOFFICIAL-/blob/master/sig/import.sh
# Set keychain locking timeout to 3600 seconds
security set-keychain-settings -t 3600 -u $KEYCHAIN_PATH

# Import our certificate into the (now default) created keychain and also allow
# the codesign binary to access said certificate.
security import $CERT_FILE -k $KEYCHAIN_PATH -P "$MACOS_CERT_PASS" -T /usr/bin/codesign;

# Add keychain to keychain-list (also from MarshallOfSound repo)
security list-keychains -s $KEYCHAIN_PATH

# Since macOS Sierra, the following command is necessary.
# Further information: https://stackoverflow.com/a/40039594
security set-key-partition-list -S apple-tool:,apple: -s -k actions $KEYCHAIN_PATH

# Remove the certificate file again
rm -f $CERT_FILE
