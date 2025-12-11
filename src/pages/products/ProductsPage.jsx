import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store'
import { productService } from '@/services'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Select,
  Badge,
  Modal,
  ModalFooter,
  PageLoader,
} from '@/components/ui'
import { formatCurrency } from '@/utils/helpers'
import {
  Plus,
  Search,
  Filter,
  Grid3X3,
  List,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Package,
  Upload,
  Camera,
  X,
  FolderPlus,
} from 'lucide-react'
import toast from 'react-hot-toast'

// Local storage key for subcategories
const SUBCATEGORIES_STORAGE_KEY = 'shipting_subcategories'

// Get subcategories from localStorage
const getStoredSubcategories = () => {
  try {
    const stored = localStorage.getItem(SUBCATEGORIES_STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

// Save subcategories to localStorage
const saveSubcategories = (subcategories) => {
  localStorage.setItem(SUBCATEGORIES_STORAGE_KEY, JSON.stringify(subcategories))
}

// Generate a 13-digit UPC code for restaurant products
const generateUPC = () => {
  // Generate 13 numeric digits
  const timestamp = Date.now().toString().slice(-10) // Last 10 digits of timestamp
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0') // 3 random digits
  return timestamp + random // Total: 13 digits
}

// Restaurant category names (case-insensitive check)
const RESTAURANT_CATEGORIES = ['restaurant', 'restaurants', 'food', 'food & dining', 'dining', 'cafe', 'bakery']

function ProductsPage() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [defaultCategoryId, setDefaultCategoryId] = useState('') // Restaurant category ID
  const [subcategories, setSubcategories] = useState({}) // { category_id: [{id, name}] }
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false)
  const [newSubcategoryName, setNewSubcategoryName] = useState('')
  const [editingProduct, setEditingProduct] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    category_id: '',
    subcategory_id: '',
    upc: '',
    price: '',
    discount: '',
    quantity: '',
    description: '',
    brand: '',
    model: '',
    color: '',
    weight: '',
    product_type: 'New',
    status: 1,
    image: null,
  })

  // Check if selected category is a restaurant category
  const isRestaurantCategory = () => {
    if (!formData.category_id) return false
    // Compare as strings to handle type mismatches
    const selectedCat = categories.find(c =>
      String(c.category_id) === String(formData.category_id)
    )
    if (!selectedCat) return false
    const categoryName = selectedCat.name?.toLowerCase() || ''
    return RESTAURANT_CATEGORIES.some(rc => categoryName.includes(rc.toLowerCase()))
  }

  useEffect(() => {
    loadProducts()
    loadCategories()
    // Load stored subcategories
    setSubcategories(getStoredSubcategories())
  }, [])

  const loadProducts = async () => {
    try {
      setLoading(true)
      // Use getShipperProducts API with correct request structure
      const response = await productService.getShipperProducts({
        wh_account_id: user.wh_account_id,
        upc: '',
        ai_category_id: '',
        ai_product_id: '',
        product_id: '',
        zipcode: '',
      })
      console.log('Products API response:', response)

      if (response.status === 1) {
        // Response structure: data.getSellerProducts[]
        const productsData = response.data?.getSellerProducts || response.data?.products || []
        console.log('Products loaded:', productsData.length)
        setProducts(productsData)
      }
    } catch (error) {
      console.error('Failed to load products:', error)
      toast.error('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      // Use getCategoryList API - response structure: data.getCategories[]
      const response = await productService.getCategoryList()
      console.log('Categories API response:', response)

      if (response.status === 1) {
        // API returns data.getCategories array with id, name, image, status
        let rawCategories = response.data?.getCategories || response.data?.categories || []

        // Normalize categories to consistent format
        const normalizedCategories = rawCategories.map(cat => ({
          category_id: cat.id || cat.category_id || '',
          name: cat.name || cat.category_name || '',
          image: cat.image || '',
          status: cat.status || 1,
        }))

        console.log('Normalized categories:', normalizedCategories)
        setCategories(normalizedCategories)

        // Find Restaurant category and set as default
        const restaurantCat = normalizedCategories.find(cat =>
          cat.name?.toLowerCase().includes('restaurant')
        )
        if (restaurantCat) {
          setDefaultCategoryId(String(restaurantCat.category_id))
          console.log('Default category set to Restaurant:', restaurantCat.category_id)
        }

        if (normalizedCategories.length === 0) {
          console.warn('No categories found in response')
        }
      } else {
        console.error('Categories API returned error status:', response.message)
      }
    } catch (error) {
      console.error('Failed to load categories:', error)
      toast.error('Failed to load categories')
    }
  }

  // Add a new subcategory for a category (stored locally)
  const handleAddSubcategory = () => {
    if (!formData.category_id) {
      toast.error('Please select a category first')
      return
    }
    if (!newSubcategoryName.trim()) {
      toast.error('Please enter a subcategory name')
      return
    }

    const categoryId = formData.category_id
    const newSubcategory = {
      id: `sub_${Date.now()}`,
      name: newSubcategoryName.trim(),
    }

    const updatedSubcategories = {
      ...subcategories,
      [categoryId]: [...(subcategories[categoryId] || []), newSubcategory],
    }

    setSubcategories(updatedSubcategories)
    saveSubcategories(updatedSubcategories)
    setFormData(prev => ({ ...prev, subcategory_id: newSubcategory.id }))
    setNewSubcategoryName('')
    setShowSubcategoryModal(false)
    toast.success('Subcategory added!')
  }

  // Get subcategories for selected category
  const currentSubcategories = formData.category_id ? (subcategories[formData.category_id] || []) : []

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFormData((prev) => ({ ...prev, image: file }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const isRestaurant = isRestaurantCategory()
      const data = new FormData()

      // Required fields
      data.append('wh_account_id', user.wh_account_id)
      data.append('title', formData.title)
      data.append('ai_category_id', formData.category_id) // API uses ai_category_id
      data.append('price', formData.price)
      data.append('discount', formData.discount || '0')
      data.append('quantity', formData.quantity || '0')
      data.append('description', formData.description || '')

      // UPC - auto-generate for restaurant, use form value for others
      const upcValue = isRestaurant ? generateUPC() : formData.upc
      data.append('upc', upcValue)

      // For restaurant: send empty values for these fields
      // For non-restaurant: use form values
      data.append('brand', isRestaurant ? '' : (formData.brand || ''))
      data.append('model', isRestaurant ? '' : (formData.model || ''))
      data.append('color', isRestaurant ? '' : (formData.color || ''))
      data.append('weight', isRestaurant ? '' : (formData.weight || ''))

      // Product status: Y or N based on status toggle
      data.append('product_status', formData.status === 1 ? 'Y' : 'N')

      // Product type: New, Used, Used-Like New
      data.append('product_type', formData.product_type || 'New')

      // Always set is_manual to Y
      data.append('is_manual', 'Y')

      // Optional fields
      if (formData.subcategory_id) {
        data.append('subcategory_id', formData.subcategory_id)
      }

      // Image file - send as regular file upload (not environment='web')
      // API will process it: move to ProductImagesUpload folder and return URL
      if (formData.image) {
        data.append('file', formData.image)
      }

      let response
      if (editingProduct) {
        // Use same addProductsToShipper API with shipper_product_id for updates
        data.append('shipper_product_id', editingProduct.product_id)
      }
      // Both add and edit use the same API
      response = await productService.addProduct(data)

      if (response.status === 1) {
        toast.success(editingProduct ? 'Product updated!' : 'Product added!')
        setShowAddModal(false)
        setEditingProduct(null)
        resetForm()
        loadProducts()
      } else {
        toast.error(response.message || 'Failed to save product')
      }
    } catch (error) {
      console.error('Failed to save product:', error)
      toast.error('Failed to save product')
    }
  }

  const handleToggleStatus = async (product) => {
    try {
      const response = await productService.toggleProductStatus({
        product_id: product.product_id,
        wh_account_id: user.wh_account_id,
        status: product.status === 'Y' ? 'N' : 'Y',
      })
      if (response.status === 1) {
        toast.success('Product status updated!')
        loadProducts()
      }
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  const handleEdit = (product) => {
    console.log('Editing product:', product) // Debug: see all fields

    // Get category_id as string for proper comparison
    const categoryId = String(product.ai_category_id || product.category_id || '')

    setEditingProduct({
      ...product,
      product_id: product.product_id, // For form submission
      image: product.images, // For image preview
    })
    setFormData({
      title: product.title || '',
      category_id: categoryId,
      subcategory_id: product.subcategory_id || product.sub_category_id || '',
      upc: product.upc || '',
      price: product.price || product.lowest_recorded_price || '',
      discount: product.discount || '',
      quantity: product.DB_qty || product.quantity || '',
      description: product.description || '',
      brand: product.brand || '',
      model: product.model || '',
      color: product.color || '',
      weight: product.weight || '',
      product_type: product.product_type || 'New',
      status: product.status === 'Y' ? 1 : 0,
      image: null,
    })
    setShowAddModal(true)
  }

  // Open Add Product modal with Restaurant category as default
  const openAddProductModal = () => {
    setEditingProduct(null)
    setFormData({
      title: '',
      category_id: defaultCategoryId, // Default to Restaurant
      subcategory_id: '',
      upc: '',
      price: '',
      discount: '',
      quantity: '',
      description: '',
      brand: '',
      model: '',
      color: '',
      weight: '',
      product_type: 'New',
      status: 1,
      image: null,
    })
    setShowAddModal(true)
  }

  const resetForm = () => {
    setFormData({
      title: '',
      category_id: defaultCategoryId, // Keep Restaurant as default
      subcategory_id: '',
      upc: '',
      price: '',
      discount: '',
      quantity: '',
      description: '',
      brand: '',
      model: '',
      color: '',
      weight: '',
      product_type: 'New',
      status: 1,
      image: null,
    })
  }

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.upc?.includes(searchQuery)
    const matchesCategory = !selectedCategory ||
      String(product.ai_category_id || product.category_id) === String(selectedCategory)
    return matchesSearch && matchesCategory
  })

  if (loading) {
    return <PageLoader />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Products</h1>
          <p className="text-gray-500 dark:text-dark-muted">
            Manage your product inventory
          </p>
        </div>
        <Button onClick={openAddProductModal}>
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category filter */}
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              options={[
                { value: '', label: 'All Categories' },
                ...categories.map((cat) => ({
                  value: cat.category_id,
                  label: cat.name,
                })),
              ]}
              className="md:w-48"
            />

            {/* View toggle */}
            <div className="flex rounded-lg border border-gray-200 dark:border-dark-border">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2.5 ${
                  viewMode === 'grid'
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-500 hover:bg-gray-100'
                } rounded-l-lg transition-colors`}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2.5 ${
                  viewMode === 'list'
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-500 hover:bg-gray-100'
                } rounded-r-lg transition-colors`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid/List */}
      {filteredProducts.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <Card key={product.product_id} className="overflow-hidden hover:shadow-card-hover transition-shadow">
                <div className="aspect-square bg-gray-100 dark:bg-dark-border relative">
                  {product.images ? (
                    <img
                      src={product.images}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-12 w-12 text-gray-300" />
                    </div>
                  )}
                  <Badge
                    variant={product.status === 'Y' ? 'success' : 'danger'}
                    className="absolute top-2 right-2"
                  >
                    {product.status === 'Y' ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-medium text-gray-900 dark:text-dark-text truncate">
                    {product.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-dark-muted mt-1">
                    {product.ai_category_name || 'Uncategorized'}
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-lg font-bold text-primary-600">
                      {formatCurrency(product.discounted_price || product.lowest_recorded_price || 0)}
                    </p>
                    <p className="text-sm text-gray-500">Sold: {product.ordered_qty || 0}</p>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEdit(product)}
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant={product.status === 'Y' ? 'secondary' : 'primary'}
                      size="sm"
                      onClick={() => handleToggleStatus(product)}
                    >
                      {product.status === 'Y' ? (
                        <ToggleRight className="h-4 w-4" />
                      ) : (
                        <ToggleLeft className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="table-header">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
                  {filteredProducts.map((product) => (
                    <tr key={product.product_id} className="hover:bg-gray-50 dark:hover:bg-dark-border">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-dark-border flex items-center justify-center overflow-hidden">
                            {product.images ? (
                              <img
                                src={product.images}
                                alt={product.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Package className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <span className="font-medium">{product.title}</span>
                        </div>
                      </td>
                      <td className="table-cell">{product.ai_category_name || '-'}</td>
                      <td className="table-cell font-medium">
                        {formatCurrency(product.discounted_price || product.lowest_recorded_price || 0)}
                      </td>
                      <td className="table-cell">{product.ordered_qty || 0}</td>
                      <td className="table-cell">
                        <Badge variant={product.status === 'Y' ? 'success' : 'danger'}>
                          {product.status === 'Y' ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="table-cell">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(product)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleStatus(product)}
                          >
                            {product.status === 'Y' ? (
                              <ToggleRight className="h-4 w-4 text-green-500" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text">
              No products found
            </h3>
            <p className="text-gray-500 dark:text-dark-muted mt-1">
              {searchQuery || selectedCategory
                ? 'Try adjusting your filters'
                : 'Add your first product to get started'}
            </p>
            {!searchQuery && !selectedCategory && (
              <Button className="mt-4" onClick={openAddProductModal}>
                <Plus className="h-4 w-4" />
                Add Product
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Product Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          setEditingProduct(null)
          resetForm()
        }}
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {/* Category and Subcategory Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Category"
              name="category_id"
              value={formData.category_id}
              onChange={(e) => {
                handleInputChange(e)
                // Reset subcategory when category changes
                setFormData(prev => ({ ...prev, category_id: e.target.value, subcategory_id: '' }))
              }}
              options={categories.map((cat) => ({
                value: cat.category_id,
                label: cat.name,
              }))}
              placeholder="Select category"
              required
            />
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">Subcategory</label>
                {formData.category_id && (
                  <button
                    type="button"
                    onClick={() => setShowSubcategoryModal(true)}
                    className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    <FolderPlus className="h-3 w-3" />
                    Add New
                  </button>
                )}
              </div>
              <Select
                name="subcategory_id"
                value={formData.subcategory_id}
                onChange={handleInputChange}
                options={[
                  { value: '', label: 'Select subcategory (optional)' },
                  ...currentSubcategories.map((sub) => ({
                    value: sub.id,
                    label: sub.name,
                  })),
                ]}
                disabled={!formData.category_id}
              />
            </div>
          </div>

          {/* UPC and Price Row - UPC hidden for restaurant (auto-generated) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!isRestaurantCategory() && (
              <Input
                label="UPC / Barcode"
                name="upc"
                value={formData.upc}
                onChange={handleInputChange}
                placeholder="Scan or enter UPC"
                required
              />
            )}
            <Input
              label="Product Price ($)"
              name="price"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={handleInputChange}
              placeholder="0.00"
              required
              className={isRestaurantCategory() ? 'md:col-span-2' : ''}
            />
          </div>

          {/* Discount and Quantity Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Discount (%)"
              name="discount"
              type="number"
              value={formData.discount}
              onChange={handleInputChange}
              placeholder="0"
              required
            />
            <Input
              label="Quantity"
              name="quantity"
              type="number"
              value={formData.quantity}
              onChange={handleInputChange}
              placeholder="0"
            />
          </div>

          {/* Title and Description Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Product title"
              required
            />
            <Input
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Product description"
            />
          </div>

          {/* Brand and Model Row - Hidden for restaurant */}
          {!isRestaurantCategory() && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Brand"
                name="brand"
                value={formData.brand}
                onChange={handleInputChange}
                placeholder="Brand name"
                required
              />
              <Input
                label="Model"
                name="model"
                value={formData.model}
                onChange={handleInputChange}
                placeholder="Model number"
              />
            </div>
          )}

          {/* Color and Weight Row - Hidden for restaurant */}
          {!isRestaurantCategory() && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Color"
                name="color"
                value={formData.color}
                onChange={handleInputChange}
                placeholder="Product color"
                required
              />
              <Input
                label="Weight"
                name="weight"
                value={formData.weight}
                onChange={handleInputChange}
                placeholder="Weight (optional)"
              />
            </div>
          )}

          {/* Image upload */}
          <div>
            <label className="label">Upload Image</label>
            <div className="flex gap-4">
              <div className="h-24 w-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden dark:border-dark-border">
                {formData.image ? (
                  <img
                    src={URL.createObjectURL(formData.image)}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                ) : editingProduct?.image ? (
                  <img
                    src={editingProduct.image}
                    alt="Current"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Package className="h-8 w-8 text-gray-300" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="btn-secondary cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm">
                  <Upload className="h-4 w-4" />
                  Choose File
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Status toggle */}
          <div>
            <label className="label">Product Status</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, status: 1 }))}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                  formData.status === 1
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, status: 0 }))}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                  formData.status === 0
                    ? 'bg-gray-500 text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                Inactive
              </button>
            </div>
          </div>

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddModal(false)
                setEditingProduct(null)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingProduct ? 'Update Product' : 'Add Product'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Add Subcategory Modal */}
      <Modal
        isOpen={showSubcategoryModal}
        onClose={() => {
          setShowSubcategoryModal(false)
          setNewSubcategoryName('')
        }}
        title="Create Subcategory"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Adding subcategory for: <strong>{categories.find(c => c.category_id === formData.category_id)?.name}</strong>
          </p>
          <Input
            label="Subcategory Name"
            value={newSubcategoryName}
            onChange={(e) => setNewSubcategoryName(e.target.value)}
            placeholder="e.g., KIDS, COMBO, SPECIAL"
            autoFocus
          />
          <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
            Note: Subcategories are stored locally. For production, consider creating a backend API.
          </p>
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowSubcategoryModal(false)
                setNewSubcategoryName('')
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddSubcategory}>
              Create
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  )
}

export default ProductsPage
