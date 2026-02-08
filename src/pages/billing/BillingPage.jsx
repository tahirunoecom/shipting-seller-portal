import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store'
import { stripeConnectService } from '@/services'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  UrgentAlert,
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
  RefreshCw,
} from 'lucide-react'
import toast from 'react-hot-toast'

/**
 * Billing & Payments Page
 * Centralized page for Stripe Connect, earnings, and payouts
 */
const BillingPage = () => {
  const { user, updateUser } = useAuthStore()
  const [connectingStripe, setConnectingStripe] = useState(false)
  const [loadingDashboard, setLoadingDashboard] = useState(false)
  const [loadingPayout, setLoadingPayout] = useState(false)
  const [payoutAmount, setPayoutAmount] = useState('')
  const [earnings, setEarnings] = useState(null)
  const [loadingEarnings, setLoadingEarnings] = useState(false)
  const [payouts, setPayouts] = useState([])
  const [loadingPayouts, setLoadingPayouts] = useState(false)
  const [approvalRequests, setApprovalRequests] = useState([])
  const [loadingApprovalRequests, setLoadingApprovalRequests] = useState(false)
  const [requestNotes, setRequestNotes] = useState('')

  const isConnected = user?.stripe_connect_id && user?.stripe_connect === 1
  const isOnboardingComplete = user?.stripe_onboarding_completed === 1
  const isPayoutsEnabled = user?.stripe_payouts_enabled === 1

  // Fetch earnings data
  useEffect(() => {
    if (isConnected && user?.wh_account_id) {
      fetchEarnings()
      fetchPayouts()
      fetchApprovalRequests()
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

  const fetchPayouts = async () => {
    setLoadingPayouts(true)
    try {
      const response = await stripeConnectService.getPayouts(user.wh_account_id, 20)
      if (response.data?.status === 1) {
        setPayouts(response.data.data.payouts || [])
      }
    } catch (error) {
      console.error('Error fetching payouts:', error)
    } finally {
      setLoadingPayouts(false)
    }
  }

  const fetchApprovalRequests = async () => {
    setLoadingApprovalRequests(true)
    try {
      const response = await stripeConnectService.getPayoutApprovalRequests(user.wh_account_id, 20)
      if (response.data?.status === 1) {
        setApprovalRequests(response.data.data.requests || [])
      }
    } catch (error) {
      console.error('Error fetching approval requests:', error)
    } finally {
      setLoadingApprovalRequests(false)
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

      // Debug: Log the response
      console.log('[STRIPE CONNECT] Response:', response.data)

      if (response.data?.status === 1) {
        // Check if onboarding URL provided (refresh link or new account)
        if (response.data?.data?.onboarding_url) {
          // Redirect to Stripe onboarding
          window.location.href = response.data.data.onboarding_url
        }
        // Check if already connected and fully active
        else if (response.data?.data?.already_connected) {
          // Update user in auth store with new Stripe values
          updateUser({
            stripe_connect: 1,
            stripe_connect_id: response.data.data.stripe_account_id,
            stripe_onboarding_completed: 1,
            stripe_charges_enabled: 1,
            stripe_payouts_enabled: 1,
          })

          toast.success('Your Stripe account is already connected and active!')

          // No need to reload - user object is updated!
        } else {
          toast.error('Unexpected response from server')
          console.error('Unexpected response:', response.data)
        }
      } else {
        toast.error(response.data?.message || 'Failed to connect Stripe account')
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

  const handleRequestPayoutApproval = async () => {
    // Validate payout amount
    const availableBalance = parseFloat(earnings?.available_balance || 0)
    const requestedAmount = payoutAmount ? parseFloat(payoutAmount) : availableBalance

    if (requestedAmount <= 0) {
      toast.error('Please enter a valid payout amount')
      return
    }

    if (requestedAmount > availableBalance) {
      toast.error(`Amount exceeds available balance ($${availableBalance.toFixed(2)})`)
      return
    }

    if (requestedAmount < 50) {
      toast.error('Minimum payout amount is $50.00')
      return
    }

    setLoadingPayout(true)
    try {
      const response = await stripeConnectService.requestPayoutApproval(
        user.wh_account_id,
        requestedAmount,
        requestNotes
      )
      if (response.data?.status === 1) {
        toast.success(`Payout approval request of $${requestedAmount.toFixed(2)} submitted successfully!`)
        setPayoutAmount('') // Reset amount field
        setRequestNotes('') // Reset notes field
        fetchApprovalRequests() // Refresh approval requests
        fetchEarnings()
      } else {
        toast.error(response.data?.message || 'Failed to submit approval request')
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit approval request')
    } finally {
      setLoadingPayout(false)
    }
  }

  const handleRequestRemainingAmount = async (remainingAmount) => {
    const availableBalance = parseFloat(earnings?.available_balance || 0)

    if (remainingAmount > availableBalance) {
      toast.error(`Remaining amount ($${remainingAmount.toFixed(2)}) exceeds available balance ($${availableBalance.toFixed(2)})`)
      return
    }

    if (remainingAmount < 50) {
      toast.error('Minimum payout amount is $50.00')
      return
    }

    setLoadingPayout(true)
    try {
      const response = await stripeConnectService.requestPayoutApproval(
        user.wh_account_id,
        remainingAmount,
        'Request for remaining amount from previous partial approval'
      )
      if (response.data?.status === 1) {
        toast.success(`Payout approval request of $${remainingAmount.toFixed(2)} submitted successfully!`)
        fetchApprovalRequests() // Refresh approval requests
        fetchEarnings()
      } else {
        toast.error(response.data?.message || 'Failed to submit approval request')
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit approval request')
    } finally {
      setLoadingPayout(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Compact alert for WhatsApp if not connected */}
      {!user?.whatsapp_phone_number_id && (
        <UrgentAlert type="whatsapp" compact={true} />
      )}

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Total Earnings */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Total Earnings
                  </p>
                  {loadingEarnings ? (
                    <Loader2 className="w-5 h-5 animate-spin mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-primary-600 mt-1">
                      ${earnings?.pending_balance || user?.Shipper_earnings || '0.00'}
                    </p>
                  )}
                </div>
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-primary-600" />
                </div>
              </div>
              <p className="text-xs text-gray-400">Cumulative earnings from all orders</p>
            </CardContent>
          </Card>

          {/* Paid Out */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Paid Out
                  </p>
                  {loadingEarnings ? (
                    <Loader2 className="w-5 h-5 animate-spin mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      ${earnings?.total_paid_out || user?.paid_shipper_earnings || '0.00'}
                    </p>
                  )}
                </div>
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-5 h-5 text-gray-600" />
                </div>
              </div>
              <p className="text-xs text-gray-400">Already transferred to your bank</p>
            </CardContent>
          </Card>

          {/* Available for Payout */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Available Now
                  </p>
                  {loadingEarnings ? (
                    <Loader2 className="w-5 h-5 animate-spin mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-green-600 mt-1">
                      ${earnings?.available_balance || '0.00'}
                    </p>
                  )}
                </div>
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <Wallet className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-3">Ready to request for payout</p>
              {isPayoutsEnabled && parseFloat(earnings?.available_balance || 0) >= 50 && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Payout Amount (leave empty for full balance)
                    </label>
                    <Input
                      type="number"
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      placeholder={`Max: $${parseFloat(earnings?.available_balance || 0).toFixed(2)}`}
                      min="50"
                      max={parseFloat(earnings?.available_balance || 0)}
                      step="0.01"
                      className="w-full"
                      disabled={loadingPayout}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Minimum: $50.00 | Available: ${parseFloat(earnings?.available_balance || 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Notes for Admin (Optional)
                    </label>
                    <Input
                      type="text"
                      value={requestNotes}
                      onChange={(e) => setRequestNotes(e.target.value)}
                      placeholder="Add any notes for the admin..."
                      className="w-full"
                      disabled={loadingPayout}
                    />
                  </div>
                  <Button
                    onClick={handleRequestPayoutApproval}
                    className="w-full bg-primary-600 hover:bg-primary-700"
                    size="sm"
                    disabled={loadingPayout}
                  >
                    {loadingPayout ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting Request...
                      </>
                    ) : (
                      `Ask Admin for Payout${payoutAmount ? ` ($${parseFloat(payoutAmount).toFixed(2)})` : ' (Full Balance)'}`
                    )}
                  </Button>
                  <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                    Admin will review and approve your payout request
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payout Approval Requests */}
      {isConnected && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Payout Approval Requests
              </CardTitle>
              <Button
                onClick={fetchApprovalRequests}
                variant="outline"
                size="sm"
                disabled={loadingApprovalRequests}
              >
                {loadingApprovalRequests ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingApprovalRequests ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
              </div>
            ) : approvalRequests.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Notes</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Admin Response</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvalRequests.map((request) => (
                      <tr key={request.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                          {new Date(request.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          {request.approved_amount && parseFloat(request.approved_amount) < parseFloat(request.amount) ? (
                            (() => {
                              const remainingAmount = parseFloat(request.amount) - parseFloat(request.approved_amount)
                              // Check if there's already a pending request for this remaining amount
                              const hasPendingRemainingRequest = approvalRequests.some(req =>
                                req.status === 'pending' &&
                                parseFloat(req.amount).toFixed(2) === remainingAmount.toFixed(2)
                              )

                              return (
                                <div>
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    Requested: ${parseFloat(request.amount).toFixed(2)}
                                  </div>
                                  <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                                    Approved: ${parseFloat(request.approved_amount).toFixed(2)}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                                      Remaining: ${remainingAmount.toFixed(2)}
                                    </div>
                                    {!hasPendingRemainingRequest && (
                                      <Button
                                        onClick={() => handleRequestRemainingAmount(remainingAmount)}
                                        size="sm"
                                        className="h-6 px-2 text-xs bg-orange-600 hover:bg-orange-700"
                                        disabled={loadingPayout}
                                      >
                                        Request Remaining →
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )
                            })()
                          ) : (
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              ${parseFloat(request.amount).toFixed(2)}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            request.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            request.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            request.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {request.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {request.notes || '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {request.admin_notes || request.rejection_reason || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No payout approval requests yet</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Request a payout above to get started</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payout History */}
      {isConnected && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Payout History
              </CardTitle>
              <Button
                onClick={fetchPayouts}
                variant="outline"
                size="sm"
                disabled={loadingPayouts}
              >
                {loadingPayouts ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingPayouts ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
              </div>
            ) : payouts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Method</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Arrival Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((payout) => (
                      <tr key={payout.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                          {new Date(payout.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                          ${parseFloat(payout.amount).toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            payout.status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            payout.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            payout.status === 'in_transit' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                            'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {payout.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 capitalize">
                          {payout.method || 'standard'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {payout.arrival_date ? new Date(payout.arrival_date).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <DollarSign className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No payouts yet</p>
              </div>
            )}
          </CardContent>
        </Card>
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
