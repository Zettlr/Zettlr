# First, cd into the root directory
cd "$(dirname "$0")"
cd ..

# Then, because xgettext cannot extract information from Vue Single File
# Components, we have to manually extract the script contents of these files
# beforehand. Since I'm super bad at awk and sed, I'm using a Node script for
# that. NOTE: It will output into ./source/tmp
node ./scripts/split-vue-sfc.js

# Extract all messages from any JS and TS file within source into the template
# file static/i18n.pot. (NOTE: this includes the previously transformed SFCs.)
FILES=$(find ./source -type f -name "*.ts" -o -name "*.js")
PKGVER=$(node ./scripts/get-pkg-version.js)

# NOTE: This command expects an existing file at static/i18n.pot!
xgettext --language=JavaScript --keyword=trans --join-existing \
  --package-name=Zettlr --package-version=$PKGVER \
  --msgid-bugs-address=https://github.com/Zettlr/Zettlr/issues \
  --copyright-holder="Hendrik Erz <info@zettlr.com>" \
  --sort-output \
  --add-comments \
  --from-code utf-8 \
  -o static/i18n.pot \
  $FILES

# Afterwards, remove that tmp dir again that the Vue splitter has created
rm -rf ./source/tmp
