import { useState, useEffect, useCallback } from 'react'
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
  Store,
  MapPin,
  Phone,
  Mail,
  Camera,
  Save,
  Bell,
  Shield,
  CreditCard,
  Truck,
  Check,
  FileText,
  Upload,
  X,
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
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
    { key: 'store', label: 'Store', icon: MapPin },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'security', label: 'Security', icon: Shield },
  ]

  const handleProfileChange = (e) => {
    const { name, value } = e.target
    setProfileData((prev) => ({ ...prev, [name]: value }))
  }

  const handleStoreChange = (e) => {
    const { name, value } = e.target
    setStoreData((prev) => ({ ...prev, [name]: value }))
  }

  const handleVerificationChange = (e) => {
    const { name, value } = e.target
    setVerificationData((prev) => ({ ...prev, [name]: value }))
  }

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

  const handleSaveProfile = async () => {
    try {
      setLoading(true)
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
      updateUserDetails(storeData)
      toast.success('Store settings updated!')
    } catch (error) {
      toast.error('Failed to update store settings')
    } finally {
      setLoading(false)
    }
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

  const fullName = `${user?.firstname || ''} ${user?.lastname || ''}`

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

                  {/* Business Info Section (Seller) */}
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
                      {isSeller ? 'ID Document' : 'Driver\'s License'}
                    </h4>

                    <div>
                      {previewImages.drivinglicence ? (
                        <div className="relative inline-block">
                          <img
                            src={previewImages.drivinglicence}
                            alt="ID Document"
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
                            {isSeller ? 'Upload ID document' : 'Upload driver\'s license'}
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
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
