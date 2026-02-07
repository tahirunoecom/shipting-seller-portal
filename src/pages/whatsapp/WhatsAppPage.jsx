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
          setup: {
            // Pre-fill business info to default to Commerce vertical
            business: {
              name: userDetails?.company_name || userDetails?.name || '',
              website: 'https://partners.shipting.com',
              vertical: 'ECOMMERCE',
            },
          },
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
                          <Button
                            variant="outline"
                            onClick={handleSyncCatalog}
                            isLoading={saving}
                          >
                            <Package className="h-4 w-4" />
                            Sync Products to Catalog
                          </Button>
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  WhatsApp Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!connectionData.isConnected ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">Connect WhatsApp first to view analytics</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-green-50 rounded-lg dark:bg-green-900/20">
                      <p className="text-sm text-green-600">Messages Sent</p>
                      <p className="text-2xl font-bold text-green-700">--</p>
                      <p className="text-xs text-green-500">Coming soon</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg dark:bg-blue-900/20">
                      <p className="text-sm text-blue-600">Messages Received</p>
                      <p className="text-2xl font-bold text-blue-700">--</p>
                      <p className="text-xs text-blue-500">Coming soon</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg dark:bg-purple-900/20">
                      <p className="text-sm text-purple-600">Orders via WhatsApp</p>
                      <p className="text-2xl font-bold text-purple-700">--</p>
                      <p className="text-xs text-purple-500">Coming soon</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
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
    </div>
  )
}

export default WhatsAppPage
