import { useEffect, useState, useMemo } from 'react';
import { api } from '../api';
import { Link } from 'react-router-dom';
import DiscordModal from '../components/DiscordModal';
import ConfirmModal from '../components/ConfirmModal';
import TimelineEditModal from '../components/TimelineEditModal';
import NewsEditModal from '../components/NewsEditModal';
import './Home.css';

// Parse DD/MM date string to Date object (assumes current year, handles year rollover)
const parseDate = (dateStr) => {
  if (!dateStr) return null;
  const [day, month] = dateStr.trim().split('/').map(Number);
  if (!day || !month) return null;
  const now = new Date();
  const year = now.getFullYear();
  // If month is less than current month by a lot, it might be next year
  const date = new Date(year, month - 1, day);
  return date;
};

// Get event status based on date range
const getEventStatus = (dateRange) => {
  if (!dateRange) return 'future';
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parts = dateRange.split(' - ');
  const startDate = parseDate(parts[0]);
  const endDate = parts[1] ? parseDate(parts[1]) : startDate;

  if (!startDate) return 'future';

  // Set end date to end of day
  const endOfDay = new Date(endDate || startDate);
  endOfDay.setHours(23, 59, 59, 999);

  if (today > endOfDay) return 'completed';
  if (today >= startDate && today <= endOfDay) return 'active';
  return 'future';
};

export default function Home({ user, setUser }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDiscordModal, setShowDiscordModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [newsItems, setNewsItems] = useState([]);
  const [timelineSaving, setTimelineSaving] = useState(false);
  const [newsSaving, setNewsSaving] = useState(false);
  const [error, setError] = useState(null);

  // Calculate timeline progress
  const timelineProgress = useMemo(() => {
    if (!timelineEvents.length) return { events: [], progressPercent: 0 };

    const eventsWithStatus = timelineEvents.map(event => ({
      ...event,
      status: getEventStatus(event.date),
    }));

    // Find the active or last completed event index
    let activeIndex = eventsWithStatus.findIndex(e => e.status === 'active');
    if (activeIndex === -1) {
      // No active event, find last completed
      const lastCompleted = eventsWithStatus.map((e, i) => e.status === 'completed' ? i : -1).filter(i => i !== -1);
      activeIndex = lastCompleted.length ? lastCompleted[lastCompleted.length - 1] : -1;
    }

    // Calculate progress percentage (center of active event or end of last completed)
    let progressPercent = 0;
    if (activeIndex >= 0) {
      const eventWidth = 100 / timelineEvents.length;
      progressPercent = (activeIndex + 0.5) * eventWidth;
    }

    return { events: eventsWithStatus, progressPercent };
  }, [timelineEvents]);

  const refreshTimeline = () => {
    api.getTimeline().then(data => setTimelineEvents(data.events)).catch(console.error);
  };

  const refreshNews = () => {
    api.getNews().then(data => setNewsItems(data.items)).catch(console.error);
  };

  useEffect(() => {
    api.getTournamentStatus().then(setStatus).catch(console.error);
    refreshTimeline();
    refreshNews();
  }, []);

  const handleSaveTimeline = async (events) => {
    setTimelineSaving(true);
    try {
      const result = await api.updateTimeline(events);
      setTimelineEvents(result.events);
      setShowTimelineModal(false);
    } catch (err) {
      console.error('Failed to save timeline:', err);
    } finally {
      setTimelineSaving(false);
    }
  };

  const handleSaveNews = async (items) => {
    setNewsSaving(true);
    try {
      const result = await api.updateNews(items);
      setNewsItems(result.items);
      setShowNewsModal(false);
    } catch (err) {
      console.error('Failed to save news:', err);
    } finally {
      setNewsSaving(false);
    }
  };

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
              // Not logged in - show login button
              <button onClick={api.login} className="cta-button">
                Iniciar Sesión
              </button>
            ) : user.is_registered ? (
              // Logged in and registered - show unregister button
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={loading}
                className="cta-button danger"
              >
                {loading ? 'Procesando...' : 'Cancelar Registro'}
              </button>
            ) : status?.registration_open ? (
              // Logged in, not registered, registration open - show register button
              <button
                onClick={() => setShowDiscordModal(true)}
                disabled={loading}
                className="cta-button"
              >
                Inscribirse
              </button>
            ) : status && !status.registration_open ? (
              // Logged in, not registered, registration closed - show disabled
              <button className="cta-button" disabled>
                Registro Cerrado
              </button>
            ) : null}
            <Link to="/brackets" className="cta-button secondary">
              Brackets
            </Link>
          </div>

        </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="timeline-section">
        <div className="section-header">
          <h2>CRONOGRAMA</h2>
          <p className="section-subtitle">Cronologia del progreso del torneo actual.</p>
          {user?.is_staff && (
            <button
              className="timeline-edit-btn"
              onClick={() => setShowTimelineModal(true)}
            >
              Editar
            </button>
          )}
        </div>
        <div className="timeline-track">
          <div className="timeline-line"></div>
          <div
            className="timeline-progress"
            style={{ width: `${timelineProgress.progressPercent}%` }}
          ></div>
          {timelineProgress.events.map((event) => (
            <div
              key={event.id}
              className={`timeline-event ${event.status}`}
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
          <span className="banner-number">{(status?.total_registered_players ?? 0).toString().padStart(2, '0')}</span>
          <span className="banner-label">REGISTRADOS</span>
        </div>
      </div>

      {/* News Section */}
      <div className="news-section">
        <div className="section-header">
          <h2 className="news-title">NOTICIAS</h2>
          {user?.is_staff && (
            <button
              className="news-edit-btn"
              onClick={() => setShowNewsModal(true)}
            >
              Editar
            </button>
          )}
        </div>
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

      <TimelineEditModal
        isOpen={showTimelineModal}
        onClose={() => setShowTimelineModal(false)}
        onSave={handleSaveTimeline}
        events={timelineEvents}
        loading={timelineSaving}
        onRefresh={refreshTimeline}
      />

      <NewsEditModal
        isOpen={showNewsModal}
        onClose={() => setShowNewsModal(false)}
        onSave={handleSaveNews}
        items={newsItems}
        loading={newsSaving}
        onRefresh={refreshNews}
      />
    </div>
  );
}
