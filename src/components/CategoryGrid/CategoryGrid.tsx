import { categories } from '../../data/categories';
import CategoryCard from '../CategoryCard/CategoryCard';
import styles from './CategoryGrid.module.css';

interface CategoryGridProps {
  onNoticeToggle?: (show: boolean, rect?: DOMRect) => void;
}

export default function CategoryGrid({ onNoticeToggle }: CategoryGridProps) {
  return (
    <div className={styles.grid}>
      {categories.map((category) => (
        <CategoryCard key={category.slug} category={category} onNoticeToggle={onNoticeToggle} />
      ))}
    </div>
  );
}
