import React from 'react';
import { IconGithub, IconX, IconSparkles, IconUser, IconZap, IconShield, IconCloud } from './Icons';

const DevCard: React.FC = () => {
  return (
    <div style={{ maxWidth: '640px', margin: '40px auto', padding: '0 16px' }}>
      <div className="glass-card" style={{ padding: '50px 36px', textAlign: 'center', position: 'relative', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
        {/* Ambient Top Glow */}
        <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '320px', height: '320px', background: 'var(--primary)', filter: 'blur(100px)', opacity: 0.12, pointerEvents: 'none' }} />

        {/* Profile Avatar Badge */}
        <div style={{ 
          width: '110px', 
          height: '110px', 
          background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', 
          borderRadius: '36px', 
          transform: 'rotate(-6deg)', 
          margin: '0 auto 32px auto', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          color: 'white', 
          boxShadow: '0 16px 36px var(--primary-glow)' 
        }}>
          <div style={{ transform: 'rotate(6deg)' }}>
            <IconUser size={52} />
          </div>
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--primary-light)', color: 'var(--primary)', padding: '4px 14px', borderRadius: '100px', fontSize: '10px', fontWeight: 800, marginBottom: '12px' }}>
          <IconSparkles size={12} /> CREATOR &amp; ARCHITECT
        </div>

        <h1 style={{ margin: '0 0 10px 0', fontSize: '34px', fontWeight: 800, letterSpacing: '-1px' }}>
          Fahim Morshed
        </h1>

        <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginBottom: '28px', lineHeight: 1.6, fontWeight: 500, maxWidth: '480px', margin: '0 auto 28px auto' }}>
          Lead Engineer &amp; Architect of TeleDrive.<br />
          Built to make personal decentralized cloud storage free, private, and unlimited for everyone by leveraging direct browser-to-Telegram MTProto.
        </p>

        {/* Tech Stack Pills */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '36px' }}>
          {['Telegram MTProto', 'Direct WebSockets', 'React 18', 'TypeScript', 'IndexedDB Disk Cache', 'Vite PWA'].map(tech => (
            <span key={tech} style={{ 
              background: 'var(--surface)', 
              border: '1px solid var(--border)', 
              padding: '6px 14px', 
              borderRadius: '100px', 
              fontSize: '11px', 
              fontWeight: 700, 
              color: 'var(--text-secondary)' 
            }}>
              {tech}
            </span>
          ))}
        </div>

        {/* Social Links */}
        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', maxWidth: '380px', margin: '0 auto' }}>
          <a 
            href="https://github.com/fahim-nion" 
            target="_blank" 
            rel="noopener noreferrer"
            className="card" 
            style={{ 
              flex: 1, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '10px', 
              padding: '14px', 
              textDecoration: 'none', 
              color: 'inherit', 
              fontWeight: 800, 
              fontSize: '12px', 
              borderRadius: '14px' 
            }}
          >
            <IconGithub size={18} /> GITHUB
          </a>
          <a 
            href="https://x.com/FahimM0rshed" 
            target="_blank" 
            rel="noopener noreferrer"
            className="card" 
            style={{ 
              flex: 1, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '10px', 
              padding: '14px', 
              textDecoration: 'none', 
              color: 'inherit', 
              fontWeight: 800, 
              fontSize: '12px', 
              borderRadius: '14px' 
            }}
          >
            <IconX size={18} /> TWITTER
          </a>
        </div>

        {/* Architectural Principles */}
        <div style={{ marginTop: '36px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', textAlign: 'left' }}>
          <div className="card" style={{ padding: '14px', borderRadius: '12px' }}>
            <div style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '11px', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <IconShield size={12} /> Privacy First
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Session saved only in your browser storage.</div>
          </div>
          <div className="card" style={{ padding: '14px', borderRadius: '12px' }}>
            <div style={{ color: 'var(--accent-video)', fontWeight: 800, fontSize: '11px', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <IconZap size={12} /> Direct WSS
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Direct MTProto connection to Telegram DC.</div>
          </div>
          <div className="card" style={{ padding: '14px', borderRadius: '12px' }}>
            <div style={{ color: 'var(--accent-audio)', fontWeight: 800, fontSize: '11px', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <IconCloud size={12} /> Free Forever
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Unlimited cloud storage for Saved Messages.</div>
          </div>
        </div>

        {/* Tribute Footer */}
        <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid var(--border)', fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '1px' }}>
          • THIS PROJECT WAS MADE FOR MY WIFE ❤️ •
        </div>
      </div>
    </div>
  );
};

export default DevCard;
