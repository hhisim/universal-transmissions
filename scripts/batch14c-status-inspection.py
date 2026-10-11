#!/usr/bin/env python3
"""Batch 14c — read-only: which stored fields actually carry lifecycle state.
Counts only. No addresses, member rows or billing identifiers."""
import json, re, urllib.request, urllib.error

REF = "opixpkquyapeqdceyczs"
pat = None
for line in open("/mnt/hermes-ssd/thoth-clean/hermes-data/.env.new", encoding="utf-8", errors="replace"):
    m = re.match(r"\s*SUPABASE_ACCESS_TOKEN\s*=\s*(.+)\s*$", line)
    if m:
        pat = m.group(1).strip().strip('"').strip("'"); break

def q(sql, label):
    body = json.dumps({"query": sql}).encode()
    rq = urllib.request.Request(
        "https://api.supabase.com/v1/projects/%s/database/query" % REF, data=body, method="POST",
        headers={"Authorization": "Bearer " + pat, "Content-Type": "application/json",
                 "User-Agent": "Mozilla/5.0", "Origin": "https://supabase.com"})
    print("--- %s" % label)
    try:
        with urllib.request.urlopen(rq, timeout=90) as r:
            rows = json.loads(r.read().decode())
            if not rows: print("    (0 rows)")
            for row in rows[:40]: print("    " + json.dumps(row))
    except urllib.error.HTTPError as e:
        print("    ERROR %s %s" % (e.code, e.read().decode()[:200]))

q("""select 'profiles' t, coalesce(plan,'(null)') plan,
       coalesce(subscription_status,'(null)') status, count(*) n
 from public.profiles group by 1,2,3
 union all
 select 'ut_members', coalesce(plan,'(null)'), coalesce(subscription_status,'(null)'), count(*)
 from public.ut_members group by 1,2,3
 order by 1,2,3;""",
  "stored plan x subscription_status (counts)")

q("""select 'profiles' t,
   count(*) filter (where subscription_status is null) status_null,
   count(*) filter (where subscription_status = 'inactive') status_inactive,
   count(*) filter (where subscription_status = 'active') status_active,
   count(*) filter (where subscription_status = 'canceled') status_canceled,
   count(*) filter (where subscription_status = 'past_due') status_past_due
 from public.profiles
 union all
select 'ut_members',
   count(*) filter (where subscription_status is null),
   count(*) filter (where subscription_status = 'inactive'),
   count(*) filter (where subscription_status = 'active'),
   count(*) filter (where subscription_status = 'canceled'),
   count(*) filter (where subscription_status = 'past_due')
 from public.ut_members;""",
  "subscription_status population by table")

q("""select 'ut_members' t, coalesce(plan,'(null)') plan,
       (stripe_subscription_id is not null) has_sub_id,
       (current_period_end is not null) has_period_end, count(*) n
 from public.ut_members group by 1,2,3,4
 union all
 select 'profiles', coalesce(plan,'(null)'),
       (stripe_subscription_id is not null), (current_period_end is not null), count(*)
 from public.profiles group by 1,2,3,4 order by 1,2;""",
  "lifecycle artefacts (subscription id / period end) by plan")