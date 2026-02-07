import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store'
import { stripeConnectService } from '@/services'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
} from '@/components/ui'
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Wallet,
  ExternalLink,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'

/**
 * Billing & Payments Page
 * Centralized page for Stripe Connect, earnings, and payouts
 */
const BillingPage = () => {
  const { user } = useAuthStore()
  const [connectingStripe, setConnectingStripe] = useState(false)
  const [loadingDashboard, setLoadingDashboard] = useState(false)
  const [earnings, setEarnings] = useState(null)
  const [loadingEarnings, setLoadingEarnings] = useState(false)

  const isConnected = user?.stripe_connect_id && user?.stripe_connect === 1
  const isOnboardingComplete = user?.stripe_onboarding_completed === 1
  const isPayoutsEnabled = user?.stripe_payouts_enabled === 1

  // Fetch earnings data
  useEffect(() => {
    if (isConnected && user?.wh_account_id) {
      fetchEarnings()
    }
  }, [isConnected, user?.wh_account_id])

  const fetchEarnings = async () => {
    setLoadingEarnings(true)
    try {
      const response = await stripeConnectService.getEarnings(user.wh_account_id)
      if (response.data?.status === 1) {
        setEarnings(response.data.data)
      }
    } catch (error) {
      console.error('Error fetching earnings:', error)
    } finally {
      setLoadingEarnings(false)
    }
  }

  const handleConnectStripe = async () => {
    if (!user?.wh_account_id) {
      toast.error('Account ID not found')
      return
    }

    setConnectingStripe(true)
    try {
      const response = await stripeConnectService.createConnectAccount(user.wh_account_id)

      if (response.data?.status === 1 && response.data?.data?.onboarding_url) {
        window.location.href = response.data.data.onboarding_url
      } else {
        toast.error(response.data?.message || 'Failed to get onboarding URL')
      }
    } catch (error) {
      console.error('Stripe Connect Error:', error)
      toast.error(error.response?.data?.message || 'Failed to connect Stripe account')
    } finally {
      setConnectingStripe(false)
    }
  }

  const handleOpenDashboard = async () => {
    setLoadingDashboard(true)
    try {
      const response = await stripeConnectService.getDashboardLink(user.wh_account_id)
      if (response.data?.status === 1 && response.data?.data?.dashboard_url) {
        window.open(response.data.data.dashboard_url, '_blank')
      } else {
        toast.error('Failed to get dashboard link')
      }
    } catch (error) {
      toast.error('Failed to open Stripe dashboard')
    } finally {
      setLoadingDashboard(false)
    }
  }

  const handleRequestPayout = async () => {
    try {
      const response = await stripeConnectService.requestPayout(user.wh_account_id)
      if (response.data?.status === 1) {
        toast.success('Payout requested successfully!')
        fetchEarnings()
      } else {
        toast.error(response.data?.message || 'Failed to request payout')
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to request payout')
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Billing & Payments
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Manage your Stripe Connect account and view your earnings
        </p>
      </div>

      {/* Stripe Connect Status Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Stripe Connect Status
            </CardTitle>
            {isConnected && (
              <Button
                onClick={handleOpenDashboard}
                variant="outline"
                size="sm"
                disabled={loadingDashboard}
              >
                {loadingDashboard ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Stripe Dashboard
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Connection Status */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                {isConnected ? (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-gray-400" />
                )}
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {isConnected ? 'Connected' : 'Not Connected'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {isConnected
                      ? isPayoutsEnabled
                        ? 'Your account is ready to receive payouts'
                        : 'Complete setup to receive payouts'
                      : 'Connect your Stripe account to receive payments'}
                  </p>
                </div>
              </div>
              {!isConnected ? (
                <Button
                  onClick={handleConnectStripe}
                  disabled={connectingStripe}
                >
                  {connectingStripe ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Connect Stripe'
                  )}
                </Button>
              ) : (
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  Active
                </span>
              )}
            </div>

            {/* Account Details (if connected) */}
            {isConnected && (
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Onboarding</p>
                  <p className="text-sm font-medium mt-1">
                    {isOnboardingComplete ? (
                      <span className="text-green-600">Complete</span>
                    ) : (
                      <span className="text-yellow-600">Pending</span>
                    )}
                  </p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Charges</p>
                  <p className="text-sm font-medium mt-1">
                    {user?.stripe_charges_enabled === 1 ? (
                      <span className="text-green-600">Enabled</span>
                    ) : (
                      <span className="text-gray-600">Disabled</span>
                    )}
                  </p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Payouts</p>
                  <p className="text-sm font-medium mt-1">
                    {isPayoutsEnabled ? (
                      <span className="text-green-600">Enabled</span>
                    ) : (
                      <span className="text-gray-600">Disabled</span>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Earnings Summary (only show if connected) */}
      {isConnected && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Total Earnings */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Total Earnings
                  </p>
                  {loadingEarnings ? (
                    <Loader2 className="w-6 h-6 animate-spin mt-2" />
                  ) : (
                    <p className="text-3xl font-bold text-primary-600 mt-1">
                      ${earnings?.pending_balance || user?.Shipper_earnings || '0.00'}
                    </p>
                  )}
                </div>
                <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-primary-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Paid Out */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Paid Out
                  </p>
                  {loadingEarnings ? (
                    <Loader2 className="w-6 h-6 animate-spin mt-2" />
                  ) : (
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                      ${earnings?.total_paid_out || user?.paid_shipper_earnings || '0.00'}
                    </p>
                  )}
                </div>
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Available for Payout */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Available Now
                  </p>
                  {loadingEarnings ? (
                    <Loader2 className="w-6 h-6 animate-spin mt-2" />
                  ) : (
                    <p className="text-3xl font-bold text-green-600 mt-1">
                      ${earnings?.available_balance || '0.00'}
                    </p>
                  )}
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-green-600" />
                </div>
              </div>
              {isPayoutsEnabled && parseFloat(earnings?.available_balance || 0) >= 50 && (
                <Button
                  onClick={handleRequestPayout}
                  className="w-full mt-4"
                  size="sm"
                >
                  Request Payout
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Info Card */}
      {!isConnected && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Why connect Stripe?
                </h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Receive payments directly from your orders</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Automatic or manual payout options</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Secure payment processing by Stripe</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Track all your earnings in one place</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default BillingPage
