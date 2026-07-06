import { Link } from 'react-router-dom';
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
          <Link to="/notes/reading" className="pixel-button">建站文档</Link>
        </div>
        <CategoryGrid />
      </main>
      <PixelFooter />
    </div>
  );
}
