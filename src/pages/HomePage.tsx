import { useState } from 'react';
import PixelNavbar from '../components/PixelNavbar/PixelNavbar';
import CategoryGrid from '../components/CategoryGrid/CategoryGrid';
import PixelFooter from '../components/PixelFooter/PixelFooter';
import RainEffect from '../components/RainEffect/RainEffect';
import styles from './HomePage.module.css';

export default function HomePage() {
  const [notice, setNotice] = useState<{ show: boolean; rect?: DOMRect }>({ show: false });

  const handleNoticeToggle = (show: boolean, rect?: DOMRect) => {
    setNotice({ show, rect });
  };

  return (
    <div className={styles.page} onClick={() => setNotice({ show: false })}>
      <PixelNavbar />
      <main className={styles.main}>
        <div className={`${styles.noticeBoard} pixel-card`}>
          <h2 className={styles.noticeTitle}>新游戏</h2>
          <p className={styles.noticeLine}>主页多了两个拱来拱去的小东西</p>
          <p className={styles.noticeLine}>页面变湿润了</p>
          <p className={styles.noticeDate}>2026.11.7</p>
        </div>
        <div className={styles.hero}>
          <h1 className={styles.title}>FUZZYEEE STUDIO</h1>
        </div>
        <CategoryGrid onNoticeToggle={handleNoticeToggle} />
        <div className={styles.badges}>
          <img className="img-light" src="/images/66index.gif" alt="66index" />
          <img className="img-dark" src="/images/shushuindex.gif" alt="shushuindex" />
          <img className="img-light" src="/images/66index.gif" alt="66index" />
          <img className="img-dark" src="/images/shushuindex.gif" alt="shushuindex" />
        </div>
      </main>
      <PixelFooter />
      <RainEffect />

      {notice.show && (
        <div className={styles.noticeBackdrop} onClick={(e) => { e.stopPropagation(); setNotice({ show: false }); }}>
          <div
            className={styles.noticeBubble}
            style={notice.rect ? {
              position: 'fixed',
              left: `${notice.rect.left + notice.rect.width / 2}px`,
              top: `${notice.rect.top - 16}px`,
              transform: 'translate(-50%, -100%)',
            } : undefined}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.noticeText}>
              看看我的建站文档吧！这个网站还有很多没完成。<br />
              <br />
              微信 a290591510<br />
              邮箱 jianght199907@gmail.com
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
