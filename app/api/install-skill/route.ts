import type { NextRequest } from 'next/server'

/**
 * Serve a Bash script that installs skill bundles via curl + bash.
 * The script is generated dynamically so that the default BASE_URL matches the current request origin.
 * @param req Incoming HTTP request
 * @returns Shell script response for curl piping
 */
export async function GET(req: NextRequest): Promise<Response> {
  const origin = req.nextUrl.origin

  const script = `#!/usr/bin/env bash
set -euo pipefail

# Usage examples:
#   curl -fsSL "${origin}/api/install-skill" | bash -s -- all
#   curl -fsSL "${origin}/api/install-skill" | bash -s -- exchange-rate
#
# You can override the default base URL or destination directory with:
#   SKILL_BASE_URL="https://example.com" SKILL_DEST_DIR="./skills" bash install-skill.sh all

SKILL_NAME="\${1:-all}"

SKILL_BASE_URL_DEFAULT="${origin}"
BASE_URL="\${SKILL_BASE_URL:-$SKILL_BASE_URL_DEFAULT}"

DEST_DIR="\${SKILL_DEST_DIR:-.}"

TMP_DIR="\$(mktemp -d)"
ZIP_PATH="$TMP_DIR/skill.zip"

cleanup() {
  rm -rf "$TMP_DIR"
}

trap cleanup EXIT

echo "Installing skill bundle: $SKILL_NAME"
echo "Destination directory: $DEST_DIR"

mkdir -p "$DEST_DIR"

ZIP_URL="\${BASE_URL%/}/api/skills/$SKILL_NAME"

echo "Downloading from: $ZIP_URL"
curl -fSL "$ZIP_URL" -o "$ZIP_PATH"

echo "Unzipping archive..."
unzip -o "$ZIP_PATH" -d "$DEST_DIR" >/dev/null

echo "Skill bundle \"$SKILL_NAME\" installed successfully into \"$DEST_DIR\"."
`

  return new Response(script, {
    status: 200,
    headers: {
      'Content-Type': 'text/x-shellscript; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
