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
    image: '/images/guitar.png',
    isAvailable: true,
    emoji: '🎷',
  },
  {
    slug: 'synth',
    title: 'crafts',
    description: '',
    image: '/images/synth.png',
    isAvailable: true,
    emoji: '🎛️',
  },
  {
    slug: 'reading',
    title: 'writing',
    description: '',
    image: '/images/reading.png',
    isAvailable: true,
    emoji: '📚',
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
