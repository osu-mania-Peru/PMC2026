import { BrowserRouter, Routes, Route, Link, NavLink, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "./api";
import { FaDiscord, FaYoutube, FaTwitch } from "react-icons/fa";
import logo from "./assets/logo.svg";
import "./App.css";

// Pages
import Home from "./pages/Home";
import Register from "./pages/Register";
import Brackets from "./pages/Brackets";
import Matches from "./pages/Matches";
import Players from "./pages/Players";
import Maps from "./pages/Maps";

// Components
import AdminPanel from "./components/AdminPanel";
import Spinner from "./components/Spinner";

function AppContent({ user, setUser, loading, handleLogin, handleLogout }) {
  if (loading) {
    return <Spinner size="large" text="Cargando..." />;
  }

  return (
    <div className="app">
      <nav className="nav">
        <div className="nav-content">
          <Link to="/" className="nav-logo">
            <img src="/2026/PMCcolor.svg" alt="PMC" />
          </Link>
          <div className="nav-links">
            <NavLink to="/" end>INICIO</NavLink>
            <NavLink to="/brackets">BRACKETS</NavLink>
            <NavLink to="/matches">PARTIDAS</NavLink>
            <NavLink to="/players">JUGADORES</NavLink>
            <NavLink to="/maps">MAPPOOL</NavLink>
            {user ? (
              <>
                <span>{user.username}</span>
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
              <Home user={user} />
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
              <Brackets />
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
            <main className="main has-container">
              <Maps />
            </main>
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

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => {
    // Initialize loading based on whether we have a token
    return (
      !!api.getToken() ||
      !!new URLSearchParams(window.location.search).get("token")
    );
  });

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
      alert(`Error de inicio de sesión: ${error}`);
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
