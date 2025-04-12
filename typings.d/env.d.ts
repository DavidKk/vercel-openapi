declare namespace NodeJS {
  interface ProcessEnv {
    /** time of project build */
    NEXT_PUBLIC_BUILD_TIME: string
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
  }
}
