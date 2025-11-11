#!/bin/bash
# Script to update an existing release with new binaries
# Usage: ./scripts/update-release.sh <tag-name> [remote] [-y]
#
# This script:
# 1. Pushes current branch commits
# 2. Force-moves the specified tag to current HEAD
# 3. Triggers GitHub Actions to rebuild and update release binaries

set -e  # Exit on error

# Parse arguments
TAG_NAME=""
REMOTE="fork"
SKIP_CONFIRM=false

while [[ $# -gt 0 ]]; do
  case $1 in
    -y|--yes)
      SKIP_CONFIRM=true
      shift
      ;;
    *)
      if [ -z "$TAG_NAME" ]; then
        TAG_NAME="$1"
      else
        REMOTE="$1"
      fi
      shift
      ;;
  esac
done

# Check if tag name is provided
if [ -z "$TAG_NAME" ]; then
  echo "Error: Tag name required"
  echo "Usage: ./scripts/update-release.sh <tag-name> [remote] [-y]"
  echo "Example: ./scripts/update-release.sh v3.6.0-arabic-beta1"
  echo "Example: ./scripts/update-release.sh v3.6.0-arabic-beta1 origin -y"
  exit 1
fi

BRANCH=$(git branch --show-current)

echo "======================================"
echo "Update Release Script"
echo "======================================"
echo "Tag:    $TAG_NAME"
echo "Remote: $REMOTE"
echo "Branch: $BRANCH"
echo "======================================"
echo ""

# Confirm with user unless -y flag is set
if [ "$SKIP_CONFIRM" = false ]; then
  read -p "This will force-push the tag '$TAG_NAME' to '$REMOTE'. Continue? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
  fi
fi

echo ""
echo "Step 1/3: Pushing branch commits to $REMOTE/$BRANCH..."
git push "$REMOTE" "$BRANCH"

echo ""
echo "Step 2/3: Force-moving tag $TAG_NAME to current HEAD..."
git tag -f "$TAG_NAME"

echo ""
echo "Step 3/3: Force-pushing tag to trigger workflow..."
git push "$REMOTE" "$TAG_NAME" --force

echo ""
echo "✅ Done!"
echo ""
echo "The GitHub Actions workflow has been triggered."
echo "Monitor progress with:"
echo "  gh run list --repo diraneyya/Zettlr-Arabic --workflow=build-arabic.yml"
echo ""
echo "Or view in browser:"
echo "  https://github.com/diraneyya/Zettlr-Arabic/actions"
