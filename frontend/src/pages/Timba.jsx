import { useState } from 'react';
import SlotMachine from '../components/SlotMachine';
import './Timba.css';

export default function Timba() {
  const [hasWon, setHasWon] = useState(false);

  const handleWin = () => {
    setHasWon(true);
  };

  if (hasWon) {
    return (
      <div className="timba-win-screen">
        <div className="win-content">
          <h1>GANASTE</h1>
          <p>Felicidades, conseguiste todos los logos de PMC.</p>
        </div>
      </div>
    );
  }

  return <SlotMachine onWin={handleWin} />;
}
