/**
 * API skill document for agents: how to call Movies HTTP API.
 * Use BASE_URL as placeholder; replaced with current origin when copying/downloading.
 */
export const MOVIES_API_SKILL = `# Movies API – HTTP usage for agents

Base URL: BASE_URL

## GET /api/movies – Latest movies from cache

Returns the latest merged movies list (Maoyan + TMDB) from cache. This endpoint **never** triggers upstream
requests; it only reads from GIST/edge cache, so it is safe to call frequently from agents.

Depending on upstream availability, the cached data may come from:

- Maoyan + TMDB (normal case)
- TMDB only (when Maoyan is temporarily unavailable)
- Maoyan only (when TMDB is temporarily unavailable)

  GET BASE_URL/api/movies

Response (200): JSON
  {
    "code": 0,
    "message": "ok",
    "data": {
      "movies": [
        {
          "maoyanId": 123456,
          "name": "Movie Title",
          "poster": "https://...",
          "score": "9.0",
          "wish": 123456,
          "source": "topRated",
          "sources": ["topRated", "tmdbPopular"],
          "maoyanUrl": "https://maoyan.com/films/123456",
          "tmdbId": 123,
          "tmdbPoster": "https://image.tmdb.org/t/p/w500/...",
          "overview": "Plot summary...",
          "releaseDate": "2025-01-15",
          "year": 2025,
          "rating": 8.3,
          "tmdbVoteCount": 4567,
          "popularity": 123.4,
          "tmdbUrl": "https://www.themoviedb.org/movie/123",
          "genres": ["Action", "Drama"],
          "insertedAt": 1734300000000,
          "updatedAt": 1734300000000
        }
      ],
      "cachedAt": 1734300000000
    }
  }

cURL:
  curl -X GET "BASE_URL/api/movies"

Notes:
- \`movies\` is already filtered/merged from multiple sources; you do NOT need to call TMDB/Maoyan directly.
- When one of the upstream providers (Maoyan or TMDB) is unreachable, the service will fall back to the other
  provider and keep using any previously cached data.
- \`cachedAt\` is a Unix timestamp (ms) when the cache was last updated.
- This endpoint is suitable for read-only, high-frequency agent queries.
`
