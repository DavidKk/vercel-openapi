'use client'

import { useRequest } from 'ahooks'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

import Alert, { type AlertImperativeHandler } from '@/components/Alert'
import { Spinner } from '@/components/Spinner'

export interface LoginFormProps {
  enable2FA?: boolean
  redirectUrl?: string
}

/**
 * Login form with optional 2FA input.
 * @param props Login form settings
 * @returns Login form component
 */
export function LoginForm(props: Readonly<LoginFormProps>) {
  const { enable2FA = false, redirectUrl = '/' } = props
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [access2FAToken, setAccess2FAToken] = useState('')
  const [complete, setComplete] = useState(false)
  const alertRef = useRef<AlertImperativeHandler>(null)
  const router = useRouter()

  const { run: submit, loading: submitting } = useRequest(
    async () => {
      if (!username || !password) {
        throw new Error('Username and password are required')
      }

      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, token: access2FAToken }),
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
    submit()
  }

  return (
    <div className="flex h-full justify-center bg-gray-100 pt-[20vh]">
      <form onSubmit={handleSubmit} className="flex w-full max-w-lg flex-col items-center gap-4 p-4">
        <h1 className="text-2xl">Login</h1>
        <input
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Username"
          required
          className="mt-1 w-full rounded-md border px-3 py-2 text-lg placeholder:tracking-normal focus:border-indigo-500 focus:ring-indigo-500"
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          required
          className="mt-1 w-full rounded-md border px-3 py-2 text-lg placeholder:tracking-normal focus:border-indigo-500 focus:ring-indigo-500"
        />
        {enable2FA && (
          <input
            className="mt-1 w-full rounded-md border px-3 py-2 text-center text-lg tracking-[1em] placeholder:tracking-normal focus:border-indigo-500 focus:ring-indigo-500"
            value={access2FAToken}
            onChange={(event) => setAccess2FAToken(event.target.value)}
            placeholder="2FA Code"
            maxLength={6}
            pattern="\d{6}"
            required
          />
        )}
        <button
          disabled={submitting || complete}
          type="submit"
          className="relative w-full max-w-lg rounded bg-gray-900 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (
            <span className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2">
              <Spinner />
            </span>
          ) : complete ? (
            <span>Signing in...</span>
          ) : (
            <span>Login</span>
          )}
        </button>
        <Alert ref={alertRef} />
      </form>
    </div>
  )
}
