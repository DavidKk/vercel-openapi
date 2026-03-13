'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { TbChevronDown, TbSearch } from 'react-icons/tb'

import { CONTENT_HEADER_CLASS, FILTER_BUTTON_CLASS } from '@/app/Nav/constants'
import type { MergedMovie } from '@/services/maoyan/types'
import { isHot } from '@/services/movies/popularity'

/** Genre name (zh-CN or en) → English label for dropdown */
const GENRE_LABEL_EN: Record<string, string> = {
  动作: 'Action',
  冒险: 'Adventure',
  动画: 'Animation',
  喜剧: 'Comedy',
  犯罪: 'Crime',
  纪录: 'Documentary',
  剧情: 'Drama',
  家庭: 'Family',
  奇幻: 'Fantasy',
  历史: 'History',
  恐怖: 'Horror',
  音乐: 'Music',
  悬疑: 'Mystery',
  爱情: 'Romance',
  科幻: 'Science Fiction',
  电视电影: 'TV Movie',
  惊悚: 'Thriller',
  战争: 'War',
  西部: 'Western',
  Action: 'Action',
  Adventure: 'Adventure',
  Animation: 'Animation',
  Comedy: 'Comedy',
  Crime: 'Crime',
  Documentary: 'Documentary',
  Drama: 'Drama',
  Family: 'Family',
  Fantasy: 'Fantasy',
  History: 'History',
  Horror: 'Horror',
  Music: 'Music',
  Mystery: 'Mystery',
  Romance: 'Romance',
  'Science Fiction': 'Science Fiction',
  'TV Movie': 'TV Movie',
  Thriller: 'Thriller',
  War: 'War',
  Western: 'Western',
}

function genreToLabelEn(name: string): string {
  return GENRE_LABEL_EN[name] ?? name
}

interface MovieListProps {
  movies: MergedMovie[]
  cachedAt: number
}

/**
 * Movies overview grid, inspired by veil's desktop card layout.
 * Masonry-like grid: poster on top, key badges and minimal text below.
 */
export function MovieList(props: MovieListProps) {
  const { movies, cachedAt } = props
  const dateStr = cachedAt ? new Date(cachedAt).toLocaleString() : '—'

  const genres = useMemo(() => {
    const set = new Set<string>()
    for (const m of movies) {
      m.genres?.forEach((g) => set.add(g))
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [movies])

  const [hotTab, setHotTab] = useState<'all' | 'popular'>('all')
  const [selectedGenre, setSelectedGenre] = useState<string>('all')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const pickerRef = useRef<HTMLDivElement>(null)

  const filteredMovies = useMemo(() => {
    let list = hotTab === 'popular' ? movies.filter(isHot) : movies
    if (selectedGenre !== 'all') list = list.filter((m) => m.genres?.includes(selectedGenre))
    return list
  }, [movies, hotTab, selectedGenre])

  const genreOptions = useMemo(() => {
    const options: Array<{ value: string; label: string }> = [{ value: 'all', label: 'All' }]
    genres.forEach((g) => options.push({ value: g, label: genreToLabelEn(g) }))
    if (!searchQuery.trim()) return options
    const q = searchQuery.toLowerCase()
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [genres, searchQuery])

  function handleSelectGenre(value: string) {
    setPickerOpen(false)
    setSearchQuery('')
    setSelectedGenre(value)
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const sourceFlags = useMemo(() => {
    let hasMaoyan = false
    let hasTmdb = false
    for (const m of movies) {
      if (m.sources?.some((s) => s === 'topRated' || s === 'mostExpected')) {
        hasMaoyan = true
      }
      if (m.sources?.some((s) => s === 'tmdbPopular' || s === 'tmdbUpcoming') || m.tmdbId != null) {
        hasTmdb = true
      }
    }
    return { hasMaoyan, hasTmdb }
  }, [movies])

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      {/* Header: title + Hot TABs + Genre dropdown */}
      <div className={CONTENT_HEADER_CLASS}>
        <div className="text-sm font-semibold text-gray-900">Recently Released Movies</div>
        <div className="ml-auto flex items-center gap-2">
          {/* Hot filter: TAB (click to toggle, active highlighted); height aligned with FILTER_BUTTON_CLASS */}
          <div className="flex h-[38px] items-stretch rounded-lg border border-gray-200 bg-gray-50 p-1" role="tablist" aria-label="Filter by popularity">
            <button
              type="button"
              role="tab"
              aria-selected={hotTab === 'all'}
              onClick={() => setHotTab('all')}
              className={`flex items-center rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                hotTab === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={hotTab === 'popular'}
              onClick={() => setHotTab('popular')}
              className={`flex items-center rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                hotTab === 'popular' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Popular
            </button>
          </div>
          {/* Genre: dropdown with search */}
          {genres.length > 0 && (
            <div className="relative" ref={pickerRef}>
              <button
                type="button"
                onClick={() => setPickerOpen((open) => !open)}
                className={FILTER_BUTTON_CLASS}
                aria-label="Filter by genre"
                aria-expanded={pickerOpen}
                aria-haspopup="listbox"
              >
                <TbSearch className="h-4 w-4 text-gray-500" />
                {selectedGenre === 'all' ? 'Genre' : genreToLabelEn(selectedGenre)}
                <TbChevronDown className="h-4 w-4 text-gray-500" />
              </button>
              {pickerOpen && (
                <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-2 shadow-lg" role="listbox">
                  <div className="border-b border-gray-100 px-2 pb-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search genre…"
                      className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-gray-400"
                      aria-label="Search genre"
                    />
                  </div>
                  <ul className="max-h-56 overflow-auto">
                    {genreOptions.length === 0 ? (
                      <li className="px-3 py-2.5 text-xs text-gray-500">No match</li>
                    ) : (
                      genreOptions.map((o) => (
                        <li key={o.value}>
                          <button
                            type="button"
                            onClick={() => handleSelectGenre(o.value)}
                            className="w-full px-3 py-2.5 text-left text-xs text-gray-800 hover:bg-gray-100"
                            role="option"
                          >
                            {o.label}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto border-b border-gray-200 bg-gray-50 px-3 py-3">
        {filteredMovies.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-md border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-500">
            No movies match the current filters. They will appear here after the next successful refresh.
          </div>
        ) : (
          <div className="grid auto-rows-min grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
            {filteredMovies.map((movie) => {
              const key = movie.tmdbId ?? String(movie.maoyanId) ?? movie.name
              const poster = movie.tmdbPoster || movie.poster

              return (
                <article key={key} className="group flex h-full flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200 transition-shadow hover:shadow-md">
                  <div className="relative aspect-[2/3] w-full overflow-hidden bg-gray-200">
                    {poster && (
                      <img src={poster} alt={movie.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" width={320} height={480} />
                    )}
                    <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between p-2 text-[10px]">
                      <div className="flex flex-wrap items-start gap-1">
                        {isHot(movie) && <span className="rounded-full bg-amber-500 px-2 py-0.5 font-medium text-white shadow-sm">Hot</span>}
                        {movie.tmdbUrl && (
                          <a
                            href={movie.tmdbUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="pointer-events-auto rounded-full bg-white/85 px-2 py-0.5 font-medium text-gray-700 shadow-sm hover:bg-white"
                          >
                            TMDB
                          </a>
                        )}
                        {movie.maoyanUrl && (
                          <a
                            href={movie.maoyanUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="pointer-events-auto rounded-full bg-white/85 px-2 py-0.5 font-medium text-gray-700 shadow-sm hover:bg-white"
                          >
                            Maoyan
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col gap-1 p-3">
                    <div className="line-clamp-2 text-sm font-semibold text-gray-900">
                      {movie.tmdbUrl || movie.maoyanUrl ? (
                        <a href={movie.tmdbUrl ?? movie.maoyanUrl} target="_blank" rel="noreferrer" className="hover:underline">
                          {movie.name}
                        </a>
                      ) : (
                        movie.name
                      )}
                    </div>

                    {(movie.year || movie.rating != null) && (
                      <div className="flex flex-wrap items-center gap-1 text-[10px] text-gray-600">
                        {movie.year && <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium">{movie.year}</span>}
                        {movie.rating != null && <span className="rounded-full bg-yellow-50 px-2 py-0.5 font-medium text-yellow-700">Rating {movie.rating.toFixed(1)}</span>}
                      </div>
                    )}

                    {movie.genres?.length ? <div className="line-clamp-1 text-[10px] text-gray-500">{movie.genres.join(', ')}</div> : null}

                    {movie.overview && <p className="mt-1 line-clamp-3 text-[11px] leading-snug text-gray-600">{movie.overview}</p>}

                    {(movie.wish != null || movie.tmdbVoteCount != null || movie.popularity != null) && (
                      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-gray-500">
                        {movie.wish != null && <span>Maoyan wish: {movie.wish}</span>}
                        {movie.tmdbVoteCount != null && <span>TMDB votes: {movie.tmdbVoteCount}</span>}
                        {movie.popularity != null && <span>Popularity: {movie.popularity.toFixed(1)}</span>}
                      </div>
                    )}
                  </div>

                  {/* no bottom link bar; TMDB / Maoyan badges are overlaid on the poster */}
                </article>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-gray-200 px-3 py-1 text-[11px] text-gray-500">
        <span>
          {sourceFlags.hasMaoyan && sourceFlags.hasTmdb && 'Latest movies are loaded from cached Maoyan + TMDB data.'}
          {!sourceFlags.hasMaoyan && sourceFlags.hasTmdb && 'Latest movies are loaded from cached TMDB data (Maoyan unavailable).'}
          {sourceFlags.hasMaoyan && !sourceFlags.hasTmdb && 'Latest movies are loaded from cached Maoyan data (TMDB unavailable).'}
          {!sourceFlags.hasMaoyan && !sourceFlags.hasTmdb && 'No upstream movie data available. Check Maoyan and TMDB connectivity.'}
        </span>
        <span>Updated: {dateStr}</span>
      </div>
    </div>
  )
}
