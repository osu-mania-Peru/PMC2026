import { api } from '../api';

export default function Login() {
  return (
    <div className="page">
      <h2>Login</h2>
      <p>Login with your osu! account to access the tournament platform.</p>
      <button onClick={api.login} style={{ marginTop: '2rem' }}>
        Login with osu!
      </button>
    </div>
  );
}
