import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useRain } from '../../contexts/RainContext';
import { useAuth } from '../../contexts/AuthContext';
import LoginModal from '../LoginModal/LoginModal';
import RecentDropdown from '../RecentDropdown/RecentDropdown';
import styles from './PixelNavbar.module.css';

export default function PixelNavbar() {
  const { theme, toggle } = useTheme();
  const { raining, toggle: toggleRain } = useRain();
  const { isLoggedIn, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [showGameNotice, setShowGameNotice] = useState(false);

  return (
    <nav className={styles.navbar}>
      <div className={styles.left}>
        <Link to="/notes/writing?page=建站文档" className="pixel-button">建站文档</Link>
        <div className={styles.gameContainer}>
          <button className="pixel-button" onClick={() => setShowGameNotice(!showGameNotice)}>新游戏</button>
          {showGameNotice && (
            <>
              <div className={styles.gameBackdrop} onClick={() => setShowGameNotice(false)} />
              <div className={styles.gameDropdown}>
                <div className={styles.gameHeader}>新游戏</div>
                <div className={styles.gameLine}>主页多了两个拱来拱去的小东西</div>
                <div className={styles.gameLine}>页面变湿润了</div>
                <div className={styles.gameDate}>2026.11.7</div>
              </div>
            </>
          )}
        </div>
      </div>
      <div className={styles.right}>
        <button className="pixel-button" onClick={toggle} title="toggle theme">
          {theme === 'dark' ? '☀' : '☾'}
        </button>
        <button
          className={raining ? 'pixel-button pixel-button--active' : 'pixel-button'}
          onClick={toggleRain}
          title="toggle rain"
        >
          💧
        </button>
        <RecentDropdown />
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
