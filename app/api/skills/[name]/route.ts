import JSZip from 'jszip'
import type { NextRequest } from 'next/server'

import { createLogger } from '@/services/logger'
import { skillBundles } from '@/skills'

const logger = createLogger('api-skills')

/**
 * Parse ?includes=exchange-rate,fuel-price for filtering "all" bundle (same semantics as /api/mcp).
 */
function getIncludesFromRequest(req: NextRequest): string[] | null {
  const includes = req.nextUrl.searchParams
    .get('includes')
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return includes?.length ? includes : null
}

/**
 * Handle GET requests for skill bundles and return them as ZIP archives.
 * For bundle "all", use ?includes=exchange-rate,fuel-price to include only those modules (same as /api/mcp).
 * All occurrences of BASE_URL in skill contents are replaced with the current request origin.
 * @param req Incoming HTTP request
 * @param context Route context containing the dynamic "name" parameter
 * @returns ZIP archive response when a bundle is found, or a 404 response when no bundle is available
 */
export async function GET(req: NextRequest, context: { params: Promise<{ name: string }> }): Promise<Response> {
  const { name } = await context.params
  logger.info('request', { name })

  let bundle = skillBundles.find((item) => item.name === name) ?? skillBundles.find((item) => item.name === 'all')

  if (!bundle) {
    logger.warn('skill bundle not found', { name })
    return new Response('Skill bundle not found', { status: 404 })
  }

  const includes = getIncludesFromRequest(req)
  if (bundle.name === 'all' && includes !== null) {
    const filteredFiles = bundle.files.filter((file) => includes.some((inc) => file.path.includes(inc)))
    if (filteredFiles.length === 0) {
      return new Response('No skill files for given includes. Use ?includes=exchange-rate,fuel-price,geo etc.', {
        status: 400,
      })
    }
    bundle = { name: 'all', files: filteredFiles }
  }

  const origin = req.nextUrl.origin
  const zip = new JSZip()

  for (const file of bundle.files) {
    const resolvedContent = file.content.replace(/BASE_URL/g, origin)
    zip.file(file.path, resolvedContent)
  }

  const zipContent = await zip.generateAsync({ type: 'nodebuffer' })

  return new Response(zipContent, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${bundle.name}.zip"`,
      'Cache-Control': 'public, max-age=600',
    },
  })
}
