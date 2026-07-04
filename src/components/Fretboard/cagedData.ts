export interface FretNote {
  string: number;   // 1-6 (1 = 高音E弦)
  fret: number;     // 0 = 空弦, 1+ = 按弦品格
}

export interface CagedShapeConfig {
  name: string;
  label: string;
  description: string;
  notes: FretNote[];
  rootString: number;
  rootFret: number;
}

// CAGED 五种指形的大三和弦按法（开放把位）
export const cagedShapes: Record<string, CagedShapeConfig> = {
  C: {
    name: 'C',
    label: 'C 指形',
    description: 'C指形以中指为根音。根音位于5弦3品和2弦1品。C指形是学习CAGED系统的起点，覆盖5弦到1弦。',
    notes: [
      { string: 5, fret: 3 },   // C (根音)
      { string: 4, fret: 2 },   // E
      { string: 3, fret: 0 },   // G (空弦)
      { string: 2, fret: 1 },   // C (根音)
      { string: 1, fret: 0 },   // E (空弦)
    ],
    rootString: 5,
    rootFret: 3,
  },
  A: {
    name: 'A',
    label: 'A 指形',
    description: 'A指形以食指为根音。根音位于5弦空弦和3弦2品。A指形是开放式五和弦的基础。',
    notes: [
      { string: 5, fret: 0 },   // A (根音, 空弦)
      { string: 4, fret: 2 },   // E
      { string: 3, fret: 2 },   // A (根音)
      { string: 2, fret: 2 },   // C#
      { string: 1, fret: 0 },   // E (空弦)
    ],
    rootString: 5,
    rootFret: 0,
  },
  G: {
    name: 'G',
    label: 'G 指形',
    description: 'G指形根音位于6弦3品和1弦3品。G指形跨度较大，需要手指充分伸展，适合中把位演奏。',
    notes: [
      { string: 6, fret: 3 },   // G (根音)
      { string: 5, fret: 2 },   // B
      { string: 4, fret: 0 },   // D (空弦)
      { string: 3, fret: 0 },   // G (空弦, 根音)
      { string: 2, fret: 0 },   // B (空弦)
      { string: 1, fret: 3 },   // G (根音)
    ],
    rootString: 6,
    rootFret: 3,
  },
  E: {
    name: 'E',
    label: 'E 指形',
    description: 'E指形根音位于6弦空弦和4弦2品。E指形是横按和弦的基础，也是Barre Chord的核心指形。',
    notes: [
      { string: 6, fret: 0 },   // E (根音, 空弦)
      { string: 5, fret: 2 },   // B
      { string: 4, fret: 2 },   // E (根音)
      { string: 3, fret: 1 },   // G#
      { string: 2, fret: 0 },   // B (空弦)
      { string: 1, fret: 0 },   // E (根音, 空弦)
    ],
    rootString: 6,
    rootFret: 0,
  },
  D: {
    name: 'D',
    label: 'D 指形',
    description: 'D指形根音位于4弦空弦和2弦3品。D指形是最小的指形，只覆盖4根弦（4弦到1弦），适合高把位演奏。',
    notes: [
      { string: 4, fret: 0 },   // D (根音, 空弦)
      { string: 3, fret: 2 },   // A
      { string: 2, fret: 3 },   // D (根音)
      { string: 1, fret: 2 },   // F#
    ],
    rootString: 4,
    rootFret: 0,
  },
};
