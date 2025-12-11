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
  Store,
  MapPin,
  Phone,
  Mail,
  Camera,
  Save,
  Bell,
  Shield,
  CreditCard,
} from 'lucide-react'
import toast from 'react-hot-toast'

function SettingsPage() {
  const { user, userDetails, updateUser, updateUserDetails } = useAuthStore()
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [profileData, setProfileData] = useState({
    firstname: user?.firstname || '',
    lastname: user?.lastname || '',
    email: user?.email || '',
    telephone: user?.telephone || '',
  })
  const [storeData, setStoreData] = useState({
    company: userDetails?.company || '',
    address_1: userDetails?.address_1 || '',
    address_2: userDetails?.address_2 || '',
    city: userDetails?.city || '',
    zip: userDetails?.zip || '',
  })

  const tabs = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'store', label: 'Store', icon: Store },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'security', label: 'Security', icon: Shield },
    { key: 'billing', label: 'Billing', icon: CreditCard },
  ]

  const handleProfileChange = (e) => {
    const { name, value } = e.target
    setProfileData((prev) => ({ ...prev, [name]: value }))
  }

  const handleStoreChange = (e) => {
    const { name, value } = e.target
    setStoreData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSaveProfile = async () => {
    try {
      setLoading(true)
      // API call would go here
      updateUser(profileData)
      toast.success('Profile updated successfully!')
    } catch (error) {
      toast.error('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveStore = async () => {
    try {
      setLoading(true)
      // API call would go here
      updateUserDetails(storeData)
      toast.success('Store settings updated!')
    } catch (error) {
      toast.error('Failed to update store settings')
    } finally {
      setLoading(false)
    }
  }

  const fullName = `${user?.firstname || ''} ${user?.lastname || ''}`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Settings</h1>
        <p className="text-gray-500 dark:text-dark-muted">
          Manage your account and store preferences
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <Card className="lg:w-64 h-fit">
          <CardContent className="p-2">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === tab.key
                      ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-dark-muted dark:hover:bg-dark-border'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </CardContent>
        </Card>

        {/* Content */}
        <div className="flex-1">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <Avatar name={fullName} size="xl" src={user?.profile_img} />
                  <div>
                    <Button variant="outline" size="sm">
                      <Camera className="h-4 w-4" />
                      Change Photo
                    </Button>
                    <p className="text-xs text-gray-500 mt-1">JPG, PNG. Max 2MB</p>
                  </div>
                </div>

                {/* Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    name="firstname"
                    value={profileData.firstname}
                    onChange={handleProfileChange}
                  />
                  <Input
                    label="Last Name"
                    name="lastname"
                    value={profileData.lastname}
                    onChange={handleProfileChange}
                  />
                  <Input
                    label="Email"
                    name="email"
                    type="email"
                    value={profileData.email}
                    onChange={handleProfileChange}
                  />
                  <Input
                    label="Phone"
                    name="telephone"
                    value={profileData.telephone}
                    onChange={handleProfileChange}
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveProfile} isLoading={loading}>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Store Tab */}
          {activeTab === 'store' && (
            <Card>
              <CardHeader>
                <CardTitle>Store Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Input
                  label="Store Name"
                  name="company"
                  value={storeData.company}
                  onChange={handleStoreChange}
                  placeholder="Your store name"
                />
                <Input
                  label="Address Line 1"
                  name="address_1"
                  value={storeData.address_1}
                  onChange={handleStoreChange}
                  placeholder="Street address"
                />
                <Input
                  label="Address Line 2"
                  name="address_2"
                  value={storeData.address_2}
                  onChange={handleStoreChange}
                  placeholder="Apartment, suite, etc. (optional)"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="City"
                    name="city"
                    value={storeData.city}
                    onChange={handleStoreChange}
                  />
                  <Input
                    label="ZIP Code"
                    name="zip"
                    value={storeData.zip}
                    onChange={handleStoreChange}
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveStore} isLoading={loading}>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
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
                {[
                  { label: 'New Orders', description: 'Get notified when you receive a new order' },
                  { label: 'Order Updates', description: 'Receive updates about order status changes' },
                  { label: 'Low Stock Alerts', description: 'Get alerts when product stock is low' },
                  { label: 'Marketing Emails', description: 'Receive tips and promotional content' },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg dark:bg-dark-bg"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-dark-text">
                        {item.label}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-dark-muted">
                        {item.description}
                      </p>
                    </div>
                    <button className="relative w-12 h-6 rounded-full bg-primary-500 transition-colors">
                      <span className="absolute top-1 right-1 w-4 h-4 bg-white rounded-full transition-transform" />
                    </button>
                  </div>
                ))}
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
                  <div className="space-y-4 max-w-md">
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
                    <Button>Update Password</Button>
                  </div>
                </div>

                <hr className="dark:border-dark-border" />

                <div>
                  <h4 className="font-medium text-gray-900 dark:text-dark-text mb-2">
                    Two-Factor Authentication
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-dark-muted mb-4">
                    Add an extra layer of security to your account
                  </p>
                  <Button variant="outline">Enable 2FA</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Billing Tab */}
          {activeTab === 'billing' && (
            <Card>
              <CardHeader>
                <CardTitle>Billing & Payments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-gray-50 rounded-lg dark:bg-dark-bg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-dark-text">
                        Stripe Connect Status
                      </p>
                      <p className="text-sm text-gray-500 dark:text-dark-muted">
                        {user?.stripe_connect_id
                          ? 'Connected'
                          : 'Not connected'}
                      </p>
                    </div>
                    {user?.stripe_connect_id ? (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        Active
                      </span>
                    ) : (
                      <Button>Connect Stripe</Button>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 dark:text-dark-text mb-4">
                    Earnings Summary
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-primary-50 rounded-lg dark:bg-primary-900/20">
                      <p className="text-sm text-primary-600">Total Earnings</p>
                      <p className="text-2xl font-bold text-primary-600">
                        ${user?.Shipper_earnings || '0.00'}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg dark:bg-dark-bg">
                      <p className="text-sm text-gray-500">Paid Out</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-dark-text">
                        ${user?.paid_shipper_earnings || '0.00'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
