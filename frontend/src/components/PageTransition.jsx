import { useState, useEffect } from 'react';
import './PageTransition.css';
import catGif from '../assets/cat.gif';
import caballero from '../assets/caballero.png';

/**
 * Wraps page content with a loading -> horse bounce -> fade-in transition.
 *
 * Props:
 *   loading: boolean — whether data is still loading
 *   text: string — loading text (e.g. "Cargando jugadores...")
 *   children: the page content to render after transition
 */
export default function PageTransition({ loading, text = '', children }) {
  // Phases: 'loading' -> 'horse' -> 'reveal'
  const [phase, setPhase] = useState('loading');

  useEffect(() => {
    if (!loading && phase === 'loading') {
      setPhase('horse');
    }
  }, [loading, phase]);

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
