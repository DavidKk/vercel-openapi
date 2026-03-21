import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { CACHE_CONTROL_NO_STORE, CACHE_CONTROL_PROXY_REDIRECT } from '@/initializer/response'
import { MAOYAN } from '@/services/maoyan/constants'
import { TMDB } from '@/services/tmdb/constants'

const REDIRECTS: Record<string, (path: string[]) => string | null> = {
  maoyan: (segments) => {
    if (segments[0] === 'film' && segments[1]) return `${MAOYAN.FILM_PAGE_BASE}${encodeURIComponent(segments[1])}`
    return null
  },
  tmdb: (segments) => {
    if (segments[0] === 'movie' && segments[1]) return `${TMDB.MOVIE_PAGE_BASE}${encodeURIComponent(segments[1])}`
    if (segments[0] === 'image' && segments.length >= 3) return `${TMDB.POSTER_BASE.replace(/w500$/, '')}${segments.slice(1).join('/')}`
    return null
  },
}

export async function GET(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path: pathSegments } = await context.params
  if (pathSegments.length < 2) {
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers: { 'Cache-Control': CACHE_CONTROL_NO_STORE } })
  }
  const [provider, ...rest] = pathSegments
  const redirect = REDIRECTS[provider]?.(rest)
  if (!redirect) {
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers: { 'Cache-Control': CACHE_CONTROL_NO_STORE } })
  }
  return NextResponse.redirect(redirect, {
    headers: { 'Cache-Control': CACHE_CONTROL_PROXY_REDIRECT },
  })
}
