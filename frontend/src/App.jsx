import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from './api';
import './App.css';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Brackets from './pages/Brackets';
import Matches from './pages/Matches';
import Players from './pages/Players';
import Maps from './pages/Maps';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for token in URL (from auth callback)
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const error = params.get('error');

    if (token) {
      api.setToken(token);
      window.history.replaceState({}, '', '/');
    }

    if (error) {
      alert(`Login error: ${error}`);
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

  const handleLogout = () => {
    api.logout();
    setUser(null);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <BrowserRouter>
      <div className="app">
        <nav className="nav">
          <div className="nav-content">
            <h1><Link to="/">Peru Mania Cup 2025</Link></h1>
            <div className="nav-links">
              <Link to="/">Home</Link>
              <Link to="/brackets">Brackets</Link>
              <Link to="/matches">Matches</Link>
              <Link to="/players">Players</Link>
              <Link to="/maps">Maps</Link>
              {user ? (
                <>
                  <Link to="/register">Register</Link>
                  <span>👤 {user.username}</span>
                  <button onClick={handleLogout}>Logout</button>
                </>
              ) : (
                <Link to="/login">Login</Link>
              )}
            </div>
          </div>
        </nav>

        <main className="main">
          <Routes>
            <Route path="/" element={<Home user={user} />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={user ? <Register user={user} setUser={setUser} /> : <Navigate to="/login" />} />
            <Route path="/brackets" element={<Brackets />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/players" element={<Players />} />
            <Route path="/maps" element={<Maps />} />
          </Routes>
        </main>

        <footer className="footer">
          <p>Peru Mania Cup 2025 | osu! Tournament</p>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
