import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store'
import { whatsappService } from '@/services'

/**
 * Hook to check WhatsApp connection status
 * Fetches status from API and caches in localStorage
 */
export const useWhatsAppStatus = () => {
  const { user } = useAuthStore()
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkWhatsAppStatus = async () => {
      if (!user?.wh_account_id) {
        setIsConnected(false)
        setLoading(false)
        return
      }

      try {
        // Check localStorage cache first
        const cached = localStorage.getItem(`whatsapp_connected_${user.wh_account_id}`)
        if (cached !== null) {
          setIsConnected(cached === 'true')
        }

        // Fetch fresh status from API
        const response = await whatsappService.getWhatsAppStatus(user.wh_account_id)
        if (response.status === 1 && response.data) {
          const connected = response.data.is_connected || false
          setIsConnected(connected)
          // Cache the result
          localStorage.setItem(`whatsapp_connected_${user.wh_account_id}`, connected.toString())
        }
      } catch (error) {
        console.error('Failed to check WhatsApp status:', error)
        // Keep cached value if API fails
      } finally {
        setLoading(false)
      }
    }

    checkWhatsAppStatus()
  }, [user?.wh_account_id])

  return { isConnected, loading }
}

export default useWhatsAppStatus
