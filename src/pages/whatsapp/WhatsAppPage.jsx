import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/store'
import { whatsappService, twilioService } from '@/services'
import { QRCodeSVG } from 'qrcode.react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Badge,
  Modal,
  Spinner,
} from '@/components/ui'
import {
  MessageSquare,
  Phone,
  Settings,
  Zap,
  MessageCircle,
  BarChart3,
  Link,
  Unlink,
  Plus,
  Trash2,
  Edit2,
  Save,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Copy,
  RefreshCw,
  ExternalLink,
  Facebook,
  Store,
  Package,
  QrCode,
  Download,
  Share2,
  Smartphone,
  KeyRound,
  User,
  Building2,
  Globe,
  Mail,
  MapPin,
  Image,
  FileText,
  ShieldCheck,
  AlertTriangle,
  Search,
  Inbox,
  ShoppingBag,
  DollarSign,
  Hash,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Eye,
  ZoomIn,
  X,
  Play,
  Lightbulb,
} from 'lucide-react'
import toast from 'react-hot-toast'

// Meta App Configuration
const META_APP_ID = '1559645705059315'
const META_CONFIG_ID = '1403441077449207'

function WhatsAppPage() {
  const { user, userDetails } = useAuthStore()
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState('connection')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fbSDKLoaded, setFbSDKLoaded] = useState(false)
  const [showSetupGuide, setShowSetupGuide] = useState(true)

  // Admin mode detection
  const isAdminMode = searchParams.get('admin_mode') === 'true'
  const adminReturnUrl = searchParams.get('return_to') || '/admin'
  const sellerId = searchParams.get('seller')
  const [previewScreenshot, setPreviewScreenshot] = useState(null) // { src, alt } for fullscreen preview
  const [showVideoTutorial, setShowVideoTutorial] = useState(false) // Video tutorial modal

  // Setup guide screenshot paths
  const setupScreenshots = {
    step1: '/images/whatsapp-setup/step1-login-facebook.png',
    step2: '/images/whatsapp-setup/step2-continue-dialog.png',
    step3: '/images/whatsapp-setup/step3-business-assets.png',
    step4: '/images/whatsapp-setup/step4-business-info.png',
    step5: '/images/whatsapp-setup/step5-add-number.png',
    step5error: '/images/whatsapp-setup/step5-number-error.png',
    step5existing: '/images/whatsapp-setup/step5-existing-number.png',
    step6: '/images/whatsapp-setup/step6-review-permissions.png',
    step7: '/images/whatsapp-setup/step7-success.png',
    step9: '/images/whatsapp-setup/step9-sync-catalog.png',
  }

  // Connection state
  const [connectionData, setConnectionData] = useState({
    isConnected: false,
    status: 'disconnected', // disconnected, connecting, connected, error
    phoneNumber: '',
    phoneNumberId: '',
    wabaId: '',
    businessId: '',
    businessName: '',
    catalogId: '',
    connectedAt: null,
  })

  // Catalog management state
  const [catalogs, setCatalogs] = useState([])
  const [loadingCatalogs, setLoadingCatalogs] = useState(false)

  // Permission diagnostics state
  const [permissionDiagnostics, setPermissionDiagnostics] = useState(null)
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false)
  const [showDiagnostics, setShowDiagnostics] = useState(false)

  // Phone status state
  const [phoneStatus, setPhoneStatus] = useState(null)
  const [loadingPhoneStatus, setLoadingPhoneStatus] = useState(false)

  // QR Code state
  const [showQRModal, setShowQRModal] = useState(false)
  const qrCodeRef = useRef(null)

  // Bot Settings state
  const [botSettings, setBotSettings] = useState({
    welcomeMessage: 'Hello! Welcome to our store. How can we help you today?',
    awayMessage: 'Thank you for your message. We are currently away and will respond as soon as possible.',
    businessHoursEnabled: true,
    businessHoursStart: '09:00',
    businessHoursEnd: '18:00',
    autoReplyEnabled: true,
    orderNotificationsEnabled: true,
    catalogEnabled: true,
  })

  // Auto-Replies state
  const [autoReplies, setAutoReplies] = useState([
    { id: 1, trigger: 'hours', response: 'We are open Monday-Friday, 9 AM - 6 PM.', enabled: true },
    { id: 2, trigger: 'delivery', response: 'Delivery typically takes 1-3 business days.', enabled: true },
    { id: 3, trigger: 'payment', response: 'We accept all major credit cards and PayPal.', enabled: true },
  ])
  const [showAutoReplyModal, setShowAutoReplyModal] = useState(false)
  const [editingReply, setEditingReply] = useState(null)
  const [replyForm, setReplyForm] = useState({ trigger: '', response: '', enabled: true })

  // Quick Replies state
  const [quickReplies, setQuickReplies] = useState([
    { id: 1, shortcut: '/thanks', message: 'Thank you for shopping with us! We appreciate your business.' },
    { id: 2, shortcut: '/track', message: 'You can track your order using this link: [Order Tracking Link]' },
    { id: 3, shortcut: '/help', message: 'How can I assist you today? Feel free to ask any questions.' },
  ])
  const [showQuickReplyModal, setShowQuickReplyModal] = useState(false)
  const [editingQuickReply, setEditingQuickReply] = useState(null)
  const [quickReplyForm, setQuickReplyForm] = useState({ shortcut: '', message: '' })

  // Phone Registration state
  const [showOtpModal, setShowOtpModal] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [otpMethod, setOtpMethod] = useState('SMS')
  const [requestingOtp, setRequestingOtp] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [registeringPhone, setRegisteringPhone] = useState(false)

  // Business Profile state
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [businessCategories, setBusinessCategories] = useState([])
  const [businessProfile, setBusinessProfile] = useState({
    about: '',
    address: '',
    description: '',
    email: '',
    websites: [''],
    vertical: 'UNDEFINED',
  })
  const [displayNameForm, setDisplayNameForm] = useState('')
  const [showDisplayNameModal, setShowDisplayNameModal] = useState(false)
  const [updatingDisplayName, setUpdatingDisplayName] = useState(false)

  // Business Verification state
  const [businessVerification, setBusinessVerification] = useState({
    status: null, // 'verified', 'pending', 'not_verified', 'rejected', null
    loading: false,
    error: null,
  })

  // Twilio Number state (for users without their own phone number)
  const [twilioState, setTwilioState] = useState({
    hasNumber: false,
    number: null,
    numberSid: null,
    purchasedAt: null,
    loading: false,
  })
  const [twilioSearching, setTwilioSearching] = useState(false)
  const [twilioAvailableNumbers, setTwilioAvailableNumbers] = useState([])
  const [twilioAreaCode, setTwilioAreaCode] = useState('')
  const [twilioContains, setTwilioContains] = useState('')
  const [twilioBuying, setTwilioBuying] = useState(false)
  const [showTwilioInbox, setShowTwilioInbox] = useState(false)
  const [twilioInbox, setTwilioInbox] = useState([])
  const [loadingInbox, setLoadingInbox] = useState(false)
  const [showTwilioSection, setShowTwilioSection] = useState(false)

  const tabs = [
    { key: 'connection', label: 'Connection', icon: Link },
    { key: 'settings', label: 'Bot Settings', icon: Settings },
    { key: 'auto-replies', label: 'Auto-Replies', icon: Zap },
    { key: 'quick-replies', label: 'Quick Replies', icon: MessageCircle },
    { key: 'templates', label: 'Message Templates', icon: FileText },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  ]

  // Load Facebook SDK
  useEffect(() => {
    const loadFacebookSDK = () => {
      // Check if already loaded
      if (window.FB) {
        setFbSDKLoaded(true)
        return
      }

      // Create script element
      const script = document.createElement('script')
      script.src = 'https://connect.facebook.net/en_US/sdk.js'
      script.async = true
      script.defer = true
      script.crossOrigin = 'anonymous'

      script.onload = () => {
        window.fbAsyncInit = function() {
          window.FB.init({
            appId: META_APP_ID,
            autoLogAppEvents: true,
            xfbml: true,
            version: 'v21.0'
          })
          setFbSDKLoaded(true)
        }
        // If FB is already defined, init it
        if (window.FB) {
          window.FB.init({
            appId: META_APP_ID,
            autoLogAppEvents: true,
            xfbml: true,
            version: 'v21.0'
          })
          setFbSDKLoaded(true)
        }
      }

      document.body.appendChild(script)
    }

    loadFacebookSDK()
  }, [])

  // Check URL params for OAuth callback status
  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    const status = searchParams.get('status')

    if (success === 'true') {
      toast.success('WhatsApp connection initiated! Completing setup...')
      if (status === 'connecting') {
        setConnectionData(prev => ({ ...prev, status: 'connecting' }))
      }
      loadWhatsAppConfig()
    } else if (error) {
      toast.error(`Connection failed: ${error}`)
      setConnectionData(prev => ({ ...prev, status: 'error' }))
    }
  }, [searchParams])

  // Load WhatsApp config on mount
  useEffect(() => {
    loadWhatsAppConfig()
    loadTwilioNumber()
  }, [])

  const loadWhatsAppConfig = async () => {
    try {
      setLoading(true)
      // Debug: Check user and wh_account_id
      console.log('WhatsApp Debug - user object:', user)
      console.log('WhatsApp Debug - userDetails:', userDetails)
      console.log('WhatsApp Debug - wh_account_id:', user?.wh_account_id)

      const response = await whatsappService.getWhatsAppStatus(user?.wh_account_id)
      console.log('WhatsApp Debug - API response:', response)

      if (response.status === 1 && response.data) {
        const data = response.data
        setConnectionData({
          isConnected: data.is_connected || false,
          status: data.connection_status || 'disconnected',
          phoneNumber: data.phone_number || '',
          phoneNumberId: data.phone_number_id || '',
          wabaId: data.waba_id || '',
          businessId: data.business_id || '',
          businessName: data.business_name || '',
          catalogId: data.catalog_id || '',
          connectedAt: data.connected_at || null,
        })
        if (data.bot_settings) {
          setBotSettings(prev => ({ ...prev, ...data.bot_settings }))
        }

        // Auto-load phone status if connected (for verification checklist)
        if (data.is_connected) {
          loadPhoneStatusSilent()
        }
      }
    } catch (error) {
      console.log('No existing WhatsApp config found:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load phone status silently (no loading indicator) - used on page load
  const loadPhoneStatusSilent = async () => {
    try {
      const response = await whatsappService.getPhoneStatus(user?.wh_account_id)
      if (response.status === 1) {
        setPhoneStatus(response.data)
      }
    } catch (error) {
      console.log('Failed to load phone status silently:', error)
    }
  }

  // Launch Meta Embedded Signup
  const launchEmbeddedSignup = useCallback(() => {
    if (!fbSDKLoaded || !window.FB) {
      toast.error('Facebook SDK not loaded. Please refresh the page.')
      return
    }

    setConnectionData(prev => ({ ...prev, status: 'connecting' }))

    // Session info listener - receives WABA ID and Phone Number ID
    const sessionInfoListener = (event) => {
      if (event.origin !== 'https://www.facebook.com') return

      try {
        const data = JSON.parse(event.data)
        if (data.type === 'WA_EMBEDDED_SIGNUP') {
          // data contains: { type, data: { phone_number_id, waba_id } }
          if (data.data?.phone_number_id && data.data?.waba_id) {
            console.log('Embedded Signup Session Info:', data.data)
            // Save to backend
            saveSessionInfo(data.data)
          }
        }
      } catch (e) {
        // Not JSON or not our message
      }
    }

    window.addEventListener('message', sessionInfoListener)

    // Launch Facebook Login with Embedded Signup
    window.FB.login(
      function(response) {
        window.removeEventListener('message', sessionInfoListener)

        if (response.authResponse) {
          const code = response.authResponse.code
          console.log('OAuth code received:', code)

          // Exchange code for token via backend
          exchangeCodeForToken(code)
        } else {
          console.log('User cancelled login or did not fully authorize.')
          setConnectionData(prev => ({ ...prev, status: 'disconnected' }))
          toast.error('WhatsApp connection cancelled')
        }
      },
      {
        config_id: META_CONFIG_ID,
        response_type: 'code',
        override_default_response_type: true,
        scope: 'whatsapp_business_management,whatsapp_business_messaging,catalog_management,business_management',
        extras: {
          setup: {},
          featureType: '',
          sessionInfoVersion: '3',
        }
      }
    )
  }, [fbSDKLoaded, user])

  // Exchange OAuth code for token
  const exchangeCodeForToken = async (code) => {
    try {
      console.log('Exchanging OAuth code for token...')
      const response = await whatsappService.exchangeToken(code, user?.wh_account_id)

      if (response.status === 1) {
        toast.success('WhatsApp connected successfully!')

        // Auto-create catalog after successful connection
        try {
          console.log('Auto-creating WhatsApp catalog...')
          const catalogResponse = await whatsappService.createCatalog(user?.wh_account_id)
          if (catalogResponse.status === 1) {
            console.log('Catalog created:', catalogResponse.data?.catalog_id)
            toast.success('WhatsApp catalog created!')
          } else {
            console.log('Catalog creation:', catalogResponse.message)
          }
        } catch (catalogError) {
          console.log('Catalog auto-creation skipped:', catalogError.message)
        }

        loadWhatsAppConfig()
      } else {
        toast.error(response.message || 'Failed to complete connection')
        setConnectionData(prev => ({ ...prev, status: 'error' }))
      }
    } catch (error) {
      console.error('Token exchange error:', error)
      toast.error('Failed to complete WhatsApp connection')
      setConnectionData(prev => ({ ...prev, status: 'error' }))
    }
  }

  // Create catalog manually
  const handleCreateCatalog = async () => {
    try {
      setSaving(true)
      const response = await whatsappService.createCatalog(user?.wh_account_id)

      if (response.status === 1) {
        toast.success(response.message || 'Catalog created successfully!')
        setConnectionData(prev => ({ ...prev, catalogId: response.data?.catalog_id }))
        loadWhatsAppConfig()
      } else {
        toast.error(response.message || 'Failed to create catalog')
      }
    } catch (error) {
      console.error('Create catalog error:', error)
      toast.error('Failed to create catalog')
    } finally {
      setSaving(false)
    }
  }

  // Save session info from Embedded Signup (with retry)
  const saveSessionInfo = async (sessionData, retryCount = 0) => {
    const maxRetries = 3
    try {
      console.log('Saving session info:', sessionData, `(attempt ${retryCount + 1})`)
      const response = await whatsappService.saveSessionInfo({
        wh_account_id: user?.wh_account_id,
        waba_id: sessionData.waba_id,
        phone_number_id: sessionData.phone_number_id,
        business_id: sessionData.business_id,
      })

      if (response.status === 1) {
        console.log('Session info saved successfully')
        // Don't show success toast here - wait for token exchange to complete
      } else {
        console.error('Failed to save session info:', response.message)
      }
    } catch (error) {
      console.error('Save session info error:', error)
      // Retry on network error
      if (retryCount < maxRetries && (error.code === 'ERR_NETWORK' || error.message?.includes('Network'))) {
        console.log(`Retrying session info save in 1 second... (${retryCount + 1}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, 1000))
        return saveSessionInfo(sessionData, retryCount + 1)
      }
      toast.error('Failed to save WhatsApp configuration. Please try again.')
    }
  }

  // Disconnect WhatsApp
  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect WhatsApp? This will stop all WhatsApp bot functionality.')) {
      return
    }

    try {
      setSaving(true)
      const response = await whatsappService.disconnect(user?.wh_account_id)

      if (response.status === 1) {
        setConnectionData({
          isConnected: false,
          status: 'disconnected',
          phoneNumber: '',
          phoneNumberId: '',
          wabaId: '',
          businessId: '',
          businessName: '',
          catalogId: '',
          connectedAt: null,
        })
        toast.success('WhatsApp disconnected successfully')
      } else {
        toast.error(response.message || 'Failed to disconnect')
      }
    } catch (error) {
      toast.error('Failed to disconnect WhatsApp')
    } finally {
      setSaving(false)
    }
  }

  // ============================================
  // Twilio Number Handlers
  // ============================================

  // Load user's Twilio number (if any)
  const loadTwilioNumber = async () => {
    try {
      setTwilioState(prev => ({ ...prev, loading: true }))
      const response = await twilioService.getMyNumber(user?.wh_account_id)
      if (response.status === 1 && response.data) {
        setTwilioState({
          hasNumber: true,
          number: response.data.phone_number,
          numberSid: response.data.sid,
          purchasedAt: response.data.purchased_at,
          loading: false,
        })
      } else {
        setTwilioState(prev => ({ ...prev, hasNumber: false, loading: false }))
      }
    } catch (error) {
      setTwilioState(prev => ({ ...prev, loading: false }))
    }
  }

  // Search available Twilio numbers
  const handleSearchTwilioNumbers = async () => {
    try {
      setTwilioSearching(true)
      setTwilioAvailableNumbers([])
      const response = await twilioService.searchAvailableNumbers(user?.wh_account_id, {
        area_code: twilioAreaCode || null,
        contains: twilioContains || null,
        limit: 10,
      })
      if (response.status === 1) {
        setTwilioAvailableNumbers(response.data || [])
        if (response.data?.length === 0) {
          toast.info('No numbers found. Try different search criteria.')
        }
      } else {
        toast.error(response.message || 'Failed to search numbers')
      }
    } catch (error) {
      toast.error('Failed to search available numbers')
    } finally {
      setTwilioSearching(false)
    }
  }

  // Buy a Twilio number
  const handleBuyTwilioNumber = async (phoneNumber) => {
    if (!confirm(`Are you sure you want to get this number?\n\n${phoneNumber}\n\nThis number will be used for your WhatsApp Business verification.`)) {
      return
    }

    try {
      setTwilioBuying(true)
      const response = await twilioService.buyNumber(user?.wh_account_id, phoneNumber)
      if (response.status === 1) {
        toast.success('Phone number acquired successfully!')
        setTwilioState({
          hasNumber: true,
          number: phoneNumber,
          numberSid: response.data?.sid,
          purchasedAt: new Date().toISOString(),
          loading: false,
        })
        setTwilioAvailableNumbers([])
        setShowTwilioSection(false)
      } else {
        toast.error(response.message || 'Failed to acquire number')
      }
    } catch (error) {
      toast.error('Failed to acquire phone number')
    } finally {
      setTwilioBuying(false)
    }
  }

  // Release Twilio number
  const handleReleaseTwilioNumber = async () => {
    if (!confirm('Are you sure you want to release this number?\n\nYou will lose this phone number and any messages sent to it.')) {
      return
    }

    try {
      setTwilioState(prev => ({ ...prev, loading: true }))
      const response = await twilioService.releaseNumber(user?.wh_account_id)
      if (response.status === 1) {
        toast.success('Phone number released')
        setTwilioState({
          hasNumber: false,
          number: null,
          numberSid: null,
          purchasedAt: null,
          loading: false,
        })
      } else {
        toast.error(response.message || 'Failed to release number')
        setTwilioState(prev => ({ ...prev, loading: false }))
      }
    } catch (error) {
      toast.error('Failed to release phone number')
      setTwilioState(prev => ({ ...prev, loading: false }))
    }
  }

  // Load SMS inbox
  const loadTwilioInbox = async () => {
    try {
      setLoadingInbox(true)
      const response = await twilioService.getSmsInbox(user?.wh_account_id, 20)
      if (response.status === 1) {
        setTwilioInbox(response.data || [])
      }
    } catch (error) {
      toast.error('Failed to load SMS inbox')
    } finally {
      setLoadingInbox(false)
    }
  }

  // Get latest OTP from inbox
  const handleGetLatestOtp = async () => {
    try {
      const response = await twilioService.getLatestOtp(user?.wh_account_id)
      if (response.status === 1 && response.data?.otp) {
        setOtpCode(response.data.otp)
        toast.success(`OTP found: ${response.data.otp}`)
      } else {
        toast.info('No OTP found in recent messages')
      }
    } catch (error) {
      toast.error('Failed to fetch OTP')
    }
  }

  // ============================================
  // Phone Registration Handlers
  // ============================================

  // Request OTP code
  const handleRequestOtp = async () => {
    try {
      setRequestingOtp(true)
      const response = await whatsappService.requestVerificationCode(
        user?.wh_account_id,
        otpMethod
      )

      if (response.status === 1) {
        toast.success(response.message || `Verification code sent via ${otpMethod}`)
        setShowOtpModal(true)
      } else {
        toast.error(response.message || 'Failed to send verification code')
      }
    } catch (error) {
      toast.error('Failed to request verification code')
    } finally {
      setRequestingOtp(false)
    }
  }

  // Verify OTP code
  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 6) {
      toast.error('Please enter a valid 6-digit code')
      return
    }

    try {
      setVerifyingOtp(true)
      const response = await whatsappService.verifyCode(user?.wh_account_id, otpCode)

      if (response.status === 1) {
        toast.success('Phone number verified successfully!')
        setShowOtpModal(false)
        setOtpCode('')
        // Refresh phone status
        loadPhoneStatus()
      } else {
        toast.error(response.message || 'Invalid verification code')
      }
    } catch (error) {
      toast.error('Failed to verify code')
    } finally {
      setVerifyingOtp(false)
    }
  }

  // Register phone with WhatsApp
  const handleRegisterPhone = async () => {
    try {
      setRegisteringPhone(true)
      const response = await whatsappService.registerPhone(user?.wh_account_id)

      if (response.status === 1) {
        toast.success('Phone number registered with WhatsApp!')
        loadPhoneStatus()
      } else {
        toast.error(response.message || 'Failed to register phone')
      }
    } catch (error) {
      toast.error('Failed to register phone')
    } finally {
      setRegisteringPhone(false)
    }
  }

  // ============================================
  // Business Profile Handlers
  // ============================================

  // Load business profile
  const loadBusinessProfile = async () => {
    try {
      setLoadingProfile(true)

      // Load categories first
      const catResponse = await whatsappService.getBusinessCategories()
      if (catResponse.status === 1) {
        setBusinessCategories(catResponse.data?.categories || [])
      }

      // Load profile
      const profileResponse = await whatsappService.getBusinessProfile(user?.wh_account_id)
      if (profileResponse.status === 1 && profileResponse.data) {
        setBusinessProfile({
          about: profileResponse.data.about || '',
          address: profileResponse.data.address || '',
          description: profileResponse.data.description || '',
          email: profileResponse.data.email || '',
          websites: profileResponse.data.websites?.length > 0 ? profileResponse.data.websites : [''],
          vertical: profileResponse.data.vertical || 'UNDEFINED',
        })
      }
    } catch (error) {
      console.error('Failed to load business profile:', error)
    } finally {
      setLoadingProfile(false)
    }
  }

  // Save business profile
  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true)

      // Filter out empty websites
      const websites = businessProfile.websites.filter(w => w.trim() !== '')

      const response = await whatsappService.updateBusinessProfile(user?.wh_account_id, {
        about: businessProfile.about,
        address: businessProfile.address,
        description: businessProfile.description,
        email: businessProfile.email,
        websites: websites.length > 0 ? websites : undefined,
        vertical: businessProfile.vertical !== 'UNDEFINED' ? businessProfile.vertical : undefined,
      })

      if (response.status === 1) {
        toast.success('Business profile updated successfully!')
        setShowProfileModal(false)
      } else {
        toast.error(response.message || 'Failed to update profile')
      }
    } catch (error) {
      toast.error('Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  // Update display name
  const handleUpdateDisplayName = async () => {
    if (!displayNameForm || displayNameForm.length < 3) {
      toast.error('Display name must be at least 3 characters')
      return
    }

    try {
      setUpdatingDisplayName(true)
      const response = await whatsappService.updateDisplayName(user?.wh_account_id, displayNameForm)

      if (response.status === 1) {
        toast.success(response.message || 'Display name update submitted for review')
        setShowDisplayNameModal(false)
        setDisplayNameForm('')
      } else {
        toast.error(response.message || 'Failed to update display name')
      }
    } catch (error) {
      toast.error('Failed to update display name')
    } finally {
      setUpdatingDisplayName(false)
    }
  }

  // Open profile modal
  const openProfileModal = () => {
    loadBusinessProfile()
    setShowProfileModal(true)
  }

  // Sync products to catalog
  const handleSyncCatalog = async () => {
    try {
      setSaving(true)
      const response = await whatsappService.syncCatalog(user?.wh_account_id)

      if (response.status === 1) {
        toast.success(`Synced ${response.data?.synced || 0} products to WhatsApp Catalog`)
        // Show debug info if there are errors
        if (response.data?.errors?.length > 0) {
          console.log('Sync errors:', response.data.errors)
        }
        if (response.data?.catalog_debug) {
          console.log('Catalog debug:', response.data.catalog_debug)
        }
      } else {
        toast.error(response.message || 'Failed to sync catalog')
      }
    } catch (error) {
      toast.error('Failed to sync catalog')
    } finally {
      setSaving(false)
    }
  }

  // Load available catalogs
  const loadCatalogs = async () => {
    try {
      setLoadingCatalogs(true)
      const response = await whatsappService.listCatalogs(user?.wh_account_id)

      if (response.status === 1) {
        setCatalogs(response.data?.catalogs || [])
      } else {
        toast.error(response.message || 'Failed to load catalogs')
      }
    } catch (error) {
      toast.error('Failed to load catalogs')
    } finally {
      setLoadingCatalogs(false)
    }
  }

  // Switch to a different catalog
  const handleSelectCatalog = async (catalogId) => {
    try {
      setSaving(true)
      const response = await whatsappService.updateCatalog(user?.wh_account_id, catalogId)

      if (response.status === 1) {
        toast.success('Catalog updated successfully!')
        if (response.data?.warning) {
          toast.error(response.data.warning)
        }
        setConnectionData(prev => ({ ...prev, catalogId }))
        loadCatalogs() // Refresh catalog list
      } else {
        toast.error(response.message || 'Failed to update catalog')
      }
    } catch (error) {
      toast.error('Failed to update catalog')
    } finally {
      setSaving(false)
    }
  }

  // Check permissions and catalog access
  const handleCheckPermissions = async () => {
    try {
      setLoadingDiagnostics(true)
      setShowDiagnostics(true)
      const response = await whatsappService.checkPermissions(user?.wh_account_id)

      if (response.status === 1) {
        setPermissionDiagnostics(response.data)
        if (response.data.overall_health) {
          toast.success('All permissions are configured correctly!')
        } else {
          toast.warning('Some permissions are missing. Check the diagnostics below.')
        }
      } else {
        toast.error(response.message || 'Failed to check permissions')
        setPermissionDiagnostics(null)
      }
    } catch (error) {
      console.error('Permission check error:', error)
      toast.error('Failed to check permissions')
      setPermissionDiagnostics(null)
    } finally {
      setLoadingDiagnostics(false)
    }
  }

  // Fetch phone number status from Meta API
  const loadPhoneStatus = async () => {
    try {
      setLoadingPhoneStatus(true)
      const response = await whatsappService.getPhoneStatus(user?.wh_account_id)

      if (response.status === 1) {
        setPhoneStatus(response.data)
      } else {
        console.log('Phone status error:', response.message)
      }
    } catch (error) {
      console.log('Failed to load phone status:', error)
    } finally {
      setLoadingPhoneStatus(false)
    }
  }

  // Fetch business verification status from existing WhatsApp status endpoint
  const loadBusinessVerificationStatus = async () => {
    if (!connectionData.businessId) {
      setBusinessVerification(prev => ({
        ...prev,
        status: 'unknown',
        error: null,
      }))
      return
    }

    try {
      setBusinessVerification(prev => ({ ...prev, loading: true, error: null }))

      // Use the existing status endpoint which may include business verification info
      const response = await whatsappService.getWhatsAppStatus(user?.wh_account_id)

      if (response.status === 1 && response.data) {
        // Check various possible field names for verification status
        const verificationStatus = response.data.verification_status ||
                                   response.data.business_verification_status ||
                                   response.data.businessVerificationStatus ||
                                   null

        if (verificationStatus) {
          setBusinessVerification(prev => ({
            ...prev,
            status: verificationStatus,
            loading: false,
            error: null,
          }))
        } else {
          // Status not available from API - show as unknown
          setBusinessVerification(prev => ({
            ...prev,
            status: 'unknown',
            loading: false,
            error: null,
          }))
        }
      } else {
        setBusinessVerification(prev => ({
          ...prev,
          status: 'unknown',
          loading: false,
          error: null,
        }))
      }
    } catch (error) {
      console.log('Failed to load business verification status:', error)
      setBusinessVerification(prev => ({
        ...prev,
        status: 'unknown',
        loading: false,
        error: null,
      }))
    }
  }

  // Get business verification badge
  const getBusinessVerificationBadge = () => {
    const { status, loading } = businessVerification

    if (loading) {
      return <Badge variant="default"><Clock className="h-3 w-3 mr-1 animate-spin" /> Checking...</Badge>
    }

    switch (status?.toLowerCase()) {
      case 'verified':
        return <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" /> Verified</Badge>
      case 'pending':
        return <Badge variant="warning"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>
      case 'not_verified':
        return <Badge variant="danger"><XCircle className="h-3 w-3 mr-1" /> Not Verified</Badge>
      case 'rejected':
        return <Badge variant="danger"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>
      case 'unknown':
      default:
        return <Badge variant="warning"><ExternalLink className="h-3 w-3 mr-1" /> Check in Meta</Badge>
    }
  }

  // Get Meta Business Manager verification URL
  const getMetaVerificationUrl = () => {
    const businessId = connectionData.businessId
    if (businessId) {
      return `https://business.facebook.com/settings/security?business_id=${businessId}`
    }
    return 'https://business.facebook.com/settings/security'
  }

  // Get phone status badge
  const getPhoneStatusBadge = () => {
    if (!phoneStatus) return null

    const status = phoneStatus.overall_status
    switch (status) {
      case 'CONNECTED':
        return <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" /> Live</Badge>
      case 'PENDING_REGISTRATION':
        return <Badge variant="warning"><Clock className="h-3 w-3 mr-1" /> Pending Registration</Badge>
      case 'PENDING_VERIFICATION':
        return <Badge variant="warning"><Clock className="h-3 w-3 mr-1" /> Pending Verification</Badge>
      case 'DISCONNECTED':
        return <Badge variant="danger"><XCircle className="h-3 w-3 mr-1" /> Disconnected</Badge>
      case 'API_READY':
        return <Badge variant="default"><AlertCircle className="h-3 w-3 mr-1" /> API Ready</Badge>
      case 'PENDING':
        return <Badge variant="warning"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>
      default:
        return <Badge variant="default"><AlertCircle className="h-3 w-3 mr-1" /> {status}</Badge>
    }
  }

  // Check if phone number is a Meta test number
  const isTestPhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return false
    const cleanNumber = phoneNumber.replace(/[^0-9]/g, '')
    // Meta test numbers typically start with 1555 (US) or other test prefixes
    // +15558520220 format - 555 area code is reserved for fictional use
    return cleanNumber.startsWith('1555') ||
           cleanNumber.startsWith('15550') ||
           cleanNumber.includes('5558') ||
           /^1555\d{7}$/.test(cleanNumber)
  }

  // Generate WhatsApp link for catalog
  const getWhatsAppLink = () => {
    // Format phone number (remove + and spaces)
    const phoneNumber = connectionData.phoneNumber?.replace(/[^0-9]/g, '') || ''
    if (!phoneNumber) return null

    // WhatsApp Business catalog link
    return `https://wa.me/${phoneNumber}?text=Hi!%20I%27d%20like%20to%20browse%20your%20catalog`
  }

  // Get direct WhatsApp chat link
  const getWhatsAppChatLink = () => {
    const phoneNumber = connectionData.phoneNumber?.replace(/[^0-9]/g, '') || ''
    if (!phoneNumber) return null
    return `https://wa.me/${phoneNumber}`
  }

  // Copy link to clipboard
  const copyLinkToClipboard = () => {
    const link = getWhatsAppLink()
    if (link) {
      navigator.clipboard.writeText(link)
      toast.success('Link copied to clipboard!')
    }
  }

  // Download QR code as image
  const downloadQRCode = () => {
    const svg = qrCodeRef.current?.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)

      const link = document.createElement('a')
      link.download = `whatsapp-qr-${connectionData.phoneNumber || 'store'}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      toast.success('QR Code downloaded!')
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  // Share via Web Share API (mobile)
  const shareLink = async () => {
    const link = getWhatsAppLink()
    if (!link) return

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Chat with us on WhatsApp',
          text: 'Click to browse our catalog on WhatsApp',
          url: link,
        })
      } catch (err) {
        if (err.name !== 'AbortError') {
          copyLinkToClipboard()
        }
      }
    } else {
      copyLinkToClipboard()
    }
  }

  // Bot Settings handlers
  const handleSaveBotSettings = async () => {
    try {
      setSaving(true)
      const response = await whatsappService.updateBotSettings({
        wh_account_id: user?.wh_account_id,
        ...botSettings
      })

      if (response.status === 1) {
        toast.success('Bot settings saved successfully!')
      } else {
        toast.error(response.message || 'Failed to save settings')
      }
    } catch (error) {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  // Auto-Reply handlers
  const handleAddAutoReply = () => {
    setEditingReply(null)
    setReplyForm({ trigger: '', response: '', enabled: true })
    setShowAutoReplyModal(true)
  }

  const handleEditAutoReply = (reply) => {
    setEditingReply(reply)
    setReplyForm({ trigger: reply.trigger, response: reply.response, enabled: reply.enabled })
    setShowAutoReplyModal(true)
  }

  const handleSaveAutoReply = async () => {
    if (!replyForm.trigger || !replyForm.response) {
      toast.error('Please fill in all fields')
      return
    }
    try {
      setSaving(true)
      if (editingReply) {
        setAutoReplies(prev => prev.map(r => r.id === editingReply.id ? { ...r, ...replyForm } : r))
        toast.success('Auto-reply updated')
      } else {
        const newReply = { id: Date.now(), ...replyForm }
        setAutoReplies(prev => [...prev, newReply])
        toast.success('Auto-reply added')
      }
      setShowAutoReplyModal(false)
    } catch (error) {
      toast.error('Failed to save auto-reply')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAutoReply = async (id) => {
    setAutoReplies(prev => prev.filter(r => r.id !== id))
    toast.success('Auto-reply deleted')
  }

  const handleToggleAutoReply = (id) => {
    setAutoReplies(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r))
  }

  // Quick Reply handlers
  const handleAddQuickReply = () => {
    setEditingQuickReply(null)
    setQuickReplyForm({ shortcut: '', message: '' })
    setShowQuickReplyModal(true)
  }

  const handleEditQuickReply = (reply) => {
    setEditingQuickReply(reply)
    setQuickReplyForm({ shortcut: reply.shortcut, message: reply.message })
    setShowQuickReplyModal(true)
  }

  const handleSaveQuickReply = async () => {
    if (!quickReplyForm.shortcut || !quickReplyForm.message) {
      toast.error('Please fill in all fields')
      return
    }
    try {
      setSaving(true)
      if (editingQuickReply) {
        setQuickReplies(prev => prev.map(r => r.id === editingQuickReply.id ? { ...r, ...quickReplyForm } : r))
        toast.success('Quick reply updated')
      } else {
        const newReply = { id: Date.now(), ...quickReplyForm }
        setQuickReplies(prev => [...prev, newReply])
        toast.success('Quick reply added')
      }
      setShowQuickReplyModal(false)
    } catch (error) {
      toast.error('Failed to save quick reply')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteQuickReply = async (id) => {
    setQuickReplies(prev => prev.filter(r => r.id !== id))
    toast.success('Quick reply deleted')
  }

  const handleCopyQuickReply = (message) => {
    navigator.clipboard.writeText(message)
    toast.success('Copied to clipboard!')
  }

  const getConnectionStatusBadge = () => {
    switch (connectionData.status) {
      case 'connected':
        return <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" /> Connected</Badge>
      case 'connecting':
        return <Badge variant="warning"><RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Connecting...</Badge>
      case 'error':
        return <Badge variant="danger"><XCircle className="h-3 w-3 mr-1" /> Error</Badge>
      default:
        return <Badge variant="default"><AlertCircle className="h-3 w-3 mr-1" /> Disconnected</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Screenshot Preview Modal */}
      {previewScreenshot && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewScreenshot(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewScreenshot(null)}
              className="absolute -top-3 -right-3 z-10 w-8 h-8 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">{previewScreenshot.alt}</p>
              </div>
              <div className="overflow-auto max-h-[80vh]">
                <img
                  src={previewScreenshot.src}
                  alt={previewScreenshot.alt}
                  className="w-full h-auto"
                  onError={(e) => {
                    e.target.style.display = 'none'
                    e.target.parentElement.innerHTML = '<div class="p-12 text-center text-gray-500"><p class="text-lg font-medium">Screenshot not yet added</p><p class="text-sm mt-2">Place the screenshot image at:<br/><code class="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded mt-1 inline-block">' + previewScreenshot.src + '</code></p></div>'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Mode Banner */}
      {isAdminMode && (
        <div className="sticky top-0 z-50 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    🔐 Admin Mode
                    <Badge className="bg-white/30 text-white border-white/50">
                      Acting as Seller #{sellerId}
                    </Badge>
                  </h3>
                  <p className="text-sm text-white/90">
                    You're completing WhatsApp setup on behalf of this seller. Complete the steps below and return to admin panel when done.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (confirm('Return to admin panel? Any unsaved changes will be lost.')) {
                      window.location.href = adminReturnUrl
                    }
                  }}
                  className="px-4 py-2 bg-white text-amber-600 font-semibold rounded-lg hover:bg-white/90 transition-colors flex items-center gap-2 shadow-md"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back to Admin Panel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text flex items-center gap-2">
            <MessageSquare className="h-7 w-7 text-green-500" />
            WhatsApp Bot
          </h1>
          <p className="text-gray-500 dark:text-dark-muted">
            Configure your WhatsApp Business integration and bot settings
          </p>
        </div>
        <div className="flex items-center gap-2">
          {getConnectionStatusBadge()}
        </div>
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
                      ? 'bg-green-50 text-green-600 dark:bg-green-900/20'
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
          {/* Connection Tab */}
          {activeTab === 'connection' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    WhatsApp Business Connection
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {!connectionData.isConnected ? (
                    <>
                      <div className="p-4 bg-blue-50 rounded-lg dark:bg-blue-900/20">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Connect your WhatsApp Business account to enable automated messaging,
                          order notifications, and customer support through WhatsApp.
                        </p>
                      </div>

                      {/* Setup Instructions Guide */}
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800 overflow-hidden">
                        {/* Collapsible Header */}
                        <button
                          onClick={() => setShowSetupGuide(!showSetupGuide)}
                          className="w-full p-4 flex items-center justify-between text-left hover:bg-green-100/50 dark:hover:bg-green-900/30 transition-colors"
                        >
                          <h4 className="font-semibold text-green-800 dark:text-green-200 flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Setup Guide: Connect Your WhatsApp Business
                            <span className="text-xs font-normal text-green-600 dark:text-green-400 ml-2">
                              (Complete Step-by-Step)
                            </span>
                          </h4>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-green-600 dark:text-green-400">
                              {showSetupGuide ? 'Hide' : 'Show'}
                            </span>
                            {showSetupGuide ? (
                              <ChevronUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-green-600 dark:text-green-400" />
                            )}
                          </div>
                        </button>

                        {/* Collapsible Content */}
                        {showSetupGuide && (
                          <div className="px-5 pb-5 space-y-4">
                            {/* Before You Begin */}
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                              <h5 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
                                <AlertCircle className="h-5 w-5" />
                                Before You Begin
                              </h5>
                              <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                                You need a WhatsApp Business phone number to connect. You can either:
                              </p>
                              <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1 ml-4">
                                <li className="flex items-start gap-2">
                                  <span className="text-blue-500 font-bold">•</span>
                                  <span>Use your own existing business number, OR</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-blue-500 font-bold">•</span>
                                  <span>Purchase a new number from our website below (check the "Need a Phone Number?" section)</span>
                                </li>
                              </ul>
                              {twilioState.hasNumber && (
                                <div className="mt-3 p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded border border-emerald-200 dark:border-emerald-800">
                                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                                    <strong>✓ You have a number:</strong> Use <span className="font-mono font-bold">{twilioState.number}</span> during setup.
                                    Click "SMS Inbox" below to get verification codes sent to this number.
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Video Tutorial Button */}
                            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-lg border-2 border-purple-300 dark:border-purple-700">
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                                  <Play className="h-6 w-6 text-white fill-white" />
                                </div>
                                <div className="flex-1">
                                  <h5 className="font-semibold text-purple-800 dark:text-purple-200 mb-1 flex items-center gap-2">
                                    🎥 Prefer Video Instructions?
                                  </h5>
                                  <p className="text-sm text-purple-700 dark:text-purple-300 mb-3">
                                    Watch our step-by-step video tutorial that walks you through the entire setup process
                                    with detailed explanations and visual guidance.
                                  </p>
                                  <button
                                    onClick={() => setShowVideoTutorial(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium text-sm rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                                  >
                                    <Play className="h-4 w-4 fill-white" />
                                    Watch Video Tutorial
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                              Follow these steps carefully when you click "Login with Facebook" below:
                            </p>

                            <div className="space-y-3">
                              {/* Step 1 - Facebook Login */}
                              <div className="flex items-start gap-3 bg-white/60 dark:bg-gray-800/40 p-3 rounded-lg">
                                <span className="flex items-center justify-center w-7 h-7 bg-green-500 text-white text-sm font-bold rounded-full flex-shrink-0">1</span>
                                <div className="flex-1">
                                  <p className="font-medium text-gray-800 dark:text-gray-200">Click "Login with Facebook"</p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    Scroll down on this page and click the blue "Login with Facebook" button to authenticate with Meta Business tools.
                                  </p>
                                  <button
                                    onClick={() => setPreviewScreenshot({ src: setupScreenshots.step1, alt: 'Step 1: Click "Login with Facebook" button on our website' })}
                                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    View Screenshot
                                  </button>
                                </div>
                              </div>

                              {/* Step 2 - Continue Dialog */}
                              <div className="flex items-start gap-3 bg-white/60 dark:bg-gray-800/40 p-3 rounded-lg">
                                <span className="flex items-center justify-center w-7 h-7 bg-green-500 text-white text-sm font-bold rounded-full flex-shrink-0">2</span>
                                <div className="flex-1">
                                  <p className="font-medium text-gray-800 dark:text-gray-200">Click "Continue"</p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    You'll see a popup saying "Seamlessly connect your account to AnythingInstantly" with permissions details.
                                  </p>
                                  <ul className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-4 space-y-1">
                                    <li>• Communicate with customers at scale</li>
                                    <li>• Send messages with optimizations</li>
                                  </ul>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 font-medium">
                                    Click the blue "Continue" button.
                                  </p>
                                  <button
                                    onClick={() => setPreviewScreenshot({ src: setupScreenshots.step2, alt: 'Step 2: Click "Continue" on Meta permissions dialog' })}
                                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    View Screenshot
                                  </button>
                                </div>
                              </div>

                              {/* Step 3 - Select Business Assets */}
                              <div className="flex items-start gap-3 bg-white/60 dark:bg-gray-800/40 p-3 rounded-lg">
                                <span className="flex items-center justify-center w-7 h-7 bg-green-500 text-white text-sm font-bold rounded-full flex-shrink-0">3</span>
                                <div className="flex-1">
                                  <p className="font-medium text-gray-800 dark:text-gray-200">Select Business Assets</p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    You'll see "Select the business assets to share with AnythingInstantly":
                                  </p>
                                  <div className="mt-2 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                    <div className="flex items-start gap-2">
                                      <span className="font-bold text-gray-800 dark:text-gray-200 min-w-[140px]">Business portfolio:</span>
                                      <span>Select existing or create new</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <span className="font-bold text-gray-800 dark:text-gray-200 min-w-[140px]">WhatsApp Account:</span>
                                      <span>Select existing or create new</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <span className="font-bold text-gray-800 dark:text-gray-200 min-w-[140px]">Catalogue:</span>
                                      <span>Select existing or create new</span>
                                    </div>
                                  </div>
                                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-medium">
                                    Click "Next" after making your selections.
                                  </p>
                                  <button
                                    onClick={() => setPreviewScreenshot({ src: setupScreenshots.step3, alt: 'Step 3: Select Business Portfolio, WhatsApp Account & Catalogue' })}
                                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    View Screenshot
                                  </button>
                                </div>
                              </div>

                              {/* Step 4 - Business Information */}
                              <div className="flex items-start gap-3 bg-amber-100/80 dark:bg-amber-900/30 p-3 rounded-lg border border-amber-300 dark:border-amber-700">
                                <span className="flex items-center justify-center w-7 h-7 bg-amber-500 text-white text-sm font-bold rounded-full flex-shrink-0">4</span>
                                <div className="flex-1">
                                  <p className="font-medium text-amber-800 dark:text-amber-200 flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4" />
                                    Enter Business Information
                                  </p>
                                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                                    Fill in your business details:
                                  </p>
                                  <ul className="text-sm text-amber-600 dark:text-amber-400 mt-2 ml-4 space-y-1">
                                    <li>• <strong>Name:</strong> Your business name</li>
                                    <li>• <strong>Category:</strong> Choose your business type (e.g., Restaurant, Clothing, Education, Food & Groceries)</li>
                                    <li>• <strong>Country:</strong> Your location</li>
                                    <li>• <strong>Website:</strong> Your website URL (if any)</li>
                                    <li>• <strong>Time zone:</strong> Your time zone</li>
                                  </ul>
                                  <div className="mt-3 p-3 bg-amber-200 dark:bg-amber-900/50 rounded-lg border border-amber-400 dark:border-amber-600">
                                    <p className="text-sm text-amber-800 dark:text-amber-100 font-bold flex items-center gap-2">
                                      <AlertTriangle className="h-4 w-4" />
                                      CRITICAL: Select "Commerce" for Vertical
                                    </p>
                                    <p className="text-xs text-amber-700 dark:text-amber-200 mt-1">
                                      In the <strong>"Vertical"</strong> dropdown, you MUST select <span className="font-bold bg-amber-300 dark:bg-amber-800 px-1.5 py-0.5 rounded">"Commerce"</span>.
                                      This is required for your WhatsApp product catalog to work properly!
                                    </p>
                                  </div>
                                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                                    <strong>Business description</strong> is optional - you can add it now or skip it.
                                  </p>
                                  <button
                                    onClick={() => setPreviewScreenshot({ src: setupScreenshots.step4, alt: 'Step 4: Enter Business Info - Make sure to select "Commerce" for Vertical!' })}
                                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 bg-amber-50 dark:bg-amber-900/30 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    View Screenshot - See "Commerce" Selection
                                  </button>
                                </div>
                              </div>

                              {/* Step 5 - Add Phone Number */}
                              <div className="flex items-start gap-3 bg-red-100/80 dark:bg-red-900/30 p-3 rounded-lg border-2 border-red-300 dark:border-red-700">
                                <span className="flex items-center justify-center w-7 h-7 bg-red-500 text-white text-sm font-bold rounded-full flex-shrink-0">5</span>
                                <div className="flex-1">
                                  <p className="font-medium text-red-800 dark:text-red-200 flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5" />
                                    Add Your WhatsApp Phone Number (IMPORTANT!)
                                  </p>

                                  <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/40 rounded border border-red-300 dark:border-red-700">
                                    <p className="text-sm text-red-800 dark:text-red-200 font-bold">
                                      ⚠️ You MUST select "Add a new number" option
                                    </p>
                                    <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                                      Do NOT select "Use a display name only" - the bot needs a real phone number to receive customer messages!
                                    </p>
                                  </div>

                                  <div className="mt-3 space-y-2">
                                    <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                                      In the "Phone number" field:
                                    </p>
                                    <ul className="text-sm text-red-600 dark:text-red-400 ml-4 space-y-1.5">
                                      <li className="flex items-start gap-2">
                                        <span className="font-bold min-w-[20px]">1.</span>
                                        <span>Enter your business phone number (or the number you purchased from our website)</span>
                                      </li>
                                      {twilioState.hasNumber && (
                                        <li className="flex items-start gap-2 bg-emerald-50 dark:bg-emerald-900/30 p-2 rounded border border-emerald-300 dark:border-emerald-700">
                                          <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                                          <span className="text-emerald-700 dark:text-emerald-300 text-xs">
                                            <strong>Your number:</strong> Copy and paste <span className="font-mono font-bold">{twilioState.number}</span> into the phone number field
                                          </span>
                                        </li>
                                      )}
                                      <li className="flex items-start gap-2">
                                        <span className="font-bold min-w-[20px]">2.</span>
                                        <span><strong>Choose verification method:</strong> Select "Text message" (recommended if you purchased from our website)</span>
                                      </li>
                                    </ul>
                                  </div>

                                  {twilioState.hasNumber && (
                                    <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/30 rounded border border-blue-300 dark:border-blue-700">
                                      <p className="text-xs text-blue-700 dark:text-blue-300">
                                        <strong>💡 Tip:</strong> After requesting verification, click the "SMS Inbox" button below to see the verification code sent to your purchased number!
                                      </p>
                                    </div>
                                  )}

                                  <div className="mt-2 flex flex-wrap gap-2">
                                    <button
                                      onClick={() => setPreviewScreenshot({ src: setupScreenshots.step5, alt: 'Step 5: Select "Add a new number" and enter your phone number' })}
                                      className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 bg-red-50 dark:bg-red-900/30 px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                      View Screenshot - Add Number
                                    </button>
                                  </div>

                                  <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/30 rounded border border-orange-300 dark:border-orange-700">
                                    <p className="text-sm text-orange-800 dark:text-orange-200 font-bold mb-1">
                                      ⚠️ If you see an error message:
                                    </p>
                                    <p className="text-xs text-orange-700 dark:text-orange-300 mb-2">
                                      "To use this phone number, you'll need to delete an existing one from WhatsApp Manager..."
                                    </p>
                                    <p className="text-xs text-orange-800 dark:text-orange-200 font-medium">
                                      This means the number is already registered in your Meta account. Do this:
                                    </p>
                                    <ul className="text-xs text-orange-600 dark:text-orange-400 mt-2 ml-4 space-y-1">
                                      <li>• Go back and select "Use a new or existing WhatsApp number"</li>
                                      <li>• Then select your already registered number from the dropdown</li>
                                      <li>• Do NOT select any other options</li>
                                      <li>• Choose "Text message" or "Phone call" for verification</li>
                                    </ul>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      <button
                                        onClick={() => setPreviewScreenshot({ src: setupScreenshots.step5error, alt: 'Phone number already registered error - Go back and select existing number' })}
                                        className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-700 dark:text-orange-300 hover:text-orange-900 bg-orange-100 dark:bg-orange-900/40 px-3 py-1.5 rounded-lg border border-orange-300 dark:border-orange-600 hover:bg-orange-200 transition-colors"
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                        View Error Screenshot
                                      </button>
                                      <button
                                        onClick={() => setPreviewScreenshot({ src: setupScreenshots.step5existing, alt: 'Select your already registered WhatsApp number from the dropdown' })}
                                        className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-700 dark:text-orange-300 hover:text-orange-900 bg-orange-100 dark:bg-orange-900/40 px-3 py-1.5 rounded-lg border border-orange-300 dark:border-orange-600 hover:bg-orange-200 transition-colors"
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                        View Fix - Select Existing Number
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Step 6 - Review Permissions */}
                              <div className="flex items-start gap-3 bg-white/60 dark:bg-gray-800/40 p-3 rounded-lg">
                                <span className="flex items-center justify-center w-7 h-7 bg-green-500 text-white text-sm font-bold rounded-full flex-shrink-0">6</span>
                                <div className="flex-1">
                                  <p className="font-medium text-gray-800 dark:text-gray-200">Review Permissions</p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    You'll see "Review what you'll share with AnythingInstantly" screen showing:
                                  </p>
                                  <ul className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-4 space-y-1">
                                    <li>• Business (your business portfolio)</li>
                                    <li>• WhatsApp Business account</li>
                                    <li>• Catalogs (your product catalogs)</li>
                                  </ul>
                                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 font-medium">
                                    AnythingInstantly will be able to:
                                  </p>
                                  <ul className="text-xs text-gray-500 dark:text-gray-400 ml-4 space-y-1 mt-1">
                                    <li>• Manage your product catalogues</li>
                                    <li>• Manage your business</li>
                                    <li>• Manage your WhatsApp accounts</li>
                                    <li>• Manage and access conversations in WhatsApp</li>
                                  </ul>
                                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-medium">
                                    Click the blue "Confirm" button to continue.
                                  </p>
                                  <button
                                    onClick={() => setPreviewScreenshot({ src: setupScreenshots.step6, alt: 'Step 6: Review what you\'ll share with AnythingInstantly - Click "Confirm"' })}
                                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    View Screenshot
                                  </button>
                                </div>
                              </div>

                              {/* Step 7 - Success & Finish */}
                              <div className="flex items-start gap-3 bg-green-100/80 dark:bg-green-900/30 p-3 rounded-lg border border-green-300 dark:border-green-700">
                                <span className="flex items-center justify-center w-7 h-7 bg-green-600 text-white text-sm font-bold rounded-full flex-shrink-0">7</span>
                                <div className="flex-1">
                                  <p className="font-medium text-green-800 dark:text-green-200 flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5" />
                                    Success! Complete Setup
                                  </p>
                                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                                    You'll see: "Your account is connected to AnythingInstantly"
                                  </p>
                                  <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                                    Meta will review your business to ensure it complies with WhatsApp's Commerce Policy and get in touch within 24 hours if there's an issue.
                                  </p>
                                  <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/40 rounded border border-green-300 dark:border-green-700">
                                    <p className="text-xs text-green-800 dark:text-green-200 font-bold">
                                      ✓ Click "Finish" button
                                    </p>
                                    <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                                      You do NOT need to click "Add payment method" - just click "Finish".
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => setPreviewScreenshot({ src: setupScreenshots.step7, alt: 'Step 7: Your account is connected! Click "Finish" (skip Add payment method)' })}
                                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 bg-green-50 dark:bg-green-900/30 px-3 py-1.5 rounded-lg border border-green-300 dark:border-green-600 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    View Screenshot - Success Screen
                                  </button>
                                </div>
                              </div>

                              {/* Step 8 - Redirect Back */}
                              <div className="flex items-start gap-3 bg-blue-100/80 dark:bg-blue-900/30 p-3 rounded-lg border border-blue-300 dark:border-blue-700">
                                <span className="flex items-center justify-center w-7 h-7 bg-blue-600 text-white text-sm font-bold rounded-full flex-shrink-0">8</span>
                                <div className="flex-1">
                                  <p className="font-medium text-blue-800 dark:text-blue-200">Automatic Redirect</p>
                                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                    After clicking "Finish", you'll be redirected back to our website.
                                  </p>
                                  <ul className="text-xs text-blue-600 dark:text-blue-400 mt-2 ml-4 space-y-1">
                                    <li>• You'll see "Connecting..." for a few seconds</li>
                                    <li>• Then your WhatsApp Business connection details will appear</li>
                                    <li>• Including: Phone number, Phone number ID, WABA ID, Business info</li>
                                    <li>• Business verification status and account status</li>
                                  </ul>
                                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-2 font-medium">
                                    You can then manage your business profile, product catalog, share WhatsApp link/QR code, and more!
                                  </p>
                                </div>
                              </div>

                              {/* Step 9 - Sync Products - CRITICAL! */}
                              <div className="flex items-start gap-3 bg-gradient-to-r from-purple-100 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/30 p-4 rounded-lg border-2 border-purple-400 dark:border-purple-600 shadow-md">
                                <span className="flex items-center justify-center w-7 h-7 bg-purple-600 text-white text-sm font-bold rounded-full flex-shrink-0">9</span>
                                <div className="flex-1">
                                  <p className="font-bold text-purple-900 dark:text-purple-100 flex items-center gap-2 text-base">
                                    <Package className="h-5 w-5" />
                                    Sync Your Products to Catalog (CRITICAL!)
                                  </p>
                                  <div className="mt-2 p-3 bg-purple-200 dark:bg-purple-900/50 rounded-lg border border-purple-400 dark:border-purple-700">
                                    <p className="text-sm text-purple-900 dark:text-purple-100 font-bold">
                                      ⚠️ This is the MOST IMPORTANT step - don't skip it!
                                    </p>
                                    <p className="text-xs text-purple-800 dark:text-purple-200 mt-1">
                                      Without syncing, customers won't see your products on WhatsApp!
                                    </p>
                                  </div>
                                  <p className="text-sm text-purple-800 dark:text-purple-200 mt-3 font-medium">
                                    After you're redirected back to our website:
                                  </p>
                                  <ol className="text-sm text-purple-700 dark:text-purple-300 mt-2 ml-4 space-y-2">
                                    <li className="flex items-start gap-2">
                                      <span className="font-bold">1.</span>
                                      <span>Scroll down to the <strong>"Product Catalog"</strong> section</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                      <span className="font-bold">2.</span>
                                      <span>Select a <strong>Commerce</strong> catalog (one with "Commerce - OK" label)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                      <span className="font-bold">3.</span>
                                      <span>Click the <strong className="text-purple-900 dark:text-purple-100 bg-purple-300 dark:bg-purple-800 px-2 py-0.5 rounded">"Sync Products to Catalog"</strong> button at the bottom</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                      <span className="font-bold">4.</span>
                                      <span>Wait for confirmation - all your Shipting products will be synced to Meta catalog</span>
                                    </li>
                                  </ol>
                                  <div className="mt-3 p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded border border-emerald-300 dark:border-emerald-700">
                                    <p className="text-xs text-emerald-800 dark:text-emerald-200">
                                      <strong>✓ Result:</strong> Your products will appear in WhatsApp catalog, customers can browse and order them directly in chat!
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => setPreviewScreenshot({ src: setupScreenshots.step9, alt: 'Step 9: Product Catalog section - Select Commerce catalog & click "Sync Products to Catalog"' })}
                                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 bg-purple-50 dark:bg-purple-900/30 px-3 py-1.5 rounded-lg border border-purple-300 dark:border-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    View Screenshot - Catalog & Sync Button
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* After Setup Notice */}
                            <div className="p-4 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 rounded-lg border border-green-300 dark:border-green-700">
                              <div className="flex items-start gap-3">
                                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-semibold text-green-800 dark:text-green-200 mb-1">
                                    🎉 What Happens After Setup
                                  </p>
                                  <p className="text-sm text-green-700 dark:text-green-300">
                                    Once connected, customers can message your WhatsApp number to:
                                  </p>
                                  <ul className="text-sm text-green-600 dark:text-green-400 mt-2 space-y-1">
                                    <li className="flex items-center gap-2">
                                      <CheckCircle className="h-3 w-3 flex-shrink-0" />
                                      Browse your products directly in WhatsApp
                                    </li>
                                    <li className="flex items-center gap-2">
                                      <CheckCircle className="h-3 w-3 flex-shrink-0" />
                                      Place orders through automated chat
                                    </li>
                                    <li className="flex items-center gap-2">
                                      <CheckCircle className="h-3 w-3 flex-shrink-0" />
                                      Track their deliveries in real-time
                                    </li>
                                    <li className="flex items-center gap-2">
                                      <CheckCircle className="h-3 w-3 flex-shrink-0" />
                                      Get instant support from your bot
                                    </li>
                                  </ul>
                                  <p className="text-xs text-green-700 dark:text-green-300 mt-2 font-medium italic">
                                    All automated - your WhatsApp Bot handles everything! 🤖✨
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Need Help? */}
                            <div className="p-3 bg-gray-100 dark:bg-gray-800/50 rounded-lg border border-gray-300 dark:border-gray-700">
                              <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                <span><strong>Need help?</strong> If you encounter any issues during setup, don't hesitate to contact our support team.</span>
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Embedded Signup Button */}
                      <div className="space-y-4">
                        <div className="p-6 border-2 border-dashed border-gray-300 rounded-xl text-center dark:border-gray-600">
                          <Facebook className="h-12 w-12 mx-auto text-blue-600 mb-4" />
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text mb-2">
                            Connect with Facebook
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-dark-muted mb-4">
                            Sign in with Facebook to connect your WhatsApp Business account.
                            You can create a new account or use an existing one.
                          </p>
                          <Button
                            onClick={launchEmbeddedSignup}
                            disabled={!fbSDKLoaded || connectionData.status === 'connecting'}
                            isLoading={connectionData.status === 'connecting'}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Facebook className="h-4 w-4" />
                            {connectionData.status === 'connecting' ? 'Connecting...' : 'Login with Facebook'}
                          </Button>
                          {!fbSDKLoaded && (
                            <p className="text-xs text-amber-600 mt-2">Loading Facebook SDK...</p>
                          )}
                        </div>

                        {/* Phone Number Options */}
                        <div className="space-y-4">
                          {/* Benefits of Using Own Number */}
                          <div className="p-5 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                            <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
                              <CheckCircle className="h-5 w-5" />
                              Recommended: Use Your Own Business Number
                            </h4>
                            <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                              For the best experience, we recommend using your own business phone number. Benefits include:
                            </p>
                            <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1.5 ml-2">
                              <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 flex-shrink-0" /> Customers will recognize your business number</li>
                              <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 flex-shrink-0" /> Full control over your WhatsApp identity</li>
                              <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 flex-shrink-0" /> Can transfer number to any platform later</li>
                              <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 flex-shrink-0" /> No monthly fees for the number</li>
                            </ul>
                            <div className="mt-3 p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                              <p className="text-xs text-blue-800 dark:text-blue-200">
                                <strong>Tip:</strong> Any US mobile or landline number works! Click "Login with Facebook" above and enter your own number during setup.
                              </p>
                            </div>
                          </div>

                          {/* Divider */}
                          <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                              <span className="px-4 bg-white dark:bg-dark-card text-gray-500">
                                Don't have a business phone number?
                              </span>
                            </div>
                          </div>

                          {/* Twilio Option - Last Resort */}
                          <div className="p-5 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                            <div className="flex items-start gap-4">
                              <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
                                <Phone className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-1">
                                  Need a Phone Number?
                                </h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                                  If you don't have a phone number available, we can provide a US number for you.
                                </p>

                                {/* If user already has a Twilio number */}
                                {twilioState.hasNumber ? (
                                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                    <div className="flex items-center justify-between flex-wrap gap-3">
                                      <div>
                                        <p className="text-xs text-gray-500 uppercase tracking-wider">Your Assigned Number</p>
                                        <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                                          {twilioState.number}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                          Use this when clicking "Login with Facebook" above
                                        </p>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            loadTwilioInbox()
                                            setShowTwilioInbox(true)
                                          }}
                                        >
                                          <Inbox className="h-4 w-4" />
                                          SMS Inbox
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                          onClick={handleReleaseTwilioNumber}
                                          disabled={twilioState.loading}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                          Release
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    {!showTwilioSection ? (
                                      <Button
                                        onClick={() => setShowTwilioSection(true)}
                                        variant="outline"
                                        className="border-violet-300 text-violet-600 hover:bg-violet-50"
                                      >
                                        <ShoppingBag className="h-4 w-4" />
                                        Get a Phone Number ($1.15/mo)
                                      </Button>
                                    ) : (
                                      <div className="space-y-3 mt-2 p-3 bg-white dark:bg-dark-card rounded-lg border border-gray-200 dark:border-gray-600">
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                          Search for available US phone numbers:
                                        </p>
                                        <div className="flex flex-wrap gap-2 items-end">
                                          <div>
                                            <label className="text-xs text-gray-500 mb-1 block">Area Code</label>
                                            <Input
                                              placeholder="e.g., 415"
                                              value={twilioAreaCode}
                                              onChange={(e) => setTwilioAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                                              className="w-24"
                                            />
                                          </div>
                                          <div>
                                            <label className="text-xs text-gray-500 mb-1 block">Contains</label>
                                            <Input
                                              placeholder="e.g., 2024"
                                              value={twilioContains}
                                              onChange={(e) => setTwilioContains(e.target.value.slice(0, 10))}
                                              className="w-28"
                                            />
                                          </div>
                                          <Button
                                            onClick={handleSearchTwilioNumbers}
                                            disabled={twilioSearching}
                                            isLoading={twilioSearching}
                                            size="sm"
                                            className="bg-emerald-600 hover:bg-emerald-700"
                                          >
                                            <Search className="h-4 w-4" />
                                            Search
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                              setShowTwilioSection(false)
                                              setTwilioAvailableNumbers([])
                                              setTwilioAreaCode('')
                                              setTwilioContains('')
                                            }}
                                          >
                                            Cancel
                                          </Button>
                                        </div>

                                        {/* Available Numbers */}
                                        {twilioAvailableNumbers.length > 0 && (
                                          <div className="space-y-2 max-h-48 overflow-y-auto mt-2">
                                            {twilioAvailableNumbers.map((num, index) => (
                                              <div
                                                key={index}
                                                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                                              >
                                                <div>
                                                  <p className="font-mono font-semibold text-sm text-gray-900 dark:text-white">
                                                    {num.phone_number || num.phoneNumber}
                                                  </p>
                                                  <p className="text-xs text-gray-500">
                                                    {num.locality || num.region || 'USA'}
                                                  </p>
                                                </div>
                                                <Button
                                                  size="sm"
                                                  onClick={() => handleBuyTwilioNumber(num.phone_number || num.phoneNumber)}
                                                  disabled={twilioBuying}
                                                >
                                                  {twilioBuying ? '...' : 'Get'}
                                                </Button>
                                              </div>
                                            ))}
                                          </div>
                                        )}

                                        {twilioSearching && (
                                          <div className="flex items-center justify-center py-4">
                                            <Spinner />
                                            <span className="ml-2 text-sm text-gray-500">Searching...</span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </>
                                )}

                                <p className="text-xs text-gray-400 mt-3">
                                  <DollarSign className="h-3 w-3 inline" /> Cost: ~$1.15/month. Currently absorbed by platform.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="text-center">
                          <p className="text-xs text-gray-400">
                            By connecting, you agree to the{' '}
                            <a href="https://www.whatsapp.com/legal/business-terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              Meta Terms for WhatsApp Business
                            </a>
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Connected State */}
                      <div className="p-4 bg-green-50 rounded-lg dark:bg-green-900/20">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-green-700 dark:text-green-300 flex items-center gap-2">
                              <CheckCircle className="h-5 w-5" />
                              Connected to WhatsApp Business
                            </p>
                            {connectionData.businessName && (
                              <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                                Business: {connectionData.businessName}
                              </p>
                            )}
                            {connectionData.phoneNumber && (
                              <p className="text-sm text-green-600 dark:text-green-400">
                                Phone: {connectionData.phoneNumber}
                              </p>
                            )}
                          </div>
                          <MessageSquare className="h-10 w-10 text-green-500" />
                        </div>
                      </div>

                      {/* Test Phone Number Warning */}
                      {isTestPhoneNumber(connectionData.phoneNumber) && (
                        <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg dark:bg-red-900/20 dark:border-red-700">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
                            <div>
                              <h4 className="font-semibold text-red-700 dark:text-red-300">
                                ⚠️ Test Phone Number Detected!
                              </h4>
                              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                                You are using a <strong>Meta Test Phone Number</strong> ({connectionData.phoneNumber}).
                                This number is for <strong>testing only</strong> and:
                              </p>
                              <ul className="text-sm text-red-600 dark:text-red-400 mt-2 list-disc list-inside space-y-1">
                                <li>Cannot receive real WhatsApp messages from customers</li>
                                <li>Cannot be verified (OTP won't work)</li>
                                <li>Should NOT be used in production</li>
                              </ul>
                              <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/40 rounded-lg">
                                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                                  How to fix this:
                                </p>
                                <ol className="text-sm text-red-700 dark:text-red-300 mt-1 list-decimal list-inside space-y-1">
                                  <li>Click "Disconnect" above to disconnect the test number</li>
                                  <li>Click "Login with Facebook" again to restart setup</li>
                                  <li>When prompted, select <strong>"Add your own phone number"</strong></li>
                                  <li>Enter your REAL business phone number</li>
                                </ol>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-3 border-red-300 text-red-700 hover:bg-red-100 dark:border-red-600 dark:text-red-300"
                                onClick={() => window.open('https://business.facebook.com/wa/manage/phone-numbers/', '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                                Manage Phone Numbers in Meta
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Connection Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 rounded-lg dark:bg-dark-bg">
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Phone Number ID</p>
                          <p className="font-mono text-sm text-gray-900 dark:text-dark-text">
                            {connectionData.phoneNumberId || 'N/A'}
                          </p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg dark:bg-dark-bg">
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">WABA ID</p>
                          <p className="font-mono text-sm text-gray-900 dark:text-dark-text">
                            {connectionData.wabaId || 'N/A'}
                          </p>
                        </div>
                        {connectionData.connectedAt && (
                          <div className="p-4 bg-gray-50 rounded-lg dark:bg-dark-bg">
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Connected Since</p>
                            <p className="text-sm text-gray-900 dark:text-dark-text">
                              {new Date(connectionData.connectedAt).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Business Verification Section */}
                      <div className="p-4 border rounded-lg dark:border-dark-border">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-gray-500" />
                            <span className="font-medium text-gray-900 dark:text-dark-text">
                              Meta Business Verification
                            </span>
                            {getBusinessVerificationBadge()}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(getMetaVerificationUrl(), '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                            Check in Meta
                          </Button>
                        </div>

                        {/* Verification Status Info */}
                        <div className={`p-3 rounded-lg mb-4 ${
                          businessVerification.status?.toLowerCase() === 'verified'
                            ? 'bg-green-50 dark:bg-green-900/20'
                            : businessVerification.status?.toLowerCase() === 'pending'
                              ? 'bg-amber-50 dark:bg-amber-900/20'
                              : 'bg-blue-50 dark:bg-blue-900/20'
                        }`}>
                          {businessVerification.status?.toLowerCase() === 'verified' ? (
                            <p className="text-sm text-green-700 dark:text-green-300">
                              Your business is verified with Meta. You have access to all WhatsApp Business API features.
                            </p>
                          ) : businessVerification.status?.toLowerCase() === 'pending' ? (
                            <p className="text-sm text-amber-700 dark:text-amber-300">
                              Your verification is being reviewed by Meta. This typically takes 1-2 business days but may take up to 2 weeks.
                            </p>
                          ) : (
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                              Business verification unlocks higher messaging limits and builds trust with customers. Click "Check in Meta" to view your verification status and complete the steps below.
                            </p>
                          )}
                        </div>

                        {/* Verification Checklist - Dynamic based on phoneStatus (auto-loaded on page mount) */}
                        {businessVerification.status?.toLowerCase() !== 'verified' && (
                          <div className="space-y-3 mb-4">
                            <p className="text-sm font-medium text-gray-700 dark:text-dark-text">
                              Verification Checklist:
                            </p>
                            <div className="space-y-2">
                              {/* Step 1: Complete business profile - Check if verified_name exists */}
                              <div className={`flex items-start gap-3 p-2 rounded ${
                                phoneStatus?.verified_name
                                  ? 'bg-green-50 dark:bg-green-900/20'
                                  : 'bg-gray-50 dark:bg-dark-bg'
                              }`}>
                                <div className="mt-0.5">
                                  {phoneStatus?.verified_name ? (
                                    <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
                                      <CheckCircle className="h-3 w-3 text-white" />
                                    </div>
                                  ) : (
                                    <div className="h-5 w-5 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center text-xs text-gray-400">
                                      1
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className={`text-sm font-medium ${
                                    phoneStatus?.verified_name
                                      ? 'text-green-700 dark:text-green-300'
                                      : 'text-gray-900 dark:text-dark-text'
                                  }`}>
                                    Complete your business profile
                                    {phoneStatus?.verified_name && (
                                      <span className="ml-2 text-xs font-normal">({phoneStatus.verified_name})</span>
                                    )}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Add your legal business name, address, and contact information
                                  </p>
                                </div>
                              </div>

                              {/* Step 2: Prepare documents - Manual step, can't verify automatically */}
                              <div className="flex items-start gap-3 p-2 bg-gray-50 rounded dark:bg-dark-bg">
                                <div className="mt-0.5">
                                  <div className="h-5 w-5 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center text-xs text-gray-400">
                                    2
                                  </div>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-dark-text">
                                    Prepare verification documents
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Business registration certificate, tax documents, or utility bill showing business name and address
                                  </p>
                                </div>
                              </div>

                              {/* Step 3: Submit verification - Check if registration_status is CONNECTED */}
                              <div className={`flex items-start gap-3 p-2 rounded ${
                                phoneStatus?.registration_status === 'CONNECTED'
                                  ? 'bg-green-50 dark:bg-green-900/20'
                                  : 'bg-gray-50 dark:bg-dark-bg'
                              }`}>
                                <div className="mt-0.5">
                                  {phoneStatus?.registration_status === 'CONNECTED' ? (
                                    <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
                                      <CheckCircle className="h-3 w-3 text-white" />
                                    </div>
                                  ) : (
                                    <div className="h-5 w-5 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center text-xs text-gray-400">
                                      3
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className={`text-sm font-medium ${
                                    phoneStatus?.registration_status === 'CONNECTED'
                                      ? 'text-green-700 dark:text-green-300'
                                      : 'text-gray-900 dark:text-dark-text'
                                  }`}>
                                    Phone number registered
                                    {phoneStatus?.registration_status && (
                                      <span className="ml-2 text-xs font-normal">({phoneStatus.registration_status})</span>
                                    )}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    WhatsApp Business phone number is registered and active
                                  </p>
                                </div>
                              </div>

                              {/* Step 4: Meta review - Check name_status */}
                              <div className={`flex items-start gap-3 p-2 rounded ${
                                phoneStatus?.name_status === 'APPROVED' || phoneStatus?.name_status === 'AVAILABLE_WITHOUT_REVIEW'
                                  ? 'bg-green-50 dark:bg-green-900/20'
                                  : phoneStatus?.name_status === 'PENDING_REVIEW'
                                    ? 'bg-amber-50 dark:bg-amber-900/20'
                                    : 'bg-gray-50 dark:bg-dark-bg'
                              }`}>
                                <div className="mt-0.5">
                                  {phoneStatus?.name_status === 'APPROVED' || phoneStatus?.name_status === 'AVAILABLE_WITHOUT_REVIEW' ? (
                                    <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
                                      <CheckCircle className="h-3 w-3 text-white" />
                                    </div>
                                  ) : phoneStatus?.name_status === 'PENDING_REVIEW' ? (
                                    <div className="h-5 w-5 rounded-full bg-amber-500 flex items-center justify-center">
                                      <Clock className="h-3 w-3 text-white" />
                                    </div>
                                  ) : (
                                    <div className="h-5 w-5 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center text-xs text-gray-400">
                                      4
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className={`text-sm font-medium ${
                                    phoneStatus?.name_status === 'APPROVED' || phoneStatus?.name_status === 'AVAILABLE_WITHOUT_REVIEW'
                                      ? 'text-green-700 dark:text-green-300'
                                      : phoneStatus?.name_status === 'PENDING_REVIEW'
                                        ? 'text-amber-700 dark:text-amber-300'
                                        : 'text-gray-900 dark:text-dark-text'
                                  }`}>
                                    Display name review
                                    {phoneStatus?.name_status && (
                                      <span className="ml-2 text-xs font-normal">({phoneStatus.name_status.replace(/_/g, ' ')})</span>
                                    )}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {phoneStatus?.name_status === 'PENDING_REVIEW'
                                      ? 'Your display name is under review by Meta'
                                      : 'Meta reviews your business display name for compliance'
                                    }
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Verification Benefits */}
                        <div className="p-3 bg-gray-50 rounded-lg dark:bg-dark-bg mb-4">
                          <p className="text-xs font-medium text-gray-700 dark:text-dark-text uppercase tracking-wider mb-2">
                            Verification Benefits
                          </p>
                          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                            <li className="flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              Higher messaging limits (1,000+ messages/day)
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              Official business checkmark badge
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              Access to advanced API features
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              Increased customer trust
                            </li>
                          </ul>
                        </div>

                        {/* Action Button - Deep link to Meta Business Manager */}
                        <Button
                          variant="outline"
                          onClick={() => window.open(getMetaVerificationUrl(), '_blank')}
                          className="w-full"
                        >
                          <ExternalLink className="h-4 w-4" />
                          {businessVerification.status?.toLowerCase() === 'verified'
                            ? 'View Verification in Meta Business Manager'
                            : 'Start Verification in Meta Business Manager'
                          }
                        </Button>

                        {/* Help Note */}
                        <p className="text-xs text-gray-400 mt-2 text-center">
                          Note: Business verification must be completed manually in Meta Business Manager.
                          This cannot be automated via API.
                        </p>
                      </div>

                      {/* Phone Number Status Section */}
                      <div className="p-4 border rounded-lg dark:border-dark-border">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Phone className="h-5 w-5 text-gray-500" />
                            <span className="font-medium text-gray-900 dark:text-dark-text">
                              Phone Number Status
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={loadPhoneStatus}
                            isLoading={loadingPhoneStatus}
                          >
                            <RefreshCw className="h-4 w-4" />
                            Check Status
                          </Button>
                        </div>

                        {phoneStatus ? (
                          <div className="space-y-3">
                            {/* Status Overview */}
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg dark:bg-dark-bg">
                              <div>
                                <p className="text-lg font-semibold text-gray-900 dark:text-dark-text">
                                  {phoneStatus.phone_number || connectionData.phoneNumber}
                                </p>
                                {phoneStatus.verified_name && (
                                  <p className="text-sm text-gray-500">{phoneStatus.verified_name}</p>
                                )}
                              </div>
                              {getPhoneStatusBadge()}
                            </div>

                            {/* Status Description */}
                            {phoneStatus.status_description && (
                              <div className={`p-3 rounded-lg ${
                                phoneStatus.overall_status === 'CONNECTED'
                                  ? 'bg-green-50 dark:bg-green-900/20'
                                  : 'bg-amber-50 dark:bg-amber-900/20'
                              }`}>
                                <p className={`text-sm ${
                                  phoneStatus.overall_status === 'CONNECTED'
                                    ? 'text-green-700 dark:text-green-300'
                                    : 'text-amber-700 dark:text-amber-300'
                                }`}>
                                  {phoneStatus.status_description}
                                </p>
                              </div>
                            )}

                            {/* Detailed Status */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              <div className={`p-2 rounded ${
                                phoneStatus.registration_status === 'CONNECTED'
                                  ? 'bg-green-50 dark:bg-green-900/20'
                                  : phoneStatus.registration_status === 'PENDING'
                                    ? 'bg-amber-50 dark:bg-amber-900/20'
                                    : 'bg-gray-50 dark:bg-dark-bg'
                              }`}>
                                <p className="text-xs text-gray-500 uppercase">Registration</p>
                                <p className={`text-sm font-medium ${
                                  phoneStatus.registration_status === 'CONNECTED'
                                    ? 'text-green-700 dark:text-green-300'
                                    : phoneStatus.registration_status === 'PENDING'
                                      ? 'text-amber-700 dark:text-amber-300'
                                      : 'text-gray-900 dark:text-dark-text'
                                }`}>
                                  {phoneStatus.registration_status || 'Unknown'}
                                </p>
                              </div>
                              <div className="p-2 bg-gray-50 rounded dark:bg-dark-bg">
                                <p className="text-xs text-gray-500 uppercase">API Verification</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-dark-text">
                                  {phoneStatus.code_verification_status || 'Unknown'}
                                </p>
                              </div>
                              <div className="p-2 bg-gray-50 rounded dark:bg-dark-bg">
                                <p className="text-xs text-gray-500 uppercase">Name Status</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-dark-text">
                                  {phoneStatus.name_status || 'Unknown'}
                                </p>
                              </div>
                              <div className="p-2 bg-gray-50 rounded dark:bg-dark-bg">
                                <p className="text-xs text-gray-500 uppercase">Mode</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-dark-text">
                                  {phoneStatus.account_mode || 'Unknown'}
                                </p>
                              </div>
                              {phoneStatus.quality_rating && (
                                <div className="p-2 bg-gray-50 rounded dark:bg-dark-bg">
                                  <p className="text-xs text-gray-500 uppercase">Quality</p>
                                  <p className="text-sm font-medium text-gray-900 dark:text-dark-text">
                                    {phoneStatus.quality_rating}
                                  </p>
                                </div>
                              )}
                              {phoneStatus.messaging_limit_tier && (
                                <div className="p-2 bg-gray-50 rounded dark:bg-dark-bg">
                                  <p className="text-xs text-gray-500 uppercase">Messaging Tier</p>
                                  <p className="text-sm font-medium text-gray-900 dark:text-dark-text">
                                    {phoneStatus.messaging_limit_tier}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <Phone className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                            <p className="text-sm text-gray-500">
                              Click "Check Status" to view your phone number status from Meta
                            </p>
                          </div>
                        )}

                        {/* Phone Registration Actions - Show when status is pending */}
                        {phoneStatus && (
                          phoneStatus.registration_status === 'PENDING' ||
                          phoneStatus.overall_status === 'PENDING_REGISTRATION' ||
                          phoneStatus.overall_status === 'PENDING' ||
                          phoneStatus.registration_status === 'PENDING_REGISTRATION'
                        ) && (
                          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                            <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-2">
                              <AlertCircle className="h-4 w-4" />
                              Complete Registration
                            </h4>
                            <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
                              Your phone number is pending registration. You can try to verify it manually or wait for Meta to complete the process.
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <select
                                  value={otpMethod}
                                  onChange={(e) => setOtpMethod(e.target.value)}
                                  className="px-3 py-2 text-sm border rounded-lg bg-white dark:bg-dark-card dark:border-dark-border dark:text-dark-text"
                                >
                                  <option value="SMS">SMS</option>
                                  <option value="VOICE">Voice Call</option>
                                </select>
                                <Button
                                  size="sm"
                                  onClick={handleRequestOtp}
                                  isLoading={requestingOtp}
                                >
                                  <KeyRound className="h-4 w-4" />
                                  Request Code
                                </Button>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleRegisterPhone}
                                isLoading={registeringPhone}
                              >
                                <Smartphone className="h-4 w-4" />
                                Try Register
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Business Profile Section */}
                      <div className="p-4 border rounded-lg dark:border-dark-border">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-gray-500" />
                            <span className="font-medium text-gray-900 dark:text-dark-text">
                              Business Profile
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setDisplayNameForm(phoneStatus?.verified_name || '')
                                setShowDisplayNameModal(true)
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                              Display Name
                            </Button>
                            <Button
                              size="sm"
                              onClick={openProfileModal}
                            >
                              <Settings className="h-4 w-4" />
                              Edit Profile
                            </Button>
                          </div>
                        </div>

                        <div className="text-sm text-gray-500 dark:text-dark-muted">
                          <p>Update your WhatsApp Business profile including description, category, email, address, and websites.</p>
                          {phoneStatus?.verified_name && (
                            <p className="mt-2">
                              <span className="font-medium text-gray-700 dark:text-dark-text">Display Name:</span>{' '}
                              {phoneStatus.verified_name}
                              {phoneStatus.name_status === 'PENDING' && (
                                <Badge variant="warning" className="ml-2">Pending Review</Badge>
                              )}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Catalog Management Section */}
                      <div className="p-4 border rounded-lg dark:border-dark-border">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Store className="h-5 w-5 text-gray-500" />
                            <span className="font-medium text-gray-900 dark:text-dark-text">
                              Product Catalog
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={loadCatalogs}
                            isLoading={loadingCatalogs}
                          >
                            <RefreshCw className="h-4 w-4" />
                            Load Catalogs
                          </Button>
                        </div>

                        {/* Current Catalog */}
                        <div className="p-3 bg-gray-50 rounded-lg dark:bg-dark-bg mb-4">
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Current Catalog</p>
                          <p className="font-mono text-sm text-gray-900 dark:text-dark-text">
                            {connectionData.catalogId || 'Not configured'}
                          </p>
                        </div>

                        {/* Available Catalogs */}
                        {catalogs.length > 0 && (
                          <div className="space-y-2 mb-4">
                            <p className="text-sm font-medium text-gray-700 dark:text-dark-text">Available Catalogs:</p>
                            {catalogs.map((catalog) => (
                              <div
                                key={catalog.id}
                                className={`p-3 border rounded-lg flex items-center justify-between ${
                                  catalog.is_current
                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                    : 'border-gray-200 dark:border-dark-border'
                                }`}
                              >
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-dark-text">
                                    {catalog.name}
                                    {catalog.is_current && (
                                      <Badge variant="success" className="ml-2">Current</Badge>
                                    )}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    ID: {catalog.id} | Type: {catalog.vertical}
                                    {catalog.is_commerce && (
                                      <span className="text-green-600 ml-1">(Commerce - OK)</span>
                                    )}
                                    {!catalog.is_commerce && (
                                      <span className="text-amber-600 ml-1">(Not Commerce - Products won't sync!)</span>
                                    )}
                                  </p>
                                </div>
                                {!catalog.is_current && (
                                  <Button
                                    size="sm"
                                    variant={catalog.is_commerce ? 'primary' : 'outline'}
                                    onClick={() => handleSelectCatalog(catalog.id)}
                                    isLoading={saving}
                                  >
                                    Select
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Help text */}
                        <p className="text-xs text-gray-500 mt-2">
                          Click "Load Catalogs" to see available catalogs. Select a <strong>Commerce</strong> catalog for products to sync correctly.
                        </p>

                        {/* Create New Commerce Catalog Button */}
                        <Button
                          variant="outline"
                          onClick={handleCreateCatalog}
                          isLoading={saving}
                          className="w-full mt-4"
                        >
                          <Store className="h-4 w-4" />
                          Create New Commerce Catalog
                        </Button>
                      </div>

                      {/* Permission Diagnostics Section */}
                      <div className="p-4 border rounded-lg dark:border-dark-border bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            <span className="font-medium text-gray-900 dark:text-dark-text">
                              Permission Diagnostics
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCheckPermissions}
                            isLoading={loadingDiagnostics}
                            className="bg-blue-600 text-white hover:bg-blue-700"
                          >
                            <RefreshCw className="h-4 w-4" />
                            Check Permissions
                          </Button>
                        </div>

                        <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                          Having issues connecting your catalog? Click "Check Permissions" to diagnose permission and access problems.
                        </p>

                        {/* Diagnostics Results */}
                        {showDiagnostics && permissionDiagnostics && (
                          <div className="space-y-3 mt-4">
                            {/* Overall Health Status */}
                            <div className={`p-3 rounded-lg ${
                              permissionDiagnostics.overall_health
                                ? 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700'
                                : 'bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700'
                            }`}>
                              <div className="flex items-center gap-2">
                                {permissionDiagnostics.overall_health ? (
                                  <>
                                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                    <span className="font-medium text-green-800 dark:text-green-200">
                                      All Systems Operational
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                                    <span className="font-medium text-red-800 dark:text-red-200">
                                      Issues Detected
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Permission Checks */}
                            <div className="space-y-2">
                              {/* Token Valid */}
                              <div className="flex items-start gap-2 p-2 bg-white/50 dark:bg-gray-800/50 rounded">
                                {permissionDiagnostics.token_valid ? (
                                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                                ) : (
                                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                )}
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900 dark:text-dark-text">
                                    Access Token Valid
                                  </p>
                                  {permissionDiagnostics.expires_at && (
                                    <p className="text-xs text-gray-500">
                                      Expires: {new Date(permissionDiagnostics.expires_at * 1000).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* All Permissions */}
                              <div className="flex items-start gap-2 p-2 bg-white/50 dark:bg-gray-800/50 rounded">
                                {permissionDiagnostics.has_all_permissions ? (
                                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                                ) : (
                                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                )}
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900 dark:text-dark-text">
                                    Required Permissions
                                  </p>
                                  {permissionDiagnostics.missing_permissions.length > 0 && (
                                    <p className="text-xs text-red-600 dark:text-red-400">
                                      Missing: {permissionDiagnostics.missing_permissions.join(', ')}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Catalog Access */}
                              <div className="flex items-start gap-2 p-2 bg-white/50 dark:bg-gray-800/50 rounded">
                                {permissionDiagnostics.catalog_accessible ? (
                                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                                ) : (
                                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                )}
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900 dark:text-dark-text">
                                    Catalog Accessible
                                  </p>
                                  {permissionDiagnostics.catalog_info && (
                                    <p className="text-xs text-gray-500">
                                      {permissionDiagnostics.catalog_info.name} ({permissionDiagnostics.catalog_info.product_count} products)
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* WABA-Catalog Connection */}
                              <div className="flex items-start gap-2 p-2 bg-white/50 dark:bg-gray-800/50 rounded">
                                {permissionDiagnostics.waba_catalog_connected ? (
                                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                                ) : (
                                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                )}
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900 dark:text-dark-text">
                                    WABA-Catalog Connection
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {permissionDiagnostics.waba_catalog_connected ? 'Connected in Meta' : 'Not connected in Meta'}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Errors */}
                            {permissionDiagnostics.errors && permissionDiagnostics.errors.length > 0 && (
                              <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-700">
                                <p className="font-medium text-red-800 dark:text-red-200 text-sm mb-2">
                                  Issues Found:
                                </p>
                                <ul className="space-y-1">
                                  {permissionDiagnostics.errors.map((error, index) => (
                                    <li key={index} className="text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                                      <span className="text-red-500 font-bold mt-0.5">•</span>
                                      <span>{error}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Recommendations */}
                            {permissionDiagnostics.recommendations && permissionDiagnostics.recommendations.length > 0 && (
                              <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg border border-amber-200 dark:border-amber-700">
                                <p className="font-medium text-amber-800 dark:text-amber-200 text-sm mb-2 flex items-center gap-2">
                                  <Lightbulb className="h-4 w-4" />
                                  How to Fix:
                                </p>
                                <ul className="space-y-1">
                                  {permissionDiagnostics.recommendations.map((rec, index) => (
                                    <li key={index} className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                                      <span className="text-amber-500 font-bold mt-0.5">→</span>
                                      <span>{rec}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Share WhatsApp Link & QR Code Section */}
                      {connectionData.phoneNumber && (
                        <div className="p-4 border rounded-lg dark:border-dark-border">
                          <div className="flex items-center gap-2 mb-4">
                            <Share2 className="h-5 w-5 text-gray-500" />
                            <span className="font-medium text-gray-900 dark:text-dark-text">
                              Share Your WhatsApp
                            </span>
                          </div>

                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Share this link or QR code with your customers so they can easily reach you on WhatsApp and browse your catalog.
                          </p>

                          {/* WhatsApp Link */}
                          <div className="p-3 bg-gray-50 rounded-lg dark:bg-dark-bg mb-4">
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">WhatsApp Link</p>
                            <div className="flex items-center gap-2">
                              <p className="font-mono text-sm text-gray-900 dark:text-dark-text truncate flex-1">
                                {getWhatsAppLink()}
                              </p>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={copyLinkToClipboard}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              onClick={() => setShowQRModal(true)}
                              className="flex-1"
                            >
                              <QrCode className="h-4 w-4" />
                              Show QR Code
                            </Button>
                            <Button
                              variant="outline"
                              onClick={shareLink}
                              className="flex-1"
                            >
                              <Share2 className="h-4 w-4" />
                              Share Link
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => window.open(getWhatsAppChatLink(), '_blank')}
                              className="flex-1"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Open WhatsApp
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-3">
                        {!connectionData.catalogId ? (
                          <>
                            <Button
                              onClick={handleCreateCatalog}
                              isLoading={saving}
                              className="bg-green-500 hover:bg-green-600"
                            >
                              <Store className="h-4 w-4" />
                              Setup Catalog
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => window.open('https://business.facebook.com/commerce/catalogs', '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                              Create in Meta
                            </Button>
                          </>
                        ) : (
                          <div className="relative">
                            <Button
                              onClick={handleSyncCatalog}
                              isLoading={saving}
                              className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 border-2 border-purple-400 relative"
                            >
                              <Package className="h-4 w-4" />
                              Sync Products to Catalog
                              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                                REQUIRED
                              </span>
                            </Button>
                            <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-1">
                              ⚠️ Critical: Click this to sync your products to WhatsApp!
                            </p>
                          </div>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => window.open('https://business.facebook.com/wa/manage/home/', '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                          WhatsApp Manager
                        </Button>
                        <Button
                          variant="danger"
                          onClick={handleDisconnect}
                          isLoading={saving}
                        >
                          <Unlink className="h-4 w-4" />
                          Disconnect
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* How it Works */}
              {!connectionData.isConnected && (
                <Card>
                  <CardHeader>
                    <CardTitle>How WhatsApp Bot Works</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <span className="text-xl font-bold text-blue-600">1</span>
                        </div>
                        <h4 className="font-medium text-gray-900 dark:text-dark-text mb-2">Connect Account</h4>
                        <p className="text-sm text-gray-500 dark:text-dark-muted">
                          Connect your WhatsApp Business account using Facebook Login
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <span className="text-xl font-bold text-green-600">2</span>
                        </div>
                        <h4 className="font-medium text-gray-900 dark:text-dark-text mb-2">Sync Products</h4>
                        <p className="text-sm text-gray-500 dark:text-dark-muted">
                          Your products are automatically synced to WhatsApp Catalog
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <span className="text-xl font-bold text-purple-600">3</span>
                        </div>
                        <h4 className="font-medium text-gray-900 dark:text-dark-text mb-2">Start Selling</h4>
                        <p className="text-sm text-gray-500 dark:text-dark-muted">
                          Customers can browse and order via WhatsApp chat
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Bot Settings Tab */}
          {activeTab === 'settings' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Bot Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {!connectionData.isConnected ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">Connect WhatsApp first to configure bot settings</p>
                  </div>
                ) : (
                  <>
                    {/* Welcome Message */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                        Welcome Message
                      </label>
                      <textarea
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-dark-bg dark:border-dark-border dark:text-dark-text"
                        rows={3}
                        value={botSettings.welcomeMessage}
                        onChange={(e) => setBotSettings(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                        placeholder="Enter welcome message for new customers..."
                      />
                    </div>

                    {/* Away Message */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                        Away Message
                      </label>
                      <textarea
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-dark-bg dark:border-dark-border dark:text-dark-text"
                        rows={3}
                        value={botSettings.awayMessage}
                        onChange={(e) => setBotSettings(prev => ({ ...prev, awayMessage: e.target.value }))}
                        placeholder="Enter away message..."
                      />
                    </div>

                    {/* Business Hours */}
                    <div className="p-4 bg-gray-50 rounded-lg dark:bg-dark-bg">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-gray-500" />
                          <span className="font-medium text-gray-900 dark:text-dark-text">
                            Business Hours
                          </span>
                        </div>
                        <button
                          onClick={() => setBotSettings(prev => ({ ...prev, businessHoursEnabled: !prev.businessHoursEnabled }))}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            botSettings.businessHoursEnabled ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                              botSettings.businessHoursEnabled ? 'right-1' : 'left-1'
                            }`}
                          />
                        </button>
                      </div>
                      {botSettings.businessHoursEnabled && (
                        <div className="grid grid-cols-2 gap-4">
                          <Input
                            label="Start Time"
                            type="time"
                            value={botSettings.businessHoursStart}
                            onChange={(e) => setBotSettings(prev => ({ ...prev, businessHoursStart: e.target.value }))}
                          />
                          <Input
                            label="End Time"
                            type="time"
                            value={botSettings.businessHoursEnd}
                            onChange={(e) => setBotSettings(prev => ({ ...prev, businessHoursEnd: e.target.value }))}
                          />
                        </div>
                      )}
                    </div>

                    {/* Toggle Settings */}
                    <div className="space-y-3">
                      {[
                        { key: 'autoReplyEnabled', label: 'Enable Auto-Replies', description: 'Automatically respond to common queries' },
                        { key: 'orderNotificationsEnabled', label: 'Order Notifications', description: 'Send order status updates via WhatsApp' },
                        { key: 'catalogEnabled', label: 'Product Catalog', description: 'Allow customers to browse products in WhatsApp' },
                      ].map((setting) => (
                        <div
                          key={setting.key}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg dark:bg-dark-bg"
                        >
                          <div>
                            <p className="font-medium text-gray-900 dark:text-dark-text">{setting.label}</p>
                            <p className="text-sm text-gray-500 dark:text-dark-muted">{setting.description}</p>
                          </div>
                          <button
                            onClick={() => setBotSettings(prev => ({ ...prev, [setting.key]: !prev[setting.key] }))}
                            className={`relative w-12 h-6 rounded-full transition-colors ${
                              botSettings[setting.key] ? 'bg-green-500' : 'bg-gray-300'
                            }`}
                          >
                            <span
                              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                botSettings[setting.key] ? 'right-1' : 'left-1'
                              }`}
                            />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end">
                      <Button
                        onClick={handleSaveBotSettings}
                        isLoading={saving}
                        className="bg-green-500 hover:bg-green-600"
                      >
                        <Save className="h-4 w-4" />
                        Save Settings
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Auto-Replies Tab */}
          {activeTab === 'auto-replies' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Auto-Replies
                </CardTitle>
                <Button size="sm" onClick={handleAddAutoReply} disabled={!connectionData.isConnected}>
                  <Plus className="h-4 w-4" />
                  Add Reply
                </Button>
              </CardHeader>
              <CardContent>
                {!connectionData.isConnected ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">Connect WhatsApp first to manage auto-replies</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-500 dark:text-dark-muted mb-4">
                      Set up automatic responses when customers send messages containing specific keywords.
                    </p>
                    <div className="space-y-3">
                      {autoReplies.map((reply) => (
                        <div
                          key={reply.id}
                          className={`p-4 border rounded-lg transition-colors ${
                            reply.enabled
                              ? 'border-green-200 bg-green-50 dark:bg-green-900/10'
                              : 'border-gray-200 bg-gray-50 dark:bg-dark-bg'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant={reply.enabled ? 'success' : 'default'}>{reply.trigger}</Badge>
                                {!reply.enabled && <Badge variant="warning">Disabled</Badge>}
                              </div>
                              <p className="text-sm text-gray-700 dark:text-dark-text">{reply.response}</p>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <button onClick={() => handleToggleAutoReply(reply.id)} className="p-1.5 rounded-lg hover:bg-gray-100">
                                {reply.enabled ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-gray-400" />}
                              </button>
                              <button onClick={() => handleEditAutoReply(reply)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg">
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button onClick={() => handleDeleteAutoReply(reply.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick Replies Tab */}
          {activeTab === 'quick-replies' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Quick Replies
                </CardTitle>
                <Button size="sm" onClick={handleAddQuickReply}>
                  <Plus className="h-4 w-4" />
                  Add Quick Reply
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 dark:text-dark-muted mb-4">
                  Create shortcuts for frequently used messages.
                </p>
                <div className="space-y-3">
                  {quickReplies.map((reply) => (
                    <div key={reply.id} className="p-4 border rounded-lg bg-gray-50 dark:bg-dark-bg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <code className="px-2 py-1 bg-gray-200 dark:bg-dark-border rounded text-sm font-mono">
                            {reply.shortcut}
                          </code>
                          <p className="text-sm text-gray-700 dark:text-dark-text mt-2">{reply.message}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button onClick={() => handleCopyQuickReply(reply.message)} className="p-1.5 text-gray-600 hover:bg-gray-200 rounded-lg">
                            <Copy className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleEditQuickReply(reply)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDeleteQuickReply(reply.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <WhatsAppAnalyticsTab
              connectionData={connectionData}
              whAccountId={userDetails?.user_account?.wh_account_id || user?.wh_account_id}
            />
          )}

          {activeTab === 'templates' && (
            <MessageTemplatesTab
              connectionData={connectionData}
              whAccountId={userDetails?.user_account?.wh_account_id || user?.wh_account_id}
            />
          )}
        </div>
      </div>

      {/* Auto-Reply Modal */}
      <Modal isOpen={showAutoReplyModal} onClose={() => setShowAutoReplyModal(false)} title={editingReply ? 'Edit Auto-Reply' : 'Add Auto-Reply'}>
        <div className="space-y-4">
          <Input label="Trigger Keyword" placeholder="e.g., hours, delivery, price" value={replyForm.trigger} onChange={(e) => setReplyForm(prev => ({ ...prev, trigger: e.target.value }))} />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">Response Message</label>
            <textarea className="w-full px-3 py-2 border rounded-lg dark:bg-dark-bg dark:border-dark-border" rows={4} value={replyForm.response} onChange={(e) => setReplyForm(prev => ({ ...prev, response: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowAutoReplyModal(false)}>Cancel</Button>
            <Button onClick={handleSaveAutoReply} isLoading={saving}>{editingReply ? 'Update' : 'Add'}</Button>
          </div>
        </div>
      </Modal>

      {/* QR Code Modal */}
      <Modal isOpen={showQRModal} onClose={() => setShowQRModal(false)} title="WhatsApp QR Code">
        <div className="flex flex-col items-center space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Scan this QR code to start a WhatsApp chat with your store
          </p>

          {/* QR Code */}
          <div ref={qrCodeRef} className="p-4 bg-white rounded-lg shadow-inner">
            {getWhatsAppLink() && (
              <QRCodeSVG
                value={getWhatsAppLink()}
                size={200}
                level="H"
                includeMargin={true}
                bgColor="#ffffff"
                fgColor="#25D366"
              />
            )}
          </div>

          {/* Phone Number */}
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900 dark:text-dark-text">
              {connectionData.phoneNumber}
            </p>
            <p className="text-sm text-gray-500">WhatsApp Business</p>
          </div>

          {/* Link */}
          <div className="w-full p-3 bg-gray-50 rounded-lg dark:bg-dark-bg">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 text-center">Link</p>
            <p className="font-mono text-xs text-gray-700 dark:text-gray-300 text-center break-all">
              {getWhatsAppLink()}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              onClick={downloadQRCode}
              className="flex-1"
            >
              <Download className="h-4 w-4" />
              Download QR
            </Button>
            <Button
              variant="outline"
              onClick={copyLinkToClipboard}
              className="flex-1"
            >
              <Copy className="h-4 w-4" />
              Copy Link
            </Button>
          </div>

          <Button
            onClick={() => setShowQRModal(false)}
            className="w-full bg-green-500 hover:bg-green-600"
          >
            Done
          </Button>
        </div>
      </Modal>

      {/* Quick Reply Modal */}
      <Modal isOpen={showQuickReplyModal} onClose={() => setShowQuickReplyModal(false)} title={editingQuickReply ? 'Edit Quick Reply' : 'Add Quick Reply'}>
        <div className="space-y-4">
          <Input label="Shortcut" placeholder="e.g., /thanks" value={quickReplyForm.shortcut} onChange={(e) => setQuickReplyForm(prev => ({ ...prev, shortcut: e.target.value }))} />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">Message</label>
            <textarea className="w-full px-3 py-2 border rounded-lg dark:bg-dark-bg dark:border-dark-border" rows={4} value={quickReplyForm.message} onChange={(e) => setQuickReplyForm(prev => ({ ...prev, message: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowQuickReplyModal(false)}>Cancel</Button>
            <Button onClick={handleSaveQuickReply} isLoading={saving}>{editingQuickReply ? 'Update' : 'Add'}</Button>
          </div>
        </div>
      </Modal>

      {/* OTP Verification Modal */}
      <Modal isOpen={showOtpModal} onClose={() => setShowOtpModal(false)} title="Enter Verification Code">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-dark-muted">
            Enter the 6-digit verification code sent to your phone number via {otpMethod}.
          </p>
          <Input
            label="Verification Code"
            placeholder="Enter 6-digit code"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
          />
          <div className="flex justify-between items-center pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRequestOtp}
              isLoading={requestingOtp}
              disabled={requestingOtp}
            >
              Resend Code
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowOtpModal(false)}>Cancel</Button>
              <Button onClick={handleVerifyOtp} isLoading={verifyingOtp} disabled={otpCode.length < 6}>
                <CheckCircle className="h-4 w-4" />
                Verify
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Twilio SMS Inbox Modal */}
      <Modal isOpen={showTwilioInbox} onClose={() => setShowTwilioInbox(false)} title="SMS Inbox" size="lg">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-dark-muted">
                Messages received at <span className="font-mono font-semibold text-violet-600">{twilioState.number}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={loadTwilioInbox}
                isLoading={loadingInbox}
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={handleGetLatestOtp}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                <Hash className="h-4 w-4" />
                Get Latest OTP
              </Button>
            </div>
          </div>

          {/* OTP Display */}
          {otpCode && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-700 dark:text-green-300">Latest OTP Code:</p>
              <p className="text-3xl font-mono font-bold text-green-600 dark:text-green-400 tracking-widest">{otpCode}</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => {
                  navigator.clipboard.writeText(otpCode)
                  toast.success('OTP copied!')
                }}
              >
                <Copy className="h-4 w-4" />
                Copy OTP
              </Button>
            </div>
          )}

          {/* Messages List */}
          {loadingInbox ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : twilioInbox.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {twilioInbox.map((msg, index) => (
                <div
                  key={msg.id || index}
                  className="p-3 bg-gray-50 dark:bg-dark-bg rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">
                        From: <span className="font-mono">{msg.from}</span>
                      </p>
                      <p className="text-sm text-gray-900 dark:text-white mt-1 whitespace-pre-wrap">
                        {msg.body}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {msg.date_created || msg.created_at}
                      </p>
                    </div>
                    {/* Highlight if contains OTP-like number */}
                    {/\b\d{6}\b/.test(msg.body) && (
                      <Badge variant="success" className="ml-2">
                        Contains OTP
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Inbox className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No messages yet</p>
              <p className="text-sm">Messages sent to your number will appear here</p>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setShowTwilioInbox(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Business Profile Modal */}
      <Modal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} title="Edit Business Profile" size="lg">
        {loadingProfile ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                Business Category
              </label>
              <select
                value={businessProfile.vertical}
                onChange={(e) => setBusinessProfile(prev => ({ ...prev, vertical: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text"
              >
                {businessCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <Input
              label="About (Short Description)"
              placeholder="Brief description of your business (max 139 chars)"
              value={businessProfile.about}
              onChange={(e) => setBusinessProfile(prev => ({ ...prev, about: e.target.value.slice(0, 139) }))}
              maxLength={139}
            />
            <p className="text-xs text-gray-500 -mt-2">{businessProfile.about.length}/139 characters</p>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                Description
              </label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text"
                rows={3}
                placeholder="Detailed description of your business (max 512 chars)"
                value={businessProfile.description}
                onChange={(e) => setBusinessProfile(prev => ({ ...prev, description: e.target.value.slice(0, 512) }))}
                maxLength={512}
              />
              <p className="text-xs text-gray-500 mt-1">{businessProfile.description.length}/512 characters</p>
            </div>

            <Input
              label="Business Email"
              type="email"
              placeholder="contact@yourbusiness.com"
              value={businessProfile.email}
              onChange={(e) => setBusinessProfile(prev => ({ ...prev, email: e.target.value }))}
            />

            <Input
              label="Business Address"
              placeholder="123 Main Street, City, State, Country"
              value={businessProfile.address}
              onChange={(e) => setBusinessProfile(prev => ({ ...prev, address: e.target.value.slice(0, 256) }))}
              maxLength={256}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                Website(s)
              </label>
              {businessProfile.websites.map((website, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <Input
                    placeholder="https://www.yourbusiness.com"
                    value={website}
                    onChange={(e) => {
                      const newWebsites = [...businessProfile.websites]
                      newWebsites[idx] = e.target.value
                      setBusinessProfile(prev => ({ ...prev, websites: newWebsites }))
                    }}
                  />
                  {idx === 0 && businessProfile.websites.length < 2 && (
                    <Button
                      variant="outline"
                      onClick={() => setBusinessProfile(prev => ({ ...prev, websites: [...prev.websites, ''] }))}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                  {idx === 1 && (
                    <Button
                      variant="outline"
                      onClick={() => setBusinessProfile(prev => ({ ...prev, websites: [prev.websites[0]] }))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <p className="text-xs text-gray-500">Maximum 2 websites allowed</p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t dark:border-dark-border">
              <Button variant="outline" onClick={() => setShowProfileModal(false)}>Cancel</Button>
              <Button onClick={handleSaveProfile} isLoading={savingProfile}>
                <Save className="h-4 w-4" />
                Save Profile
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Display Name Modal */}
      <Modal isOpen={showDisplayNameModal} onClose={() => setShowDisplayNameModal(false)} title="Update Display Name">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-dark-muted">
            Update your WhatsApp Business display name. This requires approval from Meta and may take up to 48 hours.
          </p>
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <p className="text-sm text-amber-700 dark:text-amber-300">
              <strong>Naming Guidelines:</strong>
            </p>
            <ul className="text-xs text-amber-600 dark:text-amber-400 mt-1 list-disc list-inside">
              <li>Must be 3-50 characters</li>
              <li>Cannot start or end with special characters (_, -, ., space)</li>
              <li>Should represent your actual business name</li>
              <li>No generic names like "Test Business"</li>
            </ul>
          </div>
          <Input
            label="Display Name"
            placeholder="Your Business Name"
            value={displayNameForm}
            onChange={(e) => setDisplayNameForm(e.target.value)}
            maxLength={50}
          />
          <p className="text-xs text-gray-500 -mt-2">{displayNameForm.length}/50 characters</p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowDisplayNameModal(false)}>Cancel</Button>
            <Button onClick={handleUpdateDisplayName} isLoading={updatingDisplayName} disabled={displayNameForm.length < 3}>
              <Send className="h-4 w-4" />
              Submit for Review
            </Button>
          </div>
        </div>
      </Modal>

      {/* Video Tutorial Modal */}
      <Modal
        isOpen={showVideoTutorial}
        onClose={() => setShowVideoTutorial(false)}
        title="📹 WhatsApp Setup Video Tutorial"
        size="xl"
      >
        <div className="space-y-4">
          <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
            <p className="text-sm text-purple-700 dark:text-purple-300">
              <strong>🎥 Interactive Video Guide:</strong> This video tutorial will walk you through each step
              of the WhatsApp Business setup process with detailed explanations and visual guidance.
              You can pause, navigate between steps, and follow along at your own pace.
            </p>
          </div>

          {/* Video Tutorial iframe */}
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden" style={{ height: '75vh', maxHeight: '850px' }}>
            <iframe
              src="/whatsapp-setup-video.html"
              className="w-full h-full border-0"
              title="WhatsApp Setup Video Tutorial"
              allow="fullscreen"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t dark:border-dark-border">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              💡 <strong>Tip:</strong> Use arrow keys to navigate, spacebar to play/pause
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => window.open('/whatsapp-setup-video.html', '_blank')}
                className="text-sm"
              >
                <ExternalLink className="h-4 w-4" />
                Open in New Tab
              </Button>
              <Button onClick={() => setShowVideoTutorial(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ============================================
// MESSAGE TEMPLATES TAB COMPONENT
// ============================================

function MessageTemplatesTab({ connectionData, whAccountId }) {
  const [templates, setTemplates] = useState([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showTestModal, setShowTestModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [creating, setCreating] = useState(false)
  const [sending, setSending] = useState(false)

  // Template form state
  const [templateForm, setTemplateForm] = useState({
    name: '',
    category: 'UTILITY',
    language: 'en',
    header_type: 'none',
    header_text: '',
    body_text: '',
    footer_text: '',
    buttons: [],
  })

  // Test message form state
  const [testForm, setTestForm] = useState({
    to_phone_number: '',
    body_params: [],
  })

  // Load templates on mount and when connection changes
  useEffect(() => {
    if (connectionData.isConnected && whAccountId) {
      loadTemplates()
    }
  }, [connectionData.isConnected, whAccountId])

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true)
      const response = await whatsappService.getMessageTemplates(whAccountId)
      if (response.status === 1) {
        setTemplates(response.data || [])
      } else {
        toast.error(response.message || 'Failed to load templates')
      }
    } catch (error) {
      console.error('Error loading templates:', error)
      toast.error('Failed to load templates')
    } finally {
      setLoadingTemplates(false)
    }
  }

  const handleCreateTemplate = async () => {
    if (!templateForm.name || !templateForm.body_text) {
      toast.error('Template name and body text are required')
      return
    }

    try {
      setCreating(true)
      const response = await whatsappService.createMessageTemplate({
        wh_account_id: whAccountId,
        ...templateForm,
      })

      if (response.status === 1) {
        toast.success(response.message || 'Template created successfully!')
        setShowCreateModal(false)
        resetTemplateForm()
        loadTemplates()
      } else {
        toast.error(response.message || 'Failed to create template')
        if (response.details) {
          toast.error(response.details, { duration: 5000 })
        }
      }
    } catch (error) {
      console.error('Error creating template:', error)
      toast.error('Failed to create template')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteTemplate = async (templateName) => {
    if (!confirm(`Are you sure you want to delete template "${templateName}"?`)) {
      return
    }

    try {
      const response = await whatsappService.deleteMessageTemplate(whAccountId, templateName)
      if (response.status === 1) {
        toast.success('Template deleted successfully')
        loadTemplates()
      } else {
        toast.error(response.message || 'Failed to delete template')
      }
    } catch (error) {
      console.error('Error deleting template:', error)
      toast.error('Failed to delete template')
    }
  }

  const handleSendTestMessage = async () => {
    if (!testForm.to_phone_number) {
      toast.error('Phone number is required')
      return
    }

    try {
      setSending(true)
      const response = await whatsappService.sendTestTemplate({
        wh_account_id: whAccountId,
        template_name: selectedTemplate.name,
        language_code: selectedTemplate.language,
        to_phone_number: testForm.to_phone_number,
        body_params: testForm.body_params,
      })

      if (response.status === 1) {
        toast.success('Test message sent successfully!')
        setShowTestModal(false)
        setTestForm({ to_phone_number: '', body_params: [] })
      } else {
        toast.error(response.message || 'Failed to send test message')
        if (response.details) {
          toast.error(response.details, { duration: 5000 })
        }
      }
    } catch (error) {
      console.error('Error sending test message:', error)
      toast.error('Failed to send test message')
    } finally {
      setSending(false)
    }
  }

  const resetTemplateForm = () => {
    setTemplateForm({
      name: '',
      category: 'UTILITY',
      language: 'en',
      header_type: 'none',
      header_text: '',
      body_text: '',
      footer_text: '',
      buttons: [],
    })
  }

  const openTestModal = (template) => {
    setSelectedTemplate(template)
    setShowTestModal(true)
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      APPROVED: {
        color: 'green',
        label: 'Approved',
        icon: CheckCircle,
        bgClass: 'bg-green-100 dark:bg-green-900/30 border-green-500',
        textClass: 'text-green-700 dark:text-green-300',
      },
      PENDING: {
        color: 'yellow',
        label: 'Pending Review',
        icon: Clock,
        bgClass: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500',
        textClass: 'text-yellow-700 dark:text-yellow-300',
      },
      REJECTED: {
        color: 'red',
        label: 'Rejected',
        icon: XCircle,
        bgClass: 'bg-red-100 dark:bg-red-900/30 border-red-500',
        textClass: 'text-red-700 dark:text-red-300',
      },
      PAUSED: {
        color: 'gray',
        label: 'Paused',
        icon: AlertCircle,
        bgClass: 'bg-gray-100 dark:bg-gray-900/30 border-gray-500',
        textClass: 'text-gray-700 dark:text-gray-300',
      },
      DISABLED: {
        color: 'gray',
        label: 'Disabled',
        icon: XCircle,
        bgClass: 'bg-gray-100 dark:bg-gray-900/30 border-gray-500',
        textClass: 'text-gray-700 dark:text-gray-300',
      },
    }
    const config = statusMap[status] || {
      color: 'gray',
      label: status,
      icon: AlertCircle,
      bgClass: 'bg-gray-100 dark:bg-gray-900/30 border-gray-500',
      textClass: 'text-gray-700 dark:text-gray-300',
    }
    const Icon = config.icon
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${config.bgClass} ${config.textClass} font-medium text-sm`}
      >
        <Icon className="h-4 w-4" />
        {config.label}
      </div>
    )
  }

  if (!connectionData.isConnected) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Connect WhatsApp first to manage message templates</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Message Templates
            </CardTitle>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4" />
              Create Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-semibold mb-1">About Message Templates</p>
                <p className="text-blue-700 dark:text-blue-300">
                  Message templates are pre-approved message formats required by WhatsApp for sending
                  notifications outside of 24-hour customer service windows. Create templates for order
                  confirmations, shipping updates, appointment reminders, and other transactional messages.
                </p>
              </div>
            </div>
          </div>

          {loadingTemplates ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 mb-4">No message templates yet</p>
              <Button onClick={() => setShowCreateModal(true)} variant="outline">
                <Plus className="h-4 w-4" />
                Create Your First Template
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => {
                const getCardBorderClass = (status) => {
                  if (status === 'APPROVED')
                    return 'border-l-4 border-l-green-500 border-t border-r border-b border-green-200 bg-green-50/30 dark:bg-green-900/10 dark:border-green-700'
                  if (status === 'REJECTED')
                    return 'border-l-4 border-l-red-500 border-t border-r border-b border-red-200 bg-red-50/30 dark:bg-red-900/10 dark:border-red-700'
                  if (status === 'PENDING')
                    return 'border-l-4 border-l-yellow-500 border-t border-r border-b border-yellow-200 bg-yellow-50/30 dark:bg-yellow-900/10 dark:border-yellow-700'
                  return 'border border-gray-200 dark:border-dark-border'
                }

                return (
                  <div
                    key={template.id}
                    className={`rounded-lg p-4 hover:shadow-md transition-all ${getCardBorderClass(template.status)}`}
                  >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900 dark:text-dark-text">
                          {template.name}
                        </h4>
                        {getStatusBadge(template.status)}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Hash className="h-3 w-3" />
                          {template.category}
                        </span>
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {template.language}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {template.status === 'APPROVED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openTestModal(template)}
                        >
                          <Send className="h-4 w-4" />
                          Test
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteTemplate(template.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Template Preview */}
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm dark:bg-dark-bg">
                    {template.components?.map((component, idx) => (
                      <div key={idx} className="mb-2 last:mb-0">
                        {component.type === 'HEADER' && component.text && (
                          <div className="font-semibold text-gray-900 dark:text-dark-text mb-1">
                            {component.text}
                          </div>
                        )}
                        {component.type === 'BODY' && (
                          <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {component.text}
                          </div>
                        )}
                        {component.type === 'FOOTER' && component.text && (
                          <div className="text-xs text-gray-500 mt-1">{component.text}</div>
                        )}
                        {component.type === 'BUTTONS' && component.buttons && (
                          <div className="mt-2 space-y-1">
                            {component.buttons.map((btn, btnIdx) => (
                              <div
                                key={btnIdx}
                                className="text-blue-600 text-xs border border-blue-200 rounded px-2 py-1 inline-block mr-2"
                              >
                                {btn.text}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {template.rejected_reason && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
                      <strong>Rejected:</strong> {template.rejected_reason}
                    </div>
                  )}
                </div>
              )
              })}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between pt-4 border-t dark:border-dark-border">
            <p className="text-sm text-gray-500">{templates.length} template(s) total</p>
            <Button variant="outline" size="sm" onClick={loadTemplates}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Create Template Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          resetTemplateForm()
        }}
        title="Create Message Template"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Template Name *"
            placeholder="e.g., order_confirmation"
            value={templateForm.name}
            onChange={(e) =>
              setTemplateForm((prev) => ({
                ...prev,
                name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
              }))
            }
            hint="Lowercase letters, numbers, and underscores only"
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                Category *
              </label>
              <select
                className="w-full px-3 py-2 border rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text"
                value={templateForm.category}
                onChange={(e) => setTemplateForm((prev) => ({ ...prev, category: e.target.value }))}
              >
                <option value="UTILITY">Utility (Order updates, account alerts)</option>
                <option value="MARKETING">Marketing (Promotions, offers)</option>
                <option value="AUTHENTICATION">Authentication (OTP, verification)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                Language *
              </label>
              <select
                className="w-full px-3 py-2 border rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text"
                value={templateForm.language}
                onChange={(e) => setTemplateForm((prev) => ({ ...prev, language: e.target.value }))}
              >
                <option value="en">English</option>
                <option value="en_US">English (US)</option>
                <option value="hi">Hindi</option>
                <option value="es">Spanish</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
              Header (Optional)
            </label>
            <select
              className="w-full px-3 py-2 border rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text mb-2"
              value={templateForm.header_type}
              onChange={(e) =>
                setTemplateForm((prev) => ({ ...prev, header_type: e.target.value }))
              }
            >
              <option value="none">No Header</option>
              <option value="TEXT">Text Header</option>
            </select>
            {templateForm.header_type === 'TEXT' && (
              <Input
                placeholder="e.g., Order Confirmed!"
                value={templateForm.header_text}
                onChange={(e) =>
                  setTemplateForm((prev) => ({ ...prev, header_text: e.target.value }))
                }
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
              Message Body *
            </label>
            <textarea
              className="w-full px-3 py-2 border rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text"
              rows={5}
              placeholder="Your message body here. Use {{1}}, {{2}}, etc. for dynamic variables."
              value={templateForm.body_text}
              onChange={(e) => setTemplateForm((prev) => ({ ...prev, body_text: e.target.value }))}
            />
            <div className="mt-2 space-y-2">
              <p className="text-xs text-gray-500">
                Use {'{'}
                {'{'}1{'}'}
                {'}'}, {'{'}
                {'{'}2{'}'}
                {'}'} for variables. <strong>Important:</strong> Always add a space before variables!
              </p>
              {(templateForm.body_text.match(/[#$%@&]\{\{/g) || []).length > 0 && (
                <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
                  <strong>⚠️ Warning:</strong> Detected special characters directly before variables (e.g., <code>#{'{{'}2{'}}'}
</code>).
                  Add a space to avoid rejection: <code># {'{{'}2{'}}'}
</code>
                </div>
              )}
              <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300">
                <strong>✓ Correct:</strong> "Your order # {'{{'}1{'}}'}  is confirmed" <br />
                <strong>✗ Wrong:</strong> "Your order #{'{{'}1{'}}'}  is confirmed" (missing space!)
              </div>
            </div>
          </div>

          <Input
            label="Footer (Optional)"
            placeholder="e.g., Thank you for shopping with us!"
            value={templateForm.footer_text}
            onChange={(e) => setTemplateForm((prev) => ({ ...prev, footer_text: e.target.value }))}
          />

          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200">
            <strong>Note:</strong> Templates must be approved by Meta before use. Approval typically
            takes a few minutes to a few hours.
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false)
                resetTemplateForm()
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateTemplate} isLoading={creating}>
              Create Template
            </Button>
          </div>
        </div>
      </Modal>

      {/* Send Test Message Modal */}
      <Modal
        isOpen={showTestModal}
        onClose={() => {
          setShowTestModal(false)
          setTestForm({ to_phone_number: '', body_params: [] })
        }}
        title={`Send Test Message: ${selectedTemplate?.name}`}
      >
        <div className="space-y-4">
          <Input
            label="Phone Number (with country code) *"
            placeholder="e.g., 919876543210"
            value={testForm.to_phone_number}
            onChange={(e) =>
              setTestForm((prev) => ({ ...prev, to_phone_number: e.target.value }))
            }
            hint="Enter number without + or spaces"
          />

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200">
            Template: <strong>{selectedTemplate?.name}</strong>
            <br />
            Language: <strong>{selectedTemplate?.language}</strong>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowTestModal(false)
                setTestForm({ to_phone_number: '', body_params: [] })
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSendTestMessage} isLoading={sending}>
              <Send className="h-4 w-4" />
              Send Test
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

// ============================================
// WHATSAPP ANALYTICS TAB COMPONENT
// ============================================

function WhatsAppAnalyticsTab({ connectionData, whAccountId }) {
  const [analytics, setAnalytics] = useState(null)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)
  const [dateRange, setDateRange] = useState('7d')

  useEffect(() => {
    if (connectionData.isConnected && whAccountId) {
      loadAnalytics()
    }
  }, [connectionData.isConnected, whAccountId, dateRange])

  const loadAnalytics = async () => {
    try {
      setLoadingAnalytics(true)
      const response = await whatsappService.getAnalytics(whAccountId, dateRange)
      if (response.status === 1) {
        setAnalytics(response.data)
      } else {
        toast.error(response.message || 'Failed to load analytics')
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
      toast.error('Failed to load analytics')
    } finally {
      setLoadingAnalytics(false)
    }
  }

  if (!connectionData.isConnected) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Connect WhatsApp first to view analytics</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            WhatsApp Analytics
          </CardTitle>
          <div className="flex items-center gap-2">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm dark:bg-dark-bg dark:border-dark-border"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
            <Button size="sm" variant="outline" onClick={loadAnalytics}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loadingAnalytics ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : analytics ? (
          <>
            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-6 bg-green-50 rounded-lg dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">
                    Messages Sent
                  </p>
                  <Send className="h-5 w-5 text-green-500" />
                </div>
                <p className="text-3xl font-bold text-green-700 dark:text-green-300">
                  {analytics.messages_sent?.toLocaleString() || 0}
                </p>
                <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                  Notifications & replies
                </p>
              </div>

              <div className="p-6 bg-blue-50 rounded-lg dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    Messages Received
                  </p>
                  <Inbox className="h-5 w-5 text-blue-500" />
                </div>
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                  {analytics.messages_received?.toLocaleString() || 0}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                  Customer messages
                </p>
              </div>

              <div className="p-6 bg-purple-50 rounded-lg dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                    Orders via WhatsApp
                  </p>
                  <ShoppingBag className="h-5 w-5 text-purple-500" />
                </div>
                <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">
                  {analytics.orders_via_whatsapp?.toLocaleString() || 0}
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-500 mt-1">
                  Total orders placed
                </p>
              </div>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg dark:bg-dark-bg border border-gray-200 dark:border-dark-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg dark:bg-orange-900/30">
                    <DollarSign className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Order Value</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-dark-text">
                      ${analytics.total_order_value?.toLocaleString() || '0.00'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg dark:bg-dark-bg border border-gray-200 dark:border-dark-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg dark:bg-indigo-900/30">
                    <User className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Unique Customers</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-dark-text">
                      {analytics.unique_customers?.toLocaleString() || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg dark:bg-dark-bg border border-gray-200 dark:border-dark-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-pink-100 rounded-lg dark:bg-pink-900/30">
                    <FileText className="h-5 w-5 text-pink-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Template Messages</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-dark-text">
                      {analytics.template_messages?.toLocaleString() || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Date Range Info */}
            <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>
                  Showing data from <strong>{analytics.start_date}</strong> to{' '}
                  <strong>{analytics.end_date}</strong>
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">No analytics data available</p>
            <Button onClick={loadAnalytics} variant="outline">
              <RefreshCw className="h-4 w-4" />
              Load Analytics
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default WhatsAppPage
