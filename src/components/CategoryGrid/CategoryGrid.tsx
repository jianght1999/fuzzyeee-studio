import { categories } from '../../data/categories';
import CategoryCard from '../CategoryCard/CategoryCard';
import styles from './CategoryGrid.module.css';

interface CategoryGridProps {
  onDisabledClick?: (slug: string) => void;
}

export default function CategoryGrid({ onDisabledClick }: CategoryGridProps) {
  return (
    <div className={styles.grid}>
      {categories.map((category) => (
        <CategoryCard key={category.slug} category={category} onDisabledClick={onDisabledClick} />
      ))}
    </div>
  );
}
