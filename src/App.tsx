import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import { AlertModalProvider } from '@/components/AlertModal';
import Home from '@/pages/Home';
import Create from '@/pages/Create';
import Tasks from '@/pages/Tasks';
import History from '@/pages/History';
import Settings from '@/pages/Settings';

export default function App() {
  return (
    <AlertModalProvider>
      <Router>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<Create />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </Router>
    </AlertModalProvider>
  );
}
