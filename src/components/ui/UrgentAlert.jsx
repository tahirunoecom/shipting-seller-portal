import { useState } from 'react'
import { AlertTriangle, X, ChevronDown, ChevronUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from './Button'

/**
 * UrgentAlert Component
 * Displays urgent messages for critical setup steps
 *
 * @param {string} type - 'stripe' or 'whatsapp'
 * @param {boolean} compact - Show compact version (for non-dashboard pages)
 * @param {function} onClose - Called when alert is closed (optional)
 */
export const UrgentAlert = ({ type, compact = false, onClose }) => {
  const [isCollapsed, setIsCollapsed] = useState(compact)
  const [isDismissed, setIsDismissed] = useState(false)

  if (isDismissed) return null

  const handleClose = () => {
    setIsDismissed(true)
    onClose?.()
  }

  const config = {
    stripe: {
      title: '🚨 URGENT: Connect Your Stripe Account',
      message: 'You cannot receive payouts without connecting Stripe. This is a required step to get paid for your orders.',
      compactMessage: 'Connect Stripe to receive payouts',
      link: '/billing',
      linkText: 'Connect Stripe Now',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-300 dark:border-red-700',
      textColor: 'text-red-900 dark:text-red-100',
      buttonColor: 'bg-red-600 hover:bg-red-700',
    },
    whatsapp: {
      title: '🚨 URGENT: Connect Your WhatsApp Business Account',
      message: 'Connect WhatsApp to communicate with customers, send order updates, and automate customer support.',
      compactMessage: 'Connect WhatsApp for customer messaging',
      link: '/whatsapp',
      linkText: 'Connect WhatsApp Now',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      borderColor: 'border-orange-300 dark:border-orange-700',
      textColor: 'text-orange-900 dark:text-orange-100',
      buttonColor: 'bg-orange-600 hover:bg-orange-700',
    },
  }

  const alert = config[type]

  if (compact) {
    return (
      <div className={`mb-4 border-l-4 ${alert.borderColor} ${alert.bgColor} p-3 rounded-r-lg shadow-sm`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <AlertTriangle className={`w-4 h-4 ${alert.textColor} flex-shrink-0`} />
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`text-sm font-medium ${alert.textColor} text-left flex items-center gap-2 hover:underline`}
            >
              {alert.compactMessage}
              {isCollapsed ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
          </div>
          <div className="flex items-center gap-2">
            {!isCollapsed && (
              <Link to={alert.link}>
                <Button
                  size="sm"
                  className={`${alert.buttonColor} text-white h-7 px-3 text-xs`}
                >
                  {alert.linkText}
                </Button>
              </Link>
            )}
            <button
              onClick={handleClose}
              className={`${alert.textColor} hover:opacity-70 flex-shrink-0`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        {!isCollapsed && (
          <p className={`text-xs ${alert.textColor} mt-2 ml-6`}>
            {alert.message}
          </p>
        )}
      </div>
    )
  }

  // Full dashboard version
  return (
    <div className={`mb-6 border-2 ${alert.borderColor} ${alert.bgColor} p-6 rounded-lg shadow-lg`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1">
          <div className={`w-12 h-12 rounded-full ${alert.bgColor} border-2 ${alert.borderColor} flex items-center justify-center flex-shrink-0`}>
            <AlertTriangle className={`w-6 h-6 ${alert.textColor}`} />
          </div>
          <div className="flex-1">
            <h3 className={`text-lg font-bold ${alert.textColor} mb-2`}>
              {alert.title}
            </h3>
            <p className={`${alert.textColor} mb-4 text-sm`}>
              {alert.message}
            </p>
            <Link to={alert.link}>
              <Button className={`${alert.buttonColor} text-white`}>
                {alert.linkText}
              </Button>
            </Link>
          </div>
        </div>
        <button
          onClick={handleClose}
          className={`${alert.textColor} hover:opacity-70 flex-shrink-0`}
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

export default UrgentAlert
