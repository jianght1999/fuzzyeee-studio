import { Link, useLocation } from 'react-router-dom';
import styles from './PixelNavbar.module.css';

export default function PixelNavbar() {
  const location = useLocation();

  return (
    <nav className={styles.navbar}>
      <div className={styles.left}>
        <Link
          to="/"
          className={`${styles.navLink} ${location.pathname === '/' ? styles.active : ''}`}
        >
          [ 首页 ]
        </Link>
      </div>
      <div className={styles.right}>
        <span className={styles.sprite}>☺</span>
      </div>
    </nav>
  );
}
