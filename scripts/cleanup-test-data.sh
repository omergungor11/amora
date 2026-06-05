#!/usr/bin/env bash
#
# Wipe the PUBLIC matching graph from the default Firebase project:
#   profiles/  likes/  matches/(+messages)  reports/
#
# Use ONLY pre-launch to clear accumulated test/dev data. It does NOT touch the
# private users/{uid} subtree. Deletion is IRREVERSIBLE. Uses the firebase-tools
# login already on this machine (no service account needed).
#
# Usage:
#   scripts/cleanup-test-data.sh            # dry preview (lists target + project)
#   scripts/cleanup-test-data.sh --yes      # actually delete
#
set -euo pipefail
cd "$(dirname "$0")/.."

COLLECTIONS=(profiles likes matches reports)

if [ "${1:-}" != "--yes" ]; then
  echo "About to DELETE these collections (recursively):"
  printf '  - %s\n' "${COLLECTIONS[@]}"
  echo
  echo "Target project:"
  npx -y firebase-tools use 2>/dev/null || echo "  (default from .firebaserc)"
  echo
  echo "Private users/{uid} data is NOT touched."
  echo "Re-run to proceed:  scripts/cleanup-test-data.sh --yes"
  exit 1
fi

for col in "${COLLECTIONS[@]}"; do
  echo "→ deleting collection: $col"
  npx -y firebase-tools firestore:delete "$col" --recursive --force
done

echo "✓ Public test data wiped. Private users/{uid} data untouched."
