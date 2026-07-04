import PixelNavbar from '../components/PixelNavbar/PixelNavbar';
import CategoryGrid from '../components/CategoryGrid/CategoryGrid';
import PixelFooter from '../components/PixelFooter/PixelFooter';
import styles from './HomePage.module.css';

export default function HomePage() {
  return (
    <div className={styles.page}>
      <PixelNavbar />
      <main className={styles.main}>
        <div className={styles.hero}>
          <h1 className={styles.title}> Pixel Notes</h1>
          <p className={styles.subtitle}>我的学习笔记世界</p>
        </div>
        <CategoryGrid />
      </main>
      <PixelFooter />
    </div>
  );
}
