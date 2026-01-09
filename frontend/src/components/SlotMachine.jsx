import { useState, useEffect, useRef } from 'react';
import './SlotMachine.css';
import pmcLogo from '../assets/pmclogo.png';

const SYMBOLS = [
  { id: 'pmc', emoji: null, name: 'PMC', isPMC: true },
  { id: 'cherry', emoji: '🍒', name: 'Cherry' },
  { id: 'lemon', emoji: '🍋', name: 'Lemon' },
  { id: 'orange', emoji: '🍊', name: 'Orange' },
  { id: 'grapes', emoji: '🍇', name: 'Grapes' },
  { id: 'watermelon', emoji: '🍉', name: 'Watermelon' },
  { id: 'bell', emoji: '🔔', name: 'Bell' },
  { id: 'diamond', emoji: '💎', name: 'Diamond' },
  { id: 'seven', emoji: '7️⃣', name: 'Lucky 7' },
  { id: 'star', emoji: '⭐', name: 'Star' },
];

const BAN_KEY = 'pmc_slot_ban';
const BAN_DURATION = 60 * 60 * 1000; // 1 hour in ms
const SPIN_DURATION = 100;
const GRID_COLS = 6;
const GRID_ROWS = 5;
const MAX_PULLS = 10;
const WIN_CONDITION = 5; // Need 5 PMC logos aligned vertically to win

// Single column that scrolls symbols downward
function SlotColumn({ columnIndex, spinning, finalSymbols, onStop }) {
  const [displaySymbols, setDisplaySymbols] = useState(finalSymbols);
  const [isSpinning, setIsSpinning] = useState(false);
  const intervalRef = useRef(null);
  const startDelay = columnIndex * 10;
  const stopDelay = columnIndex * 30;

  // Sync displaySymbols with finalSymbols when not spinning
  useEffect(() => {
    if (!spinning && !isSpinning) {
      setDisplaySymbols(finalSymbols);
    }
  }, [finalSymbols, spinning, isSpinning]);

  useEffect(() => {
    if (spinning) {
      // Start spinning after delay
      const startTimeout = setTimeout(() => {
        setIsSpinning(true);
        intervalRef.current = setInterval(() => {
          setDisplaySymbols(prev => {
            const newSymbols = [...prev];
            newSymbols.pop();
            newSymbols.unshift(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
            return newSymbols;
          });
        }, 100);
      }, startDelay);

      // Stop this column after base duration + stop delay
      const stopTimeout = setTimeout(() => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setDisplaySymbols(finalSymbols);
        setIsSpinning(false);
        onStop(columnIndex);
      }, SPIN_DURATION + startDelay + stopDelay);

      return () => {
        clearTimeout(startTimeout);
        clearTimeout(stopTimeout);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    } else {
      // When spinning becomes false, ensure we stop
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (isSpinning) {
        setIsSpinning(false);
        setDisplaySymbols(finalSymbols);
      }
    }
  }, [spinning, finalSymbols, columnIndex, startDelay, stopDelay, onStop]);

  return (
    <div className={`slot-column ${isSpinning ? 'spinning' : ''}`}>
      {displaySymbols.map((symbol, rowIndex) => (
        <div
          key={rowIndex}
          className={`grid-cell ${symbol?.isPMC && !isSpinning ? 'is-pmc' : ''}`}
        >
          <div className="cell-symbol">
            {symbol.isPMC ? (
              <img src="/2026/PMCcolor.svg" alt="PMC" className="pmc-symbol" />
            ) : (
              <span className="emoji-symbol">{symbol.emoji}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Generate initial grid as columns (6 columns x 5 rows each)
const generateInitialGrid = () => {
  return Array(GRID_COLS).fill(null).map(() =>
    Array(GRID_ROWS).fill(null).map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)])
  );
};

export default function SlotMachine({ onWin }) {
  const [isBanned, setIsBanned] = useState(false);
  const [banTimeLeft, setBanTimeLeft] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [pullsLeft, setPullsLeft] = useState(MAX_PULLS);
  const [columnResults, setColumnResults] = useState(generateInitialGrid);
  const [showResult, setShowResult] = useState(false);
  const [isWinner, setIsWinner] = useState(false);
  const [pmcCount, setPmcCount] = useState(0);
  const [stoppedColumns, setStoppedColumns] = useState(0);

  // Check ban status
  useEffect(() => {
    const checkBan = () => {
      const banData = localStorage.getItem(BAN_KEY);
      if (banData) {
        const banTime = parseInt(banData, 10);
        const now = Date.now();
        if (now < banTime) {
          setIsBanned(true);
          setBanTimeLeft(banTime - now);
        } else {
          localStorage.removeItem(BAN_KEY);
          setIsBanned(false);
        }
      }
    };

    checkBan();
    const interval = setInterval(checkBan, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update ban timer display
  useEffect(() => {
    if (isBanned && banTimeLeft > 0) {
      const interval = setInterval(() => {
        setBanTimeLeft((prev) => {
          if (prev <= 1000) {
            setIsBanned(false);
            localStorage.removeItem(BAN_KEY);
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isBanned]);

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleColumnStop = (columnIndex) => {
    setStoppedColumns(prev => prev + 1);
  };

  // Watch for all columns stopped
  useEffect(() => {
    if (stoppedColumns >= GRID_COLS && spinning) {
      setSpinning(false);
      setPullsLeft((prev) => prev - 1);
      setShowResult(true);

      // Check for vertical alignment: any column with all 5 PMC logos
      const hasVerticalWin = columnResults.some(column =>
        column.every(symbol => symbol?.isPMC)
      );
      const allSymbols = columnResults.flat();
      const pmcMatches = allSymbols.filter((s) => s.isPMC).length;
      setPmcCount(pmcMatches);
      const won = hasVerticalWin;
      setIsWinner(won);

      if (won) {
        setTimeout(() => onWin(), 2000);
      } else if (pullsLeft <= 1) {
        const banUntil = Date.now() + BAN_DURATION;
        localStorage.setItem(BAN_KEY, banUntil.toString());
        setIsBanned(true);
        setBanTimeLeft(BAN_DURATION);
      }
    }
  }, [stoppedColumns]);

  const spin = () => {
    if (spinning || pullsLeft <= 0) return;

    setSpinning(true);
    setShowResult(false);
    setStoppedColumns(0);

    // Generate random results for each column
    const newColumnResults = Array(GRID_COLS).fill(null).map(() =>
      Array(GRID_ROWS).fill(null).map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)])
    );

    setColumnResults(newColumnResults);
  };

  // Banned screen
  if (isBanned) {
    return (
      <div className="slot-overlay">
        <div className="slot-machine banned">
          <div className="banned-icon">🚫</div>
          <h1>ACCESO DENEGADO</h1>
          <p className="banned-reason">
            No conseguiste todos los logos de PMC.
            <br />
            Debes esperar para intentar de nuevo.
          </p>
          <div className="ban-timer">
            <span className="timer-label">Tiempo restante:</span>
            <span className="timer-value">{formatTime(banTimeLeft)}</span>
          </div>
        </div>
      </div>
    );
  }

  // Slot machine
  return (
    <div className="slot-overlay">
      <div className="slot-main-area">
        {/* Left Sidebar */}
        <div className="slot-sidebar">
          <div className="sidebar-panels-group">
            <div className="sidebar-panel feature-panel">
              <span className="panel-label">ENTRADA</span>
              <span className="panel-value">GRATIS</span>
            </div>
            <div className="sidebar-panel bet-panel">
              <span className="panel-label">TIRADAS</span>
              <span className="panel-value-large">{pullsLeft}/{MAX_PULLS}</span>
              <span className="panel-sublabel">RESTANTES</span>
            </div>
          </div>
        </div>

        {/* Main Slot Machine */}
        <div className="slot-machine">
        <div className="slot-pmc-logo-wrapper">
          <img src={pmcLogo} alt="PMC" className="slot-pmc-logo" />
        </div>
        <div className="slot-body">
          <div className="grid-container">
            {columnResults.map((columnSymbols, colIndex) => (
              <SlotColumn
                key={colIndex}
                columnIndex={colIndex}
                spinning={spinning}
                finalSymbols={columnSymbols}
                onStop={handleColumnStop}
              />
            ))}
          </div>
        </div>
      </div>
      </div>

      {/* Bottom info - Credit and Bet */}
      <div className="slot-bottom-info">
        <span className="bottom-info-label">CREDIT</span>
        <span className="bottom-info-value">$1,000.00</span>
        <span className="bottom-info-label">BET</span>
        <span className="bottom-info-value">$0.00</span>
      </div>

      {/* Right side - Spin button area */}
      <div className="slot-controls">
        <div className="control-btn minus">−</div>
        <button
          className="spin-circle-btn"
          onClick={spin}
          disabled={spinning || pullsLeft <= 0 || isWinner}
        >
          <span className="spin-arrows">↻</span>
        </button>
        <div className="control-btn plus">+</div>
      </div>
    </div>
  );
}
