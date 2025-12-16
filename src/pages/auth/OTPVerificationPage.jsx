import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button, Card, CardContent } from '@/components/ui'
import { Mail, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { authService } from '@/services'
import toast from 'react-hot-toast'

function OTPVerificationPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const email = location.state?.email
  const userData = location.state?.userData

  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendTimer, setResendTimer] = useState(60)
  const [error, setError] = useState('')
  const inputRefs = useRef([])

  // Redirect if no email
  useEffect(() => {
    if (!email) {
      navigate('/register')
    }
  }, [email, navigate])

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendTimer])

  const handleChange = (index, value) => {
    // Only allow numbers
    if (value && !/^\d+$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value.slice(-1) // Only take last character

    setOtp(newOtp)
    setError('')

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').slice(0, 6)
    if (/^\d+$/.test(pastedData)) {
      const newOtp = pastedData.split('').concat(Array(6).fill('')).slice(0, 6)
      setOtp(newOtp)
      inputRefs.current[Math.min(pastedData.length, 5)]?.focus()
    }
  }

  const handleVerify = async () => {
    const otpString = otp.join('')
    if (otpString.length !== 6) {
      setError('Please enter the complete 6-digit OTP')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await authService.validateOTP(email, otpString)

      if (response.status === 1 && response.data?.validateOtp === 1) {
        toast.success('Email verified successfully!')
        // Navigate to service type selection
        navigate('/select-service-type', {
          state: {
            email,
            userData,
            wh_account_id: userData?.wh_account_id || response.data?.wh_account_id
          }
        })
      } else {
        setError(response.message || 'Invalid OTP. Please try again.')
        setOtp(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please try again.')
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendTimer > 0) return

    setIsResending(true)
    try {
      await authService.resendOTP(email)
      toast.success('OTP sent successfully!')
      setResendTimer(60)
      setOtp(['', '', '', '', '', ''])
      setError('')
      inputRefs.current[0]?.focus()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend OTP')
    } finally {
      setIsResending(false)
    }
  }

  if (!email) return null

  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mb-4">
            <Mail className="h-8 w-8 text-primary-600 dark:text-primary-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text">
            Verify your email
          </h2>
          <p className="text-sm text-gray-500 dark:text-dark-muted mt-1">
            We've sent a 6-digit code to
          </p>
          <p className="text-sm font-medium text-gray-900 dark:text-dark-text mt-1">
            {email}
          </p>
        </div>

        {/* OTP Input */}
        <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className={`w-12 h-14 text-center text-xl font-semibold border-2 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                dark:bg-dark-card dark:text-dark-text dark:border-dark-border
                ${error ? 'border-red-500' : 'border-gray-300'}
                transition-colors`}
            />
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center justify-center gap-2 text-red-500 text-sm mb-4">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Verify Button */}
        <Button
          onClick={handleVerify}
          className="w-full mb-4"
          isLoading={isLoading}
          disabled={otp.join('').length !== 6}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Verify Email
        </Button>

        {/* Resend OTP */}
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-dark-muted mb-2">
            Didn't receive the code?
          </p>
          <button
            onClick={handleResend}
            disabled={resendTimer > 0 || isResending}
            className={`inline-flex items-center text-sm font-medium
              ${resendTimer > 0
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-primary-600 hover:text-primary-700 cursor-pointer'
              }`}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isResending ? 'animate-spin' : ''}`} />
            {resendTimer > 0
              ? `Resend in ${resendTimer}s`
              : isResending
                ? 'Sending...'
                : 'Resend OTP'
            }
          </button>
        </div>

        {/* Change email link */}
        <p className="mt-6 text-center text-sm text-gray-500 dark:text-dark-muted">
          Wrong email?{' '}
          <button
            onClick={() => navigate('/register')}
            className="font-medium text-primary-600 hover:text-primary-700"
          >
            Go back
          </button>
        </p>
      </CardContent>
    </Card>
  )
}

export default OTPVerificationPage
