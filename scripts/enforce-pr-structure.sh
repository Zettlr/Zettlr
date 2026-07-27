#!/bin/bash

# Ensure jq is installed
sudo apt-get install jq

# Fetch PR description from the event.json file
PR_DESCRIPTION=$(jq -r ".pull_request.body" "$GITHUB_EVENT_PATH")

# Now let's enforce its structure. First, check for the tag.
TEMPLATE_TAG="sTCF6g8X80A="
DESCRIPTION_HEADING="## Description"
CHANGES_HEADING="## Changes"
TESTED_HEADING="## Tested on"
MISC_HEADING="## Additional information"
DISCLOSURE_HEADING="## AI Disclosure Statement"
DECLARATIONS_HEADING="## Declarations"

# Check for the required keyword in the PR description
if [[ $PR_DESCRIPTION != *"$TEMPLATE_TAG"* ]]; then
  echo "PR description does not contain the template tag. This indicates that the template has not been used."
  exit 1
fi

# Next, let's check for the required headings
if [[ $PR_DESCRIPTION != *"$DESCRIPTION_HEADING"* ]]; then
  echo "PR description does not contain required description section."
  exit 1
fi

if [[ $PR_DESCRIPTION != *"$CHANGES_HEADING"* ]]; then
  echo "PR description does not contain required changes section."
  exit 1
fi

if [[ $PR_DESCRIPTION != *"$TESTED_HEADING"* ]]; then
  echo "PR description does not contain required test section."
  exit 1
fi

if [[ $PR_DESCRIPTION != *"$MISC_HEADING"* ]]; then
  echo "PR description does not contain required miscellaneous section."
  exit 1
fi

if [[ $PR_DESCRIPTION != *"$DISCLOSURE_HEADING"* ]]; then
  echo "PR description does not contain required AI disclosure statement."
  exit 1
fi

if [[ $PR_DESCRIPTION != *"$DECLARATIONS_HEADING"* ]]; then
  echo "PR description does not contain required declarations."
  exit 1
fi

echo "The provided PR description fulfills the requirements."
