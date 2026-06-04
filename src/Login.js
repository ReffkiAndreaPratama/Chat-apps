import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "./firebase";

export default function Login() {
  const login = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login error:", err);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="app-logo">💬</div>
        <h1>Chat<span>Pro</span></h1>
        <p>
          Kirim pesan, foto, video, dan voice note secara real-time.
          Aman, cepat, dan gratis.
        </p>

        <button onClick={login} className="login-btn">
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt="Google"
          />
          Masuk dengan Google
        </button>

        <div className="login-features">
          <div className="login-feature">
            <div className="login-feature-icon">🔒</div>
            <span>End-to-end</span>
          </div>
          <div className="login-feature">
            <div className="login-feature-icon">⚡</div>
            <span>Realtime</span>
          </div>
          <div className="login-feature">
            <div className="login-feature-icon">🌐</div>
            <span>Cross-platform</span>
          </div>
        </div>

        <small>© 2024 ChatPro. All rights reserved.</small>
      </div>
    </div>
  );
}
