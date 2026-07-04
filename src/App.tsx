import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import NotePage from './pages/NotePage'
import PixelTransition from './components/PixelTransition/PixelTransition'

function App() {
  return (
    <PixelTransition>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/notes/:category" element={<NotePage />} />
      </Routes>
    </PixelTransition>
  )
}

export default App
