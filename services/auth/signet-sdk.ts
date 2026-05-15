const DEFAULT_SIGNET_ORIGIN = 'https://vercel-2fa.vercel.app'
const DEFAULT_SIGNET_SDK_PATH = '/sdk/signet-client.mjs'

interface SignetVerifyResult {
  ok: boolean
  status: number
  response: {
    data?: SignetVerifyData
    message?: string
  } | null
  error?: string
}

export interface SignetVerifyData {
  access_token?: string
  user?: {
    sub?: string
    username?: string
    preferred_username?: string
    email?: string
    authenticated?: boolean
  }
  claims?: Record<string, unknown>
}

interface SignetClientSdk {
  buildLoginUrl(options: { authCenterOrigin: string; redirectUrl: string; state?: string }): string
  parseLoginCallbackParams(input: URLSearchParams | string): { token: string | null; state: string | null }
  verifyTokenAtAuthCenter(options: { authCenterOrigin: string; token: string; audience?: string; scope?: string; fetch?: typeof fetch }): Promise<SignetVerifyResult>
}

let signetSdkPromise: Promise<SignetClientSdk> | null = null

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/+$/, '')
}

function getSignetOriginFromSdkUrl(): string | null {
  const sdkUrl = process.env.SIGNET_SDK_URL || process.env.NEXT_PUBLIC_SIGNET_SDK_URL
  if (!sdkUrl) {
    return null
  }

  try {
    return normalizeOrigin(new URL(sdkUrl).origin)
  } catch {
    return null
  }
}

/**
 * Resolve Signet auth center origin from env.
 * @returns Normalized origin without trailing slash
 */
export function getSignetOrigin(): string {
  const origin = process.env.SIGNET_ORIGIN || process.env.SIGNET_AUTH_ORIGIN || process.env.NEXT_PUBLIC_SIGNET_ORIGIN || getSignetOriginFromSdkUrl() || DEFAULT_SIGNET_ORIGIN
  return normalizeOrigin(origin)
}

/**
 * Resolve the hosted Signet SDK URL.
 * @returns Absolute SDK module URL
 */
export function getSignetSdkUrl(): string {
  return process.env.SIGNET_SDK_URL || process.env.NEXT_PUBLIC_SIGNET_SDK_URL || `${getSignetOrigin()}${DEFAULT_SIGNET_SDK_PATH}`
}

/**
 * Whether Signet login should be shown in UI.
 * @returns True when Signet login is enabled
 */
export function isSignetLoginEnabled(): boolean {
  return process.env.ENABLE_SIGNET_LOGIN !== '0'
}

/**
 * Load the hosted Signet SDK in Node/Next Route Handlers.
 * @returns Cached Signet SDK module
 */
export async function loadSignetSdk(): Promise<SignetClientSdk> {
  signetSdkPromise ??= fetch(getSignetSdkUrl(), { cache: 'force-cache' })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load Signet SDK: ${response.status}`)
      }
      return response.text()
    })
    .then((source) => import(/* webpackIgnore: true */ `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`) as Promise<SignetClientSdk>)

  return signetSdkPromise
}
