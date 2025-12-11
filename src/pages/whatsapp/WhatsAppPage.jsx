import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store'
import { whatsappService } from '@/services'
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
} from 'lucide-react'
import toast from 'react-hot-toast'

// Demo mode - set to true to simulate API responses when backend isn't ready
const DEMO_MODE = true

function WhatsAppPage() {
  const { user, userDetails } = useAuthStore()
  const [activeTab, setActiveTab] = useState('connection')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [demoModeActive, setDemoModeActive] = useState(DEMO_MODE)

  // Connection state
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('disconnected') // disconnected, connecting, connected, error
  const [phoneNumber, setPhoneNumber] = useState('')
  const [whatsappId, setWhatsappId] = useState('')

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

  // Test message state
  const [testPhone, setTestPhone] = useState('')
  const [testMessage, setTestMessage] = useState('Hello! This is a test message from Shipting.')
  const [sendingTest, setSendingTest] = useState(false)

  const tabs = [
    { key: 'connection', label: 'Connection', icon: Link },
    { key: 'settings', label: 'Bot Settings', icon: Settings },
    { key: 'auto-replies', label: 'Auto-Replies', icon: Zap },
    { key: 'quick-replies', label: 'Quick Replies', icon: MessageCircle },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  ]

  // Load initial data
  useEffect(() => {
    loadWhatsAppConfig()
  }, [])

  const loadWhatsAppConfig = async () => {
    // Skip API call in demo mode
    if (demoModeActive) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await whatsappService.getWhatsAppConfig(userDetails?.wh_account_id)
      if (response.status === 1 && response.data) {
        const config = response.data
        setIsConnected(config.is_connected || false)
        setConnectionStatus(config.is_connected ? 'connected' : 'disconnected')
        setPhoneNumber(config.phone_number || '')
        setWhatsappId(config.whatsapp_id || '')
        if (config.bot_settings) {
          setBotSettings(prev => ({ ...prev, ...config.bot_settings }))
        }
        if (config.auto_replies) {
          setAutoReplies(config.auto_replies)
        }
        if (config.quick_replies) {
          setQuickReplies(config.quick_replies)
        }
      }
    } catch (error) {
      // Don't show error for initial load - config might not exist yet
      console.log('No existing WhatsApp config found')
    } finally {
      setLoading(false)
    }
  }

  // Connection handlers
  const handleConnect = async () => {
    if (!phoneNumber) {
      toast.error('Please enter a phone number')
      return
    }
    try {
      setConnectionStatus('connecting')

      if (demoModeActive) {
        // Demo mode - simulate successful connection
        await new Promise(resolve => setTimeout(resolve, 1500))
        setIsConnected(true)
        setConnectionStatus('connected')
        setWhatsappId(`wa_${Date.now()}`)
        toast.success('WhatsApp connected successfully! (Demo Mode)')
        return
      }

      const response = await whatsappService.connectWhatsApp(
        userDetails?.wh_account_id,
        phoneNumber
      )
      if (response.status === 1) {
        setIsConnected(true)
        setConnectionStatus('connected')
        setWhatsappId(response.data?.whatsapp_id || '')
        toast.success('WhatsApp connected successfully!')
      } else {
        setConnectionStatus('error')
        toast.error(response.message || 'Failed to connect WhatsApp')
      }
    } catch (error) {
      // Check if it's a 404 error (API not implemented yet)
      if (error.response?.status === 404) {
        setConnectionStatus('disconnected')
        toast.error('WhatsApp API not available. Enable Demo Mode to test the UI.')
      } else {
        setConnectionStatus('error')
        toast.error('Failed to connect WhatsApp. Please try again.')
      }
    }
  }

  const handleDisconnect = async () => {
    try {
      setConnectionStatus('connecting')

      if (demoModeActive) {
        // Demo mode - simulate disconnect
        await new Promise(resolve => setTimeout(resolve, 1000))
        setIsConnected(false)
        setConnectionStatus('disconnected')
        setPhoneNumber('')
        setWhatsappId('')
        toast.success('WhatsApp disconnected successfully (Demo Mode)')
        return
      }

      const response = await whatsappService.disconnectWhatsApp(userDetails?.wh_account_id)
      if (response.status === 1) {
        setIsConnected(false)
        setConnectionStatus('disconnected')
        setPhoneNumber('')
        setWhatsappId('')
        toast.success('WhatsApp disconnected successfully')
      } else {
        setConnectionStatus('connected')
        toast.error(response.message || 'Failed to disconnect WhatsApp')
      }
    } catch (error) {
      setConnectionStatus('connected')
      toast.error('Failed to disconnect WhatsApp')
    }
  }

  const handleTestConnection = async () => {
    try {
      setSaving(true)

      if (demoModeActive) {
        // Demo mode - simulate test
        await new Promise(resolve => setTimeout(resolve, 1000))
        toast.success('Connection test successful! (Demo Mode)')
        return
      }

      const response = await whatsappService.testWhatsAppConnection(userDetails?.wh_account_id)
      if (response.status === 1) {
        toast.success('Connection test successful!')
      } else {
        toast.error(response.message || 'Connection test failed')
      }
    } catch (error) {
      toast.error('Connection test failed')
    } finally {
      setSaving(false)
    }
  }

  // Bot Settings handlers
  const handleBotSettingChange = (key, value) => {
    setBotSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSaveBotSettings = async () => {
    try {
      setSaving(true)

      if (demoModeActive) {
        // Demo mode - simulate save
        await new Promise(resolve => setTimeout(resolve, 1000))
        toast.success('Bot settings saved successfully! (Demo Mode)')
        return
      }

      const response = await whatsappService.saveWhatsAppConfig({
        wh_account_id: userDetails?.wh_account_id,
        bot_settings: botSettings,
      })
      if (response.status === 1) {
        toast.success('Bot settings saved successfully!')
      } else {
        toast.error(response.message || 'Failed to save settings')
      }
    } catch (error) {
      toast.error('Failed to save settings. Please try again.')
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
        // Update existing
        setAutoReplies(prev => prev.map(r => r.id === editingReply.id ? { ...r, ...replyForm } : r))
        toast.success('Auto-reply updated')
      } else {
        // Add new
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

  // Test Message handler
  const handleSendTestMessage = async () => {
    if (!testPhone) {
      toast.error('Please enter a phone number')
      return
    }
    try {
      setSendingTest(true)

      if (demoModeActive) {
        // Demo mode - simulate sending
        await new Promise(resolve => setTimeout(resolve, 1500))
        toast.success(`Test message sent to ${testPhone}! (Demo Mode)`)
        return
      }

      const response = await whatsappService.sendTestMessage(
        userDetails?.wh_account_id,
        testPhone,
        testMessage
      )
      if (response.status === 1) {
        toast.success('Test message sent successfully!')
      } else {
        toast.error(response.message || 'Failed to send test message')
      }
    } catch (error) {
      toast.error('Failed to send test message')
    } finally {
      setSendingTest(false)
    }
  }

  const getConnectionStatusBadge = () => {
    switch (connectionStatus) {
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
      {/* Demo Mode Banner */}
      {demoModeActive && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between dark:bg-amber-900/20 dark:border-amber-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <span className="text-sm text-amber-700 dark:text-amber-300">
              <strong>Demo Mode Active</strong> - API calls are simulated. Data is not saved to the server.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDemoModeActive(false)}
            className="text-amber-700 border-amber-300 hover:bg-amber-100"
          >
            Disable Demo Mode
          </Button>
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
          {demoModeActive && <Badge variant="warning">Demo</Badge>}
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
                  {!isConnected ? (
                    <>
                      <div className="p-4 bg-blue-50 rounded-lg dark:bg-blue-900/20">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Connect your WhatsApp Business account to enable automated messaging,
                          order notifications, and customer support through WhatsApp.
                        </p>
                      </div>

                      <div className="space-y-4">
                        <Input
                          label="WhatsApp Phone Number"
                          placeholder="+1 234 567 8900"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          helper="Enter your WhatsApp Business phone number with country code"
                        />
                        <Button
                          onClick={handleConnect}
                          isLoading={connectionStatus === 'connecting'}
                          className="bg-green-500 hover:bg-green-600"
                        >
                          <Link className="h-4 w-4" />
                          Connect WhatsApp
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-4 bg-green-50 rounded-lg dark:bg-green-900/20">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-green-700 dark:text-green-300">
                              Connected to WhatsApp Business
                            </p>
                            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                              Phone: {phoneNumber}
                            </p>
                            {whatsappId && (
                              <p className="text-xs text-green-500 mt-1">
                                ID: {whatsappId}
                              </p>
                            )}
                          </div>
                          <CheckCircle className="h-8 w-8 text-green-500" />
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={handleTestConnection}
                          isLoading={saving}
                        >
                          <RefreshCw className="h-4 w-4" />
                          Test Connection
                        </Button>
                        <Button
                          variant="danger"
                          onClick={handleDisconnect}
                        >
                          <Unlink className="h-4 w-4" />
                          Disconnect
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Test Message */}
              {isConnected && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Send className="h-5 w-5" />
                      Send Test Message
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input
                      label="Recipient Phone Number"
                      placeholder="+1 234 567 8900"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                        Message
                      </label>
                      <textarea
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-dark-bg dark:border-dark-border dark:text-dark-text"
                        rows={3}
                        value={testMessage}
                        onChange={(e) => setTestMessage(e.target.value)}
                      />
                    </div>
                    <Button
                      onClick={handleSendTestMessage}
                      isLoading={sendingTest}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      <Send className="h-4 w-4" />
                      Send Test Message
                    </Button>
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
                {/* Welcome Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                    Welcome Message
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-dark-bg dark:border-dark-border dark:text-dark-text"
                    rows={3}
                    value={botSettings.welcomeMessage}
                    onChange={(e) => handleBotSettingChange('welcomeMessage', e.target.value)}
                    placeholder="Enter welcome message for new customers..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This message is sent when a customer first messages your business
                  </p>
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
                    onChange={(e) => handleBotSettingChange('awayMessage', e.target.value)}
                    placeholder="Enter away message..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This message is sent outside business hours
                  </p>
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
                      onClick={() => handleBotSettingChange('businessHoursEnabled', !botSettings.businessHoursEnabled)}
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
                        onChange={(e) => handleBotSettingChange('businessHoursStart', e.target.value)}
                      />
                      <Input
                        label="End Time"
                        type="time"
                        value={botSettings.businessHoursEnd}
                        onChange={(e) => handleBotSettingChange('businessHoursEnd', e.target.value)}
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
                        <p className="font-medium text-gray-900 dark:text-dark-text">
                          {setting.label}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-dark-muted">
                          {setting.description}
                        </p>
                      </div>
                      <button
                        onClick={() => handleBotSettingChange(setting.key, !botSettings[setting.key])}
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
                <Button size="sm" onClick={handleAddAutoReply}>
                  <Plus className="h-4 w-4" />
                  Add Reply
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 dark:text-dark-muted mb-4">
                  Set up automatic responses when customers send messages containing specific keywords.
                </p>
                <div className="space-y-3">
                  {autoReplies.map((reply) => (
                    <div
                      key={reply.id}
                      className={`p-4 border rounded-lg transition-colors ${
                        reply.enabled
                          ? 'border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800'
                          : 'border-gray-200 bg-gray-50 dark:bg-dark-bg dark:border-dark-border'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={reply.enabled ? 'success' : 'default'}>
                              {reply.trigger}
                            </Badge>
                            {!reply.enabled && (
                              <Badge variant="warning">Disabled</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 dark:text-dark-text">
                            {reply.response}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => handleToggleAutoReply(reply.id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              reply.enabled
                                ? 'text-green-600 hover:bg-green-100'
                                : 'text-gray-400 hover:bg-gray-100'
                            }`}
                            title={reply.enabled ? 'Disable' : 'Enable'}
                          >
                            {reply.enabled ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleEditAutoReply(reply)}
                            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAutoReply(reply.id)}
                            className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {autoReplies.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Zap className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No auto-replies configured</p>
                      <p className="text-sm">Click "Add Reply" to create your first auto-reply</p>
                    </div>
                  )}
                </div>
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
                  Create shortcuts for frequently used messages. Use these shortcuts when chatting with customers.
                </p>
                <div className="space-y-3">
                  {quickReplies.map((reply) => (
                    <div
                      key={reply.id}
                      className="p-4 border rounded-lg bg-gray-50 dark:bg-dark-bg dark:border-dark-border"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <code className="px-2 py-1 bg-gray-200 dark:bg-dark-border rounded text-sm font-mono">
                              {reply.shortcut}
                            </code>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-dark-text">
                            {reply.message}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => handleCopyQuickReply(reply.message)}
                            className="p-1.5 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                            title="Copy message"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditQuickReply(reply)}
                            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteQuickReply(reply.id)}
                            className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {quickReplies.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No quick replies configured</p>
                      <p className="text-sm">Click "Add Quick Reply" to create your first quick reply</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    WhatsApp Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 bg-green-50 rounded-lg dark:bg-green-900/20">
                      <p className="text-sm text-green-600">Messages Sent</p>
                      <p className="text-2xl font-bold text-green-700">1,234</p>
                      <p className="text-xs text-green-500">+12% from last week</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg dark:bg-blue-900/20">
                      <p className="text-sm text-blue-600">Messages Received</p>
                      <p className="text-2xl font-bold text-blue-700">856</p>
                      <p className="text-xs text-blue-500">+8% from last week</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg dark:bg-purple-900/20">
                      <p className="text-sm text-purple-600">Response Rate</p>
                      <p className="text-2xl font-bold text-purple-700">94%</p>
                      <p className="text-xs text-purple-500">+2% from last week</p>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg dark:bg-dark-bg">
                    <h4 className="font-medium text-gray-900 dark:text-dark-text mb-4">
                      Auto-Reply Performance
                    </h4>
                    <div className="space-y-3">
                      {[
                        { trigger: 'hours', count: 145, percentage: 35 },
                        { trigger: 'delivery', count: 98, percentage: 24 },
                        { trigger: 'payment', count: 76, percentage: 18 },
                        { trigger: 'other', count: 94, percentage: 23 },
                      ].map((item) => (
                        <div key={item.trigger} className="flex items-center gap-4">
                          <span className="w-20 text-sm text-gray-600 dark:text-dark-muted">
                            {item.trigger}
                          </span>
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-700 dark:text-dark-text">
                            {item.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { time: '2 min ago', event: 'Auto-reply sent', details: 'Keyword: hours' },
                      { time: '15 min ago', event: 'Message received', details: 'From: +1 234 567 8900' },
                      { time: '1 hour ago', event: 'Order notification sent', details: 'Order #12345' },
                      { time: '2 hours ago', event: 'Welcome message sent', details: 'New customer' },
                    ].map((activity, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg dark:bg-dark-bg"
                      >
                        <div className="h-2 w-2 bg-green-500 rounded-full" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-dark-text">
                            {activity.event}
                          </p>
                          <p className="text-xs text-gray-500">{activity.details}</p>
                        </div>
                        <span className="text-xs text-gray-400">{activity.time}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Auto-Reply Modal */}
      <Modal
        isOpen={showAutoReplyModal}
        onClose={() => setShowAutoReplyModal(false)}
        title={editingReply ? 'Edit Auto-Reply' : 'Add Auto-Reply'}
      >
        <div className="space-y-4">
          <Input
            label="Trigger Keyword"
            placeholder="e.g., hours, delivery, price"
            value={replyForm.trigger}
            onChange={(e) => setReplyForm(prev => ({ ...prev, trigger: e.target.value }))}
            helper="The keyword that triggers this auto-reply"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
              Response Message
            </label>
            <textarea
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-dark-bg dark:border-dark-border dark:text-dark-text"
              rows={4}
              placeholder="Enter the automated response..."
              value={replyForm.response}
              onChange={(e) => setReplyForm(prev => ({ ...prev, response: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="replyEnabled"
              checked={replyForm.enabled}
              onChange={(e) => setReplyForm(prev => ({ ...prev, enabled: e.target.checked }))}
              className="rounded border-gray-300 text-green-500 focus:ring-green-500"
            />
            <label htmlFor="replyEnabled" className="text-sm text-gray-700 dark:text-dark-text">
              Enable this auto-reply
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowAutoReplyModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAutoReply} isLoading={saving}>
              {editingReply ? 'Update' : 'Add'} Reply
            </Button>
          </div>
        </div>
      </Modal>

      {/* Quick Reply Modal */}
      <Modal
        isOpen={showQuickReplyModal}
        onClose={() => setShowQuickReplyModal(false)}
        title={editingQuickReply ? 'Edit Quick Reply' : 'Add Quick Reply'}
      >
        <div className="space-y-4">
          <Input
            label="Shortcut"
            placeholder="e.g., /thanks, /track, /help"
            value={quickReplyForm.shortcut}
            onChange={(e) => setQuickReplyForm(prev => ({ ...prev, shortcut: e.target.value }))}
            helper="Start with / for easy recognition"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
              Message
            </label>
            <textarea
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-dark-bg dark:border-dark-border dark:text-dark-text"
              rows={4}
              placeholder="Enter the quick reply message..."
              value={quickReplyForm.message}
              onChange={(e) => setQuickReplyForm(prev => ({ ...prev, message: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowQuickReplyModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveQuickReply} isLoading={saving}>
              {editingQuickReply ? 'Update' : 'Add'} Quick Reply
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default WhatsAppPage
