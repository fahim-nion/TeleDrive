import React from 'react';
import { IconGithub, IconX, IconSparkles, IconUser } from './Icons';

const DevCard: React.FC = () => {
  return (
    <div style={{ maxWidth: '600px', margin: '60px auto', padding: '0 20px' }}>
      <div className="glass-card" style={{ padding: '60px 40px', textAlign: 'center', position: 'relative', overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.1)' }}>
        {/* Background Glow */}
        <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '300px', height: '300px', background: 'var(--primary)', filter: 'blur(100px)', opacity: 0.1, pointerEvents: 'none' }} />
        
        <div style={{ width: '120px', height: '120px', background: 'var(--primary)', borderRadius: '40px', transform: 'rotate(-10deg)', margin: '0 auto 40px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 20px 40px var(--primary-glow)' }}>
          <div style={{ transform: 'rotate(10deg)' }}><IconUser size={56} /></div>
        </div>

        <h1 style={{ margin: '0 0 12px 0', fontSize: '36px', fontWeight: 800, letterSpacing: '-1.5px' }}>Fahim Morshed</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '16px', marginBottom: '40px', lineHeight: 1.6, fontWeight: 500 }}>
          Lead Engineer & Architect of TeleDrive.<br/>
          Pushing the boundaries of decentralized storage. Enjoy your free storage.
        </p>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <a href="https://github.com/fahim-nion" target="_blank" className="card" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '16px', textDecoration: 'none', color: 'inherit', fontWeight: '800', fontSize: '13px', background: 'var(--surface)' }}>
            <IconGithub size={18} /> GITHUB
          </a>
          <a href="https://x.com/FahimM0rshed" target="_blank" className="card" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '16px', textDecoration: 'none', color: 'inherit', fontWeight: '800', fontSize: '13px', background: 'var(--surface)' }}>
            <IconX size={18} /> TWITTER
          </a>
        </div>

        <div style={{ marginTop: '60px', paddingTop: '32px', borderTop: '1px solid var(--border)', fontSize: '8px', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '1px' }}>
           • THIS PROJECT WAS MADE FOR MY WIFE ❤️ •
        </div>
      </div>
    </div>
  );
};

export default DevCard;