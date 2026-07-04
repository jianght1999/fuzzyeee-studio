import { useTheme } from '../../contexts/ThemeContext';
import styles from './PixelNavbar.module.css';

export default function PixelNavbar() {
  const { theme, toggle } = useTheme();

  return (
    <nav className={styles.navbar}>
      <div className={styles.left} />
      <div className={styles.right}>
        <button className={styles.themeToggle} onClick={toggle} title="toggle theme">
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </div>
    </nav>
  );
}
