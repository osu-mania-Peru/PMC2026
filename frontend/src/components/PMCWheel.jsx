import { useState, useRef, useCallback } from 'react';
import pmcLogo from '../assets/pmclogo.svg';
import caballero from '../assets/caballero.png';
import catGif from '../assets/cat.gif';
import catError from '../assets/caterror.gif';
import './PMCWheel.css';

const SEGMENTS = [
  { label: 'PMC', image: pmcLogo },
  { label: 'Uma', image: caballero },
  { label: 'Miaurichesu', image: catGif },
  { label: 'Gatofuego', image: catError },
  { label: 'Uma', image: caballero },
  { label: 'Miaurichesu', image: catGif },
  { label: 'Gatofuego', image: catError },
  { label: 'Uma', image: caballero },
  { label: 'Miaurichesu', image: catGif },
  { label: 'Gatofuego', image: catError },
  { label: 'Uma', image: caballero },
  { label: 'Miaurichesu', image: catGif },
];

const SEGMENT_ANGLE = 360 / SEGMENTS.length;

export default function PMCWheel() {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState(null);
  const wheelRef = useRef(null);

  const handleOpen = () => {
    setResult(null);
    setOpen(true);
    setClosing(false);
  };

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 500);
  };

  const spin = useCallback(() => {
    if (spinning) return;
    setSpinning(true);
    setResult(null);

    const extraSpins = (5 + Math.random() * 5) * 360;
    const randomOffset = Math.random() * 360;
    const totalRotation = rotation + extraSpins + randomOffset;

    const duration = 5000;
    const startTime = performance.now();
    const startRotation = rotation;
    const delta = totalRotation - startRotation;
    const animRef = { id: null };

    const easeInOut = (t) => {
      if (t < 0.3) {
        const p = t / 0.3;
        return 0.15 * (p * p * p);
      } else if (t < 0.6) {
        return 0.15 + 0.5 * ((t - 0.3) / 0.3);
      } else {
        const p = (t - 0.6) / 0.4;
        return 0.65 + 0.35 * (1 - Math.pow(1 - p, 3));
      }
    };

    const animate = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const progress = easeInOut(t);
      const currentRot = startRotation + delta * progress;
      setRotation(currentRot);

      if (t < 1) {
        animRef.id = requestAnimationFrame(animate);
      } else {
        setRotation(totalRotation);
        const normalizedAngle = totalRotation % 360;
        const pointerAngle = (360 - normalizedAngle + 360) % 360;
        const segmentIndex = Math.floor(pointerAngle / SEGMENT_ANGLE) % SEGMENTS.length;
        setResult(SEGMENTS[segmentIndex]);
        setSpinning(false);
      }
    };

    animRef.id = requestAnimationFrame(animate);
  }, [spinning, rotation]);

  return (
    <>
      {/* Floating Button */}
      <button
        className={`pmc-wheel-fab ${open ? 'fab-hidden' : ''}`}
        onClick={handleOpen}
      >
        <img src={pmcLogo} alt="PMC" className="fab-logo" />
        <span>PMC WHEEL</span>
      </button>

      {/* Fullscreen Overlay */}
      {open && (
        <div
          className={`pmc-wheel-overlay ${closing ? 'closing' : ''}`}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <button className="pmc-wheel-close" onClick={handleClose}>&times;</button>

          <div className={`pmc-wheel-container ${closing ? 'closing' : ''}`}>
            <div className="pmc-wheel-title">
              <img src={pmcLogo} alt="PMC" className="wheel-title-logo" />
              <span>WHEEL</span>
            </div>

            <div className="wheel-wrapper">
              {/* Pointer */}
              <div className="wheel-pointer">&#9660;</div>

              {/* Wheel */}
              <div
                ref={wheelRef}
                className="wheel"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: 'none',
                }}
              >
                <svg viewBox="0 0 400 400" className="wheel-svg">
                  {SEGMENTS.map((seg, i) => {
                    const startAngle = i * SEGMENT_ANGLE;
                    const endAngle = startAngle + SEGMENT_ANGLE;
                    const startRad = (startAngle - 90) * (Math.PI / 180);
                    const endRad = (endAngle - 90) * (Math.PI / 180);
                    const x1 = 200 + 200 * Math.cos(startRad);
                    const y1 = 200 + 200 * Math.sin(startRad);
                    const x2 = 200 + 200 * Math.cos(endRad);
                    const y2 = 200 + 200 * Math.sin(endRad);
                    const largeArc = SEGMENT_ANGLE > 180 ? 1 : 0;

                    const midAngle = (startAngle + endAngle) / 2;
                    const midRad = (midAngle - 90) * (Math.PI / 180);
                    const imgX = 200 + 130 * Math.cos(midRad);
                    const imgY = 200 + 130 * Math.sin(midRad);

                    const zebraColors = ['#ff2057', '#ffffff', '#111111'];
                    const fillColor = zebraColors[i % 3];
                    const strokeColor = i % 3 === 2 ? '#333' : '#000';

                    return (
                      <g key={i}>
                        <path
                          d={`M200,200 L${x1},${y1} A200,200 0 ${largeArc},1 ${x2},${y2} Z`}
                          fill={fillColor}
                          stroke={strokeColor}
                          strokeWidth="1"
                        />
                        <image
                          href={seg.image}
                          x={imgX - 22}
                          y={imgY - 22}
                          width="44"
                          height="44"
                        />
                      </g>
                    );
                  })}
                  {/* Center hub */}
                  <circle cx="200" cy="200" r="38" fill="#111" stroke="#ff2057" strokeWidth="3" />
                  <image href={pmcLogo} x="172" y="172" width="56" height="56" />
                </svg>
              </div>
            </div>

            {/* Result Display */}
            <div className={`wheel-result ${result ? 'show' : ''}`}>
              {result && (
                <>
                  <img src={result.image} alt={result.label} className="result-image" />
                  <span className="result-label">{result.label}</span>
                </>
              )}
            </div>

            {/* Spin Button */}
            <button className="wheel-spin-btn" onClick={spin} disabled={spinning}>
              {spinning ? 'Spinning...' : 'SPIN!'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
