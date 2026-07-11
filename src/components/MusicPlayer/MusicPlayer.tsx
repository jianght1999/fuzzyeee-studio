import { useState, useRef, useEffect } from 'react';
import styles from './MusicPlayer.module.css';

async function fetchMusicList(): Promise<string[]> {
  try {
    const res = await fetch('/api/music-list');
    return await res.json();
  } catch { return []; }
}

export default function MusicPlayer() {
  const [playing, setPlaying] = useState(false);
  const [musicList, setMusicList] = useState<string[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { fetchMusicList().then(setMusicList); }, []);

  const handleClick = () => {
    if (playing) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlaying(false);
    } else {
      if (musicList.length === 0) return;
      const track = musicList[0]; // always play the first (only) track
      audioRef.current = new Audio(track);
      audioRef.current.play().catch(() => {});
      setPlaying(true);
    }
  };

  return (
    <div className={styles.player} onClick={handleClick} title={playing ? 'click to stop' : 'click to play'}>
      <img
        src={playing ? '/images/cat-on.png' : '/images/cat-off.png'}
        alt="music"
        className={styles.cat}
      />
    </div>
  );
}
