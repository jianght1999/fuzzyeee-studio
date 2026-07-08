import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Category } from '../../data/categories';
import styles from './CategoryCard.module.css';

interface CategoryCardProps {
  category: Category;
}

export default function CategoryCard({ category }: CategoryCardProps) {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);
  const [showNotice, setShowNotice] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (!category.isAvailable) {
      e.stopPropagation();
      setShowNotice(!showNotice);
      return;
    }
    navigate(`/notes/${category.slug}`);
  };

  const cardClass = category.isAvailable
    ? `${styles.card} pixel-card`
    : `${styles.card} pixel-card pixel-card--disabled`;

  return (
    <div className={cardClass} onClick={handleClick}>
      {showNotice && (
        <>
          <div className={styles.noticeBackdrop} onClick={(e) => { e.stopPropagation(); setShowNotice(false); }} />
          <div className={styles.noticeBubble} onClick={(e) => e.stopPropagation()}>
            <div className={styles.noticeText}>
              看看我的建站文档吧！这个网站还有很多没完成。<br />
              <br />
              微信 a290591510<br />
              邮箱 jianght199907@gmail.com
            </div>
          </div>
        </>
      )}
      <div className={styles.imageWrapper}>
        {imgError || !category.image ? (
          <span className={styles.placeholderEmoji}>{category.emoji}</span>
        ) : (
          <img
            src={category.image}
            alt={category.title}
            className={styles.image}
            onError={() => setImgError(true)}
          />
        )}
      </div>
      <h3 className={styles.title}>{category.title}</h3>
      {category.description && (
        <p className={styles.description}>{category.description}</p>
      )}
    </div>
  );
}
