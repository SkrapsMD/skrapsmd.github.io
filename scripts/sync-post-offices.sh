#!/usr/bin/env bash
# Copy the 20th Century Post Offices explorer into public/ so it deploys with
# the site. The explorer is authored in its own repo; this is the only link
# between the two, so re-run it after rebuilding the data bundles there
# (python3 code/c_webapp_data.py, python3 code/d_rail_data.py).
#
#   ./scripts/sync-post-offices.sh [path-to-explorer-docs]
#
# The data bundles are gitignored in the source repo as build artifacts. Here
# they are tracked, because public/ is what actually gets published.

set -euo pipefail

SRC="${1:-$HOME/Documents/GitHub/20thCent_PostOffice/docs}"
DEST="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/public/tools/post-offices"

if [[ ! -f "$SRC/index.html" ]]; then
  echo "error: no index.html under $SRC" >&2
  echo "usage: $0 [path-to-explorer-docs]" >&2
  exit 1
fi

mkdir -p "$DEST"
rsync -a --delete "$SRC/" "$DEST/"

echo "synced $SRC -> $DEST"
du -sh "$DEST"
