import { useState } from 'react'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import { useAdminStore } from '@/store'
import { adminService } from '@/services'
import { Button, Card, CardContent } from '@/components/ui'
import { Shield, Lock, Eye, EyeOff, AlertCircle, LogIn, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

function AdminLoginPage() {
  const navigate = useNavigate()
  const { adminLogin, setAdminToken, isAdminAuthenticated } = useAdminStore()
  const [showPassword, setShowPassword] = useState(false)
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [requiresShipperLogin, setRequiresShipperLogin] = useState(false)

  // If already authenticated, redirect to dashboard using Navigate component
  if (isAdminAuthenticated) {
    return <Navigate to="/admin/dashboard" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setRequiresShipperLogin(false)

    if (!passcode) {
      setError('Passcode is required')
      return
    }

    setIsLoading(true)

    try {
      // First validate the passcode locally
      const localResult = adminLogin(passcode)

      if (!localResult.success) {
        setIsLoading(false)
        setError(localResult.message || 'Invalid passcode')
        toast.error('Invalid passcode')
        return
      }

      // Passcode is correct, now try to get API authentication
      const apiResult = await adminService.login(passcode)

      if (apiResult.status === 1 && apiResult.data?.access_token) {
        // Got a token from the API
        setAdminToken(apiResult.data.access_token)
        toast.success('Admin login successful!')
        navigate('/admin/dashboard')
      } else if (apiResult.requiresShipperLogin) {
        // Need to login as shipper first
        setRequiresShipperLogin(true)
        setError(apiResult.message)
        // Still allow access since passcode is correct
        toast.success('Admin passcode accepted!')
        navigate('/admin/dashboard')
      } else {
        // Passcode correct but no API token - proceed anyway
        toast.success('Admin login successful!')
        navigate('/admin/dashboard')
      }
    } catch (error) {
      console.error('Admin login error:', error)
      // If passcode was correct, still allow access
      toast.success('Admin login successful!')
      navigate('/admin/dashboard')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyMDIwMjAiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnYyaDR2Mmgtdjstch0iLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>

      <Card className="w-full max-w-md relative z-10 bg-white/10 backdrop-blur-xl border-white/20">
        <CardContent className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/30 mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Admin Access</h1>
            <p className="text-slate-400 mt-2 text-sm">
              Enter the admin passcode to continue
            </p>
          </div>

          {/* Info about shipper login */}
          {!localStorage.getItem('access_token') && (
            <div className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
              <div className="flex items-start gap-3">
                <LogIn className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-300">
                  <p className="font-medium mb-1">Pro Tip</p>
                  <p className="text-blue-300/80">
                    For full API access, login as a shipper first, then access admin panel.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            </div>
          )}

          {/* Requires Shipper Login */}
          {requiresShipperLogin && (
            <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0" />
                  <p className="text-sm text-amber-300">
                    Login as a shipper first for full admin access
                  </p>
                </div>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-amber-500/20 text-amber-300 rounded-lg text-sm hover:bg-amber-500/30 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  Go to Shipper Login
                </Link>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 z-10" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value)
                  setError('')
                  setRequiresShipperLogin(false)
                }}
                placeholder="Enter admin passcode"
                className="w-full h-14 pl-12 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>

            <Button
              type="submit"
              className="w-full h-14 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/30 transition-all"
              isLoading={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Authenticating...
                </span>
              ) : (
                'Access Admin Panel'
              )}
            </Button>
          </form>

          {/* Back to login */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Back to User Login
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminLoginPage
