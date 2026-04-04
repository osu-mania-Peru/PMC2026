import { BrowserRouter, Routes, Route, Link, NavLink, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "./api";
import { FaDiscord, FaYoutube, FaTwitch } from "react-icons/fa";
import { Menu, X } from "lucide-react";
import logo from "./assets/logo.svg";
import catGif from "./assets/cat.gif";
import supportQr from "./assets/support.png";
import munchiesImg from "./assets/munchies.jpeg";
import oshimaiImg from "./assets/oshimai.png";
import "./App.css";

// Fuzzy match for stinky detection
function isStinky(username) {
  if (!username) return false;
  const targets = ['starrysergal'];
  const name = username.toLowerCase().replace(/[^a-z]/g, '');

  // Levenshtein distance for fuzzy matching
  const levenshtein = (a, b) => {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    return matrix[b.length][a.length];
  };

  return targets.some(target => {
    if (name === target) return true;
    if (name.includes(target)) return true;
    return levenshtein(name, target) <= 3;
  });
}

// Pages
import Home from "./pages/Home";
import Register from "./pages/Register";
import Brackets from "./pages/Brackets";
import Matches from "./pages/Matches";
import Players from "./pages/Players";
import Mappool from "./pages/Mappool";
import Preview from "./pages/Preview";
import StaffDiscord from "./pages/StaffDiscord";
import StaffWhitelist from "./pages/StaffWhitelist";
import AdminControl from "./pages/AdminControl";
import MatchScheduling from "./pages/MatchScheduling";
import Polls from "./pages/Polls";
// Timba removed - tournament committee prohibits gambling

// Components
import AdminPanel from "./components/AdminPanel";
import Spinner from "./components/Spinner";
import NotificationBell from "./components/NotificationBell";
// SlotMachine minigame available at /timba

function RedirectToHome() {
  useEffect(() => {
    window.location.href = '/home';
  }, []);
  return null;
}

function PollsPopup({ isOpen, onClose, user }) {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    api.getPolls()
      .then(res => setPolls(res.polls))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, user]);

  const handleVote = async (pollId, optionId) => {
    try {
      const updated = await api.votePoll(pollId, optionId);
      setPolls(polls.map(p => p.id === pollId ? updated : p));
    } catch (err) {
      // silently fail
    }
  };

  if (!isOpen) return null;

  return (
    <div className="polls-popup">
      <div className="polls-popup-header">
        <span className="polls-popup-title">Encuestas</span>
        <button className="support-popup-close" onClick={onClose}><X size={16} /></button>
      </div>
      <div className="polls-popup-body">
        {loading ? (
          <div className="polls-popup-loading"><img src={catGif} alt="" style={{ height: '2em' }} /></div>
        ) : polls.length === 0 ? (
          <p className="polls-popup-empty">No hay encuestas</p>
        ) : (
          polls.map(poll => (
            <div key={poll.id} className={`polls-popup-card ${!poll.is_active ? 'closed' : ''}`}>
              <div className="polls-popup-card-title">{poll.title}</div>
              {poll.description && <div className="polls-popup-card-desc">{poll.description}</div>}
              <div className="polls-popup-options">
                {poll.options.map(opt => {
                  const isSelected = poll.user_vote === opt.id;
                  const hasVoted = poll.user_vote !== null && poll.user_vote !== undefined;
                  const showStats = hasVoted || !poll.is_active;
                  const canVote = !!user && poll.is_active && !hasVoted;
                  return (
                    <button
                      key={opt.id}
                      className={`polls-popup-option ${isSelected ? 'selected' : ''}`}
                      onClick={() => canVote && handleVote(poll.id, opt.id)}
                      disabled={!canVote}
                    >
                      {showStats && <div className="polls-popup-option-bar" style={{ width: `${opt.percentage}%` }} />}
                      <span className="polls-popup-option-text">{opt.option_text}</span>
                      {showStats && <span className="polls-popup-option-pct">{opt.percentage}%</span>}
                    </button>
                  );
                })}
              </div>
              <div className="polls-popup-card-meta">
                {(poll.user_vote !== null || !poll.is_active) ? (
                  <>{poll.total_votes} voto{poll.total_votes !== 1 ? 's' : ''}</>
                ) : (
                  <>Vota para ver resultados</>
                )}
                {!poll.is_active && <span className="polls-popup-closed-badge">Cerrada</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SupportButton({ user }) {
  const [supportOpen, setSupportOpen] = useState(false);
  const [pollsOpen, setPollsOpen] = useState(false);

  return (
    <div className="support-float">
      {supportOpen && (
        <div className="support-popup">
          <button className="support-popup-close" onClick={() => setSupportOpen(false)}>
            <X size={16} />
          </button>
          <img src={supportQr} alt="Yape QR" className="support-qr" />
          <p className="support-popup-text">Escanea para apoyar</p>
        </div>
      )}
      <PollsPopup isOpen={pollsOpen} onClose={() => setPollsOpen(false)} user={user} />
      <div className="support-btn-row">
        <button className="polls-float-btn" onClick={() => { setPollsOpen(!pollsOpen); setSupportOpen(false); }}>
          Encuestas
        </button>
        <button className="support-btn" onClick={() => { setSupportOpen(!supportOpen); setPollsOpen(false); }}>
          Apoya al PMC
        </button>
      </div>
    </div>
  );
}

function OshimaiOverlay() {
  const [players, setPlayers] = useState([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    api.getAllUsers()
      .then(data => {
        setPlayers(data.users || []);
      })
      .catch(() => {});
  }, []);

  if (dismissed) return null;

  return (
    <div className="oshimai-overlay">
      <div className="oshimai-credits">
        <div className="oshimai-credits-scroll">
          {[...players, ...players, ...players].map((p, i) => (
            <div key={`${p.id}-${i}`} className="oshimai-credit-name">
              <img src={`https://a.ppy.sh/${p.osu_id}`} alt="" className="oshimai-credit-avatar" />
              {p.username}
            </div>
          ))}
        </div>
      </div>
      <div className="oshimai-thanks">Gracias por participar!</div>
      <div className="oshimai-header">
        <img src="/2026/PMCcolor.svg" alt="PMC" className="oshimai-logo" onClick={() => setDismissed(true)} style={{ cursor: 'pointer', pointerEvents: 'auto' }} />
        <div className="oshimai-organizers">
          <span>Organizado por</span>
          <div className="oshimai-organizer">
            <img src="https://a.ppy.sh/9938020" alt="Sakisagee" className="oshimai-organizer-avatar" />
            <span>Sakisagee</span>
          </div>
          <span>y</span>
          <div className="oshimai-organizer">
            <img src="https://a.ppy.sh/10055648" alt="Miaurichesu" className="oshimai-organizer-avatar" />
            <span>Miaurichesu</span>
          </div>
        </div>
      </div>
      <img src={oshimaiImg} alt="Oshimai" className="oshimai-img" />
    </div>
  );
}

function AppContent({ user, setUser, loading, handleLogin, handleLogout }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dangerHover, setDangerHover] = useState(false);
  const [munchiesMode, setMunchiesMode] = useState(false);
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  // Munchies mode: 100% chance for testing (change to 0.4 for 40%)
  // Wait until page is done loading (no spinner)
  useEffect(() => {
    if (loading) return;
    if (false) { // Munchies easter egg disabled
      setMunchiesMode(true);
      const timers = [];

      // Timeline:
      // 0ms      - Shake starts (1.2s) + munchies start spawning
      // 200ms    - Flashbang starts building up (1.5s to peak)
      // 0-1.2s   - 60 munchies stagger launch (i*0.02s = 1.2s spread, each flies 2s)
      // 1700ms   - Flashbang peaks, start fade out
      // 3200ms   - Last munchie lands (1.2s delay + 2s flight)
      // 3300ms   - Logo bloom replacement

      // Phase 1 (200ms): Flashbang overlay builds up
      timers.push(setTimeout(() => {
        const flash = document.createElement('div');
        flash.className = 'munchies-flashbang';
        document.body.appendChild(flash);
        // Fade out after buildup peaks
        timers.push(setTimeout(() => flash.classList.add('fade-out'), 1500));
        timers.push(setTimeout(() => flash.remove(), 2100));
      }, 200));

      // Phase 2 (0ms): Spawn flying munchies immediately with shake
      timers.push(setTimeout(() => {
        const logos = document.querySelectorAll('.nav-logo img, .footer-logo img');
        if (!logos.length) return;
        logos.forEach(logo => {
          const logoRect = logo.getBoundingClientRect();
          if (logoRect.width === 0) return;

          // Spawn 60 munchies of varying sizes from random screen edges
          for (let i = 0; i < 60; i++) {
            const munch = document.createElement('img');
            munch.src = munchiesImg;
            munch.className = 'munchies-projectile';

            // Random size between 40px and 120px
            const size = 40 + Math.random() * 80;
            munch.style.width = size + 'px';

            // Random start position from edges
            const edge = Math.floor(Math.random() * 4);
            let startX, startY;
            const offset = size + 20;
            if (edge === 0) { startX = Math.random() * window.innerWidth; startY = -offset; }
            else if (edge === 1) { startX = Math.random() * window.innerWidth; startY = window.innerHeight + offset; }
            else if (edge === 2) { startX = -offset; startY = Math.random() * window.innerHeight; }
            else { startX = window.innerWidth + offset; startY = Math.random() * window.innerHeight; }

            // Each munchie targets a random point within the logo bounds
            const randTargetX = logoRect.left + Math.random() * logoRect.width;
            const randTargetY = logoRect.top + Math.random() * logoRect.height;
            munch.style.left = (startX - size / 2) + 'px';
            munch.style.top = (startY - size / 2) + 'px';
            munch.style.setProperty('--tx', (randTargetX - startX) + 'px');
            munch.style.setProperty('--ty', (randTargetY - startY) + 'px');
            // Stagger over 1.2s so last one launches at 1.2s, lands at 3.2s
            munch.style.animationDelay = (i * 0.02) + 's';

            document.body.appendChild(munch);
            munch.addEventListener('animationend', () => munch.remove());
          }
        });
      }, 100));

      // Phase 3 (3300ms): Replace logos, nav names, and "Peru" text with bouncy bloom
      timers.push(setTimeout(() => {
        // Replace logos
        document.querySelectorAll('.nav-logo img, .footer-logo img').forEach(img => {
          img.src = munchiesImg;
          img.style.objectFit = 'contain';
          img.classList.add('munchies-bloom');
        });
        document.documentElement.style.setProperty('--munchies-logo', `url(${munchiesImg})`);

        // Bounce the nav names into munchies names
        document.querySelectorAll('.munchies-nav-link').forEach(link => {
          link.classList.add('munchies-bloom');
        });

        // Replace "Peru" text with munchies image (same bloom)
        document.querySelectorAll('.hero-peru-text').forEach(el => {
          const img = document.createElement('img');
          img.src = munchiesImg;
          img.className = 'peru-munchies-inline munchies-bloom';
          el.replaceWith(img);
        });
      }, 3300));

      return () => timers.forEach(t => clearTimeout(t));
    }
  }, [loading]);

  if (loading) {
    return <Spinner size="large" text="Cargando..." />;
  }

  return (
    <div className={`app ${munchiesMode ? 'munchies-shake' : ''}`}>
      <nav className={`nav ${mobileMenuOpen ? 'menu-open' : ''} ${dangerHover ? 'danger-hover' : ''}`}>
        <div className="nav-content">
          <Link to="/" className="nav-logo">
            <img src="/2026/PMCcolor.svg" alt="PMC" />
          </Link>
          <button
            className="nav-hamburger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className={`nav-links ${mobileMenuOpen ? 'open' : ''}`}>
            <NavLink to="/" end>INICIO</NavLink>
            <NavLink to="/brackets">BRACKETS</NavLink>
            <NavLink to="/matches">PARTIDAS</NavLink>
            <NavLink to="/players">JUGADORES</NavLink>
            <NavLink to="/maps">MAPPOOL</NavLink>
            {user?.is_staff && (
              <>
                <NavLink to="/staff/discord" className="nav-staff-link">
                  DISCORD<span className="staff-badge">STAFF</span>
                </NavLink>
                <NavLink to="/staff/whitelist" className="nav-staff-link">
                  WHITELIST<span className="staff-badge">STAFF</span>
                </NavLink>
                <NavLink to="/admin" className="nav-staff-link">
                  ADMIN<span className="staff-badge">STAFF</span>
                </NavLink>
                <NavLink to="/polls" className="nav-staff-link">
                  ENCUESTAS<span className="staff-badge">STAFF</span>
                </NavLink>
              </>
            )}
            {user ? (
              <>
                {/* <NotificationBell /> */}
                <span className="nav-user">
                  {user.username}
                  {user.is_staff && <span className="staff-badge">STAFF</span>}
                </span>
                <button className="btn-full-height" onClick={handleLogout}>
                  CERRAR SESIÓN
                </button>
              </>
            ) : (
              <button
                className="btn-full-height-iniciar-sesion"
                onClick={handleLogin}
              >
                INICIAR SESIÓN
              </button>
            )}
          </div>
        </div>
      </nav>

      <Routes>
        <Route
          path="/"
          element={<RedirectToHome />}
        />
        <Route
          path="/home"
          element={
            <main className="main">
              <Home user={user} setUser={setUser} dangerHover={dangerHover} setDangerHover={setDangerHover} />
            </main>
          }
        />
        <Route
          path="/register"
          element={
            <main className="main has-container">
              {user ? (
                <Register user={user} setUser={setUser} />
              ) : (
                <Navigate to="/" />
              )}
            </main>
          }
        />
        <Route
          path="/brackets"
          element={<Navigate to="/brackets/winner" replace />}
        />
        <Route
          path="/brackets/:bracketType"
          element={
            <main className="main">
              <Brackets user={user} />
            </main>
          }
        />
        <Route
          path="/matches"
          element={
            <main className="main has-container">
              <Matches user={user} />
            </main>
          }
        />
        <Route
          path="/matches/:matchId/schedule"
          element={
            <main className="main">
              <MatchScheduling user={user} />
            </main>
          }
        />
        <Route
          path="/players"
          element={
            <main className="main has-container">
              <Players user={user} />
            </main>
          }
        />
        <Route
          path="/maps"
          element={
            <main className="main">
              <Mappool user={user} />
            </main>
          }
        />
        <Route
          path="/polls"
          element={
            user?.is_staff ? (
              <main className="main has-container">
                <Polls user={user} />
              </main>
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/staff/discord"
          element={
            user?.is_staff ? (
              <main className="main has-container">
                <StaffDiscord />
              </main>
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/staff/whitelist"
          element={
            user?.is_staff ? (
              <main className="main has-container">
                <StaffWhitelist />
              </main>
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/admin"
          element={
            user?.is_staff ? (
              <main className="main" style={{ padding: '0', maxWidth: 'none' }}>
                <AdminControl user={user} />
              </main>
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/preview"
          element={<Preview user={user} />}
        />
      </Routes>

      <footer className="footer">
        <div className="footer-main">
          <div className="footer-logo">
            <img src="/2026/noyearpmc.svg" alt="PMC" />
          </div>
          <div className="footer-right">
            <div className="footer-social">
              <span className="footer-social-label">
                Nuestras redes sociales:
              </span>
              <div className="footer-social-icons">
                <a
                  href="https://www.youtube.com/@PeruManiaCup"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                >
                  <FaYoutube size={20} />
                </a>
                <a
                  href="https://www.twitch.tv/perumaniacup"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Twitch"
                >
                  <FaTwitch size={20} />
                </a>
                <a
                  href="https://discord.gg/CbbNwxpr"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Discord"
                >
                  <FaDiscord size={20} />
                </a>
              </div>
            </div>
            <nav className="footer-nav">
              <Link to="/brackets">BRACKETS</Link>
              <Link to="/matches">PARTIDAS</Link>
              <Link to="/players">JUGADORES</Link>
              <Link to="/maps">MAPPOOL</Link>
              <a
                href="https://discord.gg/CbbNwxpr"
                target="_blank"
                rel="noopener noreferrer"
              >
                SOPORTE
              </a>
            </nav>
          </div>
        </div>
        <div className="footer-bottom">
          <span className="footer-hosted">
            Peru Mania Cup 2026 Hosteado por
            <a href="https://osu.ppy.sh/users/11646616" target="_blank" rel="noopener noreferrer" className="footer-host-link">
              <img src="https://a.ppy.sh/11646616" alt="Marguenka" className="footer-host-avatar" />
              Marguenka
            </a>
            y
            <a href="https://osu.ppy.sh/users/10055648" target="_blank" rel="noopener noreferrer" className="footer-host-link">
              <img src="https://a.ppy.sh/10055648" alt="Miaurichesu" className="footer-host-avatar" />
              Miaurichesu
            </a>
          </span>
          <span className="footer-credit">Designed by @r_koshiin</span>
        </div>
      </footer>

      {/* Floating Yape Support Button */}
      <SupportButton user={user} />

      {/* Admin Debug Panel - Hidden */}
      {/* <AdminPanel /> */}

      {/* PMC Over - Oshimai overlay */}
      <OshimaiOverlay />
    </div>
  );
}

// Process auth callback token before React renders (prevents redirect race condition)
(function processAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const error = params.get("error");

  if (token) {
    api.setToken(token);
    window.history.replaceState({}, "", "/home");
  }

  if (error) {
    console.error('Login error:', error);
    window.history.replaceState({}, "", "/home");
  }
})();

function App() {
  const [user, setUser] = useState(null);
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(() => !!api.getToken());

  useEffect(() => {
    // Fetch user if token exists
    const authToken = api.getToken();
    if (authToken) {
      api
        .getMe()
        .then((userData) => {
          if (isStinky(userData?.username)) {
            setBlocked(true);
          } else {
            setUser(userData);
          }
        })
        .catch(() => {
          api.logout();
        })
        .finally(() => setLoading(false));
    }
  }, []);

  const handleLogin = () => {
    api.login();
  };
  const handleLogout = () => {
    api.logout();
    setUser(null);
  };

  if (blocked) {
    return (
      <div className="stinky-blocked">
        <img src={catGif} alt="No stinky allowed" className="stinky-cat" />
        <p className="stinky-text">No stinky allowed</p>
        <button className="fake-paypal-btn" onClick={() => alert('jaja saludos')}>
          <span className="paypal-logo">Pay</span><span className="paypal-logo-pal">Pal</span>
          <span className="paypal-text">Pagar $5.00 para desbloquear</span>
        </button>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AppContent
        user={user}
        setUser={setUser}
        loading={loading}
        handleLogin={handleLogin}
        handleLogout={handleLogout}
      />
    </BrowserRouter>
  );
}

export default App;
