import { createContext, useContext, useState, useCallback, useEffect, Component } from 'react';
import ErrorModal from '../components/ErrorModal';
import { setGlobalErrorHandler } from '../api';
import caterror from '../assets/caterror.gif';

const ErrorContext = createContext(null);

export function ErrorProvider({ children }) {
  const [error, setError] = useState(null);

  const showError = useCallback((errorData) => {
    // Normalize error data
    const normalizedError = {
      message: errorData?.message || errorData?.toString() || 'Unknown error',
      endpoint: errorData?.endpoint || null,
      status: errorData?.status || null,
      statusText: errorData?.statusText || null,
      responseBody: errorData?.responseBody || null,
      stack: errorData?.stack || (errorData instanceof Error ? errorData.stack : null),
      componentStack: errorData?.componentStack || null,
    };

    console.error('Error caught:', normalizedError);
    setError(normalizedError);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Hook into the API's global error handler
  useEffect(() => {
    setGlobalErrorHandler(showError);
    return () => setGlobalErrorHandler(null);
  }, [showError]);

  return (
    <ErrorContext.Provider value={{ error, showError, clearError }}>
      {children}
      <ErrorModal error={error} onClose={clearError} />
    </ErrorContext.Provider>
  );
}

export function useError() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
}

// Error boundary for catching React errors
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Use the showError from context via prop
    if (this.props.onError) {
      this.props.onError({
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#0d0d0d',
          color: '#fff',
          fontFamily: 'Poppins, sans-serif',
          textAlign: 'center',
          padding: '20px',
          gap: '1rem',
        }}>
          <img src={caterror} alt="Error" style={{ width: '160px', height: 'auto' }} />
          <h1 style={{ color: '#ff4444', marginBottom: '0', fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Algo salió mal</h1>
          <p style={{ color: '#888', marginBottom: '8px', fontSize: '0.85rem' }}>
            Ha ocurrido un error inesperado. Por favor, recarga la página.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#222',
              color: '#ccc',
              border: '1px solid #444',
              padding: '10px 20px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              clipPath: 'none',
            }}
          >
            Recargar página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrapper component that connects ErrorBoundary to ErrorContext
export function ConnectedErrorBoundary({ children }) {
  const { showError } = useError();
  return (
    <ErrorBoundary onError={showError}>
      {children}
    </ErrorBoundary>
  );
}
