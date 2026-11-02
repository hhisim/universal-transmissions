#!/usr/bin/env bash
# Run the commerce watcher with its restricted environment, and keep a log of every run so that
# "monitoring is scheduled" is a fact with evidence, not a claim.
set -euo pipefail
ENV_FILE=/root/.config/omni-commerce/commerce-watch.env
REPO=/root/ut-fix-20261102
LOG_DIR=/var/log/ut-commerce
mkdir -p "$LOG_DIR"

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

cd "$REPO"
node scripts/ops/commerce-watch.js "$@" 2>&1 | tee -a "$LOG_DIR/watch.log"
