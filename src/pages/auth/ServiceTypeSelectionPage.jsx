import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button, Card, CardContent } from '@/components/ui'
import { Store, Truck, Check, ArrowRight } from 'lucide-react'
import { authService } from '@/services'
import { useAuthStore } from '@/store'
import toast from 'react-hot-toast'

function ServiceTypeSelectionPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, updateUser } = useAuthStore()

  // Can come from login (authenticated) or from registration (not authenticated)
  const fromLogin = location.state?.fromLogin
  const userData = location.state?.userData || user

  const [selectedTypes, setSelectedTypes] = useState({
    seller: false,
    driver: false,
  })
  const [isLoading, setIsLoading] = useState(false)

  // Get account ID from user data
  const accountId = userData?.wh_account_id

  // Redirect if no account data
  if (!accountId) {
    navigate('/login')
    return null
  }

  const toggleSelection = (type) => {
    setSelectedTypes((prev) => ({
      ...prev,
      [type]: !prev[type],
    }))
  }

  const handleContinue = async () => {
    if (!selectedTypes.seller && !selectedTypes.driver) {
      toast.error('Please select at least one option')
      return
    }

    setIsLoading(true)
    try {
      const response = await authService.updateServiceType({
        wh_account_id: accountId,
        scanSell: selectedTypes.seller ? 1 : 0,
        fulfillment: 0,
        localDelivery: selectedTypes.driver ? 1 : 0,
      })

      if (response.status === 1) {
        toast.success('Account type updated!')

        // Update local user state
        if (updateUser) {
          updateUser({
            scanSell: selectedTypes.seller ? '1' : '0',
            localDelivery: selectedTypes.driver ? '1' : '0',
          })
        }

        // Check if verification is submitted
        const isVerificationSubmitted = userData?.is_verification_submitted === 1 || userData?.is_verification_submitted === '1'

        if (!isVerificationSubmitted) {
          // Go to verification/onboarding
          navigate('/onboarding', {
            state: {
              fromLogin: true,
              userData,
              serviceTypes: selectedTypes,
            }
          })
        } else {
          // Go to dashboard
          if (selectedTypes.driver && !selectedTypes.seller) {
            navigate('/driver/orders')
          } else {
            navigate('/dashboard')
          }
        }
      } else {
        toast.error(response.message || 'Failed to update account type')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const serviceOptions = [
    {
      id: 'seller',
      title: 'Seller / Store Owner',
      description: 'Sell products online and manage your store. Accept orders via WhatsApp and deliver to your customers.',
      icon: Store,
      features: [
        'Create product catalog',
        'Accept orders via WhatsApp',
        'Manage inventory',
        'Track sales & revenue',
      ],
    },
    {
      id: 'driver',
      title: 'Delivery Partner',
      description: 'Deliver orders and earn money. Pick up from stores and deliver to customers in your area.',
      icon: Truck,
      features: [
        'Accept delivery requests',
        'Earn per delivery',
        'Flexible working hours',
        'Track your earnings',
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
            How will you use Shipting?
          </h1>
          <p className="text-gray-500 dark:text-dark-muted mt-2">
            Select all that apply. You can change this later in settings.
          </p>
        </div>

        {/* Service Options */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {serviceOptions.map((option) => {
            const Icon = option.icon
            const isSelected = selectedTypes[option.id]

            return (
              <Card
                key={option.id}
                className={`cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'ring-2 ring-primary-500 border-primary-500'
                    : 'hover:border-gray-300 dark:hover:border-dark-border'
                }`}
                onClick={() => toggleSelection(option.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        isSelected
                          ? 'bg-primary-100 dark:bg-primary-900/30'
                          : 'bg-gray-100 dark:bg-dark-border'
                      }`}
                    >
                      <Icon
                        className={`h-6 w-6 ${
                          isSelected
                            ? 'text-primary-600 dark:text-primary-400'
                            : 'text-gray-500 dark:text-dark-muted'
                        }`}
                      />
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? 'bg-primary-500 border-primary-500'
                          : 'border-gray-300 dark:border-dark-border'
                      }`}
                    >
                      {isSelected && <Check className="h-4 w-4 text-white" />}
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text mb-2">
                    {option.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-dark-muted mb-4">
                    {option.description}
                  </p>

                  <ul className="space-y-2">
                    {option.features.map((feature, index) => (
                      <li
                        key={index}
                        className="flex items-center text-sm text-gray-600 dark:text-dark-muted"
                      >
                        <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Continue Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleContinue}
            isLoading={isLoading}
            disabled={!selectedTypes.seller && !selectedTypes.driver}
            className="px-8"
          >
            Continue
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        {/* Info text */}
        <p className="text-center text-sm text-gray-500 dark:text-dark-muted mt-6">
          You can select both options if you want to sell products and also deliver for others.
        </p>
      </div>
    </div>
  )
}

export default ServiceTypeSelectionPage
