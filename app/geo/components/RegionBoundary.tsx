'use client'

import { useState } from 'react'

/**
 * Parses polygon string from API: "lng lat,lng lat,..." into array of [lng, lat].
 * @param polygon Raw polygon from china_geo (lng lat pairs comma-separated)
 * @returns Array of [lng, lat] or empty array if invalid
 */
function parsePolygon(polygon: string): [number, number][] {
  if (!polygon?.trim()) return []
  return polygon
    .trim()
    .split(',')
    .map((s) => {
      const parts = s.trim().split(/\s+/)
      const lng = parseFloat(parts[0])
      const lat = parseFloat(parts[1])
      return [lng, lat] as [number, number]
    })
    .filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat))
}

/**
 * Polygon area centroid (center of mass of the 2D polygon). Always inside for convex polygons;
 * for concave ones it is a better "middle" than the vertex average.
 * @param pts Closed polygon vertices as [x, y] in SVG space
 * @returns [cx, cy] or null if area is zero
 */
function polygonAreaCentroid(pts: [number, number][]): [number, number] | null {
  if (pts.length < 3) return null
  let area = 0
  let cx = 0
  let cy = 0
  const n = pts.length
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    const cross = pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1]
    area += cross
    cx += (pts[i][0] + pts[j][0]) * cross
    cy += (pts[i][1] + pts[j][1]) * cross
  }
  area *= 0.5
  if (Math.abs(area) < 1e-10) return null
  const inv = 1 / (6 * area)
  return [cx * inv, cy * inv]
}

/**
 * Compute bounding box and map geographic coords to SVG coords (north-up, with padding).
 * @param points Array of [lng, lat]
 * @param width SVG width
 * @param height SVG height
 * @param paddingRatio Padding as fraction of range (e.g. 0.05 = 5%)
 * @returns Object with path points and bbox for viewBox
 */
const VIEWBOX_TRIM_MARGIN = 2

/** Region path occupies this fraction of the viewBox (rest is whitespace). */
const REGION_VIEW_RATIO = 0.4

function projectToSvg(
  points: [number, number][],
  width: number,
  height: number,
  paddingRatio = 0.12
): {
  path: string
  viewBox: string
  pointToSvg: (lng: number, lat: number) => [number, number]
} {
  if (points.length === 0) {
    return { path: '', viewBox: `0 0 ${width} ${height}`, pointToSvg: () => [0, 0] }
  }
  const lngs = points.map(([lng]) => lng)
  const lats = points.map(([, lat]) => lat)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const rangeLng = maxLng - minLng || 0.01
  const rangeLat = maxLat - minLat || 0.01
  const padLng = rangeLng * paddingRatio
  const padLat = rangeLat * paddingRatio
  const totalLng = rangeLng + 2 * padLng
  const totalLat = rangeLat + 2 * padLat
  const scaleX = width / totalLng
  const scaleY = height / totalLat

  function toX(lng: number): number {
    return (lng - (minLng - padLng)) * scaleX
  }
  function toY(lat: number): number {
    return height - (lat - (minLat - padLat)) * scaleY
  }

  const path = points.map(([lng, lat], i) => `${i === 0 ? 'M' : 'L'} ${toX(lng)} ${toY(lat)}`).join(' ') + ' Z'

  const xs = points.map(([lng]) => toX(lng))
  const ys = points.map(([, lat]) => toY(lat))
  const contentMinX = Math.min(...xs)
  const contentMaxX = Math.max(...xs)
  const contentMinY = Math.min(...ys)
  const contentMaxY = Math.max(...ys)
  const contentW = contentMaxX - contentMinX + 2 * VIEWBOX_TRIM_MARGIN
  const contentH = contentMaxY - contentMinY + 2 * VIEWBOX_TRIM_MARGIN
  const viewBoxW = contentW / REGION_VIEW_RATIO
  const viewBoxH = contentH / REGION_VIEW_RATIO
  const viewBoxMinX = contentMinX - VIEWBOX_TRIM_MARGIN - (viewBoxW - contentW) / 2
  const viewBoxMinY = contentMinY - VIEWBOX_TRIM_MARGIN - (viewBoxH - contentH) / 2
  const viewBox = `${viewBoxMinX} ${viewBoxMinY} ${viewBoxW} ${viewBoxH}`

  return {
    path,
    viewBox,
    pointToSvg(lng: number, lat: number): [number, number] {
      return [toX(lng), toY(lat)]
    },
  }
}

/** Default size of the location marker (custom icon or built-in pin). */
const LOCATION_ICON_SIZE = 28

export interface RegionBoundaryProps {
  /** Polygon from API: "lng lat,lng lat,..." */
  polygon: string
  /** Optional query point (lat, lng) to show as marker */
  queryPoint?: { lat: number; lng: number }
  /** District name to show at polygon center (e.g. 区名) */
  districtName?: string
  /** Custom icon for current location (e.g. from react-icons). Rendered in a box of LOCATION_ICON_SIZE; tip/center will be at the point. Omit to use built-in pin. */
  locationIcon?: React.ReactNode
  /** Region line shown at top-left as DOM overlay (e.g. "广东省 · 佛山市 · 顺德区"). Does not scale with SVG. */
  regionLabel?: string
  /** Coordinates line shown at top-left as DOM overlay (e.g. "22.96042, 113.10984"). Does not scale with SVG. */
  coordsLabel?: string
  /** SVG width (default 320) */
  width?: number
  /** SVG height (default 200) */
  height?: number
  /** Accessibility label */
  'aria-label'?: string
}

/**
 * Renders the admin boundary polygon from the GEO API as SVG.
 * Optionally shows the query point and district name label at polygon center.
 */
export function RegionBoundary({
  polygon,
  queryPoint,
  districtName,
  locationIcon,
  regionLabel,
  coordsLabel,
  width = 320,
  height = 200,
  'aria-label': ariaLabel = 'Region boundary',
}: RegionBoundaryProps) {
  const points = parsePolygon(polygon)
  const { path, viewBox, pointToSvg } = projectToSvg(points, width, height, 0.12)
  const [qx, qy] = queryPoint ? pointToSvg(queryPoint.lng, queryPoint.lat) : [null, null]
  const [pinHovered, setPinHovered] = useState(false)

  const svgPoints = points.map(([lng, lat]) => pointToSvg(lng, lat)) as [number, number][]
  const centroid = polygonAreaCentroid(svgPoints)

  if (points.length < 3) {
    return (
      <div className="flex items-center justify-center rounded border border-gray-200 bg-gray-50 text-[11px] text-gray-500" style={{ width, height }}>
        No boundary data
      </div>
    )
  }

  return (
    <>
      <style>{`
        .region-boundary-path:hover {
          stroke-width: 2.5;
        }
        .region-boundary-path {
          transition: stroke-width 0.2s ease-out;
        }
        .region-boundary-pin {
          transition: transform 0.2s ease-out;
        }
        .region-boundary-pin-bounce {
          transform-origin: 0 0;
          animation: region-pin-bounce 1.6s linear infinite;
        }
        @keyframes region-pin-bounce {
          0%, 100% { transform: translateY(0) scale(1, 1); }
          5% { transform: translateY(-9px) scale(0.97, 1.03); }
          12% { transform: translateY(-15px) scale(0.92, 1.06); }
          26% { transform: translateY(-5px) scale(1.02, 0.98); }
          36% { transform: translateY(0) scale(1.18, 0.78); }
          40% { transform: translateY(0) scale(1, 1); }
        }
        .region-boundary-dot {
          transform-origin: 0 0;
          animation: region-dot-scale 1.6s linear infinite;
        }
        @keyframes region-dot-scale {
          0%, 100% { transform: scale(1); }
          5% { transform: scale(0.82); }
          12% { transform: scale(0.5); }
          26% { transform: scale(0.78); }
          36% { transform: scale(0.94); }
          40% { transform: scale(1); }
        }
        .region-boundary-pin-3d {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }
      `}</style>
      <div className="relative h-full w-full min-h-0">
        <svg width="100%" height="100%" viewBox={viewBox} preserveAspectRatio="xMidYMid meet" className="region-boundary-map block" aria-label={ariaLabel} role="img">
          <path d={path} fill="rgb(59 130 246 / 0.15)" stroke="rgb(59 130 246)" strokeWidth={1.5} strokeLinejoin="round" className="region-boundary-path" />
          {districtName && centroid && (
            <text
              x={centroid[0]}
              y={centroid[1]}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgb(31 41 55)"
              style={{ fontFamily: 'system-ui, sans-serif', fontSize: 13, fontWeight: 600 }}
              className="select-none"
            >
              {districtName}
            </text>
          )}
          {qx != null && qy != null && (
            <g aria-hidden transform={`translate(${qx}, ${qy})`}>
              <g transform="translate(0, 4)">
                <g className="region-boundary-dot">
                  <ellipse cx={0} cy={0} rx={5} ry={3} fill="rgb(239 68 68)" />
                </g>
              </g>
              <g
                className="region-boundary-pin"
                style={{
                  transform: `scale(${pinHovered ? 1.25 : 1})`,
                  transformOrigin: '0 0',
                }}
                onMouseEnter={() => setPinHovered(true)}
                onMouseLeave={() => setPinHovered(false)}
              >
                <g className="region-boundary-pin-bounce">
                  {locationIcon != null ? (
                    <foreignObject
                      x={-LOCATION_ICON_SIZE / 2}
                      y={-LOCATION_ICON_SIZE}
                      width={LOCATION_ICON_SIZE}
                      height={LOCATION_ICON_SIZE}
                      className="flex items-center justify-center"
                    >
                      <div className="region-boundary-pin-3d flex h-full w-full items-center justify-center text-red-500 [&>svg]:h-full [&>svg]:w-full">{locationIcon}</div>
                    </foreignObject>
                  ) : (
                    <path d="M 0 0 L -5 -14 A 5 5 0 1 1 5 -14 Z" fill="rgb(239 68 68)" stroke="white" strokeWidth={1.5} strokeLinejoin="round" />
                  )}
                </g>
              </g>
            </g>
          )}
        </svg>
        {(regionLabel || coordsLabel) && (
          <div className="pointer-events-none absolute left-0 top-0 flex flex-col gap-1 px-2 py-2 text-[11px]" aria-hidden>
            {regionLabel && <span className="text-gray-500">{regionLabel}</span>}
            {coordsLabel && <span className="font-mono font-medium text-gray-800">{coordsLabel}</span>}
          </div>
        )}
      </div>
    </>
  )
}
