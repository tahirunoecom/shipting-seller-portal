import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const ADMIN_PASSCODE = 'UnoecomAdmin@Csiith@1996'

const useAdminStore = create(
  persist(
    (set, get) => ({
      // State
      isAdminAuthenticated: false,
      adminToken: null, // Bearer token for admin API calls
      shippers: [],
      selectedShipper: null,
      isLoading: false,
      error: null,

      // Admin login with passcode (local validation)
      adminLogin: (passcode) => {
        if (passcode === ADMIN_PASSCODE) {
          set({ isAdminAuthenticated: true, error: null })
          return { success: true }
        }
        set({ error: 'Invalid passcode' })
        return { success: false, message: 'Invalid passcode' }
      },

      // Set admin token (from API login response)
      setAdminToken: (token) => {
        set({ adminToken: token })
        // Also store in localStorage for API interceptor
        if (token) {
          localStorage.setItem('admin_token', token)
        } else {
          localStorage.removeItem('admin_token')
        }
      },

      // Get admin token
      getAdminToken: () => {
        return get().adminToken || localStorage.getItem('admin_token')
      },

      // Admin logout
      adminLogout: () => {
        localStorage.removeItem('admin_token')
        set({
          isAdminAuthenticated: false,
          adminToken: null,
          shippers: [],
          selectedShipper: null,
          error: null,
        })
      },

      // Set loading
      setLoading: (loading) => set({ isLoading: loading }),

      // Set error
      setError: (error) => set({ error }),

      // Set shippers list
      setShippers: (shippers) => set({ shippers }),

      // Select a shipper to view
      selectShipper: (shipper) => set({ selectedShipper: shipper }),

      // Clear selected shipper
      clearSelectedShipper: () => set({ selectedShipper: null }),
    }),
    {
      name: 'admin-storage',
      partialize: (state) => ({
        isAdminAuthenticated: state.isAdminAuthenticated,
        adminToken: state.adminToken,
      }),
    }
  )
)

export default useAdminStore
