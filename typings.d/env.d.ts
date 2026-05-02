declare namespace NodeJS {
  interface ProcessEnv {
    /** Admin Username */
    ACCESS_USERNAME: string
    /** Admin Password */
    ACCESS_PASSWORD: string
    /** 2FA Secret */
    ACCESS_2FA_SECRET?: string
    /** JWT Secret */
    JWT_SECRET: string
    /** JWT Token Expiration Time */
    JWT_EXPIRES_IN: string
    /** TMDB API Key (for movies module merge/cron) */
    TMDB_API_KEY?: string
    /**
     * When unset, TMDB popular/upcoming lists are merged whenever `TMDB_API_KEY` is set.
     * Set to `0`, `false`, `no`, or `off` to fetch Maoyan only (keep key for other TMDB calls if any).
     */
    MOVIES_TMDB_LISTS?: string
    /** TMDB language (e.g. zh-CN) */
    TMDB_LANGUAGE?: string
    /** TMDB region */
    TMDB_REGION?: string
    /** Secret for cron routes (e.g. /api/cron/sync/movies-sync, tasi-sync) */
    CRON_SECRET?: string
    /**
     * Finance feed (TASI) base URL: GET .../market/company/daily?market=TASI (array),
     * .../market/summary/daily?market=TASI (object). Legacy /api/finance/tasi/* aliases same handlers.
     */
    TASI_FEED_URL?: string
    /** Preferred feed request headers JSON. Example: {"x-api-key":"...","x-internal-call":"vercel"} */
    TASI_FEED_REQUEST_HEADERS_JSON?: string
    /** Header key for feed auth header (default: x-api-key) */
    TASI_FEED_X_API_KEY_HEADER_KEY?: string
    /** Header value for feed auth header */
    TASI_FEED_X_API_KEY_HEADER_VALUE?: string
    /** Header key for internal-call header (default: x-internal-call) */
    TASI_FEED_X_INTERNAL_CALL_HEADER_KEY?: string
    /** Header value for internal-call header */
    TASI_FEED_X_INTERNAL_CALL_HEADER_VALUE?: string
    /** SAHMK API key (used by GET /api/finance/market/summary/hourly?market=TASI and cron hourly sync mode) */
    SAHMK_API_KEY?: string
    /** Optional SAHMK API base URL override. Default: https://app.sahmk.sa/api/v1 */
    SAHMK_API_BASE_URL?: string
    /** FreeCurrencyAPI.com key (optional; when set, exchange rate uses it instead of no-key fallback) */
    FREECURRENCYAPI_API_KEY?: string
    /** QWeather API key (weather module) */
    QWEATHER_API_KEY?: string
    /** Optional ZeroOmega rules JSON URL (HTTPS) for proxy-rule merge */
    ZERO_OMEGA_RULES_JSON_URL?: string
    /**
     * Opt-in only: unset = normal caching. When explicitly `1` / `true` / `yes`, skip app-layer caches
     * and force `Cache-Control: private, no-store` on standard JSON helpers.
     */
    DISABLE_CACHE?: string
  }
}
