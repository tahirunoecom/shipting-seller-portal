import { useState, useRef, useCallback } from 'react'
import { Button, Modal, ModalFooter } from '@/components/ui'
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  X,
  FileText,
} from 'lucide-react'
import toast from 'react-hot-toast'

// CSV Template headers and sample data
const CSV_HEADERS = [
  'title',
  'category_name',
  'price',
  'quantity',
  'discount',
  'description',
  'upc',
  'brand',
  'model',
  'color',
  'weight',
  'status',
]

const CSV_SAMPLE_DATA = [
  ['Chicken Burger', 'Restaurant', '9.99', '100', '0', 'Delicious chicken burger with special sauce', '', '', '', '', '', 'active'],
  ['Margherita Pizza', 'Restaurant', '14.99', '50', '10', 'Classic Italian pizza with fresh basil', '', '', '', '', '', 'active'],
  ['iPhone Case', 'Electronics', '19.99', '200', '5', 'Protective case for iPhone 14', '123456789012', 'TechGuard', 'TG-IP14', 'Black', '50g', 'active'],
]

// Parse CSV text into array of objects
const parseCSV = (csvText) => {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) {
    throw new Error('CSV file must have headers and at least one data row')
  }

  // Parse headers (first line)
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''))

  // Validate required headers
  const requiredHeaders = ['title', 'price']
  const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`)
  }

  // Parse data rows
  const products = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue // Skip empty lines

    // Handle CSV values (including quoted values with commas)
    const values = parseCSVLine(line)

    const product = {}
    headers.forEach((header, index) => {
      product[header] = values[index]?.trim().replace(/"/g, '') || ''
    })

    // Validate required fields
    if (!product.title) {
      product._error = `Row ${i + 1}: Title is required`
    } else if (!product.price || isNaN(parseFloat(product.price))) {
      product._error = `Row ${i + 1}: Valid price is required`
    }

    product._row = i + 1
    products.push(product)
  }

  return products
}

// Parse a single CSV line handling quoted values
const parseCSVLine = (line) => {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)

  return result
}

// Generate CSV template content
const generateCSVTemplate = () => {
  const headerRow = CSV_HEADERS.join(',')
  const sampleRows = CSV_SAMPLE_DATA.map(row => row.join(',')).join('\n')

  return `${headerRow}\n${sampleRows}`
}

// Restaurant category names for auto UPC generation
const RESTAURANT_CATEGORIES = ['restaurant', 'restaurants', 'food', 'food & dining', 'dining', 'cafe', 'bakery']

function BulkUploadModal({
  isOpen,
  onClose,
  categories,
  onUploadComplete,
  wh_account_id,
  productService,
}) {
  const [step, setStep] = useState('upload') // 'upload', 'preview', 'uploading', 'complete'
  const [file, setFile] = useState(null)
  const [parsedProducts, setParsedProducts] = useState([])
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  const [uploadResults, setUploadResults] = useState({ success: [], failed: [] })
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)

  // Map category name to category_id
  const getCategoryId = useCallback((categoryName) => {
    if (!categoryName) return ''
    const cat = categories.find(c =>
      c.name?.toLowerCase() === categoryName.toLowerCase()
    )
    return cat?.category_id || ''
  }, [categories])

  // Check if category is restaurant type
  const isRestaurantCategory = useCallback((categoryName) => {
    if (!categoryName) return false
    return RESTAURANT_CATEGORIES.some(rc =>
      categoryName.toLowerCase().includes(rc.toLowerCase())
    )
  }, [])

  // Generate UPC for restaurant products
  const generateUPC = () => {
    const timestamp = Date.now().toString().slice(-10)
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return timestamp + random
  }

  // Handle file selection
  const handleFileSelect = async (selectedFile) => {
    if (!selectedFile) return

    // Validate file type
    const validTypes = ['.csv', 'text/csv', 'application/vnd.ms-excel']
    const isValidType = validTypes.some(type =>
      selectedFile.name.endsWith('.csv') || selectedFile.type.includes('csv')
    )

    if (!isValidType) {
      toast.error('Please upload a CSV file')
      return
    }

    setFile(selectedFile)

    try {
      const text = await selectedFile.text()
      const products = parseCSV(text)

      // Map category names to IDs and prepare products
      const preparedProducts = products.map(product => {
        const categoryId = getCategoryId(product.category_name)
        const isRestaurant = isRestaurantCategory(product.category_name)

        return {
          ...product,
          category_id: categoryId,
          _categoryNotFound: !categoryId && product.category_name,
          _isRestaurant: isRestaurant,
          // Auto-generate UPC for restaurant products if not provided
          upc: product.upc || (isRestaurant ? generateUPC() : ''),
        }
      })

      setParsedProducts(preparedProducts)
      setStep('preview')
    } catch (error) {
      toast.error(error.message || 'Failed to parse CSV file')
    }
  }

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  // Download CSV template
  const handleDownloadTemplate = () => {
    const csvContent = generateCSVTemplate()
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'product_upload_template.csv'
    link.click()
    URL.revokeObjectURL(link.href)
    toast.success('Template downloaded!')
  }

  // Upload products
  const handleUpload = async () => {
    const validProducts = parsedProducts.filter(p => !p._error && !p._categoryNotFound)

    if (validProducts.length === 0) {
      toast.error('No valid products to upload')
      return
    }

    setStep('uploading')
    setUploadProgress({ current: 0, total: validProducts.length })
    setUploadResults({ success: [], failed: [] })

    const results = { success: [], failed: [] }

    for (let i = 0; i < validProducts.length; i++) {
      const product = validProducts[i]

      try {
        // Prepare FormData for each product
        const data = new FormData()
        data.append('wh_account_id', wh_account_id)
        data.append('title', product.title)
        data.append('ai_category_id', product.category_id)
        data.append('price', product.price)
        data.append('discount', product.discount || '0')
        data.append('quantity', product.quantity || '0')
        data.append('description', product.description || '')
        data.append('upc', product.upc || '')
        data.append('brand', product._isRestaurant ? '' : (product.brand || ''))
        data.append('model', product._isRestaurant ? '' : (product.model || ''))
        data.append('color', product._isRestaurant ? '' : (product.color || ''))
        data.append('weight', product._isRestaurant ? '' : (product.weight || ''))
        data.append('product_status', product.status?.toLowerCase() === 'inactive' ? 'N' : 'Y')
        data.append('product_type', 'New')
        data.append('is_manual', 'Y')

        const response = await productService.addProduct(data)

        if (response.status === 1) {
          results.success.push({ ...product, _message: 'Added successfully' })
        } else {
          results.failed.push({ ...product, _message: response.message || 'Failed to add' })
        }
      } catch (error) {
        results.failed.push({ ...product, _message: error.message || 'Upload failed' })
      }

      setUploadProgress({ current: i + 1, total: validProducts.length })
      setUploadResults({ ...results })

      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    setUploadResults(results)
    setStep('complete')

    if (results.success.length > 0) {
      onUploadComplete?.()
    }
  }

  // Reset modal state
  const handleClose = () => {
    setStep('upload')
    setFile(null)
    setParsedProducts([])
    setUploadProgress({ current: 0, total: 0 })
    setUploadResults({ success: [], failed: [] })
    onClose()
  }

  // Count valid and invalid products
  const validCount = parsedProducts.filter(p => !p._error && !p._categoryNotFound).length
  const invalidCount = parsedProducts.length - validCount

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Bulk Upload Products"
      size="lg"
    >
      <div className="space-y-6">
        {/* Step: Upload */}
        {step === 'upload' && (
          <>
            {/* Instructions */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 dark:text-blue-400 mb-2">
                How to bulk upload products:
              </h4>
              <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
                <li>Download the CSV template below</li>
                <li>Fill in your product details (title, category_name, price are required)</li>
                <li>For Restaurant category, UPC will be auto-generated</li>
                <li>Save the file and upload it here</li>
              </ol>
            </div>

            {/* Download Template Button */}
            <div className="flex justify-center">
              <Button variant="outline" onClick={handleDownloadTemplate}>
                <Download className="h-4 w-4" />
                Download CSV Template
              </Button>
            </div>

            {/* File Upload Area */}
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-300 dark:border-dark-border hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => handleFileSelect(e.target.files[0])}
                className="hidden"
              />

              <FileSpreadsheet className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-dark-muted mb-2">
                Drag and drop your CSV file here, or
              </p>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                Browse Files
              </Button>
              <p className="text-xs text-gray-500 mt-3">
                Supported format: CSV (.csv)
              </p>
            </div>

            {/* Available Categories Info */}
            <div className="text-sm text-gray-500 dark:text-dark-muted">
              <p className="font-medium mb-1">Available Categories:</p>
              <p className="text-xs">
                {categories.map(c => c.name).join(', ')}
              </p>
            </div>
          </>
        )}

        {/* Step: Preview */}
        {step === 'preview' && (
          <>
            {/* File Info */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-border rounded-lg">
              <FileText className="h-8 w-8 text-primary-500" />
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-dark-text">
                  {file?.name}
                </p>
                <p className="text-sm text-gray-500">
                  {parsedProducts.length} products found
                </p>
              </div>
              <button
                onClick={() => {
                  setFile(null)
                  setParsedProducts([])
                  setStep('upload')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Summary */}
            <div className="flex gap-4">
              <div className="flex-1 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium text-green-700 dark:text-green-400">
                    {validCount} valid
                  </span>
                </div>
              </div>
              {invalidCount > 0 && (
                <div className="flex-1 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-500" />
                    <span className="font-medium text-red-700 dark:text-red-400">
                      {invalidCount} invalid
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Products Preview Table */}
            <div className="max-h-64 overflow-auto border rounded-lg dark:border-dark-border">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-dark-border sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">Row</th>
                    <th className="px-3 py-2 text-left">Title</th>
                    <th className="px-3 py-2 text-left">Category</th>
                    <th className="px-3 py-2 text-left">Price</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-dark-border">
                  {parsedProducts.map((product, index) => {
                    const hasError = product._error || product._categoryNotFound
                    return (
                      <tr
                        key={index}
                        className={hasError ? 'bg-red-50 dark:bg-red-900/10' : ''}
                      >
                        <td className="px-3 py-2">{product._row}</td>
                        <td className="px-3 py-2 font-medium">{product.title || '-'}</td>
                        <td className="px-3 py-2">
                          {product._categoryNotFound ? (
                            <span className="text-red-500">
                              {product.category_name} (not found)
                            </span>
                          ) : (
                            product.category_name || '-'
                          )}
                        </td>
                        <td className="px-3 py-2">${product.price || '-'}</td>
                        <td className="px-3 py-2">
                          {hasError ? (
                            <span className="flex items-center gap-1 text-red-500">
                              <AlertCircle className="h-4 w-4" />
                              {product._error || 'Category not found'}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-green-500">
                              <CheckCircle className="h-4 w-4" />
                              Ready
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <ModalFooter>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button
                onClick={handleUpload}
                disabled={validCount === 0}
              >
                <Upload className="h-4 w-4" />
                Upload {validCount} Products
              </Button>
            </ModalFooter>
          </>
        )}

        {/* Step: Uploading */}
        {step === 'uploading' && (
          <div className="py-8 text-center">
            <Loader2 className="h-12 w-12 mx-auto text-primary-500 animate-spin mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text mb-2">
              Uploading Products...
            </h3>
            <p className="text-gray-500 dark:text-dark-muted mb-4">
              {uploadProgress.current} of {uploadProgress.total} products processed
            </p>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 dark:bg-dark-border rounded-full h-2.5 mb-4">
              <div
                className="bg-primary-500 h-2.5 rounded-full transition-all duration-300"
                style={{
                  width: `${(uploadProgress.current / uploadProgress.total) * 100}%`,
                }}
              />
            </div>

            {/* Live Results */}
            <div className="flex justify-center gap-6 text-sm">
              <span className="text-green-600">
                {uploadResults.success.length} successful
              </span>
              <span className="text-red-600">
                {uploadResults.failed.length} failed
              </span>
            </div>
          </div>
        )}

        {/* Step: Complete */}
        {step === 'complete' && (
          <>
            <div className="py-6 text-center">
              {uploadResults.success.length > 0 ? (
                <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
              ) : (
                <XCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
              )}
              <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text mb-2">
                Upload Complete!
              </h3>
              <p className="text-gray-500 dark:text-dark-muted">
                {uploadResults.success.length} products added successfully
                {uploadResults.failed.length > 0 && (
                  <span className="text-red-500">
                    , {uploadResults.failed.length} failed
                  </span>
                )}
              </p>
            </div>

            {/* Failed Products List */}
            {uploadResults.failed.length > 0 && (
              <div className="max-h-40 overflow-auto border border-red-200 rounded-lg p-3 bg-red-50 dark:bg-red-900/10">
                <p className="font-medium text-red-700 dark:text-red-400 mb-2">
                  Failed Products:
                </p>
                <ul className="text-sm text-red-600 dark:text-red-300 space-y-1">
                  {uploadResults.failed.map((product, index) => (
                    <li key={index}>
                      Row {product._row}: {product.title} - {product._message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <ModalFooter>
              <Button onClick={handleClose}>
                Done
              </Button>
            </ModalFooter>
          </>
        )}
      </div>
    </Modal>
  )
}

export default BulkUploadModal
