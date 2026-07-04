import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import HomePage from './pages/HomePage'
import NotePage from './pages/NotePage'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/notes/:category" element={<NotePage />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
