import { Component, type ReactNode } from 'react'
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
