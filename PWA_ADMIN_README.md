# Manager Time Off — Installable Admin App

This version adds a Progressive Web App (PWA) layer to the existing Manager Time Off admin page.

## What changed

- App name: **Manager Time Off**
- Installed app launches directly at `/admin`
- iPhone/iPad Home Screen support
- Android install prompt support
- Standalone/full-screen display
- iPhone safe-area/status-bar fix
- Admin-specific app icons
- Connection warning while offline
- Safe offline fallback for the admin page

## Data safety

API responses and live request data are **not cached**. Approval/rejection changes still require a live internet connection and D1 remains the source of truth.

The public manager request pages are not converted into the admin offline experience.

## Database

No D1 / SQL migration is required.

## iPhone installation

1. Deploy this version.
2. Open `https://holiday.kyraops.uk/admin` in Safari.
3. Sign in if required.
4. Tap **Share**.
5. Tap **Add to Home Screen**.
6. Enable **Open as Web App** if shown.
7. Tap **Add**.

The Home Screen icon will then launch directly into the Manager Time Off admin page.
