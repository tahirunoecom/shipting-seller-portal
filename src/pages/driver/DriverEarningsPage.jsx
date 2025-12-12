import { Card, CardContent } from '@/components/ui'
import { CreditCard } from 'lucide-react'

function DriverEarningsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
          Earnings
        </h1>
        <p className="text-gray-500 dark:text-dark-muted">
          Track your delivery earnings
        </p>
      </div>

      <Card>
        <CardContent className="py-12 text-center">
          <CreditCard className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text">
            Earnings Dashboard
          </h3>
          <p className="text-gray-500 dark:text-dark-muted mt-1">
            Coming soon...
          </p>
          <p className="text-sm text-gray-400 mt-4">
            Track your daily, weekly, and monthly earnings here
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default DriverEarningsPage
