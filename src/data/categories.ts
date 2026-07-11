export interface Category {
  slug: string;
  title: string;
  description: string;
  image: string;
  isAvailable: boolean;
  emoji: string;
}

const B = import.meta.env.BASE_URL;

export const categories: Category[] = [
  {
    slug: 'guitar',
    title: 'jazz',
    description: '',
    image: B + 'images/jazz.png',
    isAvailable: true,
    emoji: '🎷',
  },
  {
    slug: 'synth',
    title: 'crafts',
    description: '',
    image: B + 'images/crafts.png',
    isAvailable: true,
    emoji: '🎛️',
  },
  {
    slug: 'reading',
    title: 'writing',
    description: '',
    image: B + 'images/writing.png',
    isAvailable: true,
    emoji: '📚',
  },
  {
    slug: 'coming-soon',
    title: 'coming soon',
    description: '',
    image: B + 'images/coming-soon.png',
    isAvailable: false,
    emoji: '❓',
  },
];
