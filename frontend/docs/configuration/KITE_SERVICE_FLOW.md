# Kite Service – Single Service & Token Flow

## Single service only

The app uses **one** Kite backend: **http://35.232.205.155:8179** (Swagger: http://35.232.205.155:8179/docs).

- **Dev:** `setupProxy.js` and `REACT_APP_KITE_SERVICES_TARGET` proxy `/api/kite` to that host.
- **Prod:** `nginx.conf` upstream `kite-service` (35.232.205.155:8179); all `/api/kite/*` requests go there.
- **Frontend:** `KiteTokenService` is the only client; it calls `/api/kite` (e.g. `/api/kite/auth/status`, `/api/kite/auth/login-url`). No legacy or alternate Kite token service.

## Token flow (same for first-time and when invalid)

1. **API key** – In Settings → API & Security, configure API key (and optional secret) so the service can generate login URLs.
2. **Get Redirect URL** – Click “Get Redirect URL”; frontend calls `GET /api/kite/token/callback-url` (or credentials status + login-url). Copy the URL.
3. **developers.kite.trade** – In your Kite app settings, set the Redirect URL to the value from step 2.
4. **Open Kite Login** – Click “Open Kite Login”; opens the URL from `GET /api/kite/auth/login-url` in a new tab. Log in on Kite.
5. **Paste & save** – After redirect, copy the full callback URL (with `request_token=...`) or the access token, paste into the text field, then click “Generate & Save” (for URL) or “Validate & Save” (for token).

## When token is invalid or expired

- **Same flow.** There is no separate “refresh” or “old” path. When the token is invalid or expired:
  - Status shows **Token Invalid** (or **Expired** if the service sets `needs_refresh`).
  - User follows the same steps above: Get Redirect URL → set it in developers.kite.trade → Open Kite Login → paste callback URL or access token → Save.
- Token is stored and validated on the **Kite service** (35.232.205.155:8179). The frontend does not store tokens; it only sends them to that service and shows status from `GET /api/kite/auth/status`.

## Health check

- Frontend calls `GET /api/kite/health`.
- Nginx/dev proxy map this to the upstream **`/api/health`** on the Kite service (API uses `/api` prefix).
