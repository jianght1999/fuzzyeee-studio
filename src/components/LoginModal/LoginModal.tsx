import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import styles from './LoginModal.module.css';

interface LoginModalProps {
  onClose: () => void;
}

export default function LoginModal({ onClose }: LoginModalProps) {
  const { login } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const ok = await login(password);
    setLoading(false);
    if (ok) {
      onClose();
    } else {
      setError('wrong password');
    }
  };

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        <h2 className={styles.title}>🔒 enter password</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            className={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            autoFocus
          />
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className="pixel-button" disabled={loading}>
            {loading ? '...' : 'login'}
          </button>
        </form>
        <button className={styles.close} onClick={onClose}>✕</button>
      </div>
    </div>
  );
}
