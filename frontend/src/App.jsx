import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import StoryList from './pages/StoryList';
import StoryDetail from './pages/StoryDetail';
import ChapterReader from './pages/ChapterReader';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Statistics from './pages/Statistics';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Header />
        <main style={{ minHeight: 'calc(100vh - 130px)' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/stories" element={<StoryList />} />
            <Route path="/story/:id" element={<StoryDetail />} />
            <Route path="/story/:storyId/chapter/:chapterId" element={<ChapterReader />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/statistics" element={<Statistics />} />
          </Routes>
        </main>
        <Footer />
      </Router>
    </AuthProvider>
  );
}

export default App;
