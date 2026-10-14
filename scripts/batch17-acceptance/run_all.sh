#!/bin/bash
# Serial runner: this VPS has 2 cores and 3.8 GB of RAM, and each script drives a
# software-WebGL Chromium at 72,000 grains. Running them together OOM-kills them, so they
# go one at a time - which is also why each script's evidence is independent.
cd /root/b17/acceptance || exit 1
PY=/root/.venvs/shopify-playwright/bin/python3
for s in b_sound_capture c_shutdown d_mobile e_oracle_journey; do
  echo "=================== $s ==================="
  start=$(date +%s)
  $PY "$s.py" > "/root/b17/acceptance/log-$s.txt" 2>&1
  rc=$?
  echo "--- $s exited $rc after $(( $(date +%s) - start ))s ---"
  tail -25 "/root/b17/acceptance/log-$s.txt"
  pkill -f chromium_headless 2>/dev/null
  sleep 5
done
echo "ALL_ACCEPTANCE_SCRIPTS_DONE"
