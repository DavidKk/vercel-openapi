declare namespace NodeJS {
  interface ProcessEnv {
    /** GitHub Gist Id */
    GIST_ID: string
    /** GitHub Gist Token */
    GIST_TOKEN: string
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
    /** Secret for cron routes (e.g. /api/cron/sync/movies-gist) */
    CRON_SECRET?: string
    /** FreeCurrencyAPI.com key (optional; when set, exchange rate uses it instead of no-key fallback) */
    FREECURRENCYAPI_API_KEY?: string
    /** QWeather API key (weather module) */
    QWEATHER_API_KEY?: string
  }
}
