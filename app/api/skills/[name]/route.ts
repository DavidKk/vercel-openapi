import JSZip from 'jszip'
import type { NextRequest } from 'next/server'

import packageJson from '@/package.json'
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
  let bundleName = bundle.name
  let bundleFiles = bundle.files

  if (bundleName === 'all' && includes !== null) {
    const filteredFiles = bundleFiles.filter((file) => includes.some((inc) => file.path.includes(inc)))
    if (filteredFiles.length === 0) {
      return new Response('No skill files for given includes. Use ?includes=exchange-rate,fuel-price,geo etc.', {
        status: 400,
      })
    }
    bundleFiles = filteredFiles
  }

  const origin = req.nextUrl.origin
  const zip = new JSZip()

  const fileMetaByPath = new Map<
    string,
    {
      name: string
      description: string
    }
  >()
  for (const b of skillBundles) {
    for (const f of b.files) {
      const prev = fileMetaByPath.get(f.path)
      if (prev) continue

      const nextMetadata = b.metadata ?? null
      if (!nextMetadata) continue

      const name = typeof nextMetadata.name === 'string' ? nextMetadata.name : ''
      const description = typeof nextMetadata.description === 'string' ? nextMetadata.description : ''
      if (!name || !description) continue

      fileMetaByPath.set(f.path, { name, description })
    }
  }

  const manifest = {
    version: packageJson.version,
    /**
     * File list inside the ZIP (use this to decide which skill docs to load into LLM context).
     * Note: this is intentionally small and does not include markdown contents.
     */
    files: bundleFiles.map((file) => {
      const meta = fileMetaByPath.get(file.path)
      return {
        path: file.path,
        name: meta?.name ?? '',
        description: meta?.description ?? '',
      }
    }),
  }

  zip.file('index.json', JSON.stringify(manifest, null, 2))

  for (const file of bundleFiles) {
    const resolvedContent = file.content.replace(/BASE_URL/g, origin)
    zip.file(file.path, resolvedContent)
  }

  const zipContent = await zip.generateAsync({ type: 'nodebuffer' })

  return new Response(zipContent, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="unbnd-${bundleName}.zip"`,
      'Cache-Control': 'public, max-age=600',
    },
  })
}
