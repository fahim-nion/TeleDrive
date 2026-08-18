import React, { useState } from 'react';
import { telegramService } from '../services/telegram';
import { IconShield, IconZap, IconSparkles, IconFolder, IconRefresh } from './Icons';

const Login: React.FC<{ onLoginSuccess: () => void }> = ({ onLoginSuccess }) => {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phoneCodeHash, setPhoneCodeHash] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    setLoading(true);
    try {
      const res = await telegramService.sendCode(phone);
      setPhoneCodeHash(res.phoneCodeHash);
      setStep('code');
    } catch (err: any) { alert(err.message); }
    setLoading(false);
  };

  const handleSignIn = async () => {
    setLoading(true);
    try {
      await telegramService.signIn(phone, code, phoneCodeHash);
      onLoginSuccess();
    } catch (err: any) { alert(err.message); }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '80vh' }}>
      <div className="login-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '60px', alignItems: 'center', marginTop: '60px' }}>
        <div>
          <h1 style={{ fontSize: '56px', fontWeight: 800, marginBottom: '24px', lineHeight: 1, letterSpacing: '-2px' }}>
            Your Telegram is now <br/><span className="logo-text" style={{ fontSize: '64px' }}>Personal Cloud.</span>
          </h1>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {[
              { icon: <IconShield color="var(--primary)" />, title: 'Private' },
              { icon: <IconZap color="var(--primary)" />, title: 'Infinite' },
              { icon: <IconSparkles color="var(--primary)" />, title: 'Original' },
              { icon: <IconFolder color="var(--primary)" />, title: 'Sync' }
            ].map(f => (
              <div key={f.title} className="glass-card" style={{ padding: '20px', borderRadius: '24px' }}>
                <div style={{ marginBottom: '10px' }}>{f.icon}</div>
                <div style={{ fontWeight: '800', fontSize: '14px' }}>{f.title}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '40px', borderRadius: '28px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0, fontWeight: 800 }}>Identity Access</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>Connect your node to continue.</p>
          
          {step === 'phone' ? (
            <div style={{ width: '100%' }}>
              <input type="text" placeholder="+880..." value={phone} onChange={e => setPhone(e.target.value)}
                style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', marginBottom: '16px', outline: 'none', display: 'block' }} />
              <button onClick={handleSendCode} disabled={loading} style={{ width: '100%', padding: '14px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '800', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                {loading ? <IconRefresh className="spin" size={16} /> : 'SEND OTP'}
              </button>
            </div>
          ) : (
            <div style={{ width: '100%' }}>
              <input type="text" placeholder="Code" value={code} onChange={e => setCode(e.target.value)}
                style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', marginBottom: '16px', outline: 'none', display: 'block' }} />
              <button onClick={handleSignIn} disabled={loading} style={{ width: '100%', padding: '14px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '800', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                {loading ? <IconRefresh className="spin" size={16} /> : 'AUTHORIZE'}
              </button>
            </div>
          )}
        </div>
      </div>
      <div style={{ marginTop: 'auto', padding: '40px 0', textAlign: 'center', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px' }}>
        DEVELOPED BY <span style={{ color: 'var(--primary)' }}>FAHIM MORSHED</span>
      </div>
    </div>
  );
};

export default Login;