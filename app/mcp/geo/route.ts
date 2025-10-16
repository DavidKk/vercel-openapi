import { createMCPHttpServer } from '@/initializer/mcp'
import { version } from '@/package.json'

import reverseGeocode from './reverseGeocode'

const name = 'geo-service'
const description = 'Provides geographic location services based on latitude and longitude'

export const { manifest: GET, execute: POST } = createMCPHttpServer(name, version, description, {
  reverseGeocode,
})
