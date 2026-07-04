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
    title: '爵士吉他',
    description: 'CAGED系统 · 琶音 · 音阶',
    image: '/images/guitar.png',
    isAvailable: true,
    emoji: '🎸',
  },
  {
    slug: 'synth',
    title: '合成器制作',
    description: '敬请期待',
    image: '/images/synth.png',
    isAvailable: false,
    emoji: '🎛️',
  },
  {
    slug: 'reading',
    title: '读书笔记',
    description: '敬请期待',
    image: '/images/reading.png',
    isAvailable: false,
    emoji: '📚',
  },
];
