import type { NextRequest } from 'next/server'

import packageJson from '@/package.json'
import { createLogger } from '@/services/logger'
import { skillBundles } from '@/skills'

const logger = createLogger('api-skills-index')

/**
 * GET /api/skills
 * Returns a small manifest of available skill bundles and their file paths.
 *
 * This enables clients/agents to fetch only the index first, then decide which
 * skill markdown files to load into LLM context (avoid sending everything every time).
 *
 * Query params are not required.
 *
 * @param req Incoming request
 * @returns JSON manifest
 */
export async function GET(req: NextRequest): Promise<Response> {
  logger.info('request', { url: req.url })

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

  return Response.json({
    version: packageJson.version,
    bundles: skillBundles.map((bundle) => ({
      name: bundle.name,
      files: bundle.files.map((file) => {
        const meta = fileMetaByPath.get(file.path)
        return {
          path: file.path,
          name: meta?.name ?? '',
          description: meta?.description ?? '',
        }
      }),
    })),
  })
}
