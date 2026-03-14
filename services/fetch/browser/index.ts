/**
 * Browser-only fetch helpers. Use in client components to avoid duplicate requests
 * and to apply request patterns (singleton, retry, sequential, etc.).
 */

export { buildRequestKey, withSingletonRequest } from './singleton'
