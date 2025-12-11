import api from './api'

/**
 * WhatsApp Bot Service
 * Handles all WhatsApp Business API integrations
 */

export const whatsappService = {
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

  // Connect WhatsApp Business Account
  async connectWhatsApp(wh_account_id, phone_number) {
    const response = await api.post('/seller/whatsapp/connect', {
      wh_account_id,
      phone_number,
    })
    return response.data
  },

  // Disconnect WhatsApp Business Account
  async disconnectWhatsApp(wh_account_id) {
    const response = await api.post('/seller/whatsapp/disconnect', {
      wh_account_id,
    })
    return response.data
  },

  // Get bot commands/auto-replies
  async getBotCommands(wh_account_id) {
    const response = await api.post('/seller/whatsapp/commands', {
      wh_account_id,
    })
    return response.data
  },

  // Save bot command
  async saveBotCommand(data) {
    const response = await api.post('/seller/whatsapp/commands/save', data)
    return response.data
  },

  // Delete bot command
  async deleteBotCommand(wh_account_id, command_id) {
    const response = await api.post('/seller/whatsapp/commands/delete', {
      wh_account_id,
      command_id,
    })
    return response.data
  },

  // Get quick replies
  async getQuickReplies(wh_account_id) {
    const response = await api.post('/seller/whatsapp/quick-replies', {
      wh_account_id,
    })
    return response.data
  },

  // Save quick reply
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

  // Test WhatsApp connection
  async testWhatsAppConnection(wh_account_id) {
    const response = await api.post('/seller/whatsapp/test', {
      wh_account_id,
    })
    return response.data
  },

  // Send test message
  async sendTestMessage(wh_account_id, phone_number, message) {
    const response = await api.post('/seller/whatsapp/send-test', {
      wh_account_id,
      phone_number,
      message,
    })
    return response.data
  },

  // Get WhatsApp message templates
  async getMessageTemplates(wh_account_id) {
    const response = await api.post('/seller/whatsapp/templates', {
      wh_account_id,
    })
    return response.data
  },

  // Get WhatsApp analytics
  async getWhatsAppAnalytics(wh_account_id, date_range) {
    const response = await api.post('/seller/whatsapp/analytics', {
      wh_account_id,
      date_range,
    })
    return response.data
  },
}

export default whatsappService
