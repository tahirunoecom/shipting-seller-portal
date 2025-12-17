import { useState, useCallback } from 'react'
import { useAuthStore } from '@/store'
import { authService } from '@/services'
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
  Store,
  Truck,
  Check,
  FileText,
  Save,
  Upload,
  X,
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'

function DriverSettingsPage() {
  const { user, userDetails, updateUser, updateUserDetails } = useAuthStore()
  const [activeTab, setActiveTab] = useState('profile')

  // Account Type State
  const [accountType, setAccountType] = useState({
    seller: user?.scanSell === '1' || user?.scanSell === 1,
    driver: user?.localDelivery === '1' || user?.localDelivery === 1,
  })
  const [savingAccountType, setSavingAccountType] = useState(false)

  // Verification State
  const [verificationData, setVerificationData] = useState({
    address1: userDetails?.address_1 || '',
    address2: userDetails?.address_2 || '',
    zip: userDetails?.zip || '',
    city: userDetails?.city || '',
    state: userDetails?.state || '',
    state_id: userDetails?.state_id || null,
    country: userDetails?.country || '',
    country_id: userDetails?.country_id || null,
    company_name: userDetails?.company || '',
    company_icon: null,
    drivinglicence: null,
  })
  const [zipFetched, setZipFetched] = useState(!!userDetails?.zip)
  const [isLoadingZip, setIsLoadingZip] = useState(false)
  const [savingVerification, setSavingVerification] = useState(false)
  const [previewImages, setPreviewImages] = useState({
    company_icon: userDetails?.company_icon || null,
    drivinglicence: userDetails?.drivinglicence || null,
  })

  const isSeller = accountType.seller
  const isDriver = accountType.driver
  const isApproved = user?.approved === 1 || user?.approved === '1'
  const isVerificationSubmitted = user?.is_verification_submitted === 1 || user?.is_verification_submitted === '1'

  const tabs = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'account-type', label: 'Account Type', icon: Store },
    { key: 'verification', label: 'Verification', icon: FileText },
    { key: 'vehicle', label: 'Vehicle', icon: Car },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'security', label: 'Security', icon: Shield },
  ]

  const accountTypeOptions = [
    {
      id: 'seller',
      title: 'Seller / Store Owner',
      description: 'Sell products online and manage your store',
      icon: Store,
    },
    {
      id: 'driver',
      title: 'Delivery Partner',
      description: 'Deliver orders and earn money',
      icon: Truck,
    },
  ]

  // ZIP code lookup for verification
  const fetchZipDetails = useCallback(async (zip) => {
    if (!zip || zip.length < 5) {
      setZipFetched(false)
      return
    }

    setIsLoadingZip(true)
    try {
      const response = await authService.getZipDetails(zip)
      if (response.status === 1 && response.data?.zipDetails && Object.keys(response.data.zipDetails).length > 0) {
        const details = response.data.zipDetails
        setVerificationData((prev) => ({
          ...prev,
          city: details.city || '',
          state: details.state_name || details.state || '',
          state_id: details.state_id || null,
          country: details.country_name || '',
          country_id: details.country_id || null,
        }))
        setZipFetched(true)
      } else {
        setZipFetched(false)
        toast.error(response.message || 'Invalid ZIP code')
      }
    } catch (err) {
      setZipFetched(false)
      toast.error('Could not verify ZIP code')
    } finally {
      setIsLoadingZip(false)
    }
  }, [])

  const handleVerificationChange = (e) => {
    const { name, value } = e.target
    setVerificationData((prev) => ({ ...prev, [name]: value }))
  }

  const handleZipChange = (e) => {
    const { value } = e.target
    const numericValue = value.replace(/\D/g, '').slice(0, 10)
    setVerificationData((prev) => ({ ...prev, zip: numericValue }))

    if (zipFetched && numericValue !== verificationData.zip) {
      setVerificationData((prev) => ({
        ...prev,
        zip: numericValue,
        city: '',
        state: '',
        state_id: null,
        country: '',
        country_id: null,
      }))
      setZipFetched(false)
    }

    if (numericValue.length >= 5) {
      fetchZipDetails(numericValue)
    }
  }

  const handleFileChange = (e, fieldName) => {
    const file = e.target.files[0]
    if (file) {
      setVerificationData((prev) => ({ ...prev, [fieldName]: file }))
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewImages((prev) => ({ ...prev, [fieldName]: reader.result }))
      }
      reader.readAsDataURL(file)
    }
  }

  const removeFile = (fieldName) => {
    setVerificationData((prev) => ({ ...prev, [fieldName]: null }))
    setPreviewImages((prev) => ({ ...prev, [fieldName]: null }))
  }

  const handleSaveAccountType = async () => {
    if (!accountType.seller && !accountType.driver) {
      toast.error('Please select at least one account type')
      return
    }

    setSavingAccountType(true)
    try {
      const response = await authService.updateServiceType({
        wh_account_id: user?.wh_account_id,
        scanSell: accountType.seller ? 1 : 0,
        fulfillment: 0,
        localDelivery: accountType.driver ? 1 : 0,
      })

      if (response.status === 1) {
        updateUser({
          scanSell: accountType.seller ? '1' : '0',
          localDelivery: accountType.driver ? '1' : '0',
        })
        toast.success('Account type updated successfully!')
      } else {
        toast.error(response.message || 'Failed to update account type')
      }
    } catch (error) {
      toast.error('Failed to update account type')
    } finally {
      setSavingAccountType(false)
    }
  }

  const handleSaveVerification = async () => {
    if (!verificationData.address1 || !verificationData.zip || !verificationData.city) {
      toast.error('Please fill in all required fields')
      return
    }

    setSavingVerification(true)
    try {
      const submitData = {
        wh_account_id: user?.wh_account_id,
        address1: verificationData.address1,
        address2: verificationData.address2 || '',
        city: verificationData.city,
        zip: verificationData.zip,
        state: verificationData.state,
        state_id: verificationData.state_id,
        country: verificationData.country,
        country_id: verificationData.country_id,
        acceptbox: 'Y',
        company_name: verificationData.company_name || '',
        company_icon: verificationData.company_icon || '',
        drivinglicence: verificationData.drivinglicence || '',
        company_type: isSeller ? 'store' : 'delivery',
        convenience_store: 'N',
        spaceimage: '',
        Spacetype: '',
        warehouse_size: '0',
        avail_space: '0',
        docusign_status: '',
        delivergoods: 'false',
        delivergoods_zip: '',
        deliver_upto: '',
        printer: '',
        printertype: '',
        maxWeighthandle: '',
        Carrier: '',
        otherCarrier: '',
        pallet: '',
        freeStoreFront: '',
      }

      const response = await authService.submitVerification(submitData)

      if (response.status === 1) {
        updateUser({ is_verification_submitted: '1' })
        toast.success('Verification details updated successfully!')
      } else {
        toast.error(response.message || 'Failed to update verification')
      }
    } catch (error) {
      toast.error('Failed to update verification details')
    } finally {
      setSavingVerification(false)
    }
  }

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

      {/* Account Type Tab */}
      {activeTab === 'account-type' && (
        <Card>
          <CardHeader>
            <CardTitle>Account Type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-gray-500 dark:text-dark-muted">
              Select how you want to use Shipting. You can select multiple options.
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              {accountTypeOptions.map((option) => {
                const Icon = option.icon
                const isSelected = accountType[option.id]

                return (
                  <div
                    key={option.id}
                    onClick={() =>
                      setAccountType((prev) => ({
                        ...prev,
                        [option.id]: !prev[option.id],
                      }))
                    }
                    className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-dark-border hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            isSelected
                              ? 'bg-primary-100 dark:bg-primary-900/30'
                              : 'bg-gray-100 dark:bg-dark-border'
                          }`}
                        >
                          <Icon
                            className={`h-5 w-5 ${
                              isSelected
                                ? 'text-primary-600'
                                : 'text-gray-500'
                            }`}
                          />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-dark-text">
                            {option.title}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-dark-muted">
                            {option.description}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected
                            ? 'bg-primary-500 border-primary-500'
                            : 'border-gray-300'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSaveAccountType}
                isLoading={savingAccountType}
                disabled={!accountType.seller && !accountType.driver}
              >
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Verification Tab */}
      {activeTab === 'verification' && (
        <div className="space-y-6">
          {/* Verification Status */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                {isApproved ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-green-700">Account Verified</p>
                      <p className="text-sm text-gray-500">Your account has been approved</p>
                    </div>
                  </>
                ) : isVerificationSubmitted ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-medium text-amber-700">Verification Pending</p>
                      <p className="text-sm text-gray-500">Your verification is under review</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <AlertCircle className="h-5 w-5 text-gray-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Not Verified</p>
                      <p className="text-sm text-gray-500">Please submit your verification details</p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Verification Form */}
          <Card>
            <CardHeader>
              <CardTitle>Verification Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Address Section */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-dark-text">Address</h4>

                <Input
                  label="Address Line 1 *"
                  name="address1"
                  value={verificationData.address1}
                  onChange={handleVerificationChange}
                  placeholder="Street address"
                />

                <Input
                  label="Address Line 2"
                  name="address2"
                  value={verificationData.address2}
                  onChange={handleVerificationChange}
                  placeholder="Apt, suite, unit, etc."
                />

                <div className="relative">
                  <Input
                    label="ZIP Code *"
                    name="zip"
                    value={verificationData.zip}
                    onChange={handleZipChange}
                    placeholder="Enter ZIP code"
                  />
                  {isLoadingZip && (
                    <div className="absolute right-3 top-9">
                      <Loader2 className="h-5 w-5 text-primary-500 animate-spin" />
                    </div>
                  )}
                  {zipFetched && !isLoadingZip && (
                    <div className="absolute right-3 top-9">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="City *"
                    name="city"
                    value={verificationData.city}
                    onChange={handleVerificationChange}
                    placeholder="City"
                    disabled={!zipFetched}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1.5">
                      State
                    </label>
                    <input
                      type="text"
                      value={verificationData.state}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-gray-100 dark:bg-dark-border text-gray-700 dark:text-dark-text cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1.5">
                      Country
                    </label>
                    <input
                      type="text"
                      value={verificationData.country}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-gray-100 dark:bg-dark-border text-gray-700 dark:text-dark-text cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <hr className="dark:border-dark-border" />

              {/* Business Info Section (if also seller) */}
              {isSeller && (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 dark:text-dark-text">Business Information</h4>

                  <Input
                    label="Business / Store Name"
                    name="company_name"
                    value={verificationData.company_name}
                    onChange={handleVerificationChange}
                    placeholder="Enter your business name"
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1.5">
                      Business Logo
                    </label>
                    {previewImages.company_icon ? (
                      <div className="relative inline-block">
                        <img
                          src={previewImages.company_icon}
                          alt="Business logo"
                          className="h-20 w-20 object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => removeFile('company_icon')}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-32 h-20 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-border border-gray-300 dark:border-dark-border">
                        <Upload className="h-6 w-6 text-gray-400 mb-1" />
                        <span className="text-xs text-gray-500">Upload logo</span>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, 'company_icon')}
                        />
                      </label>
                    )}
                  </div>
                </div>
              )}

              {isSeller && <hr className="dark:border-dark-border" />}

              {/* Document Section */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-dark-text">
                  Driver's License
                </h4>

                <div>
                  {previewImages.drivinglicence ? (
                    <div className="relative inline-block">
                      <img
                        src={previewImages.drivinglicence}
                        alt="Driver's License"
                        className="h-32 w-auto object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile('drivinglicence')}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-border border-gray-300 dark:border-dark-border">
                      <Upload className="h-8 w-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">
                        Upload driver's license
                      </span>
                      <span className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'drivinglicence')}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSaveVerification}
                  isLoading={savingVerification}
                >
                  <Save className="h-4 w-4" />
                  Save Verification Details
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
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
