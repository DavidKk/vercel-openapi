import { isStandardResponse, standardResponseError } from './standard'
import type { ErrorResponseInit, ResponseInit } from './types'

/** Turn unknown error into a string message (standard response, Error, or string). */
export function stringifyUnknownError(error: unknown) {
  if (isStandardResponse(error)) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  return JSON.stringify(error)
}

/** Error response for invalid parameters (code 1000). */
export function invalidParameters(message = 'invalid parameters') {
  return standardResponseError(message, { code: 1000 })
}

/** Error response for unauthorized (code 2000). */
export function unauthorized(message = 'unauthorized') {
  return standardResponseError(message, { code: 2000 })
}

/** Error response for forbidden (code 2003). */
export function forbidden(message = 'forbidden') {
  return standardResponseError(message, { code: 2003 })
}

/** 400 plain-text invalid parameters. */
export function textInvalidParameters(message: string, options: ResponseInit = {}) {
  return invalidParameters(message).toTextResponse(400, options)
}

/** 401 plain-text unauthorized. */
export function textUnauthorized(message = 'unauthorized', options: ResponseInit = {}) {
  return unauthorized(message).toTextResponse(401, options)
}

/** 400 JSON invalid parameters. */
export function jsonInvalidParameters(message: string, options: ErrorResponseInit = {}) {
  return invalidParameters(message).toJsonResponse(400, options)
}

/** 401 JSON unauthorized. */
export function jsonUnauthorized(message = 'unauthorized', options: ErrorResponseInit = {}) {
  return unauthorized(message).toJsonResponse(401, options)
}

/** 403 JSON forbidden. */
export function jsonForbidden(message = 'forbidden', options: ErrorResponseInit = {}) {
  return forbidden(message).toJsonResponse(403, options)
}
