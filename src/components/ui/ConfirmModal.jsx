import { useState } from 'react'
import { Button, Input } from '@/components/ui'
import { X, AlertTriangle, CheckCircle, ThumbsUp, ThumbsDown } from 'lucide-react'

/**
 * Confirmation Modal Component
 * Replaces browser's confirm() dialog with a beautiful modal
 */
export const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', type = 'confirm' }) => {
  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-start gap-4">
            {type === 'danger' || type === 'reject' ? (
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            ) : type === 'approve' ? (
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                <ThumbsUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
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
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
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
            onClick={handleConfirm}
            className={
              type === 'danger' || type === 'reject'
                ? 'bg-red-600 hover:bg-red-700'
                : type === 'approve'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Prompt Modal Component
 * Replaces browser's prompt() dialog with a beautiful modal
 */
export const PromptModal = ({ isOpen, onClose, onSubmit, title, message, placeholder, required = true }) => {
  const [value, setValue] = useState('')

  if (!isOpen) return null

  const handleSubmit = () => {
    if (required && !value.trim()) {
      return
    }
    onSubmit(value)
    setValue('')
    onClose()
  }

  const handleClose = () => {
    setValue('')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {title}
            </h3>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
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
          <Button onClick={handleClose} variant="outline">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={required && !value.trim()}>
            Submit
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Approval Modal Component with Partial Approval Option
 * Special modal for payout approval with amount adjustment
 */
export const ApprovalModal = ({ isOpen, onClose, onApprove, request, availableBalance }) => {
  const [approvalAmount, setApprovalAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [isPartial, setIsPartial] = useState(false)

  if (!isOpen || !request) return null

  const requestedAmount = parseFloat(request.amount || 0)
  const maxAmount = Math.min(requestedAmount, parseFloat(availableBalance || 0))
  const finalAmount = isPartial && approvalAmount ? parseFloat(approvalAmount) : requestedAmount

  const handleApprove = () => {
    const amountToApprove = isPartial ? finalAmount : null // null means approve full requested amount
    onApprove(amountToApprove, notes || 'Approved by admin')
    setApprovalAmount('')
    setNotes('')
    setIsPartial(false)
    onClose()
  }

  const handleClose = () => {
    setApprovalAmount('')
    setNotes('')
    setIsPartial(false)
    onClose()
  }

  const isValid = !isPartial || (finalAmount >= 50 && finalAmount <= maxAmount)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full">
        <div className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
              <ThumbsUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Approve Payout Request
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Requested Amount: <span className="font-semibold text-slate-900 dark:text-white">${requestedAmount.toFixed(2)}</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Available Balance: ${maxAmount.toFixed(2)}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Partial Approval Toggle */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <input
                type="checkbox"
                id="partial-approval"
                checked={isPartial}
                onChange={(e) => setIsPartial(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded"
              />
              <label htmlFor="partial-approval" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                Partial Approval (approve different amount)
              </label>
            </div>

            {/* Partial Amount Input */}
            {isPartial && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Approval Amount
                </label>
                <Input
                  type="number"
                  value={approvalAmount}
                  onChange={(e) => setApprovalAmount(e.target.value)}
                  placeholder={`Enter amount (max: $${maxAmount.toFixed(2)})`}
                  min="50"
                  max={maxAmount}
                  step="0.01"
                  className="w-full"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Min: $50.00 | Max: ${maxAmount.toFixed(2)}
                </p>
              </div>
            )}

            {/* Admin Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Admin Notes (Optional)
              </label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes for the seller..."
                className="w-full"
              />
            </div>

            {/* Summary */}
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <p className="text-sm text-emerald-900 dark:text-emerald-200">
                <span className="font-medium">Will approve:</span> ${finalAmount.toFixed(2)}
                {isPartial && finalAmount !== requestedAmount && (
                  <span className="text-xs ml-2 text-emerald-600 dark:text-emerald-400">
                    (${(requestedAmount - finalAmount).toFixed(2)} less than requested)
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 p-4 flex gap-3 justify-end">
          <Button onClick={handleClose} variant="outline">
            Cancel
          </Button>
          <Button
            onClick={handleApprove}
            disabled={!isValid}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Approve ${finalAmount.toFixed(2)}
          </Button>
        </div>
      </div>
    </div>
  )
}
