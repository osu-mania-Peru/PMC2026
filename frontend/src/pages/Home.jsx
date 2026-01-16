import { useEffect, useState, useMemo, useRef } from 'react';
import { api } from '../api';
import { Link } from 'react-router-dom';
import DiscordModal from '../components/DiscordModal';
import ConfirmModal from '../components/ConfirmModal';
import TimelineEditModal from '../components/TimelineEditModal';
import NewsEditModal from '../components/NewsEditModal';
import catGif from '../assets/cat.gif';
import heroBgVideo from '../assets/hero-bg.mp4';
import './Home.css';

// Parse DD/MM/YYYY or DD/MM date string to Date object
const parseDate = (dateStr) => {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  const parts = trimmed.split('/').map(Number);

  if (parts.length === 2) {
    // DD/MM format - assume 2026 for backwards compatibility
    const [day, month] = parts;
    if (isNaN(day) || isNaN(month)) return null;
    return new Date(2026, month - 1, day);
  }
  if (parts.length === 3) {
    // DD/MM/YYYY format
    const [day, month, year] = parts;
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    return new Date(year, month - 1, day);
  }
  return null;
};

// Get event status based on date range
const getEventStatus = (dateRange) => {
  if (!dateRange) return 'future';
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Handle various separators (with or without spaces)
  const parts = dateRange.split(/\s*-\s*/);
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

export default function Home({ user, setUser, dangerHover, setDangerHover }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDiscordModal, setShowDiscordModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [newsItems, setNewsItems] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [newsLoading, setNewsLoading] = useState(true);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);
  const audioContextRef = useRef(null);
  const filterRef = useRef(null);
  const gainRef = useRef(null);
  const modalOpenRef = useRef(false);

  const videoTransitionRef = useRef(null);

  const initAudioContext = () => {
    if (audioContextRef.current || !videoRef.current) return;

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaElementSource(videoRef.current);
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();

    filter.type = 'lowpass';
    filter.frequency.value = 22000; // Start fully open
    filter.Q.value = 1;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(audioContext.destination);

    audioContextRef.current = audioContext;
    filterRef.current = filter;
    gainRef.current = gain;
  };

  const slowDownVideo = () => {
    setDangerHover(true);
    document.body.style.overflow = 'hidden';
    if (!videoRef.current) return;
    initAudioContext();
    if (videoTransitionRef.current) cancelAnimationFrame(videoTransitionRef.current);

    const video = videoRef.current;
    const duration = 500;
    const startTime = performance.now();
    const startRate = video.playbackRate;
    const startFreq = filterRef.current?.frequency.value || 22000;
    const startGain = gainRef.current?.gain.value || 1;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      video.playbackRate = Math.max(0.1, startRate + (0.3 - startRate) * eased);

      if (filterRef.current) {
        filterRef.current.frequency.value = startFreq + (300 - startFreq) * eased;
      }
      if (gainRef.current) {
        gainRef.current.gain.value = startGain + (0.5 - startGain) * eased;
      }

      if (progress < 1) {
        videoTransitionRef.current = requestAnimationFrame(animate);
      }
    };
    videoTransitionRef.current = requestAnimationFrame(animate);
  };

  const restoreVideoSpeed = (force = false) => {
    if (modalOpenRef.current && !force) return;
    setDangerHover(false);
    document.body.style.overflow = '';
    if (!videoRef.current) return;
    if (videoTransitionRef.current) cancelAnimationFrame(videoTransitionRef.current);

    const video = videoRef.current;
    const duration = 500;
    const startTime = performance.now();
    const startRate = video.playbackRate;
    const startFreq = filterRef.current?.frequency.value || 300;
    const startGain = gainRef.current?.gain.value || 0.5;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      video.playbackRate = startRate + (1 - startRate) * eased;

      if (filterRef.current) {
        filterRef.current.frequency.value = startFreq + (22000 - startFreq) * eased;
      }
      if (gainRef.current) {
        gainRef.current.gain.value = startGain + (1 - startGain) * eased;
      }

      if (progress < 1) {
        videoTransitionRef.current = requestAnimationFrame(animate);
      }
    };
    videoTransitionRef.current = requestAnimationFrame(animate);
  };

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
    setTimelineLoading(true);
    api.getTimeline()
      .then(data => setTimelineEvents(data.events))
      .catch(console.error)
      .finally(() => setTimelineLoading(false));
  };

  const refreshNews = () => {
    setNewsLoading(true);
    api.getNews()
      .then(data => setNewsItems(data.items))
      .catch(console.error)
      .finally(() => setNewsLoading(false));
  };

  useEffect(() => {
    api.getTournamentStatus().then(setStatus).catch(console.error);
    refreshTimeline();
    refreshNews();
  }, []);

  const handleRegister = async (discordUsername) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.register(discordUsername);
      setUser(result.user);
      // Don't close modal - let it show success state with Discord invite
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
      modalOpenRef.current = false;
      restoreVideoSpeed(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
  };

  return (
    <div className="home-page">
      {/* Video Background Section */}
      <div className={`video-section ${user ? 'logged-in' : ''} ${dangerHover ? 'danger-hover' : ''}`}>
        <video
          ref={videoRef}
          className="video-bg"
          src={heroBgVideo}
          autoPlay
          loop
          muted
          playsInline
        />
        <div className="video-overlay"></div>

        {/* Hero Section */}
        <div className="home-hero">
          <div className="hero-left">
          <h1 className="hero-title">
            Peru Mania<br />
            Cup 2026
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
                onClick={() => { setShowConfirmModal(true); modalOpenRef.current = true; }}
                onMouseEnter={slowDownVideo}
                onMouseLeave={() => restoreVideoSpeed()}
                disabled={loading}
                className="cta-button danger"
              >
                {loading ? <><img src={catGif} alt="" className="btn-loading-cat" /> Procesando...</> : 'Cancelar Registro'}
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
        {timelineLoading ? (
          <div className="section-loading">
            <img src={catGif} alt="" className="section-loading-cat" />
            <span>Cargando cronograma...</span>
          </div>
        ) : (
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
        )}
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
        {newsLoading ? (
          <div className="section-loading">
            <img src={catGif} alt="" className="section-loading-cat" />
            <span>Cargando noticias...</span>
          </div>
        ) : (
          <div className="news-list">
            {newsItems.map((item) => (
              <div key={item.id} className="news-item">
                <span className="news-date">{item.date}</span>
                <span className="news-text">{item.title}</span>
                <span className="news-arrow">›</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <DiscordModal
        isOpen={showDiscordModal}
        onClose={() => setShowDiscordModal(false)}
        onSubmit={handleRegister}
        onUnregister={handleUnregister}
        onLogout={handleLogout}
        loading={loading}
        user={user}
      />

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => { setShowConfirmModal(false); setError(null); modalOpenRef.current = false; restoreVideoSpeed(true); }}
        onConfirm={handleUnregister}
        title="Cancelar Registro"
        message="¿Estás seguro de que quieres cancelar tu registro del torneo?"
        loading={loading}
        error={error}
      />

      <TimelineEditModal
        isOpen={showTimelineModal}
        onClose={() => setShowTimelineModal(false)}
        events={timelineEvents}
        onRefresh={refreshTimeline}
      />

      <NewsEditModal
        isOpen={showNewsModal}
        onClose={() => setShowNewsModal(false)}
        items={newsItems}
        onRefresh={refreshNews}
      />
    </div>
  );
}
