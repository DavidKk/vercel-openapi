import { useEffect, useState } from 'react'

import { PROVINCE_MAPPING } from '@/constants/city'

interface LocationInfo {
  province: {
    chinese: string | null
    english: string | null
  }
  loading: boolean
}

export function useLocation(): LocationInfo {
  const [province, setProvince] = useState<{ chinese: string | null; english: string | null }>({
    chinese: null,
    english: null,
  })
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        // Using a free IP geolocation service
        const response = await fetch('https://ipapi.co/json/')
        const data = await response.json()
        if (data.region) {
          // Map common region names to province names used in the data
          const englishRegion = data.region
          const chineseProvince = PROVINCE_MAPPING[englishRegion] || englishRegion
          setProvince({
            chinese: chineseProvince,
            english: englishRegion,
          })
        }
        setLoading(false)
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to get location:', error)
        setLoading(false)
      }
    }

    // Try to get location on component mount
    fetchLocation()
  }, [])

  return {
    province,
    loading,
  }
}
