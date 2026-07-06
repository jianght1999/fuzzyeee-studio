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
    slug: 'guitar',
    title: 'jazz',
    description: '',
    image: '/images/jazz.png',
    isAvailable: true,
    emoji: '🎷',
  },
  {
    slug: 'synth',
    title: 'crafts',
    description: '',
    image: '/images/crafts.png',
    isAvailable: true,
    emoji: '🎛️',
  },
  {
    slug: 'reading',
    title: 'writing',
    description: '',
    image: '/images/writing.png',
    isAvailable: true,
    emoji: '📚',
  },
  {
    slug: 'coming-soon',
    title: 'coming soon',
    description: '',
    image: '',
    isAvailable: false,
    emoji: '❓',
  },
];
