// Mock user data
export const mockUser = {
  wh_account_id: 957,
  user_id: 957,
  firstname: 'Test',
  lastname: 'User',
  email: 'test@example.com',
  phone: '+1234567890',
  company_name: 'Test Company',
  Shipper_earnings: '1000.00',
  driver_id: null,
  mode: 'seller',
}

export const mockDriverUser = {
  ...mockUser,
  driver_id: 123,
  mode: 'driver',
}

// Mock dashboard data
export const mockDashboardData = {
  status: 1,
  code: 200,
  message: 'Data Fetched Successfully',
  data: {
    latest_ai_orders_count: {
      Total: 12,
      Shipped: 2,
      Pending: 5,
      Accepted: 2,
      Packed: 1,
      Cancelled: 1,
      Intransit: 3,
      Delivered: 2,
    },
    statementdetails: [
      {
        section_title: 'Earnings',
        section_value: [
          {
            id: 757,
            head_code: '2',
            total_val: '1500.00',
            head_name: 'AI Orders',
            head_type: 'Earnings',
            code_type: 1,
          },
        ],
      },
    ],
    statement_balance: {
      opening_balance: 1000.0,
      closing_balance: 1500.0,
    },
    latest_ai_orders: [
      {
        id: 1140,
        invoice_no: 'inv-1765824535',
        shipper_id: 957,
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890',
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        zip_code: '10001',
        total_product: 2,
        total_product_quantity: 3,
        order_amount: '50.00',
        total_amount: '55.00',
        shipper_payout: '45.00',
        accepted: 'N',
        packed: 'N',
        Shipped: 'N',
        delivered: 'N',
        cancelled: 'N',
        order_date: '2025-12-15 10:00:00',
        delivery_type: '',
      },
      {
        id: 1139,
        invoice_no: 'inv-1765824372',
        shipper_id: 957,
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '0987654321',
        address: '456 Oak Ave',
        city: 'Los Angeles',
        state: 'CA',
        zip_code: '90001',
        total_product: 1,
        total_product_quantity: 1,
        order_amount: '25.00',
        total_amount: '30.00',
        shipper_payout: '22.00',
        accepted: 'Y',
        packed: 'N',
        Shipped: 'N',
        delivered: 'N',
        cancelled: 'N',
        order_date: '2025-12-14 15:30:00',
        delivery_type: 'self',
      },
    ],
  },
}

// Mock orders data
export const mockOrders = {
  status: 1,
  data: {
    orders: [
      {
        order_id: 1140,
        invoice_no: 'inv-1765824535',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890',
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        zip_code: '10001',
        total_amount: '55.00',
        order_amount: '50.00',
        total_product_quantity: 3,
        accepted: 'N',
        packed: 'N',
        Shipped: 'N',
        delivered: 'N',
        cancelled: 'N',
        delivery_type: '',
        order_date: '2025-12-15 10:00:00',
        OrderProducts: [
          {
            title: 'Product 1',
            quantity: 2,
            price: '20.00',
            total_price: '40.00',
            images: null,
            ai_category_name: 'Electronics',
          },
          {
            title: 'Product 2',
            quantity: 1,
            price: '10.00',
            total_price: '10.00',
            images: null,
            ai_category_name: 'Accessories',
          },
        ],
      },
      {
        order_id: 1139,
        invoice_no: 'inv-1765824372',
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '0987654321',
        address: '456 Oak Ave',
        city: 'Los Angeles',
        state: 'CA',
        zip_code: '90001',
        total_amount: '30.00',
        order_amount: '25.00',
        total_product_quantity: 1,
        accepted: 'Y',
        packed: 'Y',
        Shipped: 'N',
        delivered: 'N',
        cancelled: 'N',
        delivery_type: 'self',
        order_date: '2025-12-14 15:30:00',
        OrderProducts: [
          {
            title: 'Product 3',
            quantity: 1,
            price: '25.00',
            total_price: '25.00',
            images: null,
            ai_category_name: 'Clothing',
          },
        ],
      },
    ],
    total: 2,
    pending: 1,
  },
}

// Mock products data
export const mockProducts = {
  status: 1,
  data: {
    products: [
      {
        id: 1,
        title: 'Test Product 1',
        description: 'A test product',
        price: '29.99',
        quantity: 100,
        images: null,
        category_name: 'Electronics',
        is_active: 1,
      },
      {
        id: 2,
        title: 'Test Product 2',
        description: 'Another test product',
        price: '49.99',
        quantity: 50,
        images: null,
        category_name: 'Clothing',
        is_active: 1,
      },
    ],
    total: 2,
  },
}

// Mock WhatsApp status
export const mockWhatsAppStatus = {
  status: 1,
  data: {
    is_connected: true,
    connection_status: 'connected',
    phone_number: '+17158826516',
    phone_number_id: '123456789',
    waba_id: '987654321',
    business_id: '111222333',
    business_name: 'Test Business',
    catalog_id: '444555666',
    bot_settings: {
      welcomeMessage: 'Hello! Welcome to our store.',
      awayMessage: 'We are currently away.',
      businessHoursEnabled: true,
      autoReplyEnabled: true,
    },
  },
}

export const mockWhatsAppDisconnected = {
  status: 1,
  data: {
    is_connected: false,
    connection_status: 'disconnected',
  },
}

// Mock driver deliveries
export const mockDriverDeliveries = {
  status: 1,
  data: {
    deliveries: [
      {
        id: 1,
        order_id: 1140,
        pickup_address: '123 Store St',
        delivery_address: '456 Customer Ave',
        status: 'pending',
        customer_name: 'John Doe',
        customer_phone: '1234567890',
        total_amount: '55.00',
        delivery_fee: '5.00',
        created_at: '2025-12-15 10:00:00',
      },
    ],
    total: 1,
  },
}

// Mock auth responses
export const mockLoginResponse = {
  status: 1,
  message: 'Login successful',
  data: {
    access_token: 'mock-jwt-token',
    user: mockUser,
  },
}

export const mockRegisterResponse = {
  status: 1,
  message: 'Registration successful',
  data: {
    access_token: 'mock-jwt-token',
    user: mockUser,
  },
}

export const mockLoginError = {
  status: 0,
  message: 'Invalid credentials',
}

// Mock API error
export const mockApiError = {
  status: 0,
  message: 'Something went wrong',
}
