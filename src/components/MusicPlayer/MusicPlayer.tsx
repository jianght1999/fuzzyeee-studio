import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './MusicPlayer.module.css';

// Fetch list of MP3 files from API
async function fetchMusicList(): Promise<string[]> {
  try {
    const res = await fetch('/api/music-list');
    return await res.json();
  } catch {
    return [];
  }
}

export default function MusicPlayer() {
  const [playing, setPlaying] = useState(false);
  const [musicList, setMusicList] = useState<string[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const clickTimer = useRef<number>(0);

  // Load music list on mount
  useEffect(() => {
    fetchMusicList().then(setMusicList);
  }, []);

  const playRandom = useCallback(() => {
    if (musicList.length === 0) return;
    const track = musicList[Math.floor(Math.random() * musicList.length)];
    if (!audioRef.current) {
      audioRef.current = new Audio(track);
    } else {
      audioRef.current.src = track;
    }
    audioRef.current.play().catch(() => {});
  }, [musicList]);

  const stopMusic = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  const handleClick = () => {
    // Detect double-click
    const now = Date.now();
    if (now - clickTimer.current < 350) {
      // Double click: next song if playing
      clickTimer.current = 0;
      if (playing && musicList.length > 0) {
        playRandom();
      }
      return;
    }
    clickTimer.current = now;

    // Single click: toggle play/stop
    if (playing) {
      stopMusic();
      setPlaying(false);
    } else {
      playRandom();
      setPlaying(true);
    }
  };

  return (
    <div className={styles.player} onClick={handleClick} title={playing ? 'click to stop · double-click next track' : 'click to play'}>
      <img
        src={playing ? '/images/cat-on.png' : '/images/cat-off.png'}
        alt="music"
        className={styles.cat}
      />
    </div>
  );
}
