import { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import LoginModal from '../LoginModal/LoginModal';
import styles from './PixelNavbar.module.css';

export default function PixelNavbar() {
  const { theme, toggle } = useTheme();
  const { isLoggedIn, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  return (
    <nav className={styles.navbar}>
      <div className={styles.left} />
      <div className={styles.right}>
        <button className="pixel-button" onClick={toggle} title="toggle theme">
          {theme === 'dark' ? '☀' : '☾'}
        </button>
        {isLoggedIn ? (
          <button className="pixel-button" onClick={logout}>
            logout
          </button>
        ) : (
          <button className="pixel-button" onClick={() => setShowLogin(true)}>
            login
          </button>
        )}
      </div>
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </nav>
  );
}
