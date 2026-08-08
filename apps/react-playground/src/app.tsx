import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import FetchPage from './pages/fetch-page';
import AxiosPage from './pages/axios-page';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <header className="app-header">
          <h1>Universal Request Playground</h1>
          <span className="subtitle">@jswork/universal-request</span>
          <nav className="app-nav">
            <NavLink
              to="/"
              className={({ isActive }) => (isActive ? 'nav-link nav-active' : 'nav-link')}
              end
            >
              Fetch
            </NavLink>
            <NavLink
              to="/axios"
              className={({ isActive }) => (isActive ? 'nav-link nav-active' : 'nav-link')}
            >
              Axios
            </NavLink>
          </nav>
        </header>
        <main className="app-main">
          <Routes>
            <Route path="/" element={<FetchPage />} />
            <Route path="/axios" element={<AxiosPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}