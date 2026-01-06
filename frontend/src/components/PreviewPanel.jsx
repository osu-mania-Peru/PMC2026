import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import ManiaPreview from './ManiaPreview';
import catGif from '../assets/cat.gif';
import './PreviewPanel.css';

/**
 * Sliding preview panel component for displaying beatmap previews.
 * Slides in from the right side of the screen.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the panel is visible
 * @param {Function} props.onClose - Function to call when closing the panel
 * @param {Object} props.map - The map object with beatmapset_id and other info
 * @param {string} props.apiBaseUrl - Base URL for API calls
 */
export default function PreviewPanel({ isOpen, onClose, map, apiBaseUrl }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notesData, setNotesData] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);

  // Fetch preview data when map changes
  useEffect(() => {
    if (!map?.beatmap_id || !isOpen) {
      return;
    }

    const fetchPreviewData = async () => {
      setLoading(true);
      setError(null);
      setNotesData(null);
      setAudioUrl(null);

      try {
        const response = await fetch(
          `${apiBaseUrl}/mappools/preview/${map.beatmap_id}`
        );

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Beatmap not found');
          }
          throw new Error(`Failed to fetch preview: ${response.status}`);
        }

        const data = await response.json();
        setNotesData(data);
        // Construct full audio URL from API base + relative path
        setAudioUrl(`${apiBaseUrl}${data.audio_url}`);
      } catch (err) {
        console.error('Error fetching preview data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPreviewData();
  }, [map?.beatmap_id, isOpen, apiBaseUrl]);

  // Add body class to shift viewport when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('preview-panel-open');
    } else {
      document.body.classList.remove('preview-panel-open');
    }

    return () => {
      document.body.classList.remove('preview-panel-open');
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Get display title
  const getTitle = () => {
    if (!map) return 'Preview';
    if (map.artist && map.title) {
      return `${map.artist} - ${map.title}`;
    }
    return map.title || 'Preview';
  };

  return createPortal(
    <div className={`preview-panel ${isOpen ? 'open' : ''}`}>
      <div className="preview-panel-header">
        <button
          className="preview-panel-close"
          onClick={onClose}
          aria-label="Close preview panel"
        >
          <X size={24} />
        </button>
      </div>

      <div className="preview-panel-content">
        {loading && (
          <div className="preview-panel-loading">
            <img src={catGif} alt="Loading..." className="preview-panel-loading-cat" />
            <span>Loading preview...</span>
          </div>
        )}

        {error && (
          <div className="preview-panel-error">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && notesData && audioUrl && (
          <ManiaPreview notesData={notesData} audioUrl={audioUrl} />
        )}

        {!loading && !error && !notesData && !audioUrl && map && (
          <div className="preview-panel-empty">
            <p>No preview data available</p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
