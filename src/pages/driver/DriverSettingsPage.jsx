import { useState } from 'react'
import { useAuthStore } from '@/store'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Avatar,
} from '@/components/ui'
import {
  User,
  Phone,
  Mail,
  MapPin,
  Car,
  Shield,
  Bell,
} from 'lucide-react'
import toast from 'react-hot-toast'

function DriverSettingsPage() {
  const { user, userDetails } = useAuthStore()
  const [activeTab, setActiveTab] = useState('profile')

  const tabs = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'vehicle', label: 'Vehicle', icon: Car },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'security', label: 'Security', icon: Shield },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
          Settings
        </h1>
        <p className="text-gray-500 dark:text-dark-muted">
          Manage your driver profile and preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-dark-border dark:text-dark-muted'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <Avatar
                name={`${user?.firstname || ''} ${user?.lastname || ''}`}
                src={user?.profile_img}
                size="xl"
              />
              <div>
                <Button variant="outline" size="sm">
                  Change Photo
                </Button>
                <p className="text-xs text-gray-500 mt-1">
                  JPG, GIF or PNG. Max 2MB
                </p>
              </div>
            </div>

            {/* Form */}
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="First Name"
                value={user?.firstname || ''}
                placeholder="First name"
                readOnly
              />
              <Input
                label="Last Name"
                value={user?.lastname || ''}
                placeholder="Last name"
                readOnly
              />
              <Input
                label="Email"
                type="email"
                value={user?.email || ''}
                placeholder="Email address"
                readOnly
              />
              <Input
                label="Phone"
                value={user?.telephone || ''}
                placeholder="Phone number"
                readOnly
              />
              <div className="md:col-span-2">
                <Input
                  label="Address"
                  value={userDetails?.address_1 || ''}
                  placeholder="Your address"
                  readOnly
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => toast.success('Profile update coming soon')}>
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vehicle Tab */}
      {activeTab === 'vehicle' && (
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Information</CardTitle>
          </CardHeader>
          <CardContent className="py-12 text-center">
            <Car className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text">
              Vehicle Details
            </h3>
            <p className="text-gray-500 dark:text-dark-muted mt-1">
              Coming soon...
            </p>
            <p className="text-sm text-gray-400 mt-4">
              Add and manage your vehicle information here
            </p>
          </CardContent>
        </Card>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b dark:border-dark-border">
              <div>
                <p className="font-medium text-gray-900 dark:text-dark-text">New Order Alerts</p>
                <p className="text-sm text-gray-500">Get notified when new orders are available</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-dark-border peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
              </label>
            </div>
            <div className="flex items-center justify-between py-3 border-b dark:border-dark-border">
              <div>
                <p className="font-medium text-gray-900 dark:text-dark-text">Order Updates</p>
                <p className="text-sm text-gray-500">Updates about your active deliveries</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-dark-border peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
              </label>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-gray-900 dark:text-dark-text">Earnings Summary</p>
                <p className="text-sm text-gray-500">Daily earnings summary notifications</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-dark-border peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <Card>
          <CardHeader>
            <CardTitle>Security Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-dark-text mb-4">
                Change Password
              </h4>
              <div className="grid gap-4 max-w-md">
                <Input
                  label="Current Password"
                  type="password"
                  placeholder="Enter current password"
                />
                <Input
                  label="New Password"
                  type="password"
                  placeholder="Enter new password"
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  placeholder="Confirm new password"
                />
              </div>
              <Button className="mt-4" onClick={() => toast.success('Password update coming soon')}>
                Update Password
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default DriverSettingsPage
