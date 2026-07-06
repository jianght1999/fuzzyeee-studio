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
          <h1 className={styles.title}>FUZZYEEE STUDIO</h1>
          <p className={styles.subtitle}>personal knowledge base · music · crafts · writing</p>
        </div>
        <CategoryGrid />
      </main>
      <PixelFooter />
    </div>
  );
}
