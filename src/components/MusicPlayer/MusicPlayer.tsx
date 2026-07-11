import { useState, useRef, useEffect } from 'react';
import styles from './MusicPlayer.module.css';

// Known music files — API fallback for production
const KNOWN_TRACKS = ['/music/waltz-for-debby.mp3'];

async function fetchMusicList(): Promise<string[]> {
  try {
    const res = await fetch('/api/music-list');
    const list = await res.json();
    return list.length > 0 ? list : KNOWN_TRACKS;
  } catch { return KNOWN_TRACKS; }
}

export default function MusicPlayer() {
  const [playing, setPlaying] = useState(false);
  const [musicList, setMusicList] = useState<string[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { fetchMusicList().then(setMusicList); }, []);

  const handleClick = () => {
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
    } else {
      if (musicList.length === 0) return;
      if (!audioRef.current) {
        audioRef.current = new Audio(musicList[0]);
        audioRef.current.loop = true;
      }
      audioRef.current.play().catch(() => {});
      setPlaying(true);
    }
  };

  return (
    <div className={styles.player} onClick={handleClick} title={playing ? 'click to stop' : 'click to play'}>
      <img
        src={playing ? import.meta.env.BASE_URL + 'images/cat-on.png' : import.meta.env.BASE_URL + 'images/cat-off.png'}
        alt="music"
        className={styles.cat}
      />
    </div>
  );
}
