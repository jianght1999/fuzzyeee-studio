import { Component, type ReactNode, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import HomePage from './pages/HomePage'
import NotePage from './pages/NotePage'
import MusicPlayer from './components/MusicPlayer/MusicPlayer'

class ErrorCatcher extends Component<{ children: ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null }
  static getDerivedStateFromError(err: Error) { return { err } }
  render() {
    if (this.state.err) {
      return <div style={{color:'red',padding:20,fontFamily:'monospace',fontSize:14}}>
        <h2>REACT CRASH</h2>
        <pre>{this.state.err.message}{'\n'}{this.state.err.stack}</pre>
      </div>
    }
    return this.props.children
  }
}

function App() {
  useEffect(() => {
    const done = () => {
      document.getElementById('loading-overlay')?.remove();
    };
    // 等 React 绘制完成（双 rAF）+ 字体加载完
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const fontsReady = document.fonts?.ready ?? Promise.resolve();
      // 30 秒兜底，防止字体永远加载不了
      const timeout = new Promise(r => setTimeout(r, 30000));
      Promise.race([fontsReady, timeout]).then(done);
    }));
  }, []);

  return (
    <ErrorCatcher>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/notes/:category" element={<NotePage />} />
          </Routes>
          <MusicPlayer />
        </AuthProvider>
      </ThemeProvider>
    </ErrorCatcher>
  )
}

export default App
