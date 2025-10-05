import { listHoliday } from '@/app/actions/holiday'
import listHolidays from '@/app/mcp/holiday/listHolidays'

// Mock the API functions
jest.mock('@/app/actions/holiday', () => ({
  listHoliday: jest.fn(),
}))

describe('MCP Holiday Tool: listHolidays', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should have correct metadata', () => {
    expect(listHolidays.name).toBe('list_holidays')
    expect(listHolidays.description).toBe('Get holiday list for a specified year in China')
  })

  it('should call listHoliday with year parameter when executed', async () => {
    const mockHolidays = [
      { date: '2024-01-01', name: '元旦', isHoliday: true },
      { date: '2024-02-10', name: '春节', isHoliday: true },
    ]

    ;(listHoliday as jest.Mock).mockResolvedValue(mockHolidays)

    const result = await listHolidays.call({ year: 2024 })

    expect(result).toEqual(mockHolidays)
    expect(listHoliday).toHaveBeenCalledWith(2024)
  })

  it('should call listHoliday without parameter when executed without year', async () => {
    const mockHolidays = [
      { date: '2024-01-01', name: '元旦', isHoliday: true },
      { date: '2024-02-10', name: '春节', isHoliday: true },
    ]

    ;(listHoliday as jest.Mock).mockResolvedValue(mockHolidays)

    const result = await listHolidays.call({})

    expect(result).toEqual(mockHolidays)
    expect(listHoliday).toHaveBeenCalledWith(undefined)
  })

  it('should validate parameters correctly', () => {
    // Valid parameters with year
    const validResult1 = listHolidays.validateParameters({ year: 2024 })
    expect(validResult1).toBe(true)

    // Valid parameters without year
    const validResult2 = listHolidays.validateParameters({})
    expect(validResult2).toBe(true)

    // Invalid parameters - wrong type
    const invalidResult = listHolidays.validateParameters({ year: '2024' })
    expect(typeof invalidResult).toBe('string') // Error message
  })

  it('should handle errors from listHoliday', async () => {
    const errorMessage = 'Failed to fetch holidays'
    ;(listHoliday as jest.Mock).mockRejectedValue(new Error(errorMessage))

    await expect(listHolidays.call({ year: 2024 })).rejects.toThrow(errorMessage)
  })
})
