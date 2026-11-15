import React, { useState } from 'react';
import { telegramService } from '../services/telegram';
import { 
  IconShield, 
  IconZap, 
  IconSparkles, 
  IconFolder, 
  IconRefresh, 
  IconCloud, 
  IconCheckCircle 
} from './Icons';

interface Props {
  onLoginSuccess: () => void;
}

const Login: React.FC<Props> = ({ onLoginSuccess }) => {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password2FA, setPassword2FA] = useState('');
  const [step, setStep] = useState<'phone' | 'code' | '2fa'>('phone');
  const [phoneCodeHash, setPhoneCodeHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setErrorMessage("Please enter your phone number with country code.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const cleanPhone = phone.trim().replace(/\s+/g, '');
      const res = await telegramService.sendCode(cleanPhone);
      setPhoneCodeHash(res.phoneCodeHash);
      setStep('code');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to send code. Check your phone number.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setErrorMessage("Please enter the confirmation code received in Telegram.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const cleanPhone = phone.trim().replace(/\s+/g, '');
      await telegramService.signIn(cleanPhone, code.trim(), phoneCodeHash);
      onLoginSuccess();
    } catch (err: any) {
      if (err.message === "2FA_REQUIRED") {
        setStep('2fa');
      } else {
        setErrorMessage(err.message || "Invalid code. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handle2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password2FA) {
      setErrorMessage("Please enter your 2-Step Verification password.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      await telegramService.signInWith2FA(password2FA);
      onLoginSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || "Incorrect 2FA password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '82vh', justifyContent: 'center' }}>
      <div className="login-grid" style={{ margin: '40px 0' }}>
        {/* Left Value Proposition */}
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '100px', background: 'var(--accent)', color: 'var(--primary)', fontWeight: 800, fontSize: '11px', marginBottom: '20px' }}>
            <IconCloud size={16} /> DECENTRALIZED WEB CLOUD
          </div>

          <h1 className="login-title" style={{ fontSize: '50px', fontWeight: 800, marginBottom: '20px', lineHeight: 1.1, letterSpacing: '-1.5px' }}>
            Turn your Telegram into <br />
            <span style={{ 
              background: 'linear-gradient(135deg, #6366F1, #A855F7)', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent' 
            }}>
              Infinite Cloud Storage.
            </span>
          </h1>

          <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.6, marginBottom: '32px', maxWidth: '520px' }}>
            Direct browser-to-Telegram MTProto WebSocket connection. Zero third-party proxy, original uncompressed files, and lifetime unlimited free storage.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            {[
              { icon: <IconShield color="var(--primary)" size={20} />, title: 'Direct MTProto', desc: 'Runs in your browser. No middleman.' },
              { icon: <IconZap color="var(--accent-video)" size={20} />, title: 'Unlimited Storage', desc: 'No 15GB cap. Free forever.' },
              { icon: <IconSparkles color="var(--primary)" size={20} />, title: 'Raw Quality', desc: 'Original bytes preserved bit-by-bit.' },
              { icon: <IconFolder color="var(--accent-audio)" size={20} />, title: 'Saved Messages', desc: 'Synced across all your devices.' }
            ].map(f => (
              <div key={f.title} className="glass-card" style={{ padding: '18px', borderRadius: '18px' }}>
                <div style={{ marginBottom: '8px' }}>{f.icon}</div>
                <div style={{ fontWeight: 800, fontSize: '13px', marginBottom: '3px' }}>{f.title}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Login Box */}
        <div className="glass-card" style={{ padding: '36px', borderRadius: '24px', boxShadow: 'var(--shadow-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '18px' }}>🔐</span>
            <h3 style={{ margin: 0, fontWeight: 800, fontSize: '20px' }}>
              {step === 'phone' ? 'Log in with Telegram' : step === 'code' ? 'Enter Confirmation Code' : '2-Step Verification'}
            </h3>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
            {step === 'phone' 
              ? 'Enter your phone number with country code (e.g. +880, +1, +44) to receive your login code in Telegram.' 
              : step === 'code' 
              ? 'We sent a verification code to your Telegram app. Enter it below.' 
              : 'Your Telegram account has a 2FA cloud password enabled. Enter it to unlock.'}
          </p>

          {errorMessage && (
            <div style={{ 
              padding: '12px 16px', 
              background: 'rgba(239, 68, 68, 0.1)', 
              border: '1px solid rgba(239, 68, 68, 0.3)', 
              color: 'var(--error)', 
              borderRadius: '12px', 
              fontSize: '12px', 
              fontWeight: 700, 
              marginBottom: '20px' 
            }}>
              {errorMessage}
            </div>
          )}

          {step === 'phone' && (
            <form onSubmit={handleSendCode}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  PHONE NUMBER
                </label>
                <input 
                  type="tel" 
                  placeholder="+8801XXXXXXXXX" 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)}
                  disabled={loading}
                  style={{ 
                    width: '100%', 
                    padding: '14px', 
                    borderRadius: '14px', 
                    border: '1px solid var(--border)', 
                    background: 'var(--surface-secondary)', 
                    color: 'var(--text)', 
                    fontSize: '14px',
                    fontWeight: 600,
                    outline: 'none' 
                  }} 
                />
              </div>

              <button 
                type="submit" 
                disabled={loading} 
                style={{ 
                  width: '100%', 
                  padding: '14px', 
                  background: 'var(--primary)', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '14px', 
                  fontWeight: 800, 
                  fontSize: '13px', 
                  cursor: loading ? 'not-allowed' : 'pointer', 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  gap: '8px',
                  boxShadow: 'var(--shadow-glow)'
                }}
              >
                {loading ? <IconRefresh className="spin" size={16} /> : <IconZap size={16} />}
                {loading ? 'SENDING CODE...' : 'SEND OTP CODE'}
              </button>
            </form>
          )}

          {step === 'code' && (
            <form onSubmit={handleSignIn}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  TELEGRAM OTP CODE
                </label>
                <input 
                  type="text" 
                  placeholder="12345" 
                  value={code} 
                  onChange={e => setCode(e.target.value)}
                  disabled={loading}
                  autoFocus
                  style={{ 
                    width: '100%', 
                    padding: '14px', 
                    borderRadius: '14px', 
                    border: '1px solid var(--border)', 
                    background: 'var(--surface-secondary)', 
                    color: 'var(--text)', 
                    fontSize: '18px',
                    fontWeight: 800,
                    letterSpacing: '4px',
                    textAlign: 'center',
                    outline: 'none' 
                  }} 
                />
              </div>

              <button 
                type="submit" 
                disabled={loading} 
                style={{ 
                  width: '100%', 
                  padding: '14px', 
                  background: 'var(--primary)', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '14px', 
                  fontWeight: 800, 
                  fontSize: '13px', 
                  cursor: loading ? 'not-allowed' : 'pointer', 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  gap: '8px',
                  boxShadow: 'var(--shadow-glow)',
                  marginBottom: '12px'
                }}
              >
                {loading ? <IconRefresh className="spin" size={16} /> : <IconCheckCircle size={16} />}
                {loading ? 'VERIFYING...' : 'AUTHORIZE SESSION'}
              </button>

              <button
                type="button"
                onClick={() => { setStep('phone'); setCode(''); setErrorMessage(null); }}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '8px'
                }}
              >
                ← Back to Phone Number
              </button>
            </form>
          )}

          {step === '2fa' && (
            <form onSubmit={handle2FA}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  2-STEP PASSWORD
                </label>
                <input 
                  type="password" 
                  placeholder="Enter Telegram Cloud Password" 
                  value={password2FA} 
                  onChange={e => setPassword2FA(e.target.value)}
                  disabled={loading}
                  autoFocus
                  style={{ 
                    width: '100%', 
                    padding: '14px', 
                    borderRadius: '14px', 
                    border: '1px solid var(--border)', 
                    background: 'var(--surface-secondary)', 
                    color: 'var(--text)', 
                    fontSize: '14px',
                    fontWeight: 600,
                    outline: 'none' 
                  }} 
                />
              </div>

              <button 
                type="submit" 
                disabled={loading} 
                style={{ 
                  width: '100%', 
                  padding: '14px', 
                  background: 'var(--primary)', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '14px', 
                  fontWeight: 800, 
                  fontSize: '13px', 
                  cursor: loading ? 'not-allowed' : 'pointer', 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  gap: '8px',
                  boxShadow: 'var(--shadow-glow)',
                  marginBottom: '12px'
                }}
              >
                {loading ? <IconRefresh className="spin" size={16} /> : <IconShield size={16} />}
                {loading ? 'UNLOCKING...' : 'UNLOCK WITH 2FA'}
              </button>

              <button
                type="button"
                onClick={() => { setStep('code'); setErrorMessage(null); }}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '8px'
                }}
              >
                ← Back to Code
              </button>
            </form>
          )}
        </div>
      </div>

      <div style={{ marginTop: 'auto', padding: '24px 0', textAlign: 'center', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px' }}>
        DEVELOPED BY <span style={{ color: 'var(--primary)' }}>FAHIM MORSHED</span> • OPEN SOURCE &amp; CLIENT-SIDE SECURE
      </div>
    </div>
  );
};

export default Login;
