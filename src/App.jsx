import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout, AuthLayout } from '@/components/layout'

// Auth pages
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import OTPVerificationPage from '@/pages/auth/OTPVerificationPage'
import ServiceTypeSelectionPage from '@/pages/auth/ServiceTypeSelectionPage'
import VerificationPage from '@/pages/auth/VerificationPage'
import ModeSelectionPage from '@/pages/auth/ModeSelectionPage'

// Main pages (Seller)
import DashboardPage from '@/pages/dashboard/DashboardPage'
import ProductsPage from '@/pages/products/ProductsPage'
import OrdersPage from '@/pages/orders/OrdersPage'
import SettingsPage from '@/pages/settings/SettingsPage'
import WhatsAppPage from '@/pages/whatsapp/WhatsAppPage'

// Driver pages
import {
  DriverOrdersPage,
  DriverOrderDetailPage,
  DriverDeliveriesPage,
  DriverEarningsPage,
  DriverHistoryPage,
  DriverSettingsPage,
} from '@/pages/driver'

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
      <Route path="/onboarding/verification" element={<VerificationPage />} />

      {/* Mode Selection (for users with multiple roles) */}
      <Route path="/select-mode" element={<ModeSelectionPage />} />

      {/* Protected routes - Seller */}
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/whatsapp" element={<WhatsAppPage />} />
        <Route path="/drivers" element={<DriversPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/settings" element={<SettingsPage />} />

        {/* Driver routes */}
        <Route path="/driver/orders" element={<DriverOrdersPage />} />
        <Route path="/driver/order/:orderId" element={<DriverOrderDetailPage />} />
        <Route path="/driver/deliveries" element={<DriverDeliveriesPage />} />
        <Route path="/driver/earnings" element={<DriverEarningsPage />} />
        <Route path="/driver/history" element={<DriverHistoryPage />} />
        <Route path="/driver/settings" element={<DriverSettingsPage />} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
