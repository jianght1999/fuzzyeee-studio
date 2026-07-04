import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePixelTransition } from '../PixelTransition/PixelTransition';
import type { Category } from '../../data/categories';
import styles from './CategoryCard.module.css';

interface CategoryCardProps {
  category: Category;
}

export default function CategoryCard({ category }: CategoryCardProps) {
  const navigate = useNavigate();
  const { navigateWithTransition } = usePixelTransition();
  const [imgError, setImgError] = useState(false);

  const handleClick = () => {
    if (!category.isAvailable) return;
    navigateWithTransition(() => {
      navigate(`/notes/${category.slug}`);
    });
  };

  const cardClass = category.isAvailable
    ? `${styles.card} pixel-card`
    : `${styles.card} pixel-card pixel-card--disabled`;

  return (
    <div className={cardClass} onClick={handleClick}>
      <div className={styles.imageWrapper}>
        {imgError ? (
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
