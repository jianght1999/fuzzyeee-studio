import { categories } from '../../data/categories';
import CategoryCard from '../CategoryCard/CategoryCard';
import styles from './CategoryGrid.module.css';

export default function CategoryGrid() {
  return (
    <div className={styles.grid}>
      {categories.map((category) => (
        <CategoryCard key={category.slug} category={category} />
      ))}
    </div>
  );
}
