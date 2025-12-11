import { Outlet, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store'

function AuthLayout() {
  const { isAuthenticated } = useAuthStore()

  // Redirect to dashboard if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="https://stageshipper.shipting.com/provider/images/newlogo.png"
            alt="Shipting"
            className="h-12 w-auto mb-3"
          />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
            Shipting
          </h1>
          <p className="text-gray-500 dark:text-dark-muted">Seller Portal</p>
        </div>

        {/* Auth Form */}
        <Outlet />
      </div>

      {/* Footer */}
      <p className="mt-8 text-sm text-gray-500 dark:text-dark-muted">
        © {new Date().getFullYear()} Shipting. All rights reserved.
      </p>
    </div>
  )
}

export default AuthLayout
