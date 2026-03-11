import JSZip from 'jszip'
import type { NextRequest } from 'next/server'

import { skillBundles } from '@/skills'

/**
 * Handle GET requests for skill bundles and return them as ZIP archives.
 * All occurrences of BASE_URL in skill contents are replaced with the current request origin,
 * so downloaded skills contain fully resolved URLs pointing back to this deployment.
 * @param req Incoming HTTP request
 * @param context Route context containing the dynamic "name" parameter
 * @returns ZIP archive response when a bundle is found, or a 404 response when no bundle is available
 */
export async function GET(req: NextRequest, context: { params: Promise<{ name: string }> }): Promise<Response> {
  const { name } = await context.params

  const bundle = skillBundles.find((item) => item.name === name) ?? skillBundles.find((item) => item.name === 'all')

  if (!bundle) {
    return new Response('Skill bundle not found', { status: 404 })
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
