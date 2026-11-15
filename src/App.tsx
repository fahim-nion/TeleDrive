import React, { useEffect, useState } from 'react';
import { telegramService } from './services/telegram';
import { TeleUser } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { 
  IconCloud, 
  IconSun, 
  IconMoon, 
  IconUser, 
  IconServer, 
  IconX,
  IconShield 
} from './components/Icons';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<TeleUser | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('td_theme') as any) || 
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  });

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('td_theme', newTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const checkAuth = async (isNewLogin = false) => {
    setLoading(true);
    const auth = await telegramService.isAuthenticated();
    if (auth) {
      try {
        const me = await telegramService.getMe();
        setUser(me);
        if (isNewLogin) {
          setShowWelcome(true);
          setTimeout(() => setShowWelcome(false), 4500);
        }
      } catch (err) {
        console.error("Failed to load user profile:", err);
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 1. Welcome Toast */}
      {showWelcome && user && (
        <div 
          className="animate-toast" 
          style={{ 
            position: 'fixed', 
            top: '24px', 
            left: '50%', 
            zIndex: 10001, 
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', 
            color: 'white', 
            padding: '12px 32px', 
            borderRadius: '100px', 
            fontWeight: 800, 
            fontSize: '12px',
            boxShadow: '0 12px 30px rgba(99, 102, 241, 0.4)',
            letterSpacing: '0.5px'
          }}
        >
          WELCOME BACK, {user.firstName.toUpperCase()}! 🚀
        </div>
      )}

      {/* 2. Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '360px', textAlign: 'center' }}>
            <div style={{ 
              width: '60px', 
              height: '60px', 
              borderRadius: '50%', 
              background: 'rgba(239, 68, 68, 0.1)', 
              color: 'var(--error)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 16px auto',
              fontSize: '24px'
            }}>
              🚪
            </div>
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--text)', fontSize: '18px', fontWeight: 800 }}>Log out of TeleDrive?</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
              Your local browser MTProto session will be cleared. Your files remain completely safe in your Telegram Saved Messages.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setShowLogoutConfirm(false)} 
                style={{ 
                  flex: 1, 
                  padding: '12px', 
                  borderRadius: '14px', 
                  border: '1px solid var(--border)', 
                  background: 'transparent', 
                  color: 'var(--text)', 
                  fontWeight: 800, 
                  cursor: 'pointer' 
                }}
              >
                CANCEL
              </button>
              <button 
                onClick={() => telegramService.logout()} 
                style={{ 
                  flex: 1, 
                  padding: '12px', 
                  borderRadius: '14px', 
                  border: 'none', 
                  background: '#EF4444', 
                  color: 'white', 
                  fontWeight: 800, 
                  cursor: 'pointer' 
                }}
              >
                LOGOUT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. User Profile Modal */}
      {showProfileModal && user && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)' }}>ACCOUNT INFO</span>
              <button 
                onClick={() => setShowProfileModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
              >
                <IconX size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              {user.photoUrl ? (
                <img 
                  src={user.photoUrl} 
                  alt={user.firstName}
                  style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }} 
                />
              ) : (
                <div style={{ 
                  width: '64px', 
                  height: '64px', 
                  borderRadius: '50%', 
                  background: 'var(--primary)', 
                  color: 'white', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontWeight: 800, 
                  fontSize: '24px' 
                }}>
                  {user.firstName[0]}
                </div>
              )}
              <div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>
                  {user.firstName} {user.lastName || ''}
                </div>
                {user.username && (
                  <div style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 700 }}>
                    {user.username}
                  </div>
                )}
                {user.phone && (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {user.phone}
                  </div>
                )}
              </div>
            </div>

            <div style={{ 
              background: 'var(--surface-secondary)', 
              borderRadius: '16px', 
              padding: '16px', 
              marginBottom: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              fontSize: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Telegram User ID:</span>
                <span style={{ fontWeight: 700 }}>#{user.id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Telegram Data Center:</span>
                <span style={{ fontWeight: 700, color: 'var(--success)' }}>DC {user.dcId || 4} (Active)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Storage Quota:</span>
                <span style={{ fontWeight: 700, color: 'var(--primary)' }}>Unlimited (Free)</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => { setShowProfileModal(false); setShowLogoutConfirm(true); }}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  background: 'rgba(239, 68, 68, 0.08)',
                  color: 'var(--error)',
                  fontWeight: 800,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                LOGOUT FROM THIS BROWSER
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Top Navigation Bar */}
      <nav style={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 1000, 
        padding: '14px 6%', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        background: 'var(--surface-glass)', 
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)' 
      }}>
        <div className="logo-text">
          <div style={{ 
            width: '32px', 
            height: '32px', 
            borderRadius: '10px', 
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 4px 12px var(--primary-glow)'
          }}>
            <IconCloud size={18} color="white" />
          </div>
          <span>TeleDrive</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* MTProto Status indicator */}
          {user && (
            <div 
              className="hide-mobile"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                background: 'var(--accent)', 
                padding: '6px 12px', 
                borderRadius: '100px',
                fontSize: '10px',
                fontWeight: 800,
                color: 'var(--text-secondary)'
              }}
              title="Direct WebSocket MTProto connected to Telegram Data Center"
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} className="pulse" />
              <span>ONLINE • DC {user.dcId || 4}</span>
            </div>
          )}

          {/* Theme Switcher Button */}
          <button 
            onClick={toggleTheme} 
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            style={{ 
              background: 'var(--accent)', 
              border: '1px solid var(--border)', 
              borderRadius: '50%', 
              width: '38px', 
              height: '38px', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'var(--text)',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {theme === 'light' ? <IconMoon size={16} /> : <IconSun size={16} />}
          </button>

          {/* User Profile Pill */}
          {user && (
            <div 
              onClick={() => setShowProfileModal(true)} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                background: 'var(--surface)', 
                border: '1px solid var(--border)',
                padding: '4px 14px 4px 5px', 
                borderRadius: '100px', 
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)',
                transition: 'all 0.2s ease'
              }}
              title="View account profile"
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              {user.photoUrl ? (
                <img 
                  src={user.photoUrl} 
                  alt={user.firstName}
                  style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }} 
                />
              ) : (
                <div style={{ 
                  width: '30px', 
                  height: '30px', 
                  borderRadius: '50%', 
                  background: 'var(--primary)', 
                  color: 'white', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontWeight: 'bold', 
                  fontSize: '12px' 
                }}>
                  {user.firstName[0]}
                </div>
              )}
              <div className="hide-mobile-extra" style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '12px', fontWeight: '800', lineHeight: 1.1, color: 'var(--text)' }}>
                  {user.firstName}
                </div>
                <div style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)' }}>
                  {user.username || 'ACCOUNT'}
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '32px 6%', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        {loading && !user ? (
          <div style={{ textAlign: 'center', padding: '120px 20px', fontWeight: 800, color: 'var(--primary)', letterSpacing: '1px' }}>
            CONNECTING TO TELEGRAM MTPROTO NODES...
          </div>
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
