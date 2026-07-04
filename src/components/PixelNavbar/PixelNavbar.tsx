import styles from './PixelNavbar.module.css';

export default function PixelNavbar() {
  return (
    <nav className={styles.navbar}>
      <div className={styles.left} />
      <div className={styles.right}>
        <span className={styles.sprite}>☺</span>
      </div>
    </nav>
  );
}
