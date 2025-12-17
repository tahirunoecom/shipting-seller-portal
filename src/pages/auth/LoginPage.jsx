import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store'
import { Button, Input, Card, CardContent } from '@/components/ui'
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, Info } from 'lucide-react'

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isLoading } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState({})
  const [alertMessage, setAlertMessage] = useState(null) // { type: 'error' | 'success' | 'info', message: string, email?: string }

  // Check for messages from registration/OTP verification
  useEffect(() => {
    if (location.state?.message) {
      setAlertMessage({
        type: 'success',
        message: location.state.message,
      })
      // Pre-fill email if provided
      if (location.state.email) {
        setFormData(prev => ({ ...prev, email: location.state.email }))
      }
      // Clear the state so message doesn't persist on refresh
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error when typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
    // Clear alert when user starts typing
    if (alertMessage) {
      setAlertMessage(null)
    }
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }
    if (!formData.password) {
      newErrors.password = 'Password is required'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Mask email for display (e.g., "t***@example.com")
  const maskEmail = (email) => {
    if (!email) return ''
    const [local, domain] = email.split('@')
    if (local.length <= 2) return email
    return `${local[0]}${'*'.repeat(Math.min(local.length - 1, 5))}@${domain}`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setAlertMessage(null)
    const result = await login(formData.email, formData.password)

    if (result.success) {
      const userData = result.data?.user

      // Check verification status flags
      const otpVerified = userData?.otp_verification === 1 || userData?.otp_verification === '1'
      const isVerificationSubmitted = userData?.is_verification_submitted === 1 || userData?.is_verification_submitted === '1'
      const isApproved = userData?.approved === 1 || userData?.approved === '1'
      const stripeConnected = userData?.stripe_connect === 1 || userData?.stripe_connect === '1'

      // Check service type flags
      const isSeller = userData?.scanSell === '1' || userData?.scanSell === 1
      const isDriver = userData?.localDelivery === '1' || userData?.localDelivery === 1
      const hasServiceType = isSeller || isDriver

      // Debug logging
      console.log('Login - User Data:', {
        userData,
        flags: {
          otpVerified,
          isVerificationSubmitted,
          isApproved,
          stripeConnected,
          isSeller,
          isDriver,
          hasServiceType,
        },
        rawValues: {
          otp_verification: userData?.otp_verification,
          is_verification_submitted: userData?.is_verification_submitted,
          approved: userData?.approved,
          stripe_connect: userData?.stripe_connect,
          scanSell: userData?.scanSell,
          localDelivery: userData?.localDelivery,
        }
      })

      // Priority 1: If no service type selected, go to service type selection
      if (!hasServiceType) {
        console.log('Login - Navigating to: /select-service-type (no service type)')
        navigate('/select-service-type', {
          state: {
            fromLogin: true,
            userData
          }
        })
        return
      }

      // Priority 2: If verification not submitted, go to verification page
      if (!isVerificationSubmitted) {
        console.log('Login - Navigating to: /onboarding (verification not submitted)')
        navigate('/onboarding', {
          state: {
            fromLogin: true,
            userData,
            step: 'verification'
          }
        })
        return
      }

      // Priority 3: If verification submitted but not approved, go to pending approval
      if (isVerificationSubmitted && !isApproved) {
        console.log('Login - Navigating to: /pending-approval')
        navigate('/pending-approval')
        return
      }

      // Priority 4: Normal navigation based on roles
      if (isSeller && isDriver) {
        // User has multiple roles - let them choose
        console.log('Login - Navigating to: /select-mode (both roles)')
        navigate('/select-mode')
      } else if (isDriver) {
        // Driver only
        console.log('Login - Navigating to: /driver/orders')
        navigate('/driver/orders')
      } else {
        // Seller (default)
        console.log('Login - Navigating to: /dashboard')
        navigate('/dashboard')
      }
    } else {
      // Check if it's an OTP verification error
      const errorMessage = result.message?.toLowerCase() || ''
      if (errorMessage.includes('verify') || errorMessage.includes('otp') || errorMessage.includes('email')) {
        setAlertMessage({
          type: 'error',
          message: 'Please verify your email first!',
          email: formData.email,
          showResend: true,
        })
      } else {
        setAlertMessage({
          type: 'error',
          message: result.message || 'Login failed. Please try again.',
        })
      }
    }
  }

  const handleResendOTP = () => {
    // Navigate to OTP verification page with email to resend
    navigate('/verify-email', {
      state: {
        email: formData.email,
        resend: true
      }
    })
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text">
            Welcome back
          </h2>
          <p className="text-sm text-gray-500 dark:text-dark-muted mt-1">
            Sign in to your seller account
          </p>
        </div>

        {/* Alert Message Banner */}
        {alertMessage && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              alertMessage.type === 'error'
                ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                : alertMessage.type === 'success'
                ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                : 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
            }`}
          >
            <div className="flex items-start gap-3">
              {alertMessage.type === 'error' ? (
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              ) : alertMessage.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              ) : (
                <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p
                  className={`text-sm font-medium ${
                    alertMessage.type === 'error'
                      ? 'text-red-800 dark:text-red-200'
                      : alertMessage.type === 'success'
                      ? 'text-green-800 dark:text-green-200'
                      : 'text-blue-800 dark:text-blue-200'
                  }`}
                >
                  {alertMessage.message}
                </p>
                {alertMessage.email && alertMessage.showResend && (
                  <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                    Check your email: <strong>{maskEmail(alertMessage.email)}</strong>
                  </p>
                )}
                {alertMessage.showResend && (
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    className="mt-2 text-sm font-medium text-red-700 hover:text-red-800 dark:text-red-300 dark:hover:text-red-200 underline"
                  >
                    Resend verification email
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="relative">
            <Mail className="absolute left-3 top-9 h-5 w-5 text-gray-400" />
            <Input
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              error={errors.email}
              className="pl-10"
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock className="absolute left-3 top-9 h-5 w-5 text-gray-400" />
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              error={errors.password}
              className="pl-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Forgot password */}
          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              Forgot password?
            </Link>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            isLoading={isLoading}
          >
            Sign In
          </Button>
        </form>

        {/* Register link */}
        <p className="mt-6 text-center text-sm text-gray-500 dark:text-dark-muted">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="font-medium text-primary-600 hover:text-primary-700"
          >
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}

export default LoginPage
