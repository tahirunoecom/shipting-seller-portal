import { http, HttpResponse } from 'msw'
import {
  mockLoginResponse,
  mockRegisterResponse,
  mockDashboardData,
  mockOrders,
  mockProducts,
  mockWhatsAppStatus,
  mockDriverDeliveries,
} from './data'

const API_BASE = 'https://stageshipperapi.thedelivio.com/api'

export const handlers = [
  // Auth endpoints
  http.post(`${API_BASE}/login`, () => {
    return HttpResponse.json(mockLoginResponse)
  }),

  http.post(`${API_BASE}/register`, () => {
    return HttpResponse.json(mockRegisterResponse)
  }),

  http.post(`${API_BASE}/logout`, () => {
    return HttpResponse.json({ status: 1, message: 'Logged out successfully' })
  }),

  // Dashboard endpoint
  http.post(`${API_BASE}/dashboardData`, () => {
    return HttpResponse.json(mockDashboardData)
  }),

  // Orders endpoints
  http.post(`${API_BASE}/getShipperOrders`, () => {
    return HttpResponse.json(mockOrders)
  }),

  http.post(`${API_BASE}/OrderStatusUpdate`, () => {
    return HttpResponse.json({ status: 1, message: 'Order status updated' })
  }),

  http.post(`${API_BASE}/OrderCancelled`, () => {
    return HttpResponse.json({ status: 1, message: 'Order cancelled' })
  }),

  http.post(`${API_BASE}/change-delivery-type`, () => {
    return HttpResponse.json({ status: 1, message: 'Delivery type changed' })
  }),

  // Products endpoints
  http.post(`${API_BASE}/getMasterProducts`, () => {
    return HttpResponse.json(mockProducts)
  }),

  http.post(`${API_BASE}/getShipperProductsCount`, () => {
    return HttpResponse.json({ status: 1, data: { total: 25 } })
  }),

  // WhatsApp endpoints
  http.post(`${API_BASE}/seller/whatsapp/status`, () => {
    return HttpResponse.json(mockWhatsAppStatus)
  }),

  http.post(`${API_BASE}/seller/whatsapp/exchange-token`, () => {
    return HttpResponse.json({ status: 1, message: 'Token exchanged' })
  }),

  http.post(`${API_BASE}/seller/whatsapp/disconnect`, () => {
    return HttpResponse.json({ status: 1, message: 'Disconnected' })
  }),

  http.post(`${API_BASE}/seller/whatsapp/sync-catalog`, () => {
    return HttpResponse.json({ status: 1, data: { synced: 10 } })
  }),

  http.post(`${API_BASE}/seller/whatsapp/list-catalogs`, () => {
    return HttpResponse.json({
      status: 1,
      data: {
        catalogs: [
          { id: '123', name: 'Main Catalog', vertical: 'commerce', is_commerce: true, is_current: true },
        ],
      },
    })
  }),

  http.post(`${API_BASE}/seller/whatsapp/phone-status`, () => {
    return HttpResponse.json({
      status: 1,
      data: {
        overall_status: 'CONNECTED',
        phone_number: '+17158826516',
        verified_name: 'Test Business',
        registration_status: 'CONNECTED',
        code_verification_status: 'VERIFIED',
        name_status: 'APPROVED',
        account_mode: 'LIVE',
        quality_rating: 'GREEN',
      },
    })
  }),

  // Driver endpoints
  http.post(`${API_BASE}/driver/deliveries`, () => {
    return HttpResponse.json(mockDriverDeliveries)
  }),

  http.post(`${API_BASE}/driver/accept-delivery`, () => {
    return HttpResponse.json({ status: 1, message: 'Delivery accepted' })
  }),

  http.post(`${API_BASE}/driver/update-status`, () => {
    return HttpResponse.json({ status: 1, message: 'Status updated' })
  }),

  http.post(`${API_BASE}/driver/earnings`, () => {
    return HttpResponse.json({
      status: 1,
      data: {
        total_earnings: '500.00',
        today_earnings: '50.00',
        pending_payout: '100.00',
      },
    })
  }),
]
