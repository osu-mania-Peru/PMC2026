import './Spinner.css';
import catGif from '../assets/cat.gif';

export default function Spinner({ size = 'medium', text = '' }) {
  return (
    <div className={`spinner-container ${size}`}>
      <img src={catGif} alt="Loading cat" className="spinner-cat" />
      {text && <span className="spinner-text">{text}</span>}
    </div>
  );
}
