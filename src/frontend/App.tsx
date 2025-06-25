import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Web3Provider } from './contexts/Web3Context';
import { AIProvider } from './contexts/AIContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Lazy load components for better performance
const Home = lazy(() => import('./pages/Home'));
const Profile = lazy(() => import('./pages/Profile'));
const CreatePost = lazy(() => import('./pages/CreatePost'));
const Explore = lazy(() => import('./pages/Explore'));
const Governance = lazy(() => import('./pages/Governance'));

// Components
import Header from './components/Header';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';

// Styles
import './styles/global.css';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <Web3Provider>
          <AIProvider>
            <Router>
              <div className="app">
                <Header />
                <main className="main-content">
                  <Suspense fallback={<LoadingSpinner />}>
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/profile/:address?" element={<Profile />} />
                      <Route path="/create" element={<CreatePost />} />
                      <Route path="/explore" element={<Explore />} />
                      <Route path="/governance" element={<Governance />} />
                    </Routes>
                  </Suspense>
                </main>
                <ToastContainer
                  position="bottom-right"
                  autoClose={5000}
                  hideProgressBar={false}
                  newestOnTop
                  closeOnClick
                  rtl={false}
                  pauseOnFocusLoss
                  draggable
                  pauseOnHover
                  theme="dark"
                />
              </div>
            </Router>
          </AIProvider>
        </Web3Provider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App; 