import { BrowserRouter, Routes, Route, Link, NavLink, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "./api";
import { FaDiscord, FaYoutube, FaTwitch } from "react-icons/fa";
import { Menu, X } from "lucide-react";
import logo from "./assets/logo.svg";
import catGif from "./assets/cat.gif";
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
// Timba removed - tournament committee prohibits gambling

// Components
import AdminPanel from "./components/AdminPanel";
import Spinner from "./components/Spinner";
// SlotMachine minigame available at /timba

function RedirectToHorse() {
  useEffect(() => {
    if (localStorage.getItem('skip_horse') === 'true') {
      window.location.href = '/home';
    } else {
      window.location.href = '/horse';
    }
  }, []);
  return null;
}

function AppContent({ user, setUser, loading, handleLogin, handleLogout }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dangerHover, setDangerHover] = useState(false);
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  if (loading) {
    return <Spinner size="large" text="Cargando..." />;
  }

  return (
    <div className="app">
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
              </>
            )}
            {user ? (
              <>
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
          element={<RedirectToHorse />}
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
              <Matches />
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

      {/* Admin Debug Panel - Hidden */}
      {/* <AdminPanel /> */}
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
