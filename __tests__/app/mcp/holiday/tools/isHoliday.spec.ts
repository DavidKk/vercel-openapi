import isHoliday from '@/app/mcp/holiday/isHoliday'
import { isHoliday as checkIsHoliday } from '@/app/actions/holiday'

// Mock the API functions
jest.mock('@/app/actions/holiday', () => ({
  isHoliday: jest.fn(),
}))

describe('MCP Holiday Tool: isHoliday', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should have correct metadata', () => {
    expect(isHoliday.name).toBe('is_holiday')
    expect(isHoliday.description).toBe('Check if a specified date is a holiday in China')
  })

  it('should call checkIsHoliday with correct date parameter when executed', async () => {
    ;(checkIsHoliday as jest.Mock).mockResolvedValue(true)

    const result = await isHoliday.call({ date: '2024-01-01' })

    expect(result).toEqual({ date: '2024-01-01', isHoliday: true })
    expect(checkIsHoliday).toHaveBeenCalledWith(new Date('2024-01-01'))
  })

  it('should validate parameters correctly', () => {
    // Valid parameters
    const validResult = isHoliday.validateParameters({ date: '2024-01-01' })
    expect(validResult).toBe(true)

    // Invalid parameters - missing required field
    const invalidResult1 = isHoliday.validateParameters({})
    expect(typeof invalidResult1).toBe('string') // Error message

    // Invalid parameters - wrong type
    const invalidResult2 = isHoliday.validateParameters({ date: 123 })
    expect(typeof invalidResult2).toBe('string') // Error message
  })

  it('should handle errors from checkIsHoliday', async () => {
    const errorMessage = 'Failed to check holiday'
    ;(checkIsHoliday as jest.Mock).mockRejectedValue(new Error(errorMessage))

    await expect(isHoliday.call({ date: '2024-01-01' })).rejects.toThrow(errorMessage)
  })
})
