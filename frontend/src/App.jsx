import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from './api';
import { FaDiscord } from 'react-icons/fa';
import logo from './assets/logo.svg';
import './App.css';

// Pages
import Home from './pages/Home';
import Register from './pages/Register';
import Brackets from './pages/Brackets';
import Matches from './pages/Matches';
import Players from './pages/Players';
import Maps from './pages/Maps';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // () => {}, [] means this will get run after the component is rendered 
  useEffect(() => {
    // Check for token in URL (from auth callback)
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const error = params.get('error');

    if (token) { // get token from URL and set to the api to log in
      api.setToken(token);
      window.history.replaceState({}, '', '/');
    }

    if (error) {
      alert(`Error de inicio de sesión: ${error}`);
      window.history.replaceState({}, '', '/');
    }

    // Fetch user if token exists
    const authToken = api.getToken();
    if (authToken) {
      api.getMe()
        .then(setUser)
        .catch(() => {
          api.logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = () => {
    api.login();
  };
  const handleLogout = () => {
    api.logout();
    setUser(null);
  };

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  return (
    <BrowserRouter>
      <div className="app">
        <nav className="nav">
          <div className="nav-content">
            <Link to="/" className="nav-logo">
              <img src={logo} alt="PMC2026" />
            </Link>
            <div className="nav-links">
              <Link to="/">INICIO</Link>
              <Link to="/brackets">BRACKETS</Link>
              <Link to="/matches">PARTIDAS</Link>
              <Link to="/players">JUGADORES</Link>
              <Link to="/maps">MAPPOOL</Link>
              {user ? (
                <>
                  <span>{user.username}</span>
                  <button onClick={handleLogout}>CERRAR SESIÓN</button>
                </>
              ) : (
                <button onClick={handleLogin}>INICIAR SESIÓN</button>
              )}
            </div>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={
            <main className="main">
              <Home user={user} />
            </main>
          } />
          <Route path="/register" element={
            <main className="main has-container">
              {user ? <Register user={user} setUser={setUser} /> : <Navigate to="/" />}
            </main>
          } />
          <Route path="/brackets" element={
            <main className="main">
              <Brackets />
            </main>
          } />
          <Route path="/matches" element={
            <main className="main has-container">
              <Matches />
            </main>
          } />
          <Route path="/players" element={
            <main className="main has-container">
              <Players />
            </main>
          } />
          <Route path="/maps" element={
            <main className="main has-container">
              <Maps />
            </main>
          } />
        </Routes>

        <footer className="footer">
          <div className="footer-content">
            <p>PMC2025</p>
            <a href="https://discord.gg/placeholder" target="_blank" rel="noopener noreferrer" className="discord-link">
              <FaDiscord size={20} />
              <span>Únete a nuestro Discord</span>
            </a>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
