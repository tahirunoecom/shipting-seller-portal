import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { Layout, AuthLayout, AdminLayout } from '@/components/layout'

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
  </div>
)

// Auth pages - Lazy loaded
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'))
const OTPVerificationPage = lazy(() => import('@/pages/auth/OTPVerificationPage'))
const ServiceTypeSelectionPage = lazy(() => import('@/pages/auth/ServiceTypeSelectionPage'))
const VerificationPage = lazy(() => import('@/pages/auth/VerificationPage'))
const PendingApprovalPage = lazy(() => import('@/pages/auth/PendingApprovalPage'))
const ModeSelectionPage = lazy(() => import('@/pages/auth/ModeSelectionPage'))

// Admin pages - Lazy loaded
const AdminLoginPage = lazy(() => import('@/pages/admin/AdminLoginPage'))
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'))
const AdminShipperDetailPage = lazy(() => import('@/pages/admin/AdminShipperDetailPage'))

// Main pages (Seller) - Lazy loaded
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'))
const ProductsPage = lazy(() => import('@/pages/products/ProductsPage'))
const OrdersPage = lazy(() => import('@/pages/orders/OrdersPage'))
const OrderFulfillmentBoardPage = lazy(() => import('@/pages/orders/OrderFulfillmentBoardPage'))
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'))
const WhatsAppPage = lazy(() => import('@/pages/whatsapp/WhatsAppPage'))
const StripeConnectReturnPage = lazy(() => import('@/pages/earnings/StripeConnectReturnPage'))

// Driver pages - Lazy loaded
const DriverOrdersPage = lazy(() => import('@/pages/driver/DriverOrdersPage'))
const DriverOrderDetailPage = lazy(() => import('@/pages/driver/DriverOrderDetailPage'))
const DriverDeliveriesPage = lazy(() => import('@/pages/driver/DriverDeliveriesPage'))
const DriverEarningsPage = lazy(() => import('@/pages/driver/DriverEarningsPage'))
const DriverHistoryPage = lazy(() => import('@/pages/driver/DriverHistoryPage'))
const DriverSettingsPage = lazy(() => import('@/pages/driver/DriverSettingsPage'))

// Placeholder pages (to be built)
const CatalogPage = () => <PlaceholderPage title="Catalog" description="Manage your WhatsApp product catalog" />
const DriversPage = () => <PlaceholderPage title="Find Driver" description="Find and manage delivery drivers" />
const PaymentsPage = () => <PlaceholderPage title="Payments" description="Manage your payment settings and Stripe integration" />
const BillingPage = () => <PlaceholderPage title="Billing" description="View your billing history and statements" />

// Placeholder component
function PlaceholderPage({ title, description }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center mb-4">
        <span className="text-2xl">🚧</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">{title}</h1>
      <p className="text-gray-500 dark:text-dark-muted mt-2">{description}</p>
      <p className="text-sm text-gray-400 mt-4">Coming soon...</p>
    </div>
  )
}

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Auth routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<PlaceholderPage title="Forgot Password" description="Reset your password" />} />
          <Route path="/verify-email" element={<OTPVerificationPage />} />
        </Route>

        {/* Onboarding routes (no auth layout) */}
        <Route path="/select-service-type" element={<ServiceTypeSelectionPage />} />
        <Route path="/onboarding" element={<VerificationPage />} />
        <Route path="/onboarding/verification" element={<VerificationPage />} />
        <Route path="/pending-approval" element={<PendingApprovalPage />} />

        {/* Mode Selection (for users with multiple roles) */}
        <Route path="/select-mode" element={<ModeSelectionPage />} />

        {/* Protected routes - Seller */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/fulfillment" element={<OrderFulfillmentBoardPage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/whatsapp" element={<WhatsAppPage />} />
          <Route path="/drivers" element={<DriversPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/earnings/stripe-connect" element={<StripeConnectReturnPage />} />
          <Route path="/settings" element={<SettingsPage />} />

          {/* Driver routes */}
          <Route path="/driver/orders" element={<DriverOrdersPage />} />
          <Route path="/driver/order/:orderId" element={<DriverOrderDetailPage />} />
          <Route path="/driver/deliveries" element={<DriverDeliveriesPage />} />
          <Route path="/driver/earnings" element={<DriverEarningsPage />} />
          <Route path="/driver/history" element={<DriverHistoryPage />} />
          <Route path="/driver/settings" element={<DriverSettingsPage />} />
        </Route>

        {/* Admin routes */}
        <Route path="/admin" element={<AdminLoginPage />} />
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/shipper/:shipperId" element={<AdminShipperDetailPage />} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App
