import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  Button,
  Input,
  Badge,
  Modal,
} from '@/components/ui'
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Mail,
  Copy,
  ChevronDown,
  ChevronUp,
  Send,
  Eye,
  Edit,
  Save,
  Users,
  Building,
  Phone,
  Globe,
  MessageSquare,
  Shield,
  FileText,
  ExternalLink,
  ArrowRight,
  Loader2,
  Share2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { whatsappService } from '@/services/whatsapp'

const ONBOARDING_STEPS = [
  {
    id: 'business_info',
    title: 'Business Information',
    description: 'Collect business details from seller',
    category: 'info',
    canAdminDo: true,
  },
  {
    id: 'facebook_login',
    title: 'Facebook Login',
    description: 'Seller connects their Facebook account',
    category: 'seller_action',
    canAdminDo: 'optional', // Can do if seller shares credentials
  },
  {
    id: 'business_assets',
    title: 'Select Business Assets',
    description: 'Choose portfolio, WhatsApp account, and catalog',
    category: 'seller_action',
    canAdminDo: 'optional',
  },
  {
    id: 'phone_number',
    title: 'Phone Number',
    description: 'Add WhatsApp Business phone number',
    category: 'info',
    canAdminDo: true,
  },
  {
    id: 'phone_verification',
    title: 'Phone Verification',
    description: 'Verify phone number with OTP code',
    category: 'seller_action',
    canAdminDo: 'optional',
  },
  {
    id: 'permissions',
    title: 'Review Permissions',
    description: 'Confirm access permissions',
    category: 'seller_action',
    canAdminDo: 'optional',
  },
  {
    id: 'completion',
    title: 'Complete Setup',
    description: 'Final confirmation',
    category: 'seller_action',
    canAdminDo: false,
  },
]

export function AdminWhatsAppOnboarding({ shipperId, sellerEmail, sellerName }) {
  const [expanded, setExpanded] = useState(true)
  const [onboardingData, setOnboardingData] = useState({
    business_name: '',
    business_category: '',
    business_country: 'United States',
    business_website: '',
    business_timezone: 'America/New_York',
    business_vertical: 'Commerce',
    business_description: '',
    phone_number: '',
    phone_country_code: '+1',
    display_name: '',
    facebook_email: '',
    use_existing_number: false,
    notes: '',
  })
  const [stepStatus, setStepStatus] = useState({
    business_info: 'pending',
    facebook_login: 'pending',
    business_assets: 'pending',
    phone_number: 'pending',
    phone_verification: 'pending',
    permissions: 'pending',
    completion: 'pending',
  })
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailTemplate, setEmailTemplate] = useState({ subject: '', body: '' })
  const [currentStep, setCurrentStep] = useState(null)
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showNextStepModal, setShowNextStepModal] = useState(false)

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-500 animate-pulse" />
      case 'pending':
        return <AlertCircle className="w-5 h-5 text-slate-400" />
      case 'seller_action':
        return <Users className="w-5 h-5 text-amber-500" />
      default:
        return <XCircle className="w-5 h-5 text-red-500" />
    }
  }

  const getStatusBadge = (status) => {
    const variants = {
      completed: { bg: 'bg-emerald-100 text-emerald-700', label: 'Completed' },
      in_progress: { bg: 'bg-blue-100 text-blue-700', label: 'In Progress' },
      pending: { bg: 'bg-slate-100 text-slate-600', label: 'Pending' },
      seller_action: { bg: 'bg-amber-100 text-amber-700', label: 'Seller Action Required' },
    }
    const variant = variants[status] || variants.pending
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${variant.bg}`}>
        {variant.label}
      </span>
    )
  }

  const generateEmailTemplate = (step) => {
    const templates = {
      business_info: {
        subject: `Action Required: WhatsApp Business Setup - Business Information Needed`,
        body: `Hi ${sellerName || 'there'},

We're setting up your WhatsApp Business account to help you connect with customers!

To proceed, we need the following information from you:

📋 Business Information:
- Business Name: _________________
- Business Category: (e.g., Restaurant, Retail, E-commerce) _________________
- Country/Location: _________________
- Website URL (if any): _________________
- Time Zone: _________________

💡 Please reply to this email with the above information, and we'll complete this step for you.

Alternatively, you can log into your seller portal and complete the setup yourself by following the guided instructions.

Need help? Just reply to this email!

Best regards,
Admin Team`,
      },
      facebook_login: {
        subject: `WhatsApp Setup: Facebook Login Required`,
        body: `Hi ${sellerName || 'there'},

The next step in your WhatsApp Business setup requires you to log in with Facebook.

🔐 For security reasons, we recommend you do this step yourself:

1. Go to: ${window.location.origin}/whatsapp
2. Click "Login with Facebook"
3. Follow the on-screen instructions

If you trust us to help with this step, you can share your Facebook credentials, but we recommend doing it yourself for security.

📹 Watch our video tutorial: ${window.location.origin}/whatsapp-setup-video.html

Need assistance? Reply to this email!

Best regards,
Admin Team`,
      },
      phone_number: {
        subject: `WhatsApp Setup: Phone Number Required`,
        body: `Hi ${sellerName || 'there'},

We need your WhatsApp Business phone number to continue the setup.

📱 Please provide:
- Phone Number: _________________
- Do you want to use an existing WhatsApp number or add a new one? _________________

💡 If you prefer, you can purchase a number from us, or use your own business phone number.

Reply with this information, and we'll complete this step!

Best regards,
Admin Team`,
      },
      phone_verification: {
        subject: `WhatsApp Setup: Verification Code Needed`,
        body: `Hi ${sellerName || 'there'},

We're almost done with your WhatsApp Business setup!

📲 You should receive a verification code via SMS to your business phone number.

Please reply with the verification code, and we'll complete the verification.

Code: _________________

Best regards,
Admin Team`,
      },
    }

    return templates[step.id] || {
      subject: `WhatsApp Setup: ${step.title} Required`,
      body: `Hi ${sellerName || 'there'},

We need your help with the next step in your WhatsApp Business setup: ${step.title}

${step.description}

Please log into your seller portal at ${window.location.origin}/whatsapp to complete this step, or reply to this email if you need assistance.

📹 Watch our video tutorial: ${window.location.origin}/whatsapp-setup-video.html

Best regards,
Admin Team`,
    }
  }

  const handleSendEmail = (step) => {
    const template = generateEmailTemplate(step)
    setEmailTemplate(template)
    setCurrentStep(step)
    setShowEmailModal(true)
  }

  const handleCopyEmailTemplate = () => {
    navigator.clipboard.writeText(`Subject: ${emailTemplate.subject}\n\n${emailTemplate.body}`)
    toast.success('Email template copied to clipboard!')
  }

  const handleSaveData = async () => {
    // Validate required fields
    if (!onboardingData.business_name || !onboardingData.business_category) {
      toast.error('Please fill in Business Name and Category')
      return
    }

    if (!onboardingData.phone_number) {
      toast.error('Please enter a phone number')
      return
    }

    setIsSaving(true)
    try {
      // Save to localStorage for now (you can replace with backend API later)
      const storageKey = `whatsapp_onboarding_${shipperId}`
      localStorage.setItem(storageKey, JSON.stringify({
        ...onboardingData,
        savedAt: new Date().toISOString(),
        shipperId,
      }))

      // Auto-complete Step 1
      setStepStatus(prev => ({ ...prev, business_info: 'completed' }))

      toast.success('Business information saved successfully!')

      // Show next step guidance
      setShowNextStepModal(true)

    } catch (error) {
      console.error('Error saving onboarding data:', error)
      toast.error('Failed to save data')
    } finally {
      setIsSaving(false)
    }
  }

  // Load saved data on mount
  useEffect(() => {
    const storageKey = `whatsapp_onboarding_${shipperId}`
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setOnboardingData(parsed)
        // If data was saved, mark Step 1 as completed
        setStepStatus(prev => ({ ...prev, business_info: 'completed' }))
      } catch (error) {
        console.error('Error loading saved data:', error)
      }
    }
  }, [shipperId])

  const handleMarkStepComplete = (stepId) => {
    setStepStatus(prev => ({ ...prev, [stepId]: 'completed' }))
    toast.success('Step marked as completed!')
  }

  const handleMarkStepSellerAction = (stepId) => {
    setStepStatus(prev => ({ ...prev, [stepId]: 'seller_action' }))
    toast.success('Marked as seller action required!')
  }

  const totalSteps = ONBOARDING_STEPS.length
  const completedSteps = Object.values(stepStatus).filter(s => s === 'completed').length
  const progressPercent = (completedSteps / totalSteps) * 100

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-700">
      <CardContent className="p-6">
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between mb-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-bold text-purple-900 dark:text-purple-100 flex items-center gap-2">
                Admin-Assisted Onboarding
              </h3>
              <p className="text-sm text-purple-600 dark:text-purple-300">
                Help seller setup WhatsApp Business
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right mr-2">
              <p className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                {completedSteps} / {totalSteps} Steps
              </p>
              <div className="w-32 h-2 bg-purple-200 dark:bg-purple-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-purple-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-purple-600" />
            )}
          </div>
        </button>

        {/* Content */}
        {expanded && (
          <div className="space-y-6">
            {/* Information Collection Form */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-5 border border-purple-200 dark:border-purple-700">
              <h4 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Building className="w-5 h-5 text-purple-500" />
                Business Information Collection
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Business Name"
                  value={onboardingData.business_name}
                  onChange={(e) => setOnboardingData(prev => ({ ...prev, business_name: e.target.value }))}
                  placeholder="Enter business name"
                />
                <Input
                  label="Business Category"
                  value={onboardingData.business_category}
                  onChange={(e) => setOnboardingData(prev => ({ ...prev, business_category: e.target.value }))}
                  placeholder="e.g., Restaurant, Retail"
                />
                <Input
                  label="Country"
                  value={onboardingData.business_country}
                  onChange={(e) => setOnboardingData(prev => ({ ...prev, business_country: e.target.value }))}
                  placeholder="United States"
                />
                <Input
                  label="Website URL"
                  value={onboardingData.business_website}
                  onChange={(e) => setOnboardingData(prev => ({ ...prev, business_website: e.target.value }))}
                  placeholder="https://example.com"
                />
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Vertical <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={onboardingData.business_vertical}
                    onChange={(e) => setOnboardingData(prev => ({ ...prev, business_vertical: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="Commerce">Commerce (Required)</option>
                    <option value="Other">Other</option>
                  </select>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    ⚠️ Must be "Commerce" for product catalog features
                  </p>
                </div>
                <Input
                  label="Time Zone"
                  value={onboardingData.business_timezone}
                  onChange={(e) => setOnboardingData(prev => ({ ...prev, business_timezone: e.target.value }))}
                  placeholder="America/New_York"
                />
              </div>

              <div className="mt-4">
                <h5 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-purple-500" />
                  Phone Number
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Country Code
                    </label>
                    <select
                      value={onboardingData.phone_country_code}
                      onChange={(e) => setOnboardingData(prev => ({ ...prev, phone_country_code: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    >
                      <option value="+1">+1 (US/Canada)</option>
                      <option value="+44">+44 (UK)</option>
                      <option value="+91">+91 (India)</option>
                      <option value="+86">+86 (China)</option>
                      <option value="+81">+81 (Japan)</option>
                    </select>
                  </div>
                  <Input
                    label="Phone Number"
                    value={onboardingData.phone_number}
                    onChange={(e) => setOnboardingData(prev => ({ ...prev, phone_number: e.target.value }))}
                    placeholder="1234567890"
                    className="md:col-span-2"
                  />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="use_existing"
                    checked={onboardingData.use_existing_number}
                    onChange={(e) => setOnboardingData(prev => ({ ...prev, use_existing_number: e.target.checked }))}
                    className="rounded border-slate-300"
                  />
                  <label htmlFor="use_existing" className="text-sm text-slate-600 dark:text-slate-400">
                    Use existing WhatsApp number
                  </label>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Display Name
                </label>
                <Input
                  value={onboardingData.display_name}
                  onChange={(e) => setOnboardingData(prev => ({ ...prev, display_name: e.target.value }))}
                  placeholder="Business display name on WhatsApp"
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Internal Notes
                </label>
                <textarea
                  value={onboardingData.notes}
                  onChange={(e) => setOnboardingData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add notes about this seller's onboarding..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  onClick={handleSaveData}
                  disabled={isSaving}
                  className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Information
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Setup Steps */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-5 border border-purple-200 dark:border-purple-700">
              <h4 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-500" />
                Setup Progress
              </h4>

              <div className="space-y-3">
                {ONBOARDING_STEPS.map((step, index) => (
                  <div
                    key={step.id}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      stepStatus[step.id] === 'completed'
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700'
                        : stepStatus[step.id] === 'seller_action'
                        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'
                        : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="flex-shrink-0 mt-0.5">
                          {getStatusIcon(stepStatus[step.id])}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              Step {index + 1}: {step.title}
                            </span>
                            {getStatusBadge(stepStatus[step.id])}
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {step.description}
                          </p>
                          {step.canAdminDo === 'optional' && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                              ⚡ Admin can do if seller shares credentials
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {stepStatus[step.id] !== 'completed' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSendEmail(step)}
                              className="text-xs"
                            >
                              <Mail className="w-3 h-3 mr-1" />
                              Email Seller
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleMarkStepComplete(step.id)}
                              className="text-xs bg-emerald-600 hover:bg-emerald-700"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Complete
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-5 border border-purple-200 dark:border-purple-700">
              <h4 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-500" />
                Quick Actions
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  onClick={() => window.open('/whatsapp-setup-video.html', '_blank')}
                  className="justify-start"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Setup Tutorial
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowNotesModal(true)}
                  className="justify-start"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Setup Instructions
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(`${window.location.origin}/whatsapp`, '_blank')}
                  className="justify-start"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Seller Portal
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Email Template Modal */}
        <Modal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          title="Send Email to Seller"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                To: {sellerEmail || 'No email on file'}
              </label>
            </div>
            <Input
              label="Subject"
              value={emailTemplate.subject}
              onChange={(e) => setEmailTemplate(prev => ({ ...prev, subject: e.target.value }))}
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Message
              </label>
              <textarea
                value={emailTemplate.body}
                onChange={(e) => setEmailTemplate(prev => ({ ...prev, body: e.target.value }))}
                rows={12}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-mono text-sm"
              />
            </div>
            <div className="flex justify-between gap-3 pt-4 border-t">
              <Button variant="outline" onClick={handleCopyEmailTemplate}>
                <Copy className="w-4 h-4 mr-2" />
                Copy Template
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowEmailModal(false)}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    // TODO: Send email via backend
                    toast.success('Email template ready! Copy and send via your email client.')
                    handleCopyEmailTemplate()
                  }}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Copy & Send
                </Button>
              </div>
            </div>
          </div>
        </Modal>

        {/* Next Step Guidance Modal */}
        <Modal
          isOpen={showNextStepModal}
          onClose={() => setShowNextStepModal(false)}
          title="✅ Business Information Saved!"
        >
          <div className="space-y-4">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg p-4">
              <h4 className="font-semibold text-emerald-900 dark:text-emerald-100 flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5" />
                Step 1 Complete!
              </h4>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                Business information has been saved successfully.
              </p>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold text-slate-900 dark:text-white mb-3">
                📋 What's Next? (Step 2: Facebook Login)
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                The seller needs to connect their Facebook account. Choose how you'd like to proceed:
              </p>

              <div className="space-y-3">
                <div className="bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-700 rounded-lg p-4">
                  <h5 className="font-semibold text-purple-900 dark:text-purple-100 mb-2 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Option 1: Email Seller (Recommended)
                  </h5>
                  <p className="text-sm text-purple-700 dark:text-purple-300 mb-3">
                    Send the seller an email with login instructions. They'll complete this step themselves for security.
                  </p>
                  <Button
                    onClick={() => {
                      setShowNextStepModal(false)
                      const fbStep = ONBOARDING_STEPS.find(s => s.id === 'facebook_login')
                      handleSendEmail(fbStep)
                    }}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Email Seller Instructions
                  </Button>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-700 rounded-lg p-4">
                  <h5 className="font-semibold text-amber-900 dark:text-amber-100 mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Option 2: Complete on Their Behalf
                  </h5>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                    ⚠️ Only if seller has shared their Facebook credentials with you. Not recommended for security.
                  </p>
                  <Button
                    onClick={() => {
                      setShowNextStepModal(false)
                      // Open seller portal in new tab with admin mode
                      window.open(`${window.location.origin}/whatsapp?seller=${shipperId}&admin_mode=true&return_to=/admin/shipper/${shipperId}`, '_blank')
                    }}
                    variant="outline"
                    className="w-full border-amber-300 text-amber-700 hover:bg-amber-100"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Setup Page (Do It Myself)
                  </Button>
                </div>

                <div className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-4">
                  <h5 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Option 3: Guide Seller via Screen Share
                  </h5>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    Walk the seller through the setup on a video call while they perform the actions.
                  </p>
                  <Button
                    onClick={() => {
                      setShowNextStepModal(false)
                      toast.success('Share this link with seller for screen sharing session')
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    I'll Guide Them
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowNextStepModal(false)}>
                I'll Decide Later
              </Button>
            </div>
          </div>
        </Modal>
      </CardContent>
    </Card>
  )
}
