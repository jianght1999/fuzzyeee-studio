import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import HomePage from './pages/HomePage'
import NotePage from './pages/NotePage'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/notes/:category" element={<NotePage />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
