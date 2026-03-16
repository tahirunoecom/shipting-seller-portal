import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store'
import { whatsappService } from '@/services'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  PageLoader,
} from '@/components/ui'
import {
  Package,
  Facebook,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  Store,
  Search,
  Grid3X3,
  List,
} from 'lucide-react'
import { formatCurrency } from '@/utils/helpers'
import { toast } from 'react-hot-toast'

function CatalogPage() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [catalogProducts, setCatalogProducts] = useState([])
  const [catalogInfo, setCatalogInfo] = useState(null)
  const [whatsappConnected, setWhatsappConnected] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 12

  useEffect(() => {
    checkWhatsAppConnection()
  }, [])

  const checkWhatsAppConnection = async () => {
    try {
      const response = await whatsappService.getWhatsAppStatus(user.wh_account_id)
      if (response.status === 1 && response.data?.is_connected) {
        setWhatsappConnected(true)
        loadCatalogProducts()
      } else {
        setLoading(false)
      }
    } catch (error) {
      console.error('Failed to check WhatsApp status:', error)
      setLoading(false)
    }
  }

  const loadCatalogProducts = async () => {
    try {
      setLoading(true)
      const response = await whatsappService.getCatalogProducts(user.wh_account_id)

      if (response.status === 1) {
        setCatalogProducts(response.data?.products || [])
        setCatalogInfo(response.data?.catalog_info || null)
      } else {
        toast.error(response.message || 'Failed to load catalog products')
      }
    } catch (error) {
      console.error('Failed to load catalog products:', error)
      toast.error('Failed to load catalog products')
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    try {
      const response = await whatsappService.syncCatalog(user.wh_account_id)
      if (response.status === 1) {
        toast.success(`Synced ${response.data?.synced || 0} products to Meta Catalog`)
        loadCatalogProducts()
      } else {
        toast.error(response.message || 'Failed to sync catalog')
      }
    } catch (error) {
      toast.error('Failed to sync catalog')
    }
  }

  // Filter products by search
  const filteredProducts = catalogProducts.filter((product) =>
    product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.retailer_id?.includes(searchQuery)
  )

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage)

  if (loading) {
    return <PageLoader />
  }

  if (!whatsappConnected) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center">
              <Facebook className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text mb-2">
                WhatsApp Not Connected
              </h2>
              <p className="text-gray-600 dark:text-dark-muted mb-6">
                Connect your WhatsApp Business account to manage your Meta catalog products.
              </p>
              <Button onClick={() => window.location.href = '/whatsapp'}>
                Connect WhatsApp
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Store className="h-6 w-6 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
              Meta Catalog
            </h1>
            <Badge variant="info" className="ml-2">
              <Facebook className="h-3 w-3 mr-1" />
              Meta
            </Badge>
          </div>
          <p className="text-gray-600 dark:text-dark-muted">
            Products synced to your WhatsApp catalog
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadCatalogProducts}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={handleSync}>
            <Package className="h-4 w-4" />
            Sync to Meta
          </Button>
        </div>
      </div>

      {/* Catalog Info */}
      {catalogInfo && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-dark-muted">Catalog Name</p>
                  <p className="font-medium text-gray-900 dark:text-dark-text">{catalogInfo.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-dark-muted">Total Products</p>
                  <p className="font-medium text-gray-900 dark:text-dark-text">{catalogInfo.product_count || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-dark-muted">Type</p>
                  <Badge variant={catalogInfo.is_commerce ? 'success' : 'secondary'}>
                    {catalogInfo.vertical || 'Commerce'}
                  </Badge>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`https://business.facebook.com/commerce/catalogs/${catalogInfo.id}`, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
                View in Meta
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and View Mode */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-stretch">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search Meta catalog products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-dark-card dark:text-dark-text"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 dark:bg-dark-border rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-dark-card text-primary-600 shadow-sm'
                    : 'text-gray-600 dark:text-dark-muted hover:text-gray-900 dark:hover:text-dark-text'
                }`}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-dark-card text-primary-600 shadow-sm'
                    : 'text-gray-600 dark:text-dark-muted hover:text-gray-900 dark:hover:text-dark-text'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid/List */}
      {paginatedProducts.length > 0 ? (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedProducts.map((product) => (
                <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-square bg-gray-100 dark:bg-dark-border relative">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-12 w-12 text-gray-300" />
                      </div>
                    )}
                    <Badge variant="info" className="absolute top-2 right-2">
                      <Facebook className="h-3 w-3" />
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-medium text-gray-900 dark:text-dark-text mb-1 line-clamp-2">
                      {product.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-dark-muted mb-2">
                      SKU: {product.retailer_id || 'N/A'}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-primary-600">
                        {product.price ? formatCurrency(parseFloat(product.price.split(' ')[0])) : 'N/A'}
                      </span>
                      <Badge variant={product.availability === 'in stock' ? 'success' : 'secondary'}>
                        {product.availability}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {paginatedProducts.map((product) => (
                <Card key={product.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="w-20 h-20 bg-gray-100 dark:bg-dark-border rounded-lg flex-shrink-0">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-8 w-8 text-gray-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-dark-text">
                              {product.name}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-dark-muted">
                              SKU: {product.retailer_id || 'N/A'}
                            </p>
                          </div>
                          <Badge variant="info">
                            <Facebook className="h-3 w-3 mr-1" />
                            Meta
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-bold text-primary-600">
                            {product.price ? formatCurrency(parseFloat(product.price.split(' ')[0])) : 'N/A'}
                          </span>
                          <Badge variant={product.availability === 'in stock' ? 'success' : 'secondary'}>
                            {product.availability}
                          </Badge>
                          {product.brand && (
                            <span className="text-sm text-gray-500 dark:text-dark-muted">
                              Brand: {product.brand}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="px-4 py-2 text-sm text-gray-600 dark:text-dark-muted">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text mb-2">
              No products in Meta catalog
            </h3>
            <p className="text-gray-600 dark:text-dark-muted mb-6">
              {searchQuery
                ? 'No products match your search. Try different keywords.'
                : 'Sync your products to Meta catalog to see them here.'}
            </p>
            {!searchQuery && (
              <Button onClick={handleSync}>
                <Package className="h-4 w-4" />
                Sync Products to Meta
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info Banner */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                About Meta Catalog
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                This page shows products that are synced to your Meta (Facebook/Instagram) catalog.
                These products are visible to customers on WhatsApp, Facebook Shop, and Instagram Shopping.
                Click "Sync to Meta" to update your catalog with the latest products from your inventory.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default CatalogPage
