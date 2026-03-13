# Kite Service – Single Service & Token Flow

## Which API we use

**Base URL:** `http://35.232.205.155:8179`  
**Swagger:** http://35.232.205.155:8179/docs  

The frontend talks to this service only. All Kite token/auth calls go to `/api/kite/*`, which nginx (prod) or setupProxy (dev) forwards to `35.232.205.155:8179` with path under `/api` (e.g. `/api/kite/auth/status` → upstream `/api/auth/status`).

## Endpoints that exist on the service (verified with curl)

| Frontend calls       | Upstream path              | Response |
|----------------------|----------------------------|----------|
| GET /api/kite/health | GET **/health** (at root)   | 200 `{"status":"healthy",...}` |
| GET /api/kite/auth/status | GET /api/auth/status   | 200 `{"token_valid":false,"authenticated":false,...}` or valid token info |
| GET /api/kite/auth/login-url | GET /api/auth/login-url | 200 `{"login_url":"https://kite.zerodha.com/connect/login?api_key=...","message":"..."}` |
| POST /api/kite/auth/login | POST /api/auth/login   | 200 with `request_token`, or 401 if token invalid/expired |
| PUT /api/kite/auth/token | PUT /api/auth/token    | Used to save access token (direct paste) |

## Endpoints that return 404 on this deployment

The following are **not** implemented on the current Kite service at 8179. The frontend treats 404 as “server-managed” and still allows the login flow:

- GET /api/auth/credentials/status → 404  
- POST /api/auth/credentials → 404  
- GET /api/token/callback-url → 404  

So **API key and secret are configured on the server** (env/config), not via the UI. The UI still works: “Open Kite Login” uses `GET /api/auth/login-url` (which includes the server’s api_key in the URL), then you paste the callback URL or access token and save.

## Curl examples (direct to service)

```bash
# 1) Auth status – single source for flow (credentials_configured, token_valid)
curl -s -X GET 'http://35.232.205.155:8179/api/auth/status' -H 'accept: application/json'

# 2) If credentials_configured false → configure API key/secret (POST /api/auth/credentials).
# 3) If credentials_configured true and token_valid false → get login URL:
curl -s -X GET 'http://35.232.205.155:8179/api/auth/login-url' -H 'accept: application/json'

# 4) Save token with request_token from callback URL (PUT, not POST login):
curl -s -X PUT 'http://35.232.205.155:8179/api/auth/token' \
  -H 'accept: application/json' -H 'Content-Type: application/json' \
  -d '{"request_token": "REQUEST_TOKEN_FROM_KITE_REDIRECT"}'

# Health (at root)
curl -s http://35.232.205.155:8179/health
```

If you get `{"detail":"Not Found"}` for a path, that path is not implemented on this service.

## UI flow (driven by GET /api/auth/status)

**Single source:** `GET /api/auth/status` returns `credentials_configured` and `token_valid`.

**Step 1 – credentials_configured === false**  
- Show **only** the API Key & Secret form. User enters key and secret from [developers.kite.trade](https://developers.kite.trade/apps), clicks "Save credentials". Frontend calls `POST /api/kite/auth/credentials`. After success, refresh status; when `credentials_configured` is true, show Step 2.

**Step 2 – credentials_configured === true**  
- If **token_valid === true**: show "Authenticated" (user name, token valid). User can still refresh token via the paste flow below.  
- If **token_valid === false**: show "Open Kite Login" (from `GET /api/auth/login-url`), then user pastes the callback URL (with `request_token`) or access token. Save via **`PUT /api/auth/token`** with body `{ "request_token": "..." }` for callback URL, or `{ "access_token": "..." }` for direct token paste.

So: **credentials_configured false → API key/secret form only. credentials_configured true + token_valid false → get login URL, paste URL/token, PUT /api/auth/token. token_valid true → authenticated.**

---


## When token is invalid or expired

- **Same flow.** Status shows **Token Invalid** (or **Expired**). User: Open Kite Login → log in → paste callback URL or token → Save.
- Token is stored and validated on the Kite service. Frontend does not store tokens.

## Health check

- Frontend calls `GET /api/kite/health`.
- Proxy maps this to upstream **`/health`** (at root), not `/api/health`. The service at 8179 exposes health at root.
