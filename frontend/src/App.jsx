import { BrowserRouter, Routes, Route, Link, NavLink, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "./api";
import { FaDiscord, FaYoutube, FaTwitch } from "react-icons/fa";
import { Menu, X } from "lucide-react";
import logo from "./assets/logo.svg";
import "./App.css";

// Pages
import Home from "./pages/Home";
import Register from "./pages/Register";
import Brackets from "./pages/Brackets";
import Matches from "./pages/Matches";
import Players from "./pages/Players";
import Mappool from "./pages/Mappool";
import StaffDiscord from "./pages/StaffDiscord";

// Components
import AdminPanel from "./components/AdminPanel";
import Spinner from "./components/Spinner";
import SlotMachine from "./components/SlotMachine";

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
              <NavLink to="/staff/discord" className="nav-staff-link">
                DISCORD<span className="staff-badge">STAFF</span>
              </NavLink>
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
              <Players />
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
                  href="https://youtube.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                >
                  <FaYoutube size={20} />
                </a>
                <a
                  href="https://twitch.tv"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Twitch"
                >
                  <FaTwitch size={20} />
                </a>
                <a
                  href="https://discord.gg/placeholder"
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
                href="https://discord.gg/placeholder"
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
            Peru Mania Cup 2026 Hosteado por Sakisagee y Miaurichesu
          </span>
          <span className="footer-credit">Designed by @r_koshiin</span>
        </div>
      </footer>

      {/* Admin Debug Panel - Hidden */}
      {/* <AdminPanel /> */}
    </div>
  );
}

const SLOT_PASS_KEY = 'pmc_slot_passed';
const SLOT_PASS_DURATION = 24 * 60 * 60 * 1000; // 24 hours

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => {
    // Initialize loading based on whether we have a token
    return (
      !!api.getToken() ||
      !!new URLSearchParams(window.location.search).get("token")
    );
  });
  const [slotPassed, setSlotPassed] = useState(() => {
    const passData = localStorage.getItem(SLOT_PASS_KEY);
    if (passData) {
      const passTime = parseInt(passData, 10);
      if (Date.now() < passTime) {
        return true;
      }
      localStorage.removeItem(SLOT_PASS_KEY);
    }
    return false;
  });

  const handleSlotWin = () => {
    const passUntil = Date.now() + SLOT_PASS_DURATION;
    localStorage.setItem(SLOT_PASS_KEY, passUntil.toString());
    setSlotPassed(true);
  };

  useEffect(() => {
    // Check for token in URL (from auth callback)
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const error = params.get("error");

    if (token) {
      api.setToken(token);
      window.history.replaceState({}, "", "/");
    }

    if (error) {
      console.error('Login error:', error);
      window.history.replaceState({}, "", "/");
    }

    // Fetch user if token exists
    const authToken = api.getToken();
    if (authToken) {
      api
        .getMe()
        .then(setUser)
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

  // Show slot machine if not passed
  if (!slotPassed) {
    return <SlotMachine onWin={handleSlotWin} />;
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
