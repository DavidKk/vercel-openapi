#!/usr/bin/env bash
set -euo pipefail

# Usage examples:
#   curl -fsSL "BASE_URL/install-skill.sh" | bash -s -- all
#   curl -fsSL "BASE_URL/install-skill.sh" | bash -s -- exchange-rate
#
# You can override the default base URL or destination directory with:
#   SKILL_BASE_URL="https://example.com" SKILL_DEST_DIR="./skills" bash install-skill.sh all

SKILL_NAME="${1:-all}"

SKILL_BASE_URL_DEFAULT="BASE_URL"
BASE_URL="${SKILL_BASE_URL:-$SKILL_BASE_URL_DEFAULT}"

DEST_DIR="${SKILL_DEST_DIR:-.}"

TMP_DIR="$(mktemp -d)"
ZIP_PATH="$TMP_DIR/skill.zip"

cleanup() {
  rm -rf "$TMP_DIR"
}

trap cleanup EXIT

echo "Installing skill bundle: $SKILL_NAME"
echo "Destination directory: $DEST_DIR"

mkdir -p "$DEST_DIR"

ZIP_URL="${BASE_URL%/}/api/skills/$SKILL_NAME"

echo "Downloading from: $ZIP_URL"
curl -fSL "$ZIP_URL" -o "$ZIP_PATH"

echo "Unzipping archive..."
unzip -o "$ZIP_PATH" -d "$DEST_DIR" >/dev/null

echo "Skill bundle \"$SKILL_NAME\" installed successfully into \"$DEST_DIR\"."

