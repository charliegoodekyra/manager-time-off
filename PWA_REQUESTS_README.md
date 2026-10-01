# Manager Requests — Installable App

This version keeps the existing **Manager Time Off admin app** and also makes the Rothwell manager request page installable as its own separate iPhone/Android web app.

## Manager Requests app

- Home Screen name: **Manager Requests**
- Launches directly to `/request/rothwell-a14-eastbound`
- Uses a separate app identity/icon from the Admin app
- iPhone/iPad Add to Home Screen support
- Android install prompt support
- Standalone/full-screen display
- iPhone safe-area/status-bar support
- Request-specific offline warning/fallback

## Manager Time Off admin app

The existing Admin PWA remains available and still launches directly to `/admin`.

Both apps can be installed on the same phone because they use different manifest IDs/start URLs.

## Data safety

API responses, manager requests, approvals and live calendar data are **not cached**. D1 remains the source of truth. A connection is still required to submit or change data.

## Database

No D1 / SQL migration is required.

## iPhone installation — Manager Requests

1. Deploy this version.
2. Open `https://holiday.kyraops.uk/rothwell` in Safari.
3. Tap **Share**.
4. Tap **Add to Home Screen**.
5. Enable **Open as Web App** if shown.
6. Tap **Add**.

The new **Manager Requests** Home Screen icon will open straight into the Rothwell manager holiday / Day Off request page.


## v1.3 icon update
The Manager Requests app now uses a clearly different blue person/request icon from the Manager Time Off admin app. New icon filenames are used to avoid iOS Home Screen icon caching.
