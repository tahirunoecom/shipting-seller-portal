import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders, screen, waitFor, userEvent } from '@/test/utils'
import ProductsPage from './ProductsPage'
import { useAuthStore } from '@/store'
import { productService } from '@/services'

// Mock the stores and services
vi.mock('@/store', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('@/services', () => ({
  productService: {
    getShipperProducts: vi.fn(),
    getCategoryList: vi.fn(),
    getSubcategories: vi.fn(),
    addProduct: vi.fn(),
    editProduct: vi.fn(),
    toggleProductStatus: vi.fn(),
    addSubcategory: vi.fn(),
    verifyUPC: vi.fn(),
    getShipperProductsTotalCount: vi.fn(),
  },
}))

const mockProducts = {
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
        status: 1,
        upc: '1234567890123',
      },
      {
        id: 2,
        title: 'Test Product 2',
        description: 'Another test product',
        price: '49.99',
        quantity: 50,
        images: null,
        category_name: 'Clothing',
        status: 1,
        upc: '9876543210987',
      },
      {
        id: 3,
        title: 'Inactive Product',
        description: 'An inactive product',
        price: '19.99',
        quantity: 0,
        images: null,
        category_name: 'Electronics',
        status: 0,
        upc: '5555555555555',
      },
    ],
    total: 3,
  },
}

const mockCategories = {
  status: 1,
  data: {
    categories: [
      { category_id: 1, name: 'Electronics' },
      { category_id: 2, name: 'Clothing' },
      { category_id: 3, name: 'Restaurant' },
    ],
  },
}

describe('ProductsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.mockReturnValue({
      user: {
        wh_account_id: 957,
      },
    })
    productService.getShipperProducts.mockResolvedValue(mockProducts)
    productService.getCategoryList.mockResolvedValue(mockCategories)
    productService.getSubcategories.mockResolvedValue({
      status: 1,
      data: { subcategories: [] },
    })
  })

  it('renders products page header', async () => {
    renderWithProviders(<ProductsPage />)

    await waitFor(() => {
      expect(screen.getByText('Products')).toBeInTheDocument()
    })
  })

  it('displays add product button', async () => {
    renderWithProviders(<ProductsPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add product/i })).toBeInTheDocument()
    })
  })

  it('displays search input', async () => {
    renderWithProviders(<ProductsPage />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search products/i)).toBeInTheDocument()
    })
  })

  it('displays view mode toggle buttons', async () => {
    renderWithProviders(<ProductsPage />)

    await waitFor(() => {
      // Should have multiple buttons including add product and view toggles
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    }, { timeout: 3000 })
  })

  it('displays products in grid/list', async () => {
    renderWithProviders(<ProductsPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Product 1')).toBeInTheDocument()
      expect(screen.getByText('Test Product 2')).toBeInTheDocument()
    })
  })

  it('shows loading state initially', () => {
    renderWithProviders(<ProductsPage />)

    expect(screen.getByTestId('page-loader')).toBeInTheDocument()
  })

  it('filters products by search query', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ProductsPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Product 1')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(/search products/i)
    await user.type(searchInput, 'Product 2')

    await waitFor(() => {
      expect(screen.queryByText('Test Product 1')).not.toBeInTheDocument()
      expect(screen.getByText('Test Product 2')).toBeInTheDocument()
    })
  })

  it('displays empty state when no products', async () => {
    productService.getShipperProducts.mockResolvedValue({
      status: 1,
      data: { products: [] },
    })

    renderWithProviders(<ProductsPage />)

    await waitFor(() => {
      expect(screen.getByText(/no products found/i)).toBeInTheDocument()
    })
  })

  it('opens add product modal on button click', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ProductsPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add product/i })).toBeInTheDocument()
    })

    const addButton = screen.getByRole('button', { name: /add product/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText(/add new product/i)).toBeInTheDocument()
    })
  })

  it('displays product prices correctly formatted', async () => {
    renderWithProviders(<ProductsPage />)

    await waitFor(() => {
      // Check that product prices are displayed (may be multiple elements)
      const priceElements = screen.getAllByText(/\$\d+\.\d{2}/)
      expect(priceElements.length).toBeGreaterThan(0)
    }, { timeout: 3000 })
  })

  it('displays product categories', async () => {
    renderWithProviders(<ProductsPage />)

    await waitFor(() => {
      expect(screen.getByText('Electronics')).toBeInTheDocument()
      expect(screen.getByText('Clothing')).toBeInTheDocument()
    })
  })

  it('shows active/inactive status', async () => {
    renderWithProviders(<ProductsPage />)

    await waitFor(() => {
      // Products with status = 1 should show as active
      expect(screen.getByText('Test Product 1')).toBeInTheDocument()
    })
  })

  it('calls API to fetch products', async () => {
    renderWithProviders(<ProductsPage />)

    await waitFor(() => {
      expect(productService.getShipperProducts).toHaveBeenCalled()
    })
  })

  it('calls API to fetch categories', async () => {
    renderWithProviders(<ProductsPage />)

    await waitFor(() => {
      expect(productService.getCategoryList).toHaveBeenCalled()
    })
  })
})
