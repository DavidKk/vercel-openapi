'use client'

import { useRequest } from 'ahooks'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { TbCheck, TbEye, TbEyeOff, TbLock, TbShieldCheck, TbUser } from 'react-icons/tb'

import Alert, { type AlertImperativeHandler } from '@/components/Alert'
import { Spinner } from '@/components/Spinner'

export interface LoginFormProps {
  enable2FA?: boolean
  enableSignet?: boolean
  redirectUrl?: string
}

/**
 * Login form with optional 2FA input, remember-me, and optional Signet entry.
 * @param props Login form settings
 * @returns Login form component
 */
export function LoginForm(props: Readonly<LoginFormProps>) {
  const { enable2FA = false, enableSignet = false, redirectUrl = '/' } = props
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [access2FAToken, setAccess2FAToken] = useState('')
  const [complete, setComplete] = useState(false)
  const alertRef = useRef<AlertImperativeHandler>(null)
  const prev2FACompletionRef = useRef(false)
  const router = useRouter()

  const { withIconLeft, passwordInput, plainField, shell, checkboxLabel } = useMemo(() => {
    const base =
      'w-full rounded-lg border border-slate-200 bg-white py-2.5 text-base text-slate-900 shadow-sm placeholder:text-slate-400 placeholder:tracking-normal transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/25'
    return {
      shell: 'min-h-screen flex flex-col items-center justify-center bg-slate-100 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100',
      withIconLeft: `${base} pl-10 pr-3.5`,
      passwordInput: `${base} pl-10 pr-10`,
      plainField: `${base} px-3.5`,
      checkboxLabel: 'flex w-full cursor-pointer select-none items-center gap-2 text-sm text-slate-600 dark:text-slate-400',
    }
  }, [])

  const { run: submit, loading: submitting } = useRequest(
    async () => {
      if (!username || !password) {
        throw new Error('Username and password are required')
      }

      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, token: access2FAToken, rememberMe }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok || result?.code !== 0) {
        throw new Error(result?.message ?? 'Invalid username or password')
      }
    },
    {
      manual: true,
      throttleWait: 1000,
      onSuccess: () => {
        setComplete(true)
        router.push(redirectUrl)
        router.refresh()
      },
      onError: (error: Error) => {
        alertRef.current?.show(error.message, { type: 'error' })
      },
    }
  )

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting || complete) {
      return
    }
    submit()
  }

  /**
   * Automatically attempt login when a full 6-digit 2FA token is entered.
   * It triggers only on the transition "incomplete -> complete" to avoid repeat submissions.
   */
  useEffect(() => {
    if (!enable2FA) {
      prev2FACompletionRef.current = false
      return
    }

    const isComplete = /^\d{6}$/.test(access2FAToken)
    const wasComplete = prev2FACompletionRef.current
    prev2FACompletionRef.current = isComplete

    if (!isComplete || wasComplete) {
      return
    }

    if (complete || submitting) {
      return
    }

    if (!username || !password) {
      return
    }

    submit()
  }, [access2FAToken, complete, enable2FA, password, submitting, submit, username])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const params = new URLSearchParams(window.location.search)
    const err = params.get('error')
    if (!err) {
      return
    }
    const message =
      err === 'signet_state'
        ? 'Signet login could not validate state. Please try again.'
        : err === 'signet_verify'
          ? 'Signet login verification failed. Check configuration and try again.'
          : `Login error: ${err}`
    alertRef.current?.show(message, { type: 'error' })
    params.delete('error')
    const qs = params.toString()
    const path = qs ? `${window.location.pathname}?${qs}` : window.location.pathname
    window.history.replaceState(null, '', path)
  }, [])

  return (
    <div className={shell}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl border border-slate-200/90 bg-white p-6 shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/40"
      >
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Unbnd</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Sign in to continue to Unbnd</p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="relative w-full">
            <TbUser className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" aria-hidden />
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Username"
              required
              autoComplete="username"
              className={withIconLeft}
            />
          </div>

          <div className="relative w-full">
            <TbLock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" aria-hidden />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              required
              autoComplete="current-password"
              className={passwordInput}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <TbEyeOff className="h-4 w-4" /> : <TbEye className="h-4 w-4" />}
            </button>
          </div>

          {enable2FA && (
            <input
              className={`${plainField} text-center text-lg tracking-[0.35em]`}
              value={access2FAToken}
              onChange={(event) => setAccess2FAToken(event.target.value)}
              placeholder="2FA code"
              maxLength={6}
              pattern="[0-9]{6}"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
            />
          )}

          <label className={checkboxLabel}>
            <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
              <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="peer sr-only" />
              <span className="absolute inset-0 rounded border border-slate-300 bg-white transition-colors peer-checked:border-indigo-600 peer-checked:bg-indigo-600 dark:border-slate-600 dark:bg-slate-900 peer-checked:dark:border-indigo-500 peer-checked:dark:bg-indigo-600" />
              <TbCheck className="relative h-3.5 w-3.5 text-white opacity-0 transition-opacity peer-checked:opacity-100" aria-hidden />
            </span>
            <span>Remember me</span>
          </label>

          <button
            disabled={submitting || complete}
            type="submit"
            className="flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            {submitting ? (
              <span className="inline-flex items-center justify-center gap-2" aria-live="polite">
                <Spinner />
                <span>Signing in...</span>
              </span>
            ) : complete ? (
              <span>Redirecting...</span>
            ) : (
              <span>Sign in</span>
            )}
          </button>

          {enableSignet ? (
            <div className="flex flex-col gap-3">
              <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden>
                  <div className="w-full border-t border-slate-200 dark:border-slate-700" />
                </div>
                <div className="relative flex justify-center text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  <span className="bg-white px-3 dark:bg-slate-900">Or continue with</span>
                </div>
              </div>
              <a
                href={`/api/auth/signet/start?redirectUrl=${encodeURIComponent(redirectUrl)}`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:hover:border-slate-500 dark:hover:bg-slate-800"
              >
                <TbShieldCheck className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden />
                <span>Sign in with Signet</span>
              </a>
            </div>
          ) : null}

          <Alert ref={alertRef} />
        </div>
      </form>
    </div>
  )
}
