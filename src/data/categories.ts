export interface Category {
  slug: string;
  title: string;
  description: string;
  image: string;
  isAvailable: boolean;
  emoji: string;
}

export const categories: Category[] = [
  {
    slug: 'jazz',
    title: 'jazz',
    description: '',
    image: '/images/jazz.png',
    isAvailable: true,
    emoji: '🎷',
  },
  {
    slug: 'crafts',
    title: 'crafts',
    description: '',
    image: '/images/crafts.png',
    isAvailable: true,
    emoji: '🎛️',
  },
  {
    slug: 'writing',
    title: 'writing',
    description: '',
    image: '/images/writing.png',
    isAvailable: true,
    emoji: '📚',
  },
  {
    slug: 'reading',
    title: '建站文档',
    description: '',
    image: '/images/writing.png',
    isAvailable: true,
    emoji: '📖',
  },
  {
    slug: 'coming-soon',
    title: 'coming soon',
    description: '',
    image: '/images/coming-soon.png',
    isAvailable: false,
    emoji: '❓',
  },
];
