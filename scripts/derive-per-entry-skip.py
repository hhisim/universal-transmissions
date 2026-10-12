#!/usr/bin/env python3
"""Derive the per-entry skip candidate from the COMMITTED reviewed RPC.

The reviewed migration is never rewritten in place: this reads it and emits a
separate superseding candidate whose diff is the minimal addition.
"""
import re
import sys

SRC = sys.argv[1]
DST = sys.argv[2]

src = open(SRC, encoding="utf-8").read()
lines = src.split("\n")
original = list(lines)

HEADER = """-- Batch 14af — per-entry skip extension for the lifecycle primitive.
--
-- SUPERSEDING CANDIDATE. It is DERIVED mechanically from the committed, reviewed
-- `20261012_apply_lifecycle_update.sql`; that file is NOT modified. The diff is
-- the minimal addition below, and nothing else:
--
--   1. an entry may carry "skip": true, meaning "this located row is COVERED by
--      this write and its guards must still hold, but it must NOT be updated";
--   2. such an entry must carry no `set`, exactly like a target-level skip;
--   3. the write loop counts it and does not touch the row;
--   4. the completion check counts it as covered, so exact coverage is unchanged.
--
-- WHY. A lifecycle decision can locate several rows and be willing to change only
-- some of them (a member who moved to a new subscription; an already-canceled row
-- during dunning). The primitive's `intent` is per TARGET, so before this
-- extension such a write was inexpressible: `update` would change rows the caller
-- excluded, `skip` would change none. The caller refusing to write is correct but
-- leaves the membership unwritten; this closes that gap explicitly rather than by
-- writing an identity no-op and calling it a skip.
--
-- Guard validation, exact coverage and atomic rollback are all unchanged.
--
-- REPORTING. `affected` remains the number of rows UPDATED. Skipped rows are
-- covered but not updated, so the caller reads skipped = located - affected.

"""


def find(pred, start=0):
    for i in range(start, len(lines)):
        if pred(lines[i]):
            return i
    raise SystemExit("anchor not found")


# (1) entry validation: an entry marked skip is validated as a skip entry.
i = find(lambda l: l.strip() == "if v_intent = 'skip' then")
window = "\n".join(lines[i:i + 6])
if "SKIP_WITH_SET" not in window:
    # the same test appears twice; take the entry-validation occurrence
    i = find(lambda l: l.strip() == "if v_intent = 'skip' then", i + 1)
    window = "\n".join(lines[i:i + 6])
assert "SKIP_WITH_SET" in window, "entry-validation skip branch not identified"
indent = lines[i][:len(lines[i]) - len(lines[i].lstrip())]
lines[i] = (
    f"{indent}if v_intent = 'skip' or v_entry->'skip' = 'true'::jsonb then"
)

# (2) declare the skipped counter beside v_affected.
i = find(lambda l: re.fullmatch(r"\s*v_affected\s+integer;\s*", l))
indent = lines[i][:len(lines[i]) - len(lines[i].lstrip())]
lines.insert(i + 1, f"{indent}v_skipped    integer;")

# (3) zero it where v_affected is zeroed for the write pass.
i = find(lambda l: l.strip() == "v_affected := 0;")
indent = lines[i][:len(lines[i]) - len(lines[i].lstrip())]
lines.insert(i + 1, f"{indent}v_skipped := 0;")

# (4) write loop: a skip entry is counted and the row is left alone.
seen = 0
for i, l in enumerate(lines):
    if l.strip() == "v_set  := v_entry->'set';":
        seen += 1
        if seen == 2:  # the write pass, not the validation pass
            indent = lines[i][:len(lines[i]) - len(lines[i].lstrip())]
            lines[i + 1:i + 1] = [
                f"{indent}if v_entry->'skip' = 'true'::jsonb then",
                f"{indent}  v_skipped := v_skipped + 1;",
                f"{indent}  continue;",
                f"{indent}end if;",
            ]
            break
assert seen == 2, "write-pass set extraction not identified"

# (5) completion check counts covered-but-skipped rows.
i = find(lambda l: "if v_affected <> coalesce(array_length(v_located, 1), 0) then" in l)
lines[i] = lines[i].replace(
    "if v_affected <> coalesce(array_length(v_located, 1), 0) then",
    "if v_affected + v_skipped <> coalesce(array_length(v_located, 1), 0) then",
)

out = "\n".join(lines)
# insert the header after the first line of the file if it is already a comment
open(DST, "w", encoding="utf-8").write(HEADER + out)
print(f"wrote {DST}: {len(original)} -> {len(lines)} lines")
