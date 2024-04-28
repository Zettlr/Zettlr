# This script extracts (new) translatable strings from the source and updates
# all dependent *.po-files.
# Good tutorial: https://www.labri.fr/perso/fleury/posts/programming/a-quick-gettext-tutorial.html

# NOTE: If you would like to create a new file, use the following command from
# the root directory of the repository, replacing 'de-DE' with the corresponding
# language code:
# msginit --input=static/i18n.pot --locale=de-DE --output=static/lang/de-DE.po

# First, cd into the root directory
cd "$(dirname "$0")"
cd ..

# Then, because xgettext cannot extract information from Vue Single File
# Components, we have to manually extract the script contents of these files
# beforehand. Since I'm super bad at awk and sed, I'm using a Node script for
# that. NOTE: It will output into ./source/tmp
echo "Extracting Vue SFC script tags ..."
node ./scripts/split-vue-sfc.js

# Extract all messages from any JS and TS file within source into the template
# file static/i18n.pot. (NOTE: this includes the previously transformed SFCs.)
FILES=$(find ./source -type f -name "*.ts" -o -name "*.js")
PKGVER=$(cat package.json | jq -r '.version')

echo "Current version is $PKGVER"

echo "Running xgettext ..."
xgettext \
  --language=JavaScript \
  --keyword=trans \
  --package-name=Zettlr \
  --package-version=$PKGVER \
  --msgid-bugs-address=https://github.com/Zettlr/Zettlr/issues \
  --copyright-holder="Hendrik Erz <info@zettlr.com>" \
  --add-comments \
  --from-code utf-8 \
  -o static/i18n.pot \
  $FILES

# Afterwards, remove that tmp dir again that the Vue splitter has created
echo "Removing temporary directory with extracted Vue SFC script tags ..."
rm -rf ./source/tmp

# Now, we can create the default translation. Since all our translation strings
# in the Codebase are in en-US, this is the default translation we can create.
echo "Generating reference file for en-US ..."
msgen -o static/lang/en-US.po --lang=en-US static/i18n.pot

# Now, we can update the existing *.po-files.
cd static/lang
for file in *.po; do
    [ -f "$file" ] || break
    echo "Merging new strings to $file ..."

    # First, run msguniq over the file which removes duplicate entries (which
    # would cause msgmerge to fail, see https://www.gnu.org/software/gettext/manual/html_node/msguniq-Invocation.html)
    msguniq $file -o $file

    # NOTE the --backup=off flag, since we're using git-svn to backup old files
    # NOTE the --no-fuzzy-matching flag that prevents inaccurate translations
    msgmerge --update $file --backup=off --no-fuzzy-matching ../i18n.pot
done

echo "Finished generating i18n files!"
