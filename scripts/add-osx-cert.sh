#!/usr/bin/env sh

# This script takes the macOS code sign certificate from the secret env
# variable, saves it on the runner, and finally adds it to the keychain
# so that electron-forge can access it to sign the built app.

# Original source of this script:
# https://dev.to/rwwagner90/signing-electron-apps-with-github-actions-4cof

KEY_CHAIN=build.keychain
CERT_FILE=certificate.p12

# Recreate the certificate from the secure environment variable
echo "$MACOS_CERT" | base64 --decode > $CERT_FILE

# Create a new keychain using the password "actions"
security create-keychain -p actions $KEY_CHAIN

# Make the keychain the default so that electron-forge finds it
security default-keychain -s $KEY_CHAIN

# Unlock the keychain using the previously chosen, very secure password
security unlock-keychain -p actions $KEY_CHAIN

# Import our certificate into the (now default) created keychain and also allow
# the codesign binary to access said certificate.
security import $CERT_FILE -k $KEY_CHAIN -P "$MACOS_CERT_PASS" -T /usr/bin/codesign;

# Since macOS Sierra, the following command is necessary.
# Further information: https://stackoverflow.com/a/40039594
security set-key-partition-list -S apple-tool:,apple: -s -k actions $KEY_CHAIN

# Remove the certificate file again
rm -f $CERT_FILE
