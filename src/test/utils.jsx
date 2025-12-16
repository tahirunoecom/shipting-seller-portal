import { render } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

// Custom render with providers
export function renderWithProviders(ui, options = {}) {
  function Wrapper({ children }) {
    return (
      <BrowserRouter>
        {children}
        <Toaster />
      </BrowserRouter>
    )
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...options }),
  }
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
