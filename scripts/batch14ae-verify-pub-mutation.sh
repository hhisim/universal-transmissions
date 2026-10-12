#!/usr/bin/env bash
#
# batch14ae-verify-pub-mutation.sh — decide whether a boundary-suite log actually
# constitutes a DETECTED PUBLIC-exposure mutation on a given wrapper.
#
# Usage: bash scripts/batch14ae-verify-pub-mutation.sh <wrapper-fn> <logfile> <exit-code>
#   exit 0 = yes, this log proves the wrapper's PUBLIC exposure was detected
#   exit 1 = no
#
# Why this is separate from the runner: "the suite failed" is not the finding.
# The suite can fail for unrelated reasons, and an assertion's TEXT appears in an
# `ok` line just as it does in a `FAIL` line — so matching the assertion name
# proves only that the assertion RAN, not that it failed. Detection therefore
# requires all four of:
#
#   1. the suite's ASSERTION-FAILURE exit status (1), not any non-zero status
#      (2 means the suite could not even set up, which is not a detection);
#   2. the assertion-failure marker line;
#   3. an actual `FAIL` line for the WRAPPER's OWN ACL, with the observed value
#      1 where 0 was expected;
#   4. an actual `FAIL` line for the DENIAL POINT, with the observed value `base`
#      where `wrapper` was expected.
#
# If a boundary assertion fails for an UNRELATED reason, this exits 1: that is not
# a detected PUBLIC mutation and must not be counted as one.
#
set -u

FN="${1:?wrapper function name required}"
LOG="${2:?suite log required}"
RC="${3:-1}"

refuse() { echo "  verifier: NOT a detected PUBLIC mutation on $FN -- $1"; exit 1; }

[ -f "$LOG" ] || refuse "no log file at $LOG"
[ "$RC" = "1" ] || refuse "suite exit status was $RC, not 1 (assertion failure)"

grep -q 'BATCH14AE_BOUNDARY_SUITE_FAILED' "$LOG" \
  || refuse "the log does not carry the assertion-failure marker"

# (3) A FAIL line for the wrapper's OWN ACL, with the observed value.
acl_fail=0
for role in anon authenticated; do
  if grep -Eq "^  FAIL ACL: ${role} has EXECUTE on ${FN} = 0 \(expected '0', got '1'\)" "$LOG"; then
    acl_fail=1
    echo "  verifier: FAIL line for the $role ACL on $FN, observed 1"
  fi
done
[ "$acl_fail" = "1" ] || refuse "no FAIL line showing the wrapper ACL observed as 1"

# (4) A FAIL line for the denial point, with the observed value.
denial_fail=0
for role in anon authenticated; do
  if grep -Eq "^  FAIL DENIAL POINT: ${role} -> ${FN} denial names the WRAPPER .*\(expected 'wrapper', got 'base'\)" "$LOG"; then
    denial_fail=1
    echo "  verifier: FAIL line for the $role denial point on $FN, observed base"
  fi
done
[ "$denial_fail" = "1" ] || refuse "no FAIL line showing the denial point observed as base"

echo "  verifier: DETECTED a PUBLIC-exposure mutation on $FN"
exit 0
