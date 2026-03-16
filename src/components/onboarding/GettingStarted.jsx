import { Link } from 'react-router-dom'
import { CheckCircle, Circle, AlertCircle, ArrowRight, Package, CreditCard, MessageSquare } from 'lucide-react'
import { Button, Card, CardContent } from '@/components/ui'

function GettingStarted({ user, isWhatsAppConnected, totalProducts }) {
  // Calculate setup progress
  const steps = [
    {
      id: 'whatsapp',
      title: 'Connect WhatsApp Business',
      description: 'Send automated order updates to your customers',
      icon: MessageSquare,
      completed: isWhatsAppConnected,
      link: '/whatsapp',
      priority: 'high',
    },
    {
      id: 'stripe',
      title: 'Connect Stripe Account',
      description: 'Get paid for your orders',
      icon: CreditCard,
      completed: user?.stripe_connect === 1 || user?.stripe_connect === '1',
      link: '/billing',
      priority: 'high',
    },
    {
      id: 'products',
      title: 'Add Your First Products',
      description: 'Start selling by adding products to your catalog',
      icon: Package,
      completed: totalProducts > 0,
      link: '/products',
      priority: 'medium',
    },
  ]

  const completedSteps = steps.filter(s => s.completed).length
  const totalSteps = steps.length
  const progressPercentage = (completedSteps / totalSteps) * 100

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text mb-2">
          Welcome to Shipting! 🎉
        </h1>
        <p className="text-lg text-gray-600 dark:text-dark-muted">
          Let's get your store set up and ready to start selling
        </p>
      </div>

      {/* Progress Bar */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">
              Setup Progress
            </h3>
            <span className="text-sm font-medium text-gray-600 dark:text-dark-muted">
              {completedSteps} of {totalSteps} completed
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-dark-border rounded-full h-3 mb-2">
            <div
              className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          <p className="text-xs text-gray-500 dark:text-dark-muted">
            {completedSteps === totalSteps
              ? "🎊 All set! You're ready to start selling!"
              : `${totalSteps - completedSteps} ${totalSteps - completedSteps === 1 ? 'step' : 'steps'} remaining`}
          </p>
        </CardContent>
      </Card>

      {/* Setup Steps */}
      <div className="space-y-4">
        {steps.map((step, index) => {
          const Icon = step.icon
          const isCompleted = step.completed
          const isPriority = step.priority === 'high'

          return (
            <Card key={step.id} className={isCompleted ? 'border-green-200 dark:border-green-800' : isPriority ? 'border-orange-200 dark:border-orange-800' : ''}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* Step Icon/Status */}
                  <div className="flex-shrink-0">
                    {isCompleted ? (
                      <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                    ) : (
                      <div className={`w-12 h-12 rounded-full ${isPriority ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-gray-100 dark:bg-gray-800'} flex items-center justify-center`}>
                        <Icon className={`h-6 w-6 ${isPriority ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400'}`} />
                      </div>
                    )}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">
                            {step.title}
                          </h3>
                          {isPriority && !isCompleted && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded">
                              Required
                            </span>
                          )}
                          {isCompleted && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded">
                              Completed
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-dark-muted">
                          {step.description}
                        </p>
                      </div>

                      {/* Action Button */}
                      {!isCompleted && (
                        <Link to={step.link}>
                          <Button
                            variant={isPriority ? 'default' : 'outline'}
                            size="sm"
                            className="flex-shrink-0"
                          >
                            {step.id === 'products' ? 'Add Products' : 'Connect Now'}
                            <ArrowRight className="h-4 w-4 ml-1" />
                          </Button>
                        </Link>
                      )}
                    </div>

                    {/* Additional Info for Completed Steps */}
                    {isCompleted && step.id === 'products' && (
                      <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="text-sm text-green-700 dark:text-green-400">
                          ✅ You have {totalProducts} {totalProducts === 1 ? 'product' : 'products'} in your catalog
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Help Section */}
      <Card className="mt-8 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-1">
                Need Help Getting Started?
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-400 mb-3">
                Complete the required steps above to start receiving and managing orders. Each integration is essential for your store to function properly.
              </p>
              <div className="flex gap-3">
                <Link to="/whatsapp">
                  <Button variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-600 dark:text-blue-400">
                    Setup WhatsApp
                  </Button>
                </Link>
                <Link to="/billing">
                  <Button variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-600 dark:text-blue-400">
                    Setup Payments
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default GettingStarted
