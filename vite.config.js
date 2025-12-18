import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks - split large dependencies
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['lucide-react', 'react-hot-toast', 'qrcode.react'],
          'vendor-utils': ['zustand', 'axios'],
          // Feature chunks - split by feature/route
          'pages-auth': [
            './src/pages/auth/LoginPage.jsx',
            './src/pages/auth/RegisterPage.jsx',
            './src/pages/auth/OTPVerificationPage.jsx',
            './src/pages/auth/ServiceTypeSelectionPage.jsx',
            './src/pages/auth/VerificationPage.jsx',
            './src/pages/auth/PendingApprovalPage.jsx',
            './src/pages/auth/ModeSelectionPage.jsx',
          ],
          'pages-driver': [
            './src/pages/driver/DriverOrdersPage.jsx',
            './src/pages/driver/DriverOrderDetailPage.jsx',
            './src/pages/driver/DriverDeliveriesPage.jsx',
            './src/pages/driver/DriverEarningsPage.jsx',
            './src/pages/driver/DriverHistoryPage.jsx',
            './src/pages/driver/DriverSettingsPage.jsx',
          ],
          'pages-seller': [
            './src/pages/dashboard/DashboardPage.jsx',
            './src/pages/products/ProductsPage.jsx',
            './src/pages/orders/OrdersPage.jsx',
            './src/pages/orders/OrderFulfillmentBoardPage.jsx',
            './src/pages/settings/SettingsPage.jsx',
          ],
          'pages-whatsapp': [
            './src/pages/whatsapp/WhatsAppPage.jsx',
          ],
        },
      },
    },
    chunkSizeWarningLimit: 600, // Increase limit slightly for main chunk
  },
  server: {
    port: 3000,
    open: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        'src/main.jsx',
      ],
    },
  },
})
