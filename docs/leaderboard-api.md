# Leaderboard service contract

[Português](leaderboard-api.pt-BR.md)

This is what the game (`addons/leaderboard.js`, with `leaderboard-url="https://scores.example.org/api"`) sends to a leaderboard service and what it expects back. Any server that follows this page works. The examples use `https://scores.example.org/api`.

## 1. Overview

- **Two requests:** `POST {url}/scores` sends a score and returns the Top 10; `GET {url}/scores?limit=10` only returns the Top 10.
- **`{url}`** is the value of `leaderboard-url`, without the final slash. It can be relative (same site).
- **Unique names with a browser key.** The first time a name is saved, the service creates a random key and returns it (`201`). The game keeps the key in the browser (separately for each service address) and sends it on the next saves of that name. Without the right key, the name answers `409`.
- **Data sent:** only `name`, `score` and `key`. No cookies, no referrer, no e-mail.
- **Without `leaderboard-url`, nothing leaves the browser** (the ranking is local).

## 2. All requests

- The game sends `credentials: 'omit'`, `referrerPolicy: 'no-referrer'` and `Accept: application/json`. The POST also sends `Content-Type: application/json`. The browser adds only the `Origin` header.
- **Timeout:** 5 seconds per request, with no automatic retry. The person can press "Try again".
- **Answers** are `Content-Type: application/json; charset=utf-8`.
- **CORS.** The preflight `OPTIONS {url}/scores` answers `204` with `Access-Control-Allow-Origin: <origin or *>`, `Access-Control-Allow-Methods: GET, POST, OPTIONS`, `Access-Control-Allow-Headers: Content-Type` and `Access-Control-Max-Age: 600`. **Every answer, including 409, 422 and 429, needs `Access-Control-Allow-Origin`.** Without it, the browser hides the answer and the game can only say "Service unavailable".
- **Limits:** body up to 1 KB. `name` is text. `score` is an integer from 1 to 1,000,000. `key` has 16 to 128 characters from `[A-Za-z0-9_-]` (the game ignores a key in another shape).

## 3. POST {url}/scores

Body: `{ "name": string, "score": integer, "key"?: string }`.

The service checks, in this order:

1. The body is valid JSON and inside the limits. If not: `400`.
2. `score` is an integer from 1 to 1,000,000. If not: `400`.
3. `name`, with the same rules the game uses (the username rules of the README): the first rule that fails decides. Links, e-mails or 6 or more digits: `422 {"error":"personal_data"}`. Characters, length, start, or no letter at all (`1_2`, `1.2.3`): `422 {"error":"format"}`.
4. The service policy (offensive or reserved names): `422 {"error":"rejected"}`.
5. Look up the name by its comparison key (lowercase, no accents, no `_`, `-` or `.`: "Carol", "cárol" and "ca_rol" are the same name):
   - **new name:** create it, make a random key of at least 128 bits (base64url), store **only its hash**, and answer `201 {"key","top"}`;
   - **name exists and the key matches** (compare in constant time): keep the higher of the old and new score, update the spelling and answer `200 {"top"}`. A lower score changes nothing: the service's score stands;
   - **name exists and the key is missing or wrong:** `409 {"error":"taken"}`.
6. Too many tries: `429 {"error":"rate_limited"}`. `Retry-After` is optional.
7. Internal failure: `5xx`.

**`top`** has up to 10 entries `{ "name", "score" }`, from the highest to the lowest score. On a tie, who arrived first stays on top (use a sequence number, not a date).

**What the service stores:** the spelling, the comparison key, the best score, the hash of the key and the sequence number. No IP address beyond the window used to limit tries.

## 4. GET {url}/scores?limit=10

- Answers `200 {"top":[…]}`. `limit` goes from 1 to 10 (default 10; other values are adjusted to that range).
- Answers with `Cache-Control: no-store`.
- The game only uses this request when a `200` or `201` answer to the POST comes without `top`.

## 5. How the game reads each answer

| Answer | Message (text attribute) | What the person sees |
|---|---|---|
| `201 {key, top}` | none | The Top 10. The game keeps the `key` for that name and service. |
| `200 {top}` (a valid `key`, if present, is also kept) | none | The Top 10. |
| `409` | `text-leaderboard-error-taken` | The form, with the field marked invalid. |
| `422 {"error":"format"}` | `text-leaderboard-error-chars` | The form, with the field marked invalid. |
| `422 {"error":"personal_data"}` | `text-leaderboard-error-personal-data` | The form, with the field marked invalid. |
| `422 {"error":"rejected"}`, or `422` with another reason or no reason | `text-leaderboard-error-rejected` | The form, with the field marked invalid. |
| `429` | `text-leaderboard-error-rate-limited` | The form and "Try again". |
| Anything else: `400`, `401`, `403`, `404`, `413`, `5xx`, a body that is not JSON, a `top` that is not a list, a network failure or no answer in 5 seconds | `text-leaderboard-error-offline` | The form and "Try again". The game also writes a warning in the console with what it received. |

The console warning looks like `snake-game leaderboard: unexpected response 403`, or `network error`, or `timeout` when there is no status code.

The game shows a single message for `422` `format` ("Use only letters, numbers, _, - and ."), because the exact reason (length or start) is already checked in the browser before sending.

If the key is lost (browser data cleared, another device), the name answers `409`. This is only documented for now; a way to recover the name is in the next steps.

## 6. Examples

```http
POST /api/scores            (first time)
{"name":"Carol","score":42}
→ 201 {"key":"k7Qf2m9Xr4TzP1bW8sLc0A","top":[{"name":"Carol","score":42},{"name":"Ana","score":12}]}

POST /api/scores            (same browser, higher score, another spelling)
{"name":"cárol","score":50,"key":"k7Qf2m9Xr4TzP1bW8sLc0A"}
→ 200 {"top":[{"name":"cárol","score":50},{"name":"Ana","score":12}]}

POST /api/scores            (lower score: the service's score stands)
{"name":"Carol","score":10,"key":"k7Qf2m9Xr4TzP1bW8sLc0A"}
→ 200 {"top":[{"name":"Carol","score":50},{"name":"Ana","score":12}]}

POST /api/scores            (another browser, a name that belongs to someone else)
{"name":"ana","score":20}
→ 409 {"error":"taken"}

POST /api/scores  {"name":"ab","score":5}         → 422 {"error":"format"}
POST /api/scores  {"name":"ana.com","score":5}    → 422 {"error":"personal_data"}
POST /api/scores  {"name":"Xxxxx","score":5}      → 422 {"error":"rejected"}
POST /api/scores  {"name":"Zed","score":5}        → 422 {"error":"other"}   (shown as "Choose another name.")
POST /api/scores  (too many in a row)             → 429 Retry-After: 30 {"error":"rate_limited"}
POST /api/scores  (internal failure)              → 503 {"error":"unavailable"}   (shown as "Service unavailable")
POST /api/scores  {"name":"Carol","score":1.5}    → 400 {"error":"bad_request"}   (shown as "Service unavailable")

GET /api/scores?limit=10
→ 200 {"top":[{"name":"Carol","score":50},{"name":"Ana","score":12}]}

OPTIONS /api/scores
→ 204  Access-Control-Allow-Origin: *  Access-Control-Allow-Methods: GET, POST, OPTIONS
       Access-Control-Allow-Headers: Content-Type  Access-Control-Max-Age: 600
```

## 7. Trying it without a server

`demo/fake-service.js` is a pretend service that lives inside the demo page (address `https://fake-leaderboard.invalid/api`, a name that never reaches the network). Its states cover the rows of the table above: works, name taken, name rejected, 422 with an unknown reason, too many tries, unexpected response (403), 200 with broken JSON, offline and slow. It keeps the key as plain text only because it is a demo; the real server keeps only the hash.
