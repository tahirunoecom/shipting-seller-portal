import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store'
import { Card, CardContent, Button } from '@/components/ui'
import { Store, Truck, ArrowRight } from 'lucide-react'

function ModeSelectionPage() {
  const navigate = useNavigate()
  const { user, userTypes, setActiveMode } = useAuthStore()

  const handleSelectMode = (mode) => {
    setActiveMode(mode)
    if (mode === 'driver') {
      navigate('/driver/orders')
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <img
            src="https://stageshipper.shipting.com/provider/images/newlogo.png"
            alt="Shipting"
            className="h-12 mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
            Welcome, {user?.firstname}!
          </h1>
          <p className="text-gray-500 dark:text-dark-muted mt-2">
            Choose how you'd like to use Shipting today
          </p>
        </div>

        {/* Mode Cards */}
        <div className="space-y-4">
          {/* Seller Mode */}
          {userTypes.scanSell && (
            <Card
              className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary-500"
              onClick={() => handleSelectMode('seller')}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                    <Store className="h-8 w-8 text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">
                      Store Owner
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-dark-muted">
                      Manage your products, orders, and store settings
                    </p>
                  </div>
                  <ArrowRight className="h-6 w-6 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Driver Mode */}
          {userTypes.localDelivery && (
            <Card
              className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-green-500"
              onClick={() => handleSelectMode('driver')}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                    <Truck className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">
                      Delivery Partner
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-dark-muted">
                      Accept orders and deliver to customers
                    </p>
                  </div>
                  <ArrowRight className="h-6 w-6 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          You can switch between modes anytime from the sidebar
        </p>
      </div>
    </div>
  )
}

export default ModeSelectionPage
