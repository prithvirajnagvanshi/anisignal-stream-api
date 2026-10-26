<div align="center">

<img src="docs/logo.svg" width="80" height="80" alt="AniSignal logo" />

# AniSignal Stream API

**A small JSON API for finding anime episodes and resolving playable streams.**

[![GitHub stars](https://img.shields.io/github/stars/fakeapple-alt3/anisignal-stream-api?style=flat-square&color=yellow)](https://github.com/fakeapple-alt3/anisignal-stream-api/stargazers)

</div>

---

AniSignal Stream API looks up anime by AniList ID, gathers episode lists from its connected sources, and resolves a selected episode into stream information. The API currently integrates **Anikoto**, **AnimeGG**, and **AniWaves**.

## Routes

All endpoints use the deployed service origin as their base URL and return JSON.

### API information

```http
GET /
```

Returns the API name, cache state, active provider slugs, and route patterns.

### Map an AniList ID

```http
GET /map/:anilistId
```

Returns available cross-catalog IDs for the AniList title.

Example:

```text
/map/16498
```

### Get episodes

```http
GET /episodes/:anilistId
GET /episodes/:provider[/:provider...]/:anilistId?map=true|false
```

The first route requests episode lists from every connected source. The filtered route limits the request to one or more provider slugs. Chain provider slugs in the path; `map=false` skips the ID-map lookup.

Examples:

```text
/episodes/16498
/episodes/anikoto/16498
/episodes/anikoto/aniwaves/16498?map=false
```

Available provider slugs are `anikoto`, `animegg`, and `aniwaves`.

### Resolve an episode

```http
GET /watch/:provider/:id/:audio/:provider-:episode
```

Resolves an episode to its available stream information. Use the episode ID returned by that provider’s episode list. The audio value is `sub` or `dub`.

Examples:

```text
/watch/anikoto/16498/sub/anikoto-1
/watch/animegg/16498/sub/animegg-1
/watch/aniwaves/16498/sub/aniwaves-1
```

## Run locally

Requires Node.js. Clone the repository, install dependencies, and start the server:

```bash
git clone https://github.com/fakeapple-alt3/anisignal-stream-api.git
cd anisignal-stream-api
npm install
cp .env.example .env
npm start
```

The example environment file sets the local port to `4000`. Open `http://localhost:4000` for API information and `http://localhost:4000/docs` for the route guide.

## Configuration

Copy `.env.example` to `.env` and adjust settings as needed:

| Variable | Example default | Purpose |
| --- | --- | --- |
| `PORT` | `4000` | Local Node server port. |
| `CACHE_ENABLED` | `false` | Enables the API cache when set to `true`. |
| `DEFAULT_REDIS_TTL` | `900` | Default cache lifetime in seconds. |
| `UPSTASH_REDIS_REST_URL` | — | Upstash Redis REST URL, for Redis-backed caching. |
| `UPSTASH_REDIS_REST_TOKEN` | — | Upstash Redis REST token, for Redis-backed caching. |

When deploying on a hosting service, configure environment variables in that service’s project settings rather than committing secrets to the repository.

## Notes

- AniList is the catalog and identity layer used by the API. If AniList is unavailable, some requests may fail or return incomplete results.
- Source availability and returned streams depend on the connected providers and may change over time.
- This project is an API, not a catalog website or a video player.

---

<div align="center">

Made for anime fans. One clean signal.

</div>
