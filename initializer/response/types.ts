/** Standard API response envelope. */
export interface StandardResponse {
  code: number
  message: string
  data: any
}

/** Optional fields when building a standard response. */
export interface StandardResponseInit {
  code?: number
  message?: string
  data?: any
}

/** Common response options for API helpers. */
export interface ResponseInit {
  status?: number
  headers?: HeadersInit
}

/** Common options for error response helpers. */
export interface ErrorResponseInit extends ResponseInit {
  code?: number
}
