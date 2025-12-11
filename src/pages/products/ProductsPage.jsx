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
} from 'lucide-react'
import toast from 'react-hot-toast'

// Helper to normalize category data from different API response formats
const normalizeCategory = (cat) => ({
  category_id: cat.category_id || cat.id || cat.categoryId || '',
  name: cat.name || cat.category_name || cat.categoryName || cat.title || '',
})

function ProductsPage() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    category_id: '',
    upc: '',
    price: '',
    discount: '',
    quantity: '',
    condition: 'New',
    status: 1,
    image: null,
  })

  useEffect(() => {
    loadProducts()
    loadCategories()
  }, [])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const response = await productService.getSellerProducts(user.wh_account_id)
      if (response.status === 1) {
        setProducts(response.data?.products || [])
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
      const response = await productService.getCategories()
      console.log('Categories API response:', response)

      if (response.status === 1) {
        // Handle different response structures
        let rawCategories = []
        if (Array.isArray(response.data?.categories)) {
          rawCategories = response.data.categories
        } else if (Array.isArray(response.data)) {
          rawCategories = response.data
        } else if (Array.isArray(response.categories)) {
          rawCategories = response.categories
        }

        // Normalize categories to consistent format
        const normalizedCategories = rawCategories.map(normalizeCategory)
        console.log('Normalized categories:', normalizedCategories)
        setCategories(normalizedCategories)

        if (normalizedCategories.length === 0) {
          console.warn('No categories found in response')
        }
      } else {
        console.error('Categories API returned error status:', response.message)
      }
    } catch (error) {
      console.error('Failed to load categories:', error)
      // Try alternative endpoint
      try {
        const altResponse = await productService.getCategoryList()
        console.log('CategoryList API response:', altResponse)
        if (altResponse.status === 1) {
          let rawCategories = []
          if (Array.isArray(altResponse.data?.categories)) {
            rawCategories = altResponse.data.categories
          } else if (Array.isArray(altResponse.data)) {
            rawCategories = altResponse.data
          } else if (Array.isArray(altResponse.categories)) {
            rawCategories = altResponse.categories
          }
          const normalizedCategories = rawCategories.map(normalizeCategory)
          setCategories(normalizedCategories)
        }
      } catch (altError) {
        console.error('Both category endpoints failed')
      }
    }
  }

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
      const data = new FormData()
      data.append('wh_account_id', user.wh_account_id)
      data.append('title', formData.title)
      data.append('category_id', formData.category_id)
      data.append('upc', formData.upc)
      data.append('price', formData.price)
      data.append('discount', formData.discount || 0)
      data.append('quantity', formData.quantity)
      data.append('condition', formData.condition)
      data.append('status', formData.status)
      if (formData.image) {
        data.append('image', formData.image)
      }

      let response
      if (editingProduct) {
        data.append('product_id', editingProduct.id)
        response = await productService.editProduct(data)
      } else {
        response = await productService.addProduct(data)
      }

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
        product_id: product.id,
        wh_account_id: user.wh_account_id,
        status: product.status === 1 ? 0 : 1,
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
    setEditingProduct(product)
    setFormData({
      title: product.title || '',
      category_id: product.category_id || '',
      upc: product.upc || '',
      price: product.price || '',
      discount: product.discount || '',
      quantity: product.quantity || '',
      condition: product.condition || 'New',
      status: product.status || 1,
      image: null,
    })
    setShowAddModal(true)
  }

  const resetForm = () => {
    setFormData({
      title: '',
      category_id: '',
      upc: '',
      price: '',
      discount: '',
      quantity: '',
      condition: 'New',
      status: 1,
      image: null,
    })
  }

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.upc?.includes(searchQuery)
    const matchesCategory = !selectedCategory || product.category_id === selectedCategory
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
        <Button onClick={() => setShowAddModal(true)}>
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
              <Card key={product.id} className="overflow-hidden hover:shadow-card-hover transition-shadow">
                <div className="aspect-square bg-gray-100 dark:bg-dark-border relative">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-12 w-12 text-gray-300" />
                    </div>
                  )}
                  <Badge
                    variant={product.status === 1 ? 'success' : 'danger'}
                    className="absolute top-2 right-2"
                  >
                    {product.status === 1 ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-medium text-gray-900 dark:text-dark-text truncate">
                    {product.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-dark-muted mt-1">
                    {product.category_name || 'Uncategorized'}
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-lg font-bold text-primary-600">
                      {formatCurrency(product.price)}
                    </p>
                    <p className="text-sm text-gray-500">Qty: {product.quantity}</p>
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
                      variant={product.status === 1 ? 'secondary' : 'primary'}
                      size="sm"
                      onClick={() => handleToggleStatus(product)}
                    >
                      {product.status === 1 ? (
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
                    <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-dark-border">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-dark-border flex items-center justify-center overflow-hidden">
                            {product.image ? (
                              <img
                                src={product.image}
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
                      <td className="table-cell">{product.category_name || '-'}</td>
                      <td className="table-cell font-medium">
                        {formatCurrency(product.price)}
                      </td>
                      <td className="table-cell">{product.quantity}</td>
                      <td className="table-cell">
                        <Badge variant={product.status === 1 ? 'success' : 'danger'}>
                          {product.status === 1 ? 'Active' : 'Inactive'}
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
                            {product.status === 1 ? (
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
              <Button className="mt-4" onClick={() => setShowAddModal(true)}>
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
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image upload */}
          <div>
            <label className="label">Product Image</label>
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
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
                <label className="btn-outline cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm">
                  <Camera className="h-4 w-4" />
                  Take Photo
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Product name */}
          <Input
            label="Product Name"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="Enter product name"
            required
          />

          {/* Category */}
          <Select
            label="Category"
            name="category_id"
            value={formData.category_id}
            onChange={handleInputChange}
            options={categories.map((cat) => ({
              value: cat.category_id,
              label: cat.name,
            }))}
            placeholder="Select category"
            required
          />

          {/* UPC */}
          <Input
            label="UPC / Barcode"
            name="upc"
            value={formData.upc}
            onChange={handleInputChange}
            placeholder="Scan or enter UPC"
          />

          {/* Price row */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Price"
              name="price"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={handleInputChange}
              placeholder="0.00"
              required
            />
            <Input
              label="Discount (%)"
              name="discount"
              type="number"
              value={formData.discount}
              onChange={handleInputChange}
              placeholder="0"
            />
          </div>

          {/* Quantity and Condition */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Quantity"
              name="quantity"
              type="number"
              value={formData.quantity}
              onChange={handleInputChange}
              placeholder="0"
              required
            />
            <Select
              label="Condition"
              name="condition"
              value={formData.condition}
              onChange={handleInputChange}
              options={[
                { value: 'New', label: 'New' },
                { value: 'Used', label: 'Used' },
                { value: 'Refurbished', label: 'Refurbished' },
              ]}
            />
          </div>

          {/* Status toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg dark:bg-dark-bg">
            <div>
              <p className="font-medium text-gray-900 dark:text-dark-text">
                Product Status
              </p>
              <p className="text-sm text-gray-500 dark:text-dark-muted">
                Enable to make this product visible
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setFormData((prev) => ({ ...prev, status: prev.status === 1 ? 0 : 1 }))
              }
              className={`relative w-12 h-6 rounded-full transition-colors ${
                formData.status === 1 ? 'bg-primary-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  formData.status === 1 ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
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
    </div>
  )
}

export default ProductsPage
