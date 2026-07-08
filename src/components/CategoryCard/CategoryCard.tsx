import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Category } from '../../data/categories';
import styles from './CategoryCard.module.css';

interface CategoryCardProps {
  category: Category;
  onNoticeToggle?: (show: boolean, rect?: DOMRect) => void;
}

export default function CategoryCard({ category, onNoticeToggle }: CategoryCardProps) {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (!category.isAvailable) {
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      onNoticeToggle?.(true, rect);
      return;
    }
    navigate(`/notes/${category.slug}`);
  };

  const cardClass = category.isAvailable
    ? `${styles.card} pixel-card`
    : `${styles.card} pixel-card pixel-card--disabled`;

  return (
    <div className={cardClass} onClick={handleClick}>
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
