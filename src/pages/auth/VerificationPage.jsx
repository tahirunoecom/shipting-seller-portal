import { useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button, Input, Card, CardContent } from '@/components/ui'
import {
  MapPin,
  Upload,
  FileText,
  ArrowRight,
  X,
  CheckCircle,
  FileCheck,
  Loader2,
  LogOut,
} from 'lucide-react'
import { authService } from '@/services'
import { useAuthStore } from '@/store'
import toast from 'react-hot-toast'

function VerificationPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, updateUser, logout } = useAuthStore()

  // Get data from location state or auth store (for logged-in users)
  const locationState = location.state || {}
  const userData = locationState.userData || user
  const wh_account_id = userData?.wh_account_id
  const serviceTypes = locationState.serviceTypes || {
    seller: userData?.scanSell === '1' || userData?.scanSell === 1,
    driver: userData?.localDelivery === '1' || userData?.localDelivery === 1,
  }
  const fromLogin = locationState.fromLogin
  const isSeller = serviceTypes?.seller
  const isDriver = serviceTypes?.driver && !serviceTypes?.seller

  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingZip, setIsLoadingZip] = useState(false)

  const [formData, setFormData] = useState({
    // Required for both
    address1: '',
    address2: '',
    zip: '',
    city: '',
    state: '',
    state_id: null,
    country: '',
    country_id: null,
    acceptbox: false,
    drivinglicence: null,

    // Required for Seller only
    company_name: '',

    // Optional
    company_icon: null,
    company_type: isSeller ? 'store' : 'delivery',
    convenience_store: 'N',
  })

  const [errors, setErrors] = useState({})
  const [previewImages, setPreviewImages] = useState({
    company_icon: null,
    drivinglicence: null,
  })
  const [zipFetched, setZipFetched] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  // Debounced ZIP code lookup
  const fetchZipDetails = useCallback(async (zip) => {
    if (!zip || zip.length < 5) {
      setZipFetched(false)
      return
    }

    setIsLoadingZip(true)
    try {
      const response = await authService.getZipDetails(zip)

      // Check if response is valid and has zip details
      if (response.status === 1 && response.data?.zipDetails && Object.keys(response.data.zipDetails).length > 0) {
        const details = response.data.zipDetails
        setFormData((prev) => ({
          ...prev,
          city: details.city || '',
          state: details.state_name || details.state || '',
          state_id: details.state_id || null,
          country: details.country_name || '',
          country_id: details.country_id || null,
        }))
        setZipFetched(true)
        // Clear any zip error
        setErrors((prev) => ({ ...prev, zip: '' }))
      } else {
        // ZIP not verified or empty response
        setZipFetched(false)
        setFormData((prev) => ({
          ...prev,
          city: '',
          state: '',
          state_id: null,
          country: '',
          country_id: null,
        }))
        setErrors((prev) => ({
          ...prev,
          zip: response.message || 'Please enter a valid ZIP code'
        }))
      }
    } catch (err) {
      console.error('ZIP lookup error:', err)
      setZipFetched(false)
      setFormData((prev) => ({
        ...prev,
        city: '',
        state: '',
        state_id: null,
        country: '',
        country_id: null,
      }))
      setErrors((prev) => ({ ...prev, zip: 'Could not verify ZIP code. Please try again.' }))
    } finally {
      setIsLoadingZip(false)
    }
  }, [])

  const handleZipChange = (e) => {
    const { value } = e.target
    // Only allow numbers
    const numericValue = value.replace(/\D/g, '').slice(0, 10)
    setFormData((prev) => ({ ...prev, zip: numericValue }))

    if (errors.zip) {
      setErrors((prev) => ({ ...prev, zip: '' }))
    }

    // Reset location fields when ZIP changes
    if (zipFetched) {
      setFormData((prev) => ({
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

    // Trigger API when ZIP is 5+ digits
    if (numericValue.length >= 5) {
      fetchZipDetails(numericValue)
    }
  }

  const handleFileChange = (e, fieldName) => {
    const file = e.target.files[0]
    if (file) {
      setFormData((prev) => ({ ...prev, [fieldName]: file }))
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewImages((prev) => ({ ...prev, [fieldName]: reader.result }))
      }
      reader.readAsDataURL(file)
      if (errors[fieldName]) {
        setErrors((prev) => ({ ...prev, [fieldName]: '' }))
      }
    }
  }

  const removeFile = (fieldName) => {
    setFormData((prev) => ({ ...prev, [fieldName]: null }))
    setPreviewImages((prev) => ({ ...prev, [fieldName]: null }))
  }

  // Redirect if no account data
  if (!wh_account_id) {
    navigate('/login')
    return null
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const validateStep = (step) => {
    const newErrors = {}

    if (step === 1) {
      // Address validation
      if (!formData.address1.trim()) {
        newErrors.address1 = 'Address is required'
      }
      if (!formData.zip.trim()) {
        newErrors.zip = 'ZIP code is required'
      } else if (!zipFetched) {
        newErrors.zip = 'Please enter a valid ZIP code'
      }
      if (!formData.city.trim()) {
        newErrors.city = 'City is required'
      }
      if (!formData.state.trim()) {
        newErrors.state = 'State is required'
      }
      if (!formData.country.trim()) {
        newErrors.country = 'Country is required'
      }
    }

    if (step === 2) {
      // Business info validation (for seller)
      if (isSeller && !formData.company_name.trim()) {
        newErrors.company_name = 'Business name is required'
      }
      // Document validation
      if (!formData.drivinglicence) {
        newErrors.drivinglicence = isSeller ? 'ID document is required' : 'Driver\'s license is required'
      }
      // Terms validation
      if (!formData.acceptbox) {
        newErrors.acceptbox = 'You must accept the terms and conditions'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handleSubmit = async () => {
    if (!validateStep(2)) return

    setIsLoading(true)
    try {
      // Build the submission data with all required fields
      const submitData = {
        wh_account_id: wh_account_id,

        // Required fields
        address1: formData.address1,
        address2: formData.address2 || '',
        city: formData.city,
        zip: formData.zip,
        state: formData.state,
        state_id: formData.state_id,
        country: formData.country,
        country_id: formData.country_id,
        acceptbox: formData.acceptbox ? 'Y' : 'N',
        drivinglicence: formData.drivinglicence,

        // Optional fields shown to user
        company_name: formData.company_name || '',
        company_icon: formData.company_icon || '',
        company_type: formData.company_type || '',
        convenience_store: formData.convenience_store || 'N',

        // Hidden fields - send defaults
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
        toast.success('Verification submitted successfully!')

        // Update local user state
        if (updateUser) {
          updateUser({ is_verification_submitted: '1' })
        }

        // Navigate to pending approval page
        navigate('/pending-approval')
      } else {
        // Check if it's an address verification error
        const errorMessage = response.message?.toLowerCase() || ''
        const verificationData = response.data?.verification?.toLowerCase() || ''

        if (errorMessage.includes('address') || verificationData.includes('address')) {
          // Address verification failed - go back to step 1
          setCurrentStep(1)
          setErrors((prev) => ({
            ...prev,
            address1: 'Please enter a valid address. Your address could not be verified.'
          }))
          toast.error('Address verification failed. Please check your address and try again.')
        } else {
          toast.error(response.message || 'Verification failed')
        }
      }
    } catch (err) {
      console.error('Verification error:', err)
      toast.error(err.response?.data?.message || 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const steps = isSeller
    ? [
        { id: 1, title: 'Address', icon: MapPin },
        { id: 2, title: 'Business & Documents', icon: FileText },
      ]
    : [
        { id: 1, title: 'Address', icon: MapPin },
        { id: 2, title: 'Documents', icon: FileText },
      ]

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">
                Your Address
              </h3>
              <p className="text-sm text-gray-500 dark:text-dark-muted">
                {isSeller ? 'Where is your business located?' : 'Enter your address for verification'}
              </p>
            </div>

            <Input
              label="Address Line 1 *"
              name="address1"
              value={formData.address1}
              onChange={handleChange}
              placeholder="Street address"
              error={errors.address1}
            />

            <Input
              label="Address Line 2 (Optional)"
              name="address2"
              value={formData.address2}
              onChange={handleChange}
              placeholder="Apt, suite, unit, etc."
            />

            {/* ZIP Code - triggers auto-fill */}
            <div className="relative">
              <Input
                label="ZIP Code *"
                name="zip"
                value={formData.zip}
                onChange={handleZipChange}
                placeholder="Enter ZIP code"
                error={errors.zip}
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

            {/* City - editable */}
            <Input
              label="City *"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder={zipFetched ? '' : 'Enter ZIP code first'}
              error={errors.city}
              disabled={!zipFetched}
            />

            {/* State - read only */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1.5">
                State *
              </label>
              <input
                type="text"
                value={formData.state}
                readOnly
                placeholder={zipFetched ? '' : 'Auto-filled from ZIP code'}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-gray-100 dark:bg-dark-border text-gray-700 dark:text-dark-text cursor-not-allowed"
              />
              {errors.state && (
                <p className="text-sm text-red-500 mt-1">{errors.state}</p>
              )}
            </div>

            {/* Country - read only */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1.5">
                Country *
              </label>
              <input
                type="text"
                value={formData.country}
                readOnly
                placeholder={zipFetched ? '' : 'Auto-filled from ZIP code'}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-gray-100 dark:bg-dark-border text-gray-700 dark:text-dark-text cursor-not-allowed"
              />
              {errors.country && (
                <p className="text-sm text-red-500 mt-1">{errors.country}</p>
              )}
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">
                {isSeller ? 'Business & Documents' : 'Upload Documents'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-dark-muted">
                {isSeller
                  ? 'Tell us about your business and upload verification documents'
                  : 'Upload your driver\'s license for verification'}
              </p>
            </div>

            {/* Business Name - Seller Only */}
            {isSeller && (
              <Input
                label="Business / Store Name *"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                placeholder="Enter your business name"
                error={errors.company_name}
              />
            )}

            {/* Business Logo - Seller Only (Optional) */}
            {isSeller && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1.5">
                  Business Logo (Optional)
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
                  <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-border border-gray-300 dark:border-dark-border">
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
            )}

            {/* ID Document / Driver's License - Required */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1.5">
                {isSeller ? 'ID Document *' : 'Driver\'s License *'}
              </label>
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
                <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-border ${errors.drivinglicence ? 'border-red-500' : 'border-gray-300 dark:border-dark-border'}`}>
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
              {errors.drivinglicence && (
                <p className="text-sm text-red-500 mt-1">{errors.drivinglicence}</p>
              )}
            </div>

            {/* Terms and Conditions */}
            <div className="mt-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="acceptbox"
                  checked={formData.acceptbox}
                  onChange={handleChange}
                  className={`mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 ${errors.acceptbox ? 'border-red-500' : ''}`}
                />
                <span className="text-sm text-gray-600 dark:text-dark-muted">
                  I agree to the{' '}
                  <a href="#" className="text-primary-600 hover:underline">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-primary-600 hover:underline">
                    Privacy Policy
                  </a>
                </span>
              </label>
              {errors.acceptbox && (
                <p className="text-sm text-red-500 mt-1 ml-7">{errors.acceptbox}</p>
              )}
            </div>

            {/* Success Preview */}
            <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-400">
                    Almost there!
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                    Your verification will be reviewed by our team. You'll be notified once approved.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Logout Button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-dark-muted dark:hover:text-dark-text"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
            Complete Your Profile
          </h1>
          <p className="text-gray-500 dark:text-dark-muted mt-1">
            {isSeller ? 'Set up your seller account' : 'Set up your driver account'}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {steps.map((step, index) => {
            const Icon = step.icon
            const isActive = step.id === currentStep
            const isCompleted = step.id < currentStep

            return (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full ${
                      isActive
                        ? 'bg-primary-500 text-white'
                        : isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 dark:bg-dark-border text-gray-400'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <span className={`text-xs mt-1 ${isActive ? 'text-primary-600 font-medium' : 'text-gray-500'}`}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-16 h-1 mx-2 mb-5 ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-dark-border'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>

        <Card>
          <CardContent className="p-6">
            {renderStepContent()}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              {currentStep > 1 ? (
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep((prev) => prev - 1)}
                >
                  Back
                </Button>
              ) : (
                <div />
              )}

              {currentStep < 2 ? (
                <Button onClick={handleNext} disabled={isLoadingZip}>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} isLoading={isLoading}>
                  <FileCheck className="h-4 w-4 mr-2" />
                  Submit Verification
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default VerificationPage
