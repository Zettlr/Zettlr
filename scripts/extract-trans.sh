# This script extracts (new) translatable strings from the source and updates
# all dependent *.po-files.
# Good tutorial: https://www.labri.fr/perso/fleury/posts/programming/a-quick-gettext-tutorial.html

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

xgettext \
  --language=JavaScript \
  --keyword=trans \
  --package-name=Zettlr \
  --package-version=$PKGVER \
  --msgid-bugs-address=https://github.com/Zettlr/Zettlr/issues \
  --copyright-holder="Hendrik Erz <info@zettlr.com>" \
  --sort-output \
  --add-comments \
  --from-code utf-8 \
  -o static/i18n.pot \
  $FILES

# Afterwards, remove that tmp dir again that the Vue splitter has created
rm -rf ./source/tmp

# Now, we can update the existing *.po-files.
# msgmerge --update static/lang/de-DE.po static/i18n.pot
# TODO: Add a way to do that with every file

# NOTE: Creating a new file can be done as such:
# msginit --input=static/i18n.pot --locale=de-DE --output=static/lang/de-DE.po
