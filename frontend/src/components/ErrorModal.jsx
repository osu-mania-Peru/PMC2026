import { useState } from 'react';
import { Copy, Check, RefreshCw, X } from 'lucide-react';
import caterror from '../assets/caterror.gif';
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
        <button className="error-close-btn" onClick={onClose}>
          <X size={18} />
        </button>

        <div className="error-modal-body">
          <div className="error-cat-side">
            <img src={caterror} alt="Error" className="error-cat-img" />
            <span className="error-cat-title">Ha ocurrido un error</span>
          </div>

          <div className="error-details-side">
            <div className="error-actions">
              <button className="error-action-btn" onClick={() => window.location.reload()}>
                <RefreshCw size={14} /> Recargar
              </button>
              <button className="error-action-btn" onClick={handleCopy}>
                {copied ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar</>}
              </button>
            </div>
            <pre className="error-trace">{formatErrorDump()}</pre>
            <p className="error-help-text">
              Si el problema persiste, copia este log y envíalo a los administradores.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
