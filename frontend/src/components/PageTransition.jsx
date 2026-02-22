import { useState, useEffect } from 'react';
import { Copy, RefreshCw } from 'lucide-react';
import './PageTransition.css';
import catGif from '../assets/cat.gif';
import caballero from '../assets/caballero.png';
import caterror from '../assets/caterror.gif';

/**
 * Wraps page content with a loading -> horse bounce -> fade-in transition.
 * On error, shows exploding cat with error trace instead.
 *
 * Props:
 *   loading: boolean — whether data is still loading
 *   error: string|null — error message/trace to display
 *   text: string — loading text (e.g. "Cargando jugadores...")
 *   children: the page content to render after transition
 */
export default function PageTransition({ loading, error = null, text = '', children }) {
  // Phases: 'loading' -> 'horse'|'error' -> 'reveal'
  const [phase, setPhase] = useState('loading');

  useEffect(() => {
    if (!loading && phase === 'loading') {
      setPhase(error ? 'error' : 'horse');
    }
  }, [loading, phase, error]);

  useEffect(() => {
    if (phase === 'horse') {
      const timer = setTimeout(() => setPhase('reveal'), 1200);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  if (phase === 'loading') {
    return (
      <div className="page-transition-loader">
        <img src={catGif} alt="Loading..." className="pt-cat" />
        {text && <span className="pt-text">{text}</span>}
        <div className="pt-loadbar">
          <div className="pt-loadbar-fill" />
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    const handleCopy = () => {
      navigator.clipboard.writeText(error);
    };

    return (
      <div className="page-transition-loader pt-error-layout">
        <div className="pt-error-left">
          <img src={caterror} alt="Error" className="pt-error-cat" />
          <span className="pt-error-title">Error al cargar</span>
        </div>
        <div className="pt-error-right">
          <div className="pt-error-actions">
            <button className="pt-error-btn" onClick={() => window.location.reload()}>
              <RefreshCw size={14} /> Recargar
            </button>
            <button className="pt-error-btn" onClick={handleCopy}>
              <Copy size={14} /> Copiar
            </button>
          </div>
          <pre className="pt-error-trace">{error}</pre>
        </div>
      </div>
    );
  }

  if (phase === 'horse') {
    return (
      <div className="page-transition-loader">
        <img src={caballero} alt="Caballero" className="pt-horse" />
        <span className="pt-success">Cargado exitosamente</span>
      </div>
    );
  }

  // phase === 'reveal'
  return (
    <div className="pt-reveal">
      {children}
    </div>
  );
}
