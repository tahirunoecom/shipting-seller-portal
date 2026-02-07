import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/store'
import { stripeConnectService } from '@/services'
import { Card, CardContent, Button } from '@/components/ui'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

/**
 * Stripe Connect Return Page
 * Handles return from Stripe Connect onboarding
 */
const StripeConnectReturnPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, updateUser } = useAuthStore()
  const [status, setStatus] = useState('loading') // loading, success, error
  const [message, setMessage] = useState('')

  useEffect(() => {
    const checkStatus = async () => {
      const success = searchParams.get('success')

      if (success === 'true') {
        // Onboarding completed successfully
        try {
          // Fetch updated status from backend
          const response = await stripeConnectService.getConnectStatus(user?.wh_account_id)

          if (response.data?.status === 1) {
            const data = response.data.data

            // Update user in store
            updateUser({
              stripe_connect_id: data.stripe_account_id,
              stripe_connect: data.connected ? 1 : 0,
              stripe_onboarding_completed: data.onboarding_completed ? 1 : 0,
              stripe_charges_enabled: data.charges_enabled ? 1 : 0,
              stripe_payouts_enabled: data.payouts_enabled ? 1 : 0,
            })

            if (data.connected && data.payouts_enabled) {
              setStatus('success')
              setMessage('Your Stripe account is connected and ready to receive payouts!')
              toast.success('Stripe account connected successfully!')
            } else {
              setStatus('success')
              setMessage('Onboarding submitted! Please complete any remaining steps.')
            }
          } else {
            setStatus('error')
            setMessage('Could not verify connection status')
          }
        } catch (error) {
          console.error('Error checking status:', error)
          setStatus('error')
          setMessage('Failed to verify Stripe connection')
        }
      } else {
        // User cancelled or error occurred
        setStatus('error')
        setMessage('Stripe Connect onboarding was not completed. Please try again.')
      }
    }

    if (user?.wh_account_id) {
      checkStatus()
    }
  }, [searchParams, user?.wh_account_id, updateUser])

  const handleContinue = () => {
    navigate('/settings')
  }

  const handleRetry = async () => {
    try {
      const response = await stripeConnectService.refreshOnboardingLink(user?.wh_account_id)
      if (response.data?.data?.onboarding_url) {
        window.location.href = response.data.data.onboarding_url
      }
    } catch (error) {
      toast.error('Failed to refresh onboarding link')
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            {status === 'loading' && (
              <div className="space-y-4">
                <Loader2 className="w-16 h-16 mx-auto animate-spin text-primary-500" />
                <h2 className="text-2xl font-bold">Verifying Connection...</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Please wait while we verify your Stripe account
                </p>
              </div>
            )}

            {status === 'success' && (
              <div className="space-y-6">
                <CheckCircle className="w-20 h-20 mx-auto text-green-500" />
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Success!
                  </h2>
                  <p className="text-lg text-gray-600 dark:text-gray-400">
                    {message}
                  </p>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    You can now receive payments from your orders directly to your bank account.
                  </p>
                </div>

                <div className="flex flex-col gap-3 max-w-sm mx-auto">
                  <Button onClick={handleContinue} size="lg" className="w-full">
                    Go to Settings
                  </Button>
                  <Button
                    onClick={() => navigate('/earnings')}
                    variant="outline"
                    size="lg"
                    className="w-full"
                  >
                    View Earnings
                  </Button>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-6">
                <XCircle className="w-20 h-20 mx-auto text-red-500" />
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Connection Not Completed
                  </h2>
                  <p className="text-lg text-gray-600 dark:text-gray-400">
                    {message}
                  </p>
                </div>

                <div className="flex flex-col gap-3 max-w-sm mx-auto">
                  <Button onClick={handleRetry} size="lg" className="w-full">
                    Try Again
                  </Button>
                  <Button
                    onClick={handleContinue}
                    variant="outline"
                    size="lg"
                    className="w-full"
                  >
                    Go to Settings
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default StripeConnectReturnPage
