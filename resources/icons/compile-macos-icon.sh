#!/usr/bin/env bash

# The following script takes an icon from Icon Composer and compiles it down
# into an `Assets.car`-file for usage with, e.g., Electron apps.

# Suggested workflow with Electron Forge:
#
# 1. Use Icon Composer to create an icon and save it to disk, e.g.,
#    <Your Appname>.icon.
# 2. Invoke this file, adapting paths where necessary, to generate the file
#    Assets.car.
# 3. Provide the path to the Assets.car-file in the property
#    `packagerConfig.extraResource`.
# 4. Provide the PList key `CFBundleIconName` with the value `<Your Appname>` in
#    either your PList file or as a property of an object passed to
#    `packagerConfig.extendInfo`. Note that the property value is the Icon
#    filename sans the `.icon`-extension, since this is what actool uses as a
#    name for the compiled resource, and otherwise macOS will not be able to
#    locate the icon in the Assets.car file.

ICON_PATH="./resources/icons/Zettlr.icon"
OUTPUT_PATH="./resources/icons"
PLIST_PATH="$OUTPUT_PATH/assetcatalog_generated_info.plist"
DEVELOPMENT_REGION="en" # Change if necessary

# Adapted from https://github.com/electron/packager/pull/1806/files
actool $ICON_PATH --compile $OUTPUT_PATH \
  --output-format human-readable-text --notices --warnings --errors \
  --output-partial-info-plist $PLIST_PATH \
  --app-icon Icon --include-all-app-icons \
  --enable-on-demand-resources NO \
  --development-region $DEVELOPMENT_REGION \
  --target-device mac \
  --minimum-deployment-target 26.0 \
  --platform macosx

rm $PLIST_PATH
