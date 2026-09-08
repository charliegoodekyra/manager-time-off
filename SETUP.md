# Manager Time Off — Database-only holiday planning

D1 is the single source of truth. Google Calendar / Apps Script is no longer used.

## Core rules
- Holiday requests must be exactly 7 calendar days inclusive.
- Multiple consecutive weeks must be booked separately.
- Only APPROVED Holiday requests count toward the maximum of 2 managers off at once.
- Clear Holiday requests auto-approve.
- Day Off requests remain PENDING until manually approved/rejected.
- Closing a month blocks all new manager Holiday and Day Off submissions for that month.
- Holiday No Go Zones block Holiday requests only; Day Off requests can still be submitted.
- Admin can add a request on behalf of a manager even when a month is closed, but Holiday No Go Zones still apply.
- Admin can permanently delete future requests.
- The admin Holiday Calendar is generated directly from D1 approved holidays + no-go zones.

## Existing database upgrade
If `request_month_blocks` already exists, leave it in place. Run the new migration:

```bash
npx wrangler d1 execute manager-time-off-db --remote --file=migrations/0003_holiday_no_go_zones.sql
```

Or paste `migrations/0003_holiday_no_go_zones.sql` into the D1 Console and Execute.

## Cloudflare variables
Still required:
- `GROUP_ADMIN_PASSWORD`
- `SESSION_SECRET`
- `RESEND_API_KEY`
- `APPROVER_EMAILS`

No longer required and may be deleted from the Worker settings:
- `APPS_SCRIPT_BRIDGE_URL`
- `APPS_SCRIPT_BRIDGE_SECRET`

## Google Apps Script
Not used by this version. You may leave the old deployment in place temporarily or disable/delete it later.

## Recommended test
1. Open `/admin` and choose a store/month in Holiday calendar.
2. Add a No Go Zone and confirm it appears red on the calendar.
3. Try a Holiday request touching that zone — it should be blocked.
4. Try a Day Off request on the same dates — it should submit as PENDING.
5. Submit a clear 7-day Holiday — it should auto-approve and appear on the admin calendar.
6. Delete that future request from the Requests list — it should disappear from the calendar.
7. Close a month and verify normal manager submissions are blocked with the CLOSED message.


## Manager-facing calendar fix
The public time-off calendar now uses one unified approved-bookings feed for both HOLIDAY and DAY OFF records, then renders them separately (green and blue). No database migration is required for this fix.
