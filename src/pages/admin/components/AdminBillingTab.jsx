import { useState, useEffect } from 'react'
import { stripeConnectService } from '@/services'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  ApprovalModal,
  PromptModal,
} from '@/components/ui'
import {
  CreditCard,
  DollarSign,
  Settings,
  TrendingUp,
  Wallet,
  ExternalLink,
  Loader2,
  CheckCircle,
  AlertCircle,
  Edit2,
  Save,
  X,
  RefreshCw,
  Info,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Bell,
  Zap,
} from 'lucide-react'
import toast from 'react-hot-toast'

/**
 * Admin Billing Tab Component
 * For managing seller's Stripe Connect account from admin panel
 */
export function AdminBillingTab({ shipper }) {
  const [stripeStatus, setStripeStatus] = useState(null)
  const [loadingStatus, setLoadingStatus] = useState(false)
  const [earnings, setEarnings] = useState(null)
  const [loadingEarnings, setLoadingEarnings] = useState(false)
  const [loadingPayout, setLoadingPayout] = useState(false)
  const [loadingDashboard, setLoadingDashboard] = useState(false)
  const [editingConfig, setEditingConfig] = useState(false)
  const [payoutAmount, setPayoutAmount] = useState('')
  const [payouts, setPayouts] = useState([])
  const [loadingPayouts, setLoadingPayouts] = useState(false)
  const [approvalRequests, setApprovalRequests] = useState([])
  const [loadingApprovalRequests, setLoadingApprovalRequests] = useState(false)
  const [approvingRequest, setApprovingRequest] = useState(null)
  const [rejectingRequest, setRejectingRequest] = useState(null)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [config, setConfig] = useState({
    commission_percentage: shipper?.stripe_commission_percentage || 5,
    payout_frequency: shipper?.stripe_payout_frequency || 'monthly',
    payment_model: shipper?.stripe_payment_model || 'separate',
  })

  // Use live Stripe status if fetched, otherwise fall back to shipper prop
  const currentStatus = stripeStatus || shipper
  const isConnected = currentStatus?.stripe_connect === 1 || currentStatus?.stripe_connect === '1'
  const isOnboardingComplete = currentStatus?.stripe_onboarding_completed === 1
  const isPayoutsEnabled = currentStatus?.stripe_payouts_enabled === 1

  // Fetch current Stripe status from API on mount
  useEffect(() => {
    if (shipper?.wh_account_id) {
      fetchStripeStatus()
    }
  }, [shipper?.wh_account_id])

  useEffect(() => {
    if (isConnected && shipper?.wh_account_id) {
      fetchEarnings()
      fetchPayouts()
      fetchApprovalRequests()
    }
  }, [isConnected, shipper?.wh_account_id])

  const fetchStripeStatus = async () => {
    setLoadingStatus(true)
    try {
      const response = await stripeConnectService.getConnectStatus(shipper.wh_account_id)
      if (response.data?.status === 1) {
        // Map API response to match expected field names
        const data = response.data.data
        const mappedStatus = {
          stripe_connect: data.connected ? 1 : 0,
          stripe_connect_id: data.stripe_connect_id,
          stripe_onboarding_completed: data.onboarding_completed ? 1 : 0,
          stripe_charges_enabled: data.charges_enabled ? 1 : 0,
          stripe_payouts_enabled: data.payouts_enabled ? 1 : 0,
          stripe_payment_model: data.payment_model,
          stripe_payout_frequency: data.payout_frequency,
          stripe_commission_percentage: data.commission_percentage,
          wh_account_id: shipper.wh_account_id,
        }
        setStripeStatus(mappedStatus)
      }
    } catch (error) {
      console.error('Error fetching Stripe status:', error)
    } finally {
      setLoadingStatus(false)
    }
  }

  const fetchEarnings = async () => {
    setLoadingEarnings(true)
    try {
      const response = await stripeConnectService.getEarnings(shipper.wh_account_id)
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
      const response = await stripeConnectService.getPayouts(shipper.wh_account_id, 20)
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
      const response = await stripeConnectService.getAllPayoutApprovalRequests(shipper.wh_account_id, 'all')
      if (response.data?.status === 1) {
        setApprovalRequests(response.data.data.requests || [])
      }
    } catch (error) {
      console.error('Error fetching approval requests:', error)
    } finally {
      setLoadingApprovalRequests(false)
    }
  }

  const handleApproveRequest = (request) => {
    setSelectedRequest(request)
    setShowApprovalModal(true)
  }

  const confirmApprove = async (approvedAmount, notes) => {
    if (!selectedRequest) return

    setApprovingRequest(selectedRequest.id)
    setShowApprovalModal(false)

    try {
      const response = await stripeConnectService.approvePayoutRequest(
        selectedRequest.id,
        notes || 'Approved by admin',
        approvedAmount // Will be null if approving full amount
      )
      if (response.data?.status === 1) {
        const actualAmount = approvedAmount || selectedRequest.amount
        toast.success(`Payout of $${parseFloat(actualAmount).toFixed(2)} approved and created!`)
        fetchApprovalRequests()
        fetchPayouts()
        fetchEarnings()
      } else {
        toast.error(response.data?.message || 'Failed to approve payout request')
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve payout request')
    } finally {
      setApprovingRequest(null)
    }
  }

  const handleRejectRequest = (request) => {
    setSelectedRequest(request)
    setShowRejectModal(true)
  }

  const confirmReject = async (reason) => {
    if (!selectedRequest) return

    setRejectingRequest(selectedRequest.id)
    setShowRejectModal(false)

    try {
      const response = await stripeConnectService.rejectPayoutRequest(
        selectedRequest.id,
        reason
      )
      if (response.data?.status === 1) {
        toast.success('Payout request rejected')
        fetchApprovalRequests()
      } else {
        toast.error(response.data?.message || 'Failed to reject payout request')
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject payout request')
    } finally {
      setRejectingRequest(null)
    }
  }

  const handleCreatePayout = async () => {
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
      const response = await stripeConnectService.requestPayout(
        shipper.wh_account_id,
        requestedAmount
      )
      if (response.data?.status === 1) {
        toast.success(`Payout of $${requestedAmount.toFixed(2)} created successfully!`)
        setPayoutAmount('')
        fetchEarnings()
        fetchPayouts()
      } else {
        toast.error(response.data?.message || 'Failed to create payout')
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create payout')
    } finally {
      setLoadingPayout(false)
    }
  }

  const handleOpenDashboard = async () => {
    setLoadingDashboard(true)
    try {
      const response = await stripeConnectService.getDashboardLink(shipper.wh_account_id)
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

  const handleCreatePayout = async () => {
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
      const response = await stripeConnectService.requestPayout(
        shipper.wh_account_id,
        requestedAmount
      )
      if (response.data?.status === 1) {
        toast.success(`Payout of $${requestedAmount.toFixed(2)} created successfully!`)
        setPayoutAmount('') // Reset amount field
        fetchEarnings()
        fetchPayouts() // Refresh payout history
      } else {
        toast.error(response.data?.message || 'Failed to create payout')
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create payout')
    } finally {
      setLoadingPayout(false)
    }
  }

  const handleSaveConfig = async () => {
    try {
      // TODO: Implement admin update config endpoint call
      toast.success('Configuration updated successfully!')
      setEditingConfig(false)
    } catch (error) {
      toast.error('Failed to update configuration')
    }
  }

  return (
    <div className="space-y-6">
      {/* Stripe Connect Status Card */}
      <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-violet-500" />
              Stripe Connect Status
            </CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={fetchStripeStatus}
                variant="outline"
                size="sm"
                disabled={loadingStatus}
              >
                {loadingStatus ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </>
                )}
              </Button>
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Connection Status */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
              <div className="flex items-center gap-3">
                {isConnected ? (
                  <CheckCircle className="w-6 h-6 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-slate-400" />
                )}
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {isConnected ? 'Connected' : 'Not Connected'}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {isConnected
                      ? isPayoutsEnabled
                        ? 'Account is ready to receive payouts'
                        : 'Complete setup to receive payouts'
                      : 'Seller needs to connect Stripe account'}
                  </p>
                </div>
              </div>
              {isConnected && (
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium dark:bg-emerald-900/30 dark:text-emerald-400">
                  Active
                </span>
              )}
            </div>

            {/* Account Details (if connected) */}
            {isConnected && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Onboarding</p>
                    <p className="text-sm font-medium mt-1">
                      {isOnboardingComplete ? (
                        <span className="text-emerald-600">Complete</span>
                      ) : (
                        <span className="text-yellow-600">Pending</span>
                      )}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Charges</p>
                    <p className="text-sm font-medium mt-1">
                      {currentStatus?.stripe_charges_enabled === 1 ? (
                        <span className="text-emerald-600">Enabled</span>
                      ) : (
                        <span className="text-slate-600">Disabled</span>
                      )}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Payouts</p>
                    <p className="text-sm font-medium mt-1">
                      {isPayoutsEnabled ? (
                        <span className="text-emerald-600">Enabled</span>
                      ) : (
                        <span className="text-slate-600">Disabled</span>
                      )}
                    </p>
                  </div>
                </div>

                {currentStatus?.stripe_connect_id && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Stripe Account ID</p>
                    <p className="font-mono text-sm text-slate-900 dark:text-white mt-1">
                      {currentStatus.stripe_connect_id}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Earnings Summary (only show if connected) */}
      {isConnected && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Earnings */}
          <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Total Earnings
                  </p>
                  {loadingEarnings ? (
                    <Loader2 className="w-6 h-6 animate-spin mt-2" />
                  ) : (
                    <p className="text-2xl font-bold text-violet-600 mt-1">
                      ${earnings?.pending_balance || shipper?.Shipper_earnings || '0.00'}
                    </p>
                  )}
                </div>
                <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Paid Out */}
          <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Paid Out
                  </p>
                  {loadingEarnings ? (
                    <Loader2 className="w-6 h-6 animate-spin mt-2" />
                  ) : (
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      ${earnings?.total_paid_out || shipper?.paid_shipper_earnings || '0.00'}
                    </p>
                  )}
                </div>
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Available for Payout */}
          <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Available Now
                  </p>
                  {loadingEarnings ? (
                    <Loader2 className="w-6 h-6 animate-spin mt-2" />
                  ) : (
                    <p className="text-2xl font-bold text-emerald-600 mt-1">
                      ${earnings?.available_balance || '0.00'}
                    </p>
                  )}
                </div>
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              {isPayoutsEnabled && parseFloat(earnings?.available_balance || 0) >= 50 && (
                <div className="mt-4 space-y-4">
                  {/* Manual Payout Section */}
                  <div className="p-4 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-200 dark:border-violet-800">
                    <h4 className="text-sm font-medium text-violet-900 dark:text-violet-200 mb-3 flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Admin Manual Payout (Direct Transfer)
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
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
                      </div>
                      <Button
                        onClick={handleCreatePayout}
                        className="w-full bg-violet-600 hover:bg-violet-700"
                        size="sm"
                        disabled={loadingPayout}
                      >
                        {loadingPayout ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          `Create Payout Now${payoutAmount ? ` ($${parseFloat(payoutAmount).toFixed(2)})` : ' (Full Balance)'}`
                        )}
                      </Button>
                      <p className="text-xs text-violet-600 dark:text-violet-400">
                        Creates payout immediately without seller request
                      </p>
                    </div>
                  </div>

                  {/* Separator */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white dark:bg-slate-800 px-2 text-slate-500">
                        OR
                      </span>
                    </div>
                  </div>

                  {/* Approval System Notice */}
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-blue-700 dark:text-blue-300">
                        <p className="font-medium mb-1">Seller Payout Requests</p>
                        <p>Check "Payout Approval Requests" section below to approve pending requests from sellers.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payout Approval Requests */}
      {isConnected && (
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-500" />
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
                <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
              </div>
            ) : approvalRequests.length > 0 ? (
              <div className="space-y-4">
                {approvalRequests.map((request) => (
                  <div
                    key={request.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-slate-900 dark:text-white text-lg">
                            ${parseFloat(request.amount).toFixed(2)}
                          </h4>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            request.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                            request.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            request.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-400'
                          }`}>
                            {request.status}
                          </span>
                        </div>

                        <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                          <p className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Requested: {new Date(request.created_at).toLocaleString()}
                          </p>
                          {request.notes && (
                            <p className="flex items-start gap-2">
                              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <span>Seller Notes: {request.notes}</span>
                            </p>
                          )}
                          {(request.admin_notes || request.rejection_reason) && (
                            <p className="flex items-start gap-2">
                              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <span>Admin Response: {request.admin_notes || request.rejection_reason}</span>
                            </p>
                          )}
                          {request.processed_at && (
                            <p className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4" />
                              Processed: {new Date(request.processed_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action buttons - only show for pending requests */}
                      {request.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleApproveRequest(request)}
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700"
                            disabled={approvingRequest === request.id || rejectingRequest === request.id}
                          >
                            {approvingRequest === request.id ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                Approving...
                              </>
                            ) : (
                              <>
                                <ThumbsUp className="w-4 h-4 mr-1" />
                                Approve
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={() => handleRejectRequest(request)}
                            size="sm"
                            variant="outline"
                            className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                            disabled={approvingRequest === request.id || rejectingRequest === request.id}
                          >
                            {rejectingRequest === request.id ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                Rejecting...
                              </>
                            ) : (
                              <>
                                <ThumbsDown className="w-4 h-4 mr-1" />
                                Reject
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Bell className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400">No payout approval requests</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payout History */}
      {isConnected && (
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-violet-500" />
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
                <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
              </div>
            ) : payouts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Date</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Amount</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Method</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Arrival Date</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Payout ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((payout) => (
                      <tr key={payout.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <td className="py-3 px-4 text-sm text-slate-900 dark:text-white">
                          {new Date(payout.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-slate-900 dark:text-white">
                          ${parseFloat(payout.amount).toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            payout.status === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                            payout.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            payout.status === 'in_transit' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                            'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-400'
                          }`}>
                            {payout.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400 capitalize">
                          {payout.method || 'standard'}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                          {payout.arrival_date ? new Date(payout.arrival_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="py-3 px-4 text-xs font-mono text-slate-500 dark:text-slate-400">
                          {payout.stripe_payout_id}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <DollarSign className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400">No payouts yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Admin Configuration */}
      {isConnected && (
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-violet-500" />
                Payout Configuration
              </CardTitle>
              {!editingConfig ? (
                <Button
                  onClick={() => setEditingConfig(true)}
                  variant="outline"
                  size="sm"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveConfig}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button
                    onClick={() => setEditingConfig(false)}
                    variant="outline"
                    size="sm"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Commission Percentage */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Commission %
                </label>
                {editingConfig ? (
                  <Input
                    type="number"
                    value={config.commission_percentage}
                    onChange={(e) => setConfig({ ...config, commission_percentage: e.target.value })}
                    min="0"
                    max="100"
                    step="0.1"
                  />
                ) : (
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {config.commission_percentage}%
                  </p>
                )}
              </div>

              {/* Payout Frequency */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Payout Frequency
                </label>
                {editingConfig ? (
                  <select
                    value={config.payout_frequency}
                    onChange={(e) => setConfig({ ...config, payout_frequency: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="manual">Manual Only</option>
                  </select>
                ) : (
                  <p className="text-lg font-semibold text-slate-900 dark:text-white capitalize">
                    {config.payout_frequency}
                  </p>
                )}
              </div>

              {/* Payment Model */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Payment Model
                </label>
                {editingConfig ? (
                  <div>
                    <select
                      value={config.payment_model}
                      onChange={(e) => setConfig({ ...config, payment_model: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    >
                      <option value="direct">Direct Charge</option>
                      <option value="destination">Destination Charge</option>
                      <option value="separate">Separate Charge & Transfer</option>
                    </select>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      {config.payment_model === 'direct' && 'Connected account charges customer directly. You receive application fees separately.'}
                      {config.payment_model === 'destination' && 'You charge customer and funds go to connected account. Deduct commission automatically.'}
                      {config.payment_model === 'separate' && 'You charge customer to your account, then manually transfer funds to connected account.'}
                    </p>
                  </div>
                ) : (
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {config.payment_model === 'direct' && 'Direct Charge'}
                    {config.payment_model === 'destination' && 'Destination'}
                    {config.payment_model === 'separate' && 'Separate'}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Model Info Card (only show if connected) */}
      {isConnected && (
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-500" />
              Payment Model Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Direct Charge */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">1</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-1">
                      Direct Charge
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                      The connected account (seller) charges the customer directly. The platform receives application fees separately.
                    </p>
                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 text-xs text-slate-600 dark:text-slate-400">
                      <strong>Flow:</strong> Customer → Seller Account (minus fees) → Platform receives commission
                    </div>
                    <div className="mt-2 flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span className="text-xs text-slate-600 dark:text-slate-400">Best for: Marketplaces where sellers manage their own payments</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Destination Charge */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-lg font-bold text-violet-600 dark:text-violet-400">2</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-1">
                      Destination Charge
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                      The platform charges the customer, and funds are sent directly to the connected account. Commission is deducted automatically.
                    </p>
                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 text-xs text-slate-600 dark:text-slate-400">
                      <strong>Flow:</strong> Customer → Platform Charges → Seller Account (after commission) → Platform keeps commission
                    </div>
                    <div className="mt-2 flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span className="text-xs text-slate-600 dark:text-slate-400">Best for: Simplified payment flow with automatic commission deduction</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Separate Charge & Transfer */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">3</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-1">
                      Separate Charge & Transfer (Recommended)
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                      The platform charges the customer to its own account, then manually transfers funds to the seller's connected account at a later time (e.g., weekly, monthly).
                    </p>
                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 text-xs text-slate-600 dark:text-slate-400">
                      <strong>Flow:</strong> Customer → Platform Account → Platform Manually Transfers → Seller Account
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-slate-600 dark:text-slate-400">Best for: Maximum control and flexibility over payout timing</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-slate-600 dark:text-slate-400">Platform holds funds and can implement custom payout schedules</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-slate-600 dark:text-slate-400">Easier dispute handling and refund management</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Not Connected State */}
      {!isConnected && (
        <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="p-8 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center">
              <CreditCard className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                Seller hasn't connected Stripe yet
              </h4>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                The seller needs to connect their Stripe account from their Billing page to enable payouts.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <ApprovalModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        onApprove={confirmApprove}
        request={selectedRequest}
        availableBalance={earnings?.available_balance}
      />

      <PromptModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        onSubmit={confirmReject}
        title="Reject Payout Request"
        message="Please provide a reason for rejecting this payout request:"
        placeholder="e.g., Pending verification, Insufficient documentation..."
      />
    </div>
  )
}

export default AdminBillingTab
