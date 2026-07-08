import { useState } from 'react';
import PixelNavbar from '../components/PixelNavbar/PixelNavbar';
import CategoryGrid from '../components/CategoryGrid/CategoryGrid';
import PixelFooter from '../components/PixelFooter/PixelFooter';
import styles from './HomePage.module.css';

export default function HomePage() {
  const [notice, setNotice] = useState(false);

  return (
    <div className={styles.page} onClick={() => setNotice(false)}>
      <PixelNavbar />
      <main className={styles.main}>
        <div className={styles.hero}>
          <h1 className={styles.title}>FUZZYEEE STUDIO</h1>
        </div>
        <CategoryGrid onDisabledClick={() => setNotice(true)} />
      </main>
      <PixelFooter />

      {notice && (
        <div className={styles.noticeBackdrop} onClick={(e) => { e.stopPropagation(); setNotice(false); }}>
          <div className={styles.noticeBubble} onClick={(e) => e.stopPropagation()}>
            <div className={styles.noticeText}>
              看看我的建站文档吧！这个网站还有很多没完成。<br />
              <br />
              微信 a290591510<br />
              邮箱 jianght199907@gmail.com
            </div>
            <div className={styles.noticeArrow} />
          </div>
        </div>
      )}
    </div>
  );
}
