import { useState, useRef, useCallback, useEffect } from 'react';
import { api } from '../api';
import pmcLogo from '../assets/pmclogo.svg';
import caballero from '../assets/caballero.png';
import catGif from '../assets/cat.gif';
import catError from '../assets/caterror.gif';
import './PMCWheel.css';

const SEGMENTS = [
  { label: 'PMC', image: pmcLogo, points: 80 },
  { label: 'Uma', image: caballero, points: -20 },
  { label: 'Miaurichesu', image: catGif, points: -15 },
  { label: 'Gatofuego', image: catError, points: -8 },
  { label: 'Uma', image: caballero, points: -20 },
  { label: 'Miaurichesu', image: catGif, points: -15 },
  { label: 'Gatofuego', image: catError, points: -8 },
  { label: 'Uma', image: caballero, points: -20 },
  { label: 'Miaurichesu', image: catGif, points: -15 },
  { label: 'Gatofuego', image: catError, points: -8 },
  { label: 'Uma', image: caballero, points: -20 },
  { label: 'Miaurichesu', image: catGif, points: -15 },
];

const SEGMENT_ANGLE = 360 / SEGMENTS.length;

const rotationForSegment = (index, baseRotation) => {
  const segmentCenter = index * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
  const targetMod = (360 - segmentCenter + 360) % 360;
  const jitter = (Math.random() - 0.5) * (SEGMENT_ANGLE * 0.7);
  const extraSpins = (5 + Math.random() * 5) * 360;
  const raw = baseRotation + extraSpins;
  const currentMod = raw % 360;
  const adjust = (targetMod - currentMod + jitter + 360) % 360;
  return raw + adjust;
};

export default function PMCWheel({ user }) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState(null);
  const [score, setScore] = useState(0);
  const [scoreFlash, setScoreFlash] = useState(null);
  const [tampered, setTampered] = useState(false);
  const wheelRef = useRef(null);
  const containerRef = useRef(null);

  // Load score from server on open
  useEffect(() => {
    if (open && user) {
      api.getWheelScore().then(data => {
        setScore(data.score);
      }).catch(() => {});
    }
  }, [open, user]);

  // MutationObserver for tamper detection
  useEffect(() => {
    if (!open || !containerRef.current) return;

    const container = containerRef.current;
    let observer;

    // Snapshot all existing nodes after React finishes rendering
    const knownNodes = new WeakSet();
    const walkTree = (node) => {
      knownNodes.add(node);
      for (const child of node.childNodes) walkTree(child);
    };

    // Delay observer setup so React's initial render + first data fetch are done
    const timerId = setTimeout(() => {
      walkTree(container);

      const isReactNode = (node) =>
        node && Object.keys(node).some(k => k.startsWith('__react'));

      observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.type === 'childList') {
            // Only flag nodes that aren't React-managed
            for (const node of m.addedNodes) {
              if (!isReactNode(node) && !knownNodes.has(node) && node.nodeType === 1) {
                setTampered(true);
                observer.disconnect();
                return;
              }
            }
            for (const node of m.removedNodes) {
              if (node.nodeType === 1 && !isReactNode(node)) {
                setTampered(true);
                observer.disconnect();
                return;
              }
            }
          }
          // Attribute changes on non-React elements (e.g. manually editing style)
          if (m.type === 'attributes' && m.target !== container) {
            if (!isReactNode(m.target)) {
              setTampered(true);
              observer.disconnect();
              return;
            }
          }
        }
      });

      observer.observe(container, {
        childList: true,
        attributes: true,
        subtree: true,
      });
    }, 2000);

    return () => {
      clearTimeout(timerId);
      observer?.disconnect();
    };
  }, [open]);

  if (!user) return null;

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

  const spin = useCallback(async () => {
    if (spinning || tampered) return;
    setSpinning(true);
    setResult(null);

    let serverResult;
    try {
      serverResult = await api.recordWheelSpin();
    } catch {
      setSpinning(false);
      return;
    }

    const { segment_index, points, bonus, curse, score: newScore } = serverResult;
    const landed = SEGMENTS[segment_index];

    const totalRotation = rotationForSegment(segment_index, rotation);

    const duration = 5000;
    const startTime = performance.now();
    const startRotation = rotation;
    const delta = totalRotation - startRotation;

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
        requestAnimationFrame(animate);
      } else {
        setRotation(totalRotation);
        setResult({ ...landed, bonus, curse });
        setScore(newScore);
        setScoreFlash({ points, bonus, curse, key: Date.now() });
        setSpinning(false);
      }
    };

    requestAnimationFrame(animate);
  }, [spinning, rotation, tampered]);

  return (
    <>
      {/* Tamper overlay - covers entire page */}
      {tampered && (
        <div className="wheel-tampered">
          <span className="tamper-quote">El que con trampa juega, con trampa se queda.</span>
          <span className="tamper-reload">Recarga la página.</span>
        </div>
      )}

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

          <div ref={containerRef} className={`pmc-wheel-container ${closing ? 'closing' : ''}`}>
            <div className="pmc-wheel-title">
              <img src={pmcLogo} alt="PMC" className="wheel-title-logo" />
              <span>WHEEL</span>
            </div>

            {/* Score Display */}
            <div className={`wheel-score ${score > 0 ? 'positive' : score < 0 ? 'negative' : ''}`}>
              <span className="score-label">SCORE</span>
              <span className="score-value">{score}</span>
              {scoreFlash && (
                <span
                  key={scoreFlash.key}
                  className={`score-flash ${scoreFlash.points > 0 ? 'flash-positive' : 'flash-negative'}`}
                >
                  {scoreFlash.points > 0 ? '+' : ''}{scoreFlash.points}
                </span>
              )}
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
                  {result.bonus > 0 && <span className="result-bonus">+{result.bonus} BONUS!</span>}
                  {result.curse < 0 && <span className="result-curse">{result.curse} MALDICIÓN!</span>}
                </>
              )}
            </div>

            {/* Spin Button */}
            <button className="wheel-spin-btn" onClick={spin} disabled={spinning || tampered}>
              {spinning ? 'Spinning...' : tampered ? 'DISABLED' : 'SPIN!'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
