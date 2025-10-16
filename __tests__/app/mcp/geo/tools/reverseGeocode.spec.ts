import reverseGeocode from '@/app/mcp/geo/reverseGeocode'

describe('MCP Geo Tools', () => {
  describe('reverseGeocode', () => {
    it('should have correct tool metadata', () => {
      expect(reverseGeocode.name).toBe('reverse_geocode')
      expect(reverseGeocode.description).toBe('Get geographic location information by latitude and longitude, only supports mainland China')
    })

    it('should validate parameters correctly', () => {
      // Valid parameters
      const validResult = reverseGeocode.validateParameters({
        latitude: 39.9042,
        longitude: 116.4074,
      })
      expect(validResult).toBe(true)

      // Invalid parameters - missing latitude
      const invalidResult1 = reverseGeocode.validateParameters({
        longitude: 116.4074,
      })
      expect(typeof invalidResult1).toBe('string')

      // Invalid parameters - wrong type
      const invalidResult2 = reverseGeocode.validateParameters({
        latitude: 'invalid',
        longitude: 116.4074,
      })
      expect(typeof invalidResult2).toBe('string')
    })
  })
})
