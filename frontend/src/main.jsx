import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import AppErrorBoundary from './components/AppErrorBoundary'
import { queryClient } from './lib/queryClient'
import { router } from './router'
import { Toaster } from './ui/Toaster'
import './styles/theme.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Toaster>
          <RouterProvider router={router} />
        </Toaster>
      </QueryClientProvider>
    </AppErrorBoundary>
  </React.StrictMode>,
)
