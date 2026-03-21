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
    /** TMDB language (e.g. zh-CN) */
    TMDB_LANGUAGE?: string
    /** TMDB region */
    TMDB_REGION?: string
    /** Secret for cron routes (e.g. /api/cron/sync/movies-sync, tasi-sync) */
    CRON_SECRET?: string
    /** Finance feed (TASI) base URL: GET .../api/finance/tasi/company/daily (array), .../summary/daily (object) */
    TASI_FEED_URL?: string
    /** FreeCurrencyAPI.com key (optional; when set, exchange rate uses it instead of no-key fallback) */
    FREECURRENCYAPI_API_KEY?: string
    /** QWeather API key (weather module) */
    QWEATHER_API_KEY?: string
    /**
     * Opt-in only: unset = normal caching. When explicitly `1` / `true` / `yes`, skip app-layer caches
     * (e.g. news merged pool L1/L2/KV) and force `Cache-Control: private, no-store` on standard JSON helpers.
     */
    DISABLE_CACHE?: string
  }
}
