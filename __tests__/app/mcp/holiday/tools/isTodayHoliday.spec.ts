import { isHolidayToady } from '@/app/actions/holiday'
import isTodayHoliday from '@/app/mcp/holiday/isTodayHoliday'

// Mock the API functions
jest.mock('@/app/actions/holiday', () => ({
  isHolidayToady: jest.fn(),
}))

describe('MCP Holiday Tool: isTodayHoliday', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should have correct metadata', () => {
    expect(isTodayHoliday.name).toBe('is_today_holiday')
    expect(isTodayHoliday.description).toBe('Check if today is a holiday in China')
  })

  it('should call isHolidayToady when executed', async () => {
    ;(isHolidayToady as jest.Mock).mockResolvedValue(true)

    const result = await isTodayHoliday.call({})

    expect(result).toEqual({ isHoliday: true })
    expect(isHolidayToady).toHaveBeenCalled()
  })

  it('should validate parameters correctly', () => {
    const validResult = isTodayHoliday.validateParameters({})
    expect(validResult).toBe(true)
  })

  it('should handle errors from isHolidayToady', async () => {
    const errorMessage = 'Failed to check if today is holiday'
    ;(isHolidayToady as jest.Mock).mockRejectedValue(new Error(errorMessage))

    await expect(isTodayHoliday.call({})).rejects.toThrow(errorMessage)
  })
})
