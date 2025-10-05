import { isHolidayInNextDays } from '@/app/actions/holiday'
import isFutureHoliday from '@/app/mcp/holiday/isFutureHoliday'

// Mock the API functions
jest.mock('@/app/actions/holiday', () => ({
  isHolidayInNextDays: jest.fn(),
}))

describe('MCP Holiday Tool: isFutureHoliday', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should have correct metadata', () => {
    expect(isFutureHoliday.name).toBe('is_future_holiday')
    expect(isFutureHoliday.description).toBe('Check if a future date (by days from today) is a holiday in China')
  })

  it('should call isHolidayInNextDays with correct days parameter when executed', async () => {
    ;(isHolidayInNextDays as jest.Mock).mockResolvedValue(false)

    const result = await isFutureHoliday.call({ days: 7 })

    expect(result).toEqual({ days: 7, isHoliday: false })
    expect(isHolidayInNextDays).toHaveBeenCalledWith(7)
  })

  it('should validate parameters correctly', () => {
    // Valid parameters
    const validResult = isFutureHoliday.validateParameters({ days: 7 })
    expect(validResult).toBe(true)

    // Invalid parameters - missing required field
    const invalidResult1 = isFutureHoliday.validateParameters({})
    expect(typeof invalidResult1).toBe('string') // Error message

    // Invalid parameters - wrong type
    const invalidResult2 = isFutureHoliday.validateParameters({ days: '7' })
    expect(typeof invalidResult2).toBe('string') // Error message
  })

  it('should handle errors from isHolidayInNextDays', async () => {
    const errorMessage = 'Failed to check future holiday'
    ;(isHolidayInNextDays as jest.Mock).mockRejectedValue(new Error(errorMessage))

    await expect(isFutureHoliday.call({ days: 7 })).rejects.toThrow(errorMessage)
  })
})
