import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import NotePage from './pages/NotePage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/notes/:category" element={<NotePage />} />
    </Routes>
  )
}

export default App
