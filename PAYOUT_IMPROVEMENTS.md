# Payout System Improvements

Based on your feedback, here are ALL the improvements needed:

## 🎯 Issues to Fix

1. ✅ White space in seller earnings cards - FIXED
2. ⏳ Add back admin manual payout option
3. ⏳ Add partial approval capability
4. ⏳ Replace JS alerts with proper modals
5. ⏳ Explain "Paid Out" - FIXED

---

## ✅ Already Completed

### 1. Seller Billing Page - Better Card Design
**Status:** ✅ DONE

- Reduced padding (p-6 → p-4)
- Smaller icons (w-12 → w-10)
- Added helpful descriptions under each card:
  - **Total Earnings**: "Cumulative earnings from all orders"
  - **Paid Out**: "Already transferred to your bank"
  - **Available Now**: "Ready to request for payout"

---

## 📋 Still Need To Do

### 2. Admin Manual Payout Option
**Status:** ⏳ TODO

**Current Problem:**
Admin can ONLY approve seller requests. They should ALSO be able to create direct payouts.

**Solution:**
Restore the manual payout section in `AdminBillingTab.jsx` with BOTH options:

```jsx
{/* Available for Payout - Admin Manual Payout */}
<Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
  <CardContent className="p-6">
    {/* ... existing Available Now display ... */}

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
```

**Import needed:**
```jsx
import { Zap } from 'lucide-react'
```

**Add back the handler:**
```jsx
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
```

---

### 3. Partial Approval Support
**Status:** ⏳ TODO

**Current Problem:**
Admin can only approve the exact amount seller requested. Should be able to approve less.

**Frontend Solution:**
Add "Partial Approval" option in the approve modal.

**Backend Changes Needed:**
Update `approvePayoutRequest` method in `StripeConnectController.php`:

```php
public function approvePayoutRequest(Request $request)
{
    $request_id = $request->request_id;
    $admin_notes = $request->admin_notes ?? '';
    $approved_amount = $request->approved_amount; // NEW: Allow custom amount

    // ... existing validation ...

    // If approved_amount is provided, use it. Otherwise use requested amount
    $payoutAmount = $approved_amount ?? $approvalRequest->amount;

    // Validate approved amount
    if ($payoutAmount > $approvalRequest->amount) {
        return response()->json([
            'status' => 0,
            'message' => 'Cannot approve more than requested amount'
        ]);
    }

    if ($payoutAmount > $availableBalance) {
        return response()->json([
            'status' => 0,
            'message' => "Insufficient balance. Available: $" . $availableBalance
        ]);
    }

    // Create payout with approved amount (not requested amount)
    $payout = $this->createStripePayout(
        $seller->stripe_connect_id,
        $payoutAmount,  // Use approved amount
        $seller->wh_account_id
    );

    // ... rest of the code ...
}
```

**Frontend Service Update:**
```javascript
approvePayoutRequest: (request_id, admin_notes = '', approved_amount = null) =>
  axios.post(`${API_BASE}/admin/stripe/approve-payout-request`, {
    request_id,
    admin_notes,
    approved_amount  // NEW: Optional custom amount
  }),
```

---

### 4. Replace JS Alerts with React Modals
**Status:** ⏳ TODO

**Current Problem:**
Using `confirm()` and `prompt()` looks unprofessional.

**Solution:**
Create reusable modal components.

**Create Modal Component:**
```jsx
// src/components/ui/ConfirmModal.jsx
import { useState } from 'react'
import { Button, Input } from '@/components/ui'
import { X, AlertTriangle, CheckCircle } from 'lucide-react'

export const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, type = 'confirm' }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-start gap-4">
            {type === 'warning' ? (
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            )}
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                {title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {message}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="border-t border-slate-200 dark:border-slate-700 p-4 flex gap-3 justify-end">
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className={type === 'warning' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}
          >
            Confirm
          </Button>
        </div>
      </div>
    </div>
  )
}

export const PromptModal = ({ isOpen, onClose, onSubmit, title, message, placeholder }) => {
  const [value, setValue] = useState('')

  if (!isOpen) return null

  const handleSubmit = () => {
    if (!value.trim()) {
      return
    }
    onSubmit(value)
    setValue('')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            {message}
          </p>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full"
            autoFocus
            onKeyPress={(e) => {
              if (e.key === 'Enter') handleSubmit()
            }}
          />
        </div>
        <div className="border-t border-slate-200 dark:border-slate-700 p-4 flex gap-3 justify-end">
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!value.trim()}>
            Submit
          </Button>
        </div>
      </div>
    </div>
  )
}
```

**Usage in AdminBillingTab:**
```jsx
import { ConfirmModal, PromptModal } from '@/components/ui/ConfirmModal'

// Add state
const [showApproveModal, setShowApproveModal] = useState(false)
const [showRejectModal, setShowRejectModal] = useState(false)
const [selectedRequest, setSelectedRequest] = useState(null)

// Replace handleApproveRequest
const handleApproveRequest = async (request) => {
  setSelectedRequest(request)
  setShowApproveModal(true)
}

const confirmApprove = async () => {
  setShowApproveModal(false)
  setApprovingRequest(selectedRequest.id)

  try {
    const response = await stripeConnectService.approvePayoutRequest(
      selectedRequest.id,
      'Approved by admin'
    )
    if (response.data?.status === 1) {
      toast.success(`Payout of $${parseFloat(selectedRequest.amount).toFixed(2)} approved!`)
      fetchApprovalRequests()
      fetchPayouts()
      fetchEarnings()
    } else {
      toast.error(response.data?.message || 'Failed to approve')
    }
  } catch (error) {
    toast.error(error.response?.data?.message || 'Failed to approve')
  } finally {
    setApprovingRequest(null)
  }
}

// Replace handleRejectRequest
const handleRejectRequest = async (request) => {
  setSelectedRequest(request)
  setShowRejectModal(true)
}

const confirmReject = async (reason) => {
  setShowRejectModal(false)
  setRejectingRequest(selectedRequest.id)

  try {
    const response = await stripeConnectService.rejectPayoutRequest(
      selectedRequest.id,
      reason
    )
    if (response.data?.status === 1) {
      toast.success('Payout request rejected')
      fetchApprovalRequests()
    } else {
      toast.error(response.data?.message || 'Failed to reject')
    }
  } catch (error) {
    toast.error(error.response?.data?.message || 'Failed to reject')
  } finally {
    setRejectingRequest(null)
  }
}

// Add modals to JSX (at the end, before closing </div>)
<ConfirmModal
  isOpen={showApproveModal}
  onClose={() => setShowApproveModal(false)}
  onConfirm={confirmApprove}
  title="Approve Payout Request"
  message={`Are you sure you want to approve payout of $${selectedRequest?.amount?.toFixed(2)}? This will create an immediate payout to the seller.`}
  type="confirm"
/>

<PromptModal
  isOpen={showRejectModal}
  onClose={() => setShowRejectModal(false)}
  onSubmit={confirmReject}
  title="Reject Payout Request"
  message="Please provide a reason for rejecting this payout request:"
  placeholder="e.g., Pending verification, Insufficient documentation..."
/>
```

---

## 🎯 Summary

### What's Done ✅
- Seller card design improved
- "Paid Out" explanation added

### What's Next ⏳
1. Add admin manual payout option (code provided above)
2. Add partial approval backend support
3. Replace JS alerts with React modals (components provided above)

Would you like me to implement these changes directly, or do you want to review the approach first?
