import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorProvider, ConnectedErrorBoundary } from './context/ErrorContext'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorProvider>
      <ConnectedErrorBoundary>
        <App />
      </ConnectedErrorBoundary>
    </ErrorProvider>
  </StrictMode>,
)
