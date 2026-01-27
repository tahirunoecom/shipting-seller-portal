import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const ADMIN_PASSCODE = 'UnoecomAdmin@Csiith@1996'

const useAdminStore = create(
  persist(
    (set, get) => ({
      // State
      isAdminAuthenticated: false,
      shippers: [],
      selectedShipper: null,
      isLoading: false,
      error: null,

      // Admin login with passcode
      adminLogin: (passcode) => {
        if (passcode === ADMIN_PASSCODE) {
          set({ isAdminAuthenticated: true, error: null })
          return { success: true }
        }
        set({ error: 'Invalid passcode' })
        return { success: false, message: 'Invalid passcode' }
      },

      // Admin logout
      adminLogout: () => {
        set({
          isAdminAuthenticated: false,
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
      }),
    }
  )
)

export default useAdminStore
