import api from './api'

/**
 * WhatsApp Bot Service
 * Handles all WhatsApp Business API integrations
 * Including Meta Embedded Signup flow
 */

export const whatsappService = {
  // ============================================
  // META EMBEDDED SIGNUP ENDPOINTS
  // ============================================

  // Get WhatsApp connection status for a seller
  async getWhatsAppStatus(wh_account_id) {
    const response = await api.post('/seller/whatsapp/status', {
      wh_account_id,
    })
    return response.data
  },

  // Exchange OAuth code for access token (called after FB login)
  async exchangeToken(code, wh_account_id) {
    const response = await api.post('/seller/whatsapp/exchange-token', {
      code,
      wh_account_id,
    })
    return response.data
  },

  // Save session info from Embedded Signup (WABA ID, Phone Number ID)
  async saveSessionInfo(data) {
    const response = await api.post('/seller/whatsapp/session-info', {
      wh_account_id: data.wh_account_id,
      waba_id: data.waba_id,
      phone_number_id: data.phone_number_id,
      business_id: data.business_id,
    })
    return response.data
  },

  // Disconnect WhatsApp Business Account
  async disconnect(wh_account_id) {
    const response = await api.post('/seller/whatsapp/disconnect', {
      wh_account_id,
    })
    return response.data
  },

  // Create WhatsApp Catalog (called after connection)
  async createCatalog(wh_account_id) {
    const response = await api.post('/seller/whatsapp/create-catalog', {
      wh_account_id,
    })
    return response.data
  },

  // Sync products to WhatsApp Catalog
  async syncCatalog(wh_account_id) {
    const response = await api.post('/seller/whatsapp/sync-catalog', {
      wh_account_id,
    })
    return response.data
  },

  // ============================================
  // BOT SETTINGS ENDPOINTS
  // ============================================

  // Update bot settings (welcome message, away message, etc.)
  async updateBotSettings(data) {
    const response = await api.post('/seller/whatsapp/bot-settings', data)
    return response.data
  },

  // Get bot settings
  async getBotSettings(wh_account_id) {
    const response = await api.post('/seller/whatsapp/bot-settings/get', {
      wh_account_id,
    })
    return response.data
  },

  // ============================================
  // AUTO-REPLIES ENDPOINTS
  // ============================================

  // Get all auto-replies
  async getAutoReplies(wh_account_id) {
    const response = await api.post('/seller/whatsapp/auto-replies', {
      wh_account_id,
    })
    return response.data
  },

  // Save auto-reply (create or update)
  async saveAutoReply(data) {
    const response = await api.post('/seller/whatsapp/auto-replies/save', data)
    return response.data
  },

  // Delete auto-reply
  async deleteAutoReply(wh_account_id, reply_id) {
    const response = await api.post('/seller/whatsapp/auto-replies/delete', {
      wh_account_id,
      reply_id,
    })
    return response.data
  },

  // Toggle auto-reply status
  async toggleAutoReply(wh_account_id, reply_id) {
    const response = await api.post('/seller/whatsapp/auto-replies/toggle', {
      wh_account_id,
      reply_id,
    })
    return response.data
  },

  // ============================================
  // QUICK REPLIES ENDPOINTS
  // ============================================

  // Get all quick replies
  async getQuickReplies(wh_account_id) {
    const response = await api.post('/seller/whatsapp/quick-replies', {
      wh_account_id,
    })
    return response.data
  },

  // Save quick reply (create or update)
  async saveQuickReply(data) {
    const response = await api.post('/seller/whatsapp/quick-replies/save', data)
    return response.data
  },

  // Delete quick reply
  async deleteQuickReply(wh_account_id, reply_id) {
    const response = await api.post('/seller/whatsapp/quick-replies/delete', {
      wh_account_id,
      reply_id,
    })
    return response.data
  },

  // ============================================
  // MESSAGING ENDPOINTS
  // ============================================

  // Send test message
  async sendTestMessage(wh_account_id, phone_number, message) {
    const response = await api.post('/seller/whatsapp/send-test', {
      wh_account_id,
      phone_number,
      message,
    })
    return response.data
  },

  // Get message templates
  async getMessageTemplates(wh_account_id) {
    const response = await api.post('/seller/whatsapp/templates', {
      wh_account_id,
    })
    return response.data
  },

  // ============================================
  // ANALYTICS ENDPOINTS
  // ============================================

  // Get WhatsApp analytics
  async getAnalytics(wh_account_id, date_range = '7d') {
    const response = await api.post('/seller/whatsapp/analytics', {
      wh_account_id,
      date_range,
    })
    return response.data
  },

  // ============================================
  // LEGACY ENDPOINTS (keeping for backwards compatibility)
  // ============================================

  // Get WhatsApp configuration for a seller
  async getWhatsAppConfig(wh_account_id) {
    const response = await api.post('/seller/whatsapp/config', {
      wh_account_id,
    })
    return response.data
  },

  // Save WhatsApp configuration
  async saveWhatsAppConfig(data) {
    const response = await api.post('/seller/whatsapp/config/save', data)
    return response.data
  },

  // Connect WhatsApp Business Account (legacy)
  async connectWhatsApp(wh_account_id, phone_number) {
    const response = await api.post('/seller/whatsapp/connect', {
      wh_account_id,
      phone_number,
    })
    return response.data
  },

  // Disconnect WhatsApp Business Account (legacy)
  async disconnectWhatsApp(wh_account_id) {
    const response = await api.post('/seller/whatsapp/disconnect', {
      wh_account_id,
    })
    return response.data
  },

  // Get bot commands/auto-replies (legacy)
  async getBotCommands(wh_account_id) {
    const response = await api.post('/seller/whatsapp/commands', {
      wh_account_id,
    })
    return response.data
  },

  // Save bot command (legacy)
  async saveBotCommand(data) {
    const response = await api.post('/seller/whatsapp/commands/save', data)
    return response.data
  },

  // Delete bot command (legacy)
  async deleteBotCommand(wh_account_id, command_id) {
    const response = await api.post('/seller/whatsapp/commands/delete', {
      wh_account_id,
      command_id,
    })
    return response.data
  },

  // Test WhatsApp connection (legacy)
  async testWhatsAppConnection(wh_account_id) {
    const response = await api.post('/seller/whatsapp/test', {
      wh_account_id,
    })
    return response.data
  },

  // Get WhatsApp analytics (legacy)
  async getWhatsAppAnalytics(wh_account_id, date_range) {
    const response = await api.post('/seller/whatsapp/analytics', {
      wh_account_id,
      date_range,
    })
    return response.data
  },
}

export default whatsappService
