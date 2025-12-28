import { useState } from 'react';
import { Copy, Check, X, AlertTriangle } from 'lucide-react';
import './ErrorModal.css';

export default function ErrorModal({ error, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!error) return null;

  const errorDetails = {
    timestamp: new Date().toISOString(),
    message: error.message || 'Unknown error',
    endpoint: error.endpoint || null,
    status: error.status || null,
    statusText: error.statusText || null,
    responseBody: error.responseBody || null,
    stack: error.stack || null,
    componentStack: error.componentStack || null,
    userAgent: navigator.userAgent,
    url: window.location.href,
  };

  const formatErrorDump = () => {
    let dump = `=== ERROR REPORT ===\n`;
    dump += `Timestamp: ${errorDetails.timestamp}\n`;
    dump += `URL: ${errorDetails.url}\n`;
    dump += `User Agent: ${errorDetails.userAgent}\n\n`;

    dump += `=== ERROR DETAILS ===\n`;
    dump += `Message: ${errorDetails.message}\n`;

    if (errorDetails.endpoint) {
      dump += `Endpoint: ${errorDetails.endpoint}\n`;
    }
    if (errorDetails.status) {
      dump += `Status: ${errorDetails.status} ${errorDetails.statusText || ''}\n`;
    }
    if (errorDetails.responseBody) {
      dump += `\n=== RESPONSE BODY ===\n`;
      dump += typeof errorDetails.responseBody === 'string'
        ? errorDetails.responseBody
        : JSON.stringify(errorDetails.responseBody, null, 2);
      dump += '\n';
    }
    if (errorDetails.stack) {
      dump += `\n=== STACK TRACE ===\n${errorDetails.stack}\n`;
    }
    if (errorDetails.componentStack) {
      dump += `\n=== COMPONENT STACK ===\n${errorDetails.componentStack}\n`;
    }

    return dump;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatErrorDump());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="error-modal-overlay" onClick={onClose}>
      <div className="error-modal" onClick={(e) => e.stopPropagation()}>
        <div className="error-modal-header">
          <div className="error-modal-title">
            <AlertTriangle size={20} />
            <h3>Ha ocurrido un error</h3>
          </div>
          <button className="error-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="error-modal-content">
          <div className="error-message-box">
            <strong>Error:</strong> {errorDetails.message}
          </div>

          {errorDetails.endpoint && (
            <div className="error-info-row">
              <span className="error-info-label">Endpoint:</span>
              <code>{errorDetails.endpoint}</code>
            </div>
          )}

          {errorDetails.status && (
            <div className="error-info-row">
              <span className="error-info-label">Status:</span>
              <code>{errorDetails.status} {errorDetails.statusText}</code>
            </div>
          )}

          <div className="error-dump-container">
            <div className="error-dump-header">
              <span>Log completo</span>
              <button className="error-copy-btn" onClick={handleCopy}>
                {copied ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar</>}
              </button>
            </div>
            <pre className="error-dump">{formatErrorDump()}</pre>
          </div>

          <p className="error-help-text">
            Si el problema persiste, copia este log y envíalo a los administradores.
          </p>
        </div>

        <div className="error-modal-footer">
          <button className="error-btn error-btn-secondary" onClick={handleCopy}>
            {copied ? <><Check size={16} /> Copiado</> : <><Copy size={16} /> Copiar Log</>}
          </button>
          <button className="error-btn error-btn-primary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
