import { api } from '../api';

export default function Login() {
  return (
    <div className="page">
      <h2>Iniciar Sesión</h2>
      <p>Inicia sesión con tu cuenta de osu! para acceder a la plataforma del torneo.</p>
      <button onClick={api.login} style={{ marginTop: '2rem' }}>
        Iniciar Sesión con osu!
      </button>
    </div>
  );
}
