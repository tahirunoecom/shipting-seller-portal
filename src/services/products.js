import api from './api'

export const productService = {
  // Get categories
  async getCategories() {
    const response = await api.post('/getCategories')
    return response.data
  },

  // Get category list
  async getCategoryList() {
    const response = await api.post('/getCategoryList')
    return response.data
  },

  // Get seller's products
  async getSellerProducts(wh_account_id, params = {}) {
    const response = await api.post('/getSellerProducts', { 
      wh_account_id,
      ...params 
    })
    return response.data
  },

  // Verify UPC code
  async verifyUPC(upc) {
    const response = await api.post('/verifyUPC', { upc })
    return response.data
  },

  // Add product
  async addProduct(data) {
    const response = await api.post('/addProductsToShipper', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // Edit product
  async editProduct(data) {
    const response = await api.post('/EditProductsToShipper', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // Toggle product status
  async toggleProductStatus(data) {
    const response = await api.post('/ToggleProductsToShipper', data)
    return response.data
  },

  // Add bulk products
  async addBulkProducts(data) {
    const response = await api.post('/addBulkProductsToShipper', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // Get bulk uploaded products
  async getBulkUploadedProducts(wh_account_id) {
    const response = await api.post('/getBulkUploadedProductList', { wh_account_id })
    return response.data
  },

  // Get shipper products (public)
  async getShipperProducts(params) {
    const response = await api.post('/getShipperProducts', params)
    return response.data
  },

  // Get total product count
  async getShipperProductsTotalCount(wh_account_id) {
    const response = await api.post('/getShipperProductsTotalCount', { wh_account_id })
    return response.data
  },
}

export default productService
