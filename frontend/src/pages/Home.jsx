import { useEffect, useState } from 'react';
import { api } from '../api';
import { Link } from 'react-router-dom';
import DiscordModal from '../components/DiscordModal';
import ConfirmModal from '../components/ConfirmModal';
import './Home.css';

const timelineEvents = [
  { date: '16/01 - 01/02', title: 'REGISTROS', id: 'registros' },
  { date: '01/02 - 08/02', title: 'SCREENING', id: 'screening' },
  { date: '08/02', title: 'QUALIFIERS SHOWCASE', id: 'showcase' },
  { date: '13/02 - 15/02', title: 'QUALIFIERS', id: 'qualifiers' },
  { date: '27/02 - 01/03', title: 'ROUND OF 16', id: 'ro16' },
  { date: '06/03 - 08/03', title: 'QUARTERFINALS', id: 'quarters' },
  { date: '13/03 - 15/03', title: 'SEMIFINALS', id: 'semis' },
  { date: '20/03 - 22/03', title: 'FINALS', id: 'finals' },
  { date: '27/03 - 29/03', title: 'GRANDFINALS', id: 'grandfinals' },
];

const newsItems = [
  { date: '25/12/2025', title: 'Lorem ipsum dolor sit amet consectetur adipiscing elit.', id: 1 },
  { date: '20/12/2025', title: 'Sed do eiusmod tempor incididunt ut labore.', id: 2 },
  { date: '15/12/2025', title: 'Ut enim ad minim veniam quis nostrud.', id: 3 },
  { date: '10/12/2025', title: 'Duis aute irure dolor in reprehenderit voluptate.', id: 4 },
  { date: '05/12/2025', title: 'Excepteur sint occaecat cupidatat non proident sunt.', id: 5 },
];

export default function Home({ user, setUser }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDiscordModal, setShowDiscordModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getTournamentStatus().then(setStatus).catch(console.error);
  }, []);

  const handleRegister = async (discordUsername) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.register(discordUsername);
      setUser(result.user);
      setShowDiscordModal(false);
    } catch (err) {
      setError(err.message);
      throw err; // Re-throw so modal can display it
    } finally {
      setLoading(false);
    }
  };

  const handleUnregister = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.unregister();
      const updatedUser = await api.getMe();
      setUser(updatedUser);
      setShowConfirmModal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-page">
      {/* Video Background Section */}
      <div className="video-section">
        <video className="video-bg" autoPlay loop playsInline>
          <source src="/pmcvideo.webm" type="video/webm" />
        </video>
        <div className="video-overlay"></div>

        {/* Hero Section */}
        <div className="home-hero">
          <div className="hero-left">
          <h1 className="hero-title">
            Peru Mania<br />
            <span>Cup 2026</span>
          </h1>
          <p className="hero-subtitle">
            El torneo de osu!mania 4K más grande de Perú.
          </p>
          <div className="hero-cta">
            {!user ? (
              <>
                <button onClick={api.login} className="cta-button">
                  Inscribirse
                </button>
                <Link to="/brackets" className="cta-button secondary">
                  Brackets
                </Link>
              </>
            ) : !user.is_registered && status?.registration_open ? (
              <>
                <button
                  onClick={() => setShowDiscordModal(true)}
                  disabled={loading}
                  className="cta-button"
                >
                  Inscribirse
                </button>
                <Link to="/brackets" className="cta-button secondary">
                  Brackets
                </Link>
              </>
            ) : user.is_registered ? (
              <>
                <button
                  onClick={() => setShowConfirmModal(true)}
                  disabled={loading}
                  className="cta-button danger"
                >
                  {loading ? 'Procesando...' : 'Cancelar Registro'}
                </button>
                <Link to="/brackets" className="cta-button secondary">
                  Brackets
                </Link>
              </>
            ) : (
              <Link to="/brackets" className="cta-button secondary">
                Brackets
              </Link>
            )}
          </div>

        </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="timeline-section">
        <div className="section-header">
          <h2>CRONOGRAMA</h2>
          <p className="section-subtitle">Cronologia del progreso del torneo actual.</p>
        </div>
        <div className="timeline-track">
          <div className="timeline-line"></div>
          {timelineEvents.map((event, index) => (
            <div
              key={event.id}
              className={`timeline-event ${event.id === 'registros' ? 'active' : ''}`}
            >
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <span className="timeline-event-title">{event.title}</span>
                <span className="timeline-event-date">{event.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Registration Status Banner */}
      <div className="registration-banner">
        <div className="banner-stat banner-left">
          <span className="banner-number">{(status?.total_registered_players ?? 0).toString().padStart(2, '0')}</span>
          <span className="banner-label">JUGADORES</span>
        </div>
        <div className="banner-center">
          <span className="banner-status">{status?.registration_open ? 'ABIERTO' : 'CERRADO'}</span>
          <span className="banner-status-label">ESTADO DE INSCRIPCIONES</span>
        </div>
        <div className="banner-stat banner-right">
          <span className="banner-number">{Math.max(0, 32 - (status?.total_registered_players ?? 0)).toString().padStart(2, '0')}</span>
          <span className="banner-label">CUPOS DISPONIBLES</span>
        </div>
      </div>

      {/* News Section */}
      <div className="news-section">
        <h2 className="news-title">NOTICIAS</h2>
        <div className="news-list">
          {newsItems.map((item) => (
            <div key={item.id} className="news-item">
              <span className="news-date">{item.date}</span>
              <span className="news-text">{item.title}</span>
              <span className="news-arrow">›</span>
            </div>
          ))}
        </div>
      </div>

      <DiscordModal
        isOpen={showDiscordModal}
        onClose={() => setShowDiscordModal(false)}
        onSubmit={handleRegister}
        loading={loading}
      />

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => { setShowConfirmModal(false); setError(null); }}
        onConfirm={handleUnregister}
        title="Cancelar Registro"
        message="¿Estás seguro de que quieres cancelar tu registro del torneo?"
        loading={loading}
        error={error}
      />
    </div>
  );
}
