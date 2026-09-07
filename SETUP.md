# Manager Time Off v1 — setup

This replaces the Google Form/Requests-sheet front end while KEEPING Google Calendar
as the scheduling/planning view.

## Rules preserved exactly
- Hourly-paid managers only.
- HOLIDAY must be exactly 7 calendar days inclusive.
- Only APPROVED HOLIDAY requests count towards capacity.
- If 2 approved holidays already overlap ANY requested day, the new holiday is BLOCKED.
- The first fully-booked conflict date is stored.
- Clear HOLIDAY requests auto-approve.
- DAY OFF is always PENDING and can only be manually APPROVED or REJECTED.
- Approved Holiday calendar title: `Holiday - Manager Name`
- Approved Day Off calendar title: `OFF R - Manager Name`
- Approved, Pending, Rejected and Blocked manager email notifications are retained.
- New Day Off requests email the approvers with a direct `/admin?request=<id>` review link.

## ZIPs
1. `manager-time-off-cloudflare-v1.zip` — website + D1 backend.
2. `manager-time-off-google-calendar-bridge-v1.zip` — Google Apps Script calendar bridge.

## 1. Create a new D1 database
Cloudflare → Storage & databases → D1 → Create.
Name: `manager-time-off-db`

Open it → Console → paste/run `schema.sql`.

Copy the D1 database ID.

## 2. Edit wrangler.jsonc BEFORE uploading to GitHub
Replace:
`REPLACE_WITH_YOUR_D1_DATABASE_ID`
with the actual D1 database ID.

## 3. Create a new GitHub repo
Suggested name:
`manager-time-off`

Upload the contents of the Cloudflare ZIP to the repository root.

Connect it to a new Cloudflare Worker exactly like Delivery Checks.

## 4. Cloudflare secrets / variables
Worker → Settings → Variables and Secrets:

SECRET:
- `GROUP_ADMIN_PASSWORD` — group admin password.
- `SESSION_SECRET` — random value at least 32 characters.
- `RESEND_API_KEY` — your existing Resend API key.
- `APPS_SCRIPT_BRIDGE_SECRET` — a long random secret shared with Apps Script.

TEXT VARIABLE:
- `APPROVER_EMAILS`
  Set to the two addresses that should receive Day Off review alerts, comma-separated.

- `APPS_SCRIPT_BRIDGE_URL`
  Add this after deploying the Apps Script bridge.

The app sends manager emails from:
`Manager Time Off <holidays@kyraops.uk>`
Your verified `kyraops.uk` Resend domain supports this sender.

## 5. Google Apps Script bridge
Open script.google.com → New project.
Paste `Code.gs` from the bridge ZIP.

Project Settings → Script Properties:
- Property: `BRIDGE_SECRET`
- Value: EXACTLY the same value as Cloudflare `APPS_SCRIPT_BRIDGE_SECRET`.

Deploy → New deployment → Web app:
- Execute as: Me
- Who has access: Anyone

Authorise Calendar access.
Copy the `/exec` Web App URL.
Put it into Cloudflare as `APPS_SCRIPT_BRIDGE_URL`.

The Google account running the Apps Script must have edit access to every calendar used.

## 6. Calendar naming
Each store has a `calendar_name`.
Default: `Manager Holiday Calendar`.

For six stores you can either:
- share one group calendar; or
- create one calendar per store and enter its exact Google Calendar name in Manage Stores.

The app sends the selected store's calendar name to Apps Script.

## 7. Custom domain
Connect the new Worker to:
`holidays.kyraops.uk`

## 8. Configure stores and managers
Open:
`https://holidays.kyraops.uk/admin`

Sign in with the GROUP_ADMIN_PASSWORD.
Use Manage stores & managers:
- add the six stores;
- set each store's exact calendar name;
- set each store's 5-digit admin/review code;
- add its hourly-paid managers and email addresses.

Each store gets a permanent manager request link:
`https://holidays.kyraops.uk/request/<store-slug>`

Copy that link and turn it into a QR code or place it in the manager office.

## 9. Existing Google Sheet migration
There is no destructive migration. Keep the old Sheet/App Script running until the new
system passes testing.

For each store, copy manager names + emails from the existing `Managers` sheet into
Manage Managers. Existing historical requests can remain in Google Sheets as your old archive.

For a future phase we can import historical rows into D1 if you decide that is useful.

## Recommended test
1. Add Rothwell + its managers.
2. Submit one 7-day Holiday while no conflicts exist → should APPROVE + appear in Calendar.
3. Add two overlapping approved test holidays, then submit a third overlapping week → should BLOCK.
4. Submit Day Off → manager gets PENDING email and approvers get review email.
5. Approve it in `/admin` → Calendar gets `OFF R - Manager Name` + manager gets APPROVED email.
6. Submit another Day Off and reject it → manager gets rejection email.
