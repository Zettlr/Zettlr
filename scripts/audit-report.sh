#!/usr/bin/env bash
# Formats yarn audit output and reports results to Discord and/or GHA summary.
# Usage: ./scripts/audit-report.sh format|discord|summary
set -euo pipefail

cd "$(dirname "$0")/.."

AUDIT_JSON=audit_result.json
AUDIT_FILE=audit_result.txt

load_audit_content() {
  AUDIT_CONTENT=$(<"$AUDIT_FILE")
  AUDIT_CHARS=${#AUDIT_CONTENT}
  AUDIT_COUNT=$(jq length "$AUDIT_JSON")
}

# NOTE: The jq filter below condenses the most important info into a human-readable
# txt file. This is merely meant as a canary; maintainers should run the audit
# locally once informed to get all information if necessary.
format_results() {
  jq --slurp '.' "$AUDIT_JSON" > tmp.json
  mv tmp.json "$AUDIT_JSON"
  jq -r '.[] | .value as $v | .children += { package: $v } | .children | ("Package: \(.package)", "  Version(s) \(."Vulnerable Versions")", "  \(.Issue) (Severity: \(.Severity))", "  URL: \(.URL)")' "$AUDIT_JSON" > "$AUDIT_FILE"
}

report_discord() {
  WEBHOOK="${WEBHOOK:?WEBHOOK is required}"
  RUN_URL="${RUN_URL:?RUN_URL is required}"
  load_audit_content
  curl -d "$(cat <<EOF | jq -Rs '{content: .}'
## Repository Audit Results

A new audit has been run against Zettlr’s \`yarn.lock\` file. This happens automatically if dependencies have changed, or if a maintainer has manually requested an audit. There have been **${AUDIT_COUNT} results**.

For the full results (${AUDIT_CHARS} characters), please see the summary of the run: ${RUN_URL}.

**Disclaimer**: Many results are not relevant for the app’s security, and the pure number of results cannot be used to infer whether there exists a security risk for Zettlr and its users. The maintainers are able to infer whether a result indicates a critical issue that needs fixing.
EOF
)" -H "Content-Type: application/json" -X POST "$WEBHOOK"
}

report_summary() {
  load_audit_content
  {
    cat <<EOF
## Full Audit results

Below follow the full results from the audit report (${AUDIT_CHARS} characters).

~~~
EOF
    cat "$AUDIT_FILE"
    cat <<EOF
~~~

End of audit.
EOF
  } >> "${GITHUB_STEP_SUMMARY:-/dev/stdout}"
}

case "${1:-}" in
  format) format_results ;;
  discord) report_discord ;;
  summary) report_summary ;;
  *)
    echo "Usage: $0 format|discord|summary" >&2
    exit 1
    ;;
esac
