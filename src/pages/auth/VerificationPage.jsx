import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button, Input, Card, CardContent } from '@/components/ui'
import {
  Building2,
  MapPin,
  Upload,
  FileText,
  ArrowRight,
  X,
  CheckCircle,
  Store,
  Truck,
} from 'lucide-react'
import { authService } from '@/services'
import toast from 'react-hot-toast'

function VerificationPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { email, userData, wh_account_id, serviceTypes } = location.state || {}

  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState({
    // Business Info
    company_name: '',
    company_type: serviceTypes?.seller ? 'store' : 'delivery',
    company_icon: null,

    // Address
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',

    // Store specific
    Spacetype: '',
    warehouse_size: '',
    avail_space: '',
    convenience_store: 'N',

    // Driver specific
    drivinglicence: null,
    delivergoods: 'Y',
    deliver_upto: '',
    delivergoods_zip: '',

    // Other
    Carrier: '',
    otherCarrier: '',
    maxWeighthandle: '',
    printer: '',
    printertype: '',
    pallet: 'N',
    freeStoreFront: 'N',
    acceptbox: 'N',
  })

  const [errors, setErrors] = useState({})
  const [previewImages, setPreviewImages] = useState({
    company_icon: null,
    drivinglicence: null,
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
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
    }
  }

  const removeFile = (fieldName) => {
    setFormData((prev) => ({ ...prev, [fieldName]: null }))
    setPreviewImages((prev) => ({ ...prev, [fieldName]: null }))
  }

  const handleSkip = () => {
    toast.success('You can complete verification later from Settings')
    navigate('/login')
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      const submitData = {
        wh_account_id: wh_account_id,
        ...formData,
        delivergoods_zip: formData.delivergoods_zip
          ? formData.delivergoods_zip.split(',').map((z) => z.trim())
          : [],
      }

      const response = await authService.submitVerification(submitData)

      if (response.status === 1) {
        toast.success('Verification submitted successfully!')
        navigate('/login', {
          state: {
            message: 'Account created! Please login to continue.',
          },
        })
      } else {
        toast.error(response.message || 'Verification failed')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const steps = [
    { id: 1, title: 'Business Info', icon: Building2 },
    { id: 2, title: 'Address', icon: MapPin },
    { id: 3, title: 'Documents', icon: FileText },
  ]

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">
                Business Information
              </h3>
              <p className="text-sm text-gray-500 dark:text-dark-muted">
                Tell us about your business
              </p>
            </div>

            <Input
              label="Business / Store Name"
              name="company_name"
              value={formData.company_name}
              onChange={handleChange}
              placeholder="Enter your business name"
              error={errors.company_name}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1.5">
                Business Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'store', label: 'Retail Store', icon: Store },
                  { value: 'delivery', label: 'Delivery Service', icon: Truck },
                ].map((option) => {
                  const Icon = option.icon
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, company_type: option.value }))
                      }
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        formData.company_type === option.value
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-dark-border hover:border-gray-300'
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 ${
                          formData.company_type === option.value
                            ? 'text-primary-600'
                            : 'text-gray-400'
                        }`}
                      />
                      <span
                        className={`text-sm font-medium ${
                          formData.company_type === option.value
                            ? 'text-primary-700 dark:text-primary-400'
                            : 'text-gray-600 dark:text-dark-muted'
                        }`}
                      >
                        {option.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Business Logo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1.5">
                Business Logo (Optional)
              </label>
              {previewImages.company_icon ? (
                <div className="relative inline-block">
                  <img
                    src={previewImages.company_icon}
                    alt="Business logo"
                    className="h-24 w-24 object-cover rounded-lg border"
                  />
                  <button
                    type="button"
                    onClick={() => removeFile('company_icon')}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-border border-gray-300 dark:border-dark-border">
                  <Upload className="h-8 w-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">Upload logo</span>
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
        )

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">
                Business Address
              </h3>
              <p className="text-sm text-gray-500 dark:text-dark-muted">
                Where is your business located?
              </p>
            </div>

            <Input
              label="Address Line 1"
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

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="City"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="City"
                error={errors.city}
              />
              <Input
                label="State"
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder="State"
                error={errors.state}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="ZIP Code"
                name="zip"
                value={formData.zip}
                onChange={handleChange}
                placeholder="12345"
                error={errors.zip}
              />
              <Input
                label="Country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                placeholder="US"
              />
            </div>

            {serviceTypes?.driver && (
              <Input
                label="Delivery ZIP Codes (comma separated)"
                name="delivergoods_zip"
                value={formData.delivergoods_zip}
                onChange={handleChange}
                placeholder="12345, 12346, 12347"
                helperText="Enter ZIP codes where you can deliver"
              />
            )}
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">
                Documents & Details
              </h3>
              <p className="text-sm text-gray-500 dark:text-dark-muted">
                Upload required documents (optional for now)
              </p>
            </div>

            {serviceTypes?.driver && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1.5">
                  Driver's License
                </label>
                {previewImages.drivinglicence ? (
                  <div className="relative inline-block">
                    <img
                      src={previewImages.drivinglicence}
                      alt="License"
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
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'drivinglicence')}
                    />
                  </label>
                )}
              </div>
            )}

            {serviceTypes?.driver && (
              <Input
                label="Maximum Delivery Distance (miles)"
                name="deliver_upto"
                type="number"
                value={formData.deliver_upto}
                onChange={handleChange}
                placeholder="e.g., 25"
              />
            )}

            {serviceTypes?.seller && (
              <>
                <Input
                  label="Store Size (sq ft)"
                  name="warehouse_size"
                  value={formData.warehouse_size}
                  onChange={handleChange}
                  placeholder="e.g., 1000"
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1.5">
                    Is this a convenience store?
                  </label>
                  <div className="flex gap-4">
                    {['Y', 'N'].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, convenience_store: value }))
                        }
                        className={`px-4 py-2 rounded-lg border-2 transition-all ${
                          formData.convenience_store === value
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {value === 'Y' ? 'Yes' : 'No'}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Success Preview */}
            <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-400">
                    Almost there!
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                    You can submit now and complete any missing details later from your
                    Settings page.
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
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {steps.map((step, index) => {
            const Icon = step.icon
            const isActive = step.id === currentStep
            const isCompleted = step.id < currentStep

            return (
              <div key={step.id} className="flex items-center">
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
                {index < steps.length - 1 && (
                  <div
                    className={`w-12 h-1 mx-2 ${
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
                <Button variant="ghost" onClick={handleSkip}>
                  Skip for now
                </Button>
              )}

              {currentStep < 3 ? (
                <Button onClick={() => setCurrentStep((prev) => prev + 1)}>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} isLoading={isLoading}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete Setup
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Skip Link */}
        <p className="text-center text-sm text-gray-500 dark:text-dark-muted mt-6">
          Want to do this later?{' '}
          <button
            onClick={handleSkip}
            className="font-medium text-primary-600 hover:text-primary-700"
          >
            Skip and login
          </button>
        </p>
      </div>
    </div>
  )
}

export default VerificationPage
