import React, { useEffect, useState } from 'react';
import { telegramService } from './services/telegram';
import { TeleUser } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<TeleUser | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>((localStorage.getItem('td_theme') as any) || 'light');

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('td_theme', newTheme);
  };

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);

  const checkAuth = async (isNewLogin = false) => {
    setLoading(true);
    const auth = await telegramService.isAuthenticated();
    if (auth) {
      const me = await telegramService.getMe();
      setUser(me);
      if (isNewLogin) {
        setShowWelcome(true);
        setTimeout(() => setShowWelcome(false), 4000);
      }
    } else { setUser(null); }
    setLoading(false);
  };

  useEffect(() => { checkAuth(); }, []);

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* 1. Welcome Toast */}
      {showWelcome && user && (
        <div className="animate-toast" style={{ position: 'fixed', top: '20px', left: '50%', zIndex: 10001, background: 'var(--primary)', color: 'white', padding: '12px 32px', borderRadius: '100px', fontWeight: 800, boxShadow: '0 10px 30px rgba(99, 102, 241, 0.4)' }}>
          WELCOME BACK, {user.firstName.toUpperCase()}!
        </div>
      )}

      {/* FIXED LOGOUT POPUP */}
      {showLogoutConfirm && (
        <div className="modal-overlay animate-fade">
          <div className="glass-card" style={{ padding: '40px', textAlign: 'center', borderRadius: '32px' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🚪</div>
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--text)' }}>Log out?</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>Session will be cleared.</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setShowLogoutConfirm(false)} 
                style={{ flex: 1, padding: '12px', borderRadius: '14px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontWeight: 800, cursor: 'pointer' }}
              >
                CANCEL
              </button>
              <button 
                onClick={() => telegramService.logout()} 
                style={{ flex: 1, padding: '12px', borderRadius: '14px', border: 'none', background: '#EF4444', color: 'white', fontWeight: 800, cursor: 'pointer' }}
              >
                LOGOUT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ... (REMAINDER OF THE FILE IS UNTOUCHED) ... */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 1000, padding: '12px 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="logo-text">TeleDrive</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={toggleTheme} style={{ background: 'var(--accent)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          {user && (
            <div onClick={() => setShowLogoutConfirm(true)} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--accent)', padding: '4px 14px 4px 4px', borderRadius: '100px', cursor: 'pointer' }}>
              {user.photoUrl ? <img src={user.photoUrl} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' }}>{user.firstName[0]}</div>}
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '12px', fontWeight: '800', lineHeight: 1.1 }}>{user.firstName}</div>
                <div style={{ fontSize: '9px', fontWeight: '800', color: 'var(--error)', opacity: 0.8 }}>LOGOUT</div>
              </div>
            </div>
          )}
        </div>
      </nav>

      <main style={{ padding: '30px 5%', maxWidth: '1200px', margin: '0 auto' }}>
        {loading && !user ? (
          <div style={{ textAlign: 'center', padding: '100px', fontWeight: 800, color: 'var(--primary)' }}>SYNCING...</div>
        ) : !user ? (
          <Login onLoginSuccess={() => checkAuth(true)} />
        ) : (
          <Dashboard />
        )}
      </main>
    </div>
  );
};

export default App;