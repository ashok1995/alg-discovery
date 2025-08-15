## API Integration Guide

### Overview
- Base URL: `http://localhost:8031`
- API Prefix: `/api/v1`
- Docs: `http://localhost:8031/docs`
- Health: `GET /api/v1/symbol/health`

Note: The Candidate Query Registry endpoints are currently disabled. Active surfaces are Symbol Mapping and Query Storage APIs.

---

### Symbol Mapping API (`/api/v1/symbol`)

- GET `/chartink-to-kite/{symbol}`
  - Convert ChartInk symbol to Kite.
  - Example:
    ```bash
    curl -s "http://localhost:8031/api/v1/symbol/chartink-to-kite/RELIANCE-EQ" | jq .
    ```

- GET `/kite-to-chartink/{symbol}`
  - Convert Kite symbol to ChartInk.
  - Example:
    ```bash
    curl -s "http://localhost:8031/api/v1/symbol/kite-to-chartink/RELIANCE" | jq .
    ```

- GET `/normalize?symbol=...&target_format=...`
  - target_format: `kite | chartink | standard`
  - Example:
    ```bash
    curl -s "http://localhost:8031/api/v1/symbol/normalize?symbol=RELIANCE-EQ&target_format=kite" | jq .
    ```

- POST `/batch-convert?from_format=chartink&to_format=kite`
  - Body: JSON array of symbols
  - Example:
    ```bash
    curl -s -X POST "http://localhost:8031/api/v1/symbol/batch-convert?from_format=chartink&to_format=kite" \
      -H "Content-Type: application/json" \
      -d '["RELIANCE-EQ", "TCS-EQ", "INFY-EQ"]' | jq .
    ```

- GET `/validate/{symbol}?exchange=NSE`
  - Example:
    ```bash
    curl -s "http://localhost:8031/api/v1/symbol/validate/RELIANCE?exchange=NSE" | jq .
    ```

- GET `/variants/{symbol}`
  - Example:
    ```bash
    curl -s "http://localhost:8031/api/v1/symbol/variants/RELIANCE-EQ" | jq .
    ```

- GET `/search?query=pharma&limit=5`
  - Example:
    ```bash
    curl -s "http://localhost:8031/api/v1/symbol/search?query=pharma&limit=5" | jq .
    ```

- GET `/health`
  - Example:
    ```bash
    curl -s "http://localhost:8031/api/v1/symbol/health" | jq .
    ```

---

### Query Storage API (`/api/v1/query`)

Schemas reference: see `schemas/query.py` for exact fields.

- POST `/store` (proxy to batch)
  - Body:
    ```json
    {
      "query_name": "NSE Gainers",
      "query_string": "( {cash} ( latest close > latest sma ( latest close , 20 ) ) )",
      "query_type": "chartink",
      "description": "Simple momentum",
      "tags": ["nse", "momentum"],
      "parameters": {"sma": 20},
      "version": "1.0",
      "is_active": true
    }
    ```
  - Example:
    ```bash
    curl -s -X POST "http://localhost:8031/api/v1/query/store" \
      -H "Content-Type: application/json" \
      -d '{
        "query_name": "NSE Gainers",
        "query_string": "( {cash} ( latest close > latest sma ( latest close , 20 ) ) )",
        "query_type": "chartink",
        "description": "Simple momentum",
        "tags": ["nse", "momentum"],
        "parameters": {"sma": 20},
        "version": "1.0",
        "is_active": true
      }' | jq .
    ```

- POST `/store-batch`
  - Body:
    ```json
    { "queries": [ {"query_name": "Q1", "query_string": "...", "query_type": "chartink"} ] }
    ```
  - Example:
    ```bash
    curl -s -X POST "http://localhost:8031/api/v1/query/store-batch" \
      -H "Content-Type: application/json" \
      -d '{"queries":[{"query_name":"Q1","query_string":"( {cash} ( latest close > 50 ) )","query_type":"chartink"}]}' | jq .
    ```

- GET `/list?limit=50&offset=0`
  - Example:
    ```bash
    curl -s "http://localhost:8031/api/v1/query/list?limit=10" | jq .
    ```

- GET `/search?search_term=nse&limit=5`
  - Example:
    ```bash
    curl -s "http://localhost:8031/api/v1/query/search?search_term=nse&limit=5" | jq .
    ```

- GET `/stats`
  - Example:
    ```bash
    curl -s "http://localhost:8031/api/v1/query/stats" | jq .
    ```

- GET `/candidates`
  - Example:
    ```bash
    curl -s "http://localhost:8031/api/v1/query/candidates" | jq .
    ```

- GET `/ids`
  - Example:
    ```bash
    curl -s "http://localhost:8031/api/v1/query/ids" | jq .
    ```

- GET `/{query_id}`
  - Example:
    ```bash
    curl -s "http://localhost:8031/api/v1/query/q_abcdef123456" | jq .
    ```

- PUT `/{query_id}`
  - Body (partial update):
    ```json
    { "description": "Updated", "is_active": false }
    ```
  - Example:
    ```bash
    curl -s -X PUT "http://localhost:8031/api/v1/query/q_abcdef123456" \
      -H "Content-Type: application/json" \
      -d '{"description":"Updated","is_active":false}' | jq .
    ```

- DELETE `/{query_id}`
  - Example:
    ```bash
    curl -s -X DELETE "http://localhost:8031/api/v1/query/q_abcdef123456" | jq .
    ```

- POST `/get-batch`
  - Body:
    ```json
    { "query_ids": ["q_abcdef123456", "q_1234"] }
    ```
  - Example:
    ```bash
    curl -s -X POST "http://localhost:8031/api/v1/query/get-batch" \
      -H "Content-Type: application/json" \
      -d '{"query_ids":["q_abcdef123456"]}' | jq .
    ```

- PUT `/update-batch`
  - Body:
    ```json
    { "updates": [ {"query_id": "q_abcdef123456", "description": "Updated"} ] }
    ```

- POST `/delete-batch`
  - Body:
    ```json
    { "query_ids": ["q_abcdef123456"] }
    ```

---

### Environment & Service Management
- Port comes from `PORT` (manage with `.env` or `env.example`).
- Start/stop via `manage.sh`:
  ```bash
  PORT=8031 ./manage.sh start
  ./manage.sh status
  ./manage.sh restart
  ./manage.sh stop
  ```

---

### Troubleshooting
- Connection refused: ensure service is running and port matches.
- 404: verify path includes `/api/v1` prefix.
- Validation errors: check required fields per `schemas/query.py`.
- Logs: `tail -f logs/server.out`. 