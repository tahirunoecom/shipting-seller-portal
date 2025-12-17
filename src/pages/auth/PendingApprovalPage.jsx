import { useNavigate } from 'react-router-dom'
import { Button, Card, CardContent } from '@/components/ui'
import { Clock, CheckCircle, LogOut, Mail, Phone } from 'lucide-react'
import { useAuthStore } from '@/store'

function PendingApprovalPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleRefresh = () => {
    // Re-check by logging in again
    logout()
    navigate('/login', {
      state: {
        message: 'Please login again to check your approval status.',
        email: user?.email
      }
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <Card>
          <CardContent className="p-8">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                <Clock className="h-10 w-10 text-amber-600 dark:text-amber-400" />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-dark-text mb-2">
              Verification Under Review
            </h1>

            {/* Description */}
            <p className="text-center text-gray-600 dark:text-dark-muted mb-6">
              Thank you for submitting your verification details! Our team is currently reviewing your information.
            </p>

            {/* Status Card */}
            <div className="bg-gray-50 dark:bg-dark-border rounded-lg p-4 mb-6">
              <h3 className="font-medium text-gray-900 dark:text-dark-text mb-3">
                What happens next?
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600 dark:text-dark-muted">
                    Your documents have been submitted successfully
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600 dark:text-dark-muted">
                    Our team will review your verification within 24-48 hours
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600 dark:text-dark-muted">
                    You'll receive an email notification once your account is approved
                  </span>
                </li>
              </ul>
            </div>

            {/* User Info */}
            {user?.email && (
              <div className="text-center text-sm text-gray-500 dark:text-dark-muted mb-6">
                Registered email: <span className="font-medium">{user.email}</span>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <Button
                onClick={handleRefresh}
                className="w-full"
              >
                Check Approval Status
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>

            {/* Contact Support */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-dark-border">
              <p className="text-center text-sm text-gray-500 dark:text-dark-muted">
                Need help? Contact our support team
              </p>
              <div className="flex justify-center gap-4 mt-2">
                <a
                  href="mailto:support@shipting.com"
                  className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  <Mail className="h-4 w-4" />
                  support@shipting.com
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default PendingApprovalPage
