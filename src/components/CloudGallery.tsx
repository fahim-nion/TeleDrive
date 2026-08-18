import React, { useState, useEffect, useRef } from 'react';
import { CloudFile } from '../types';
import { fetchCloudFiles, deleteFileFromTelegram, downloadFileFromTelegram } from '../services/cloud';
import CloudItem from './CloudItem';
import MediaViewer from './MediaViewer';
import { IconRefresh } from './Icons';

const CloudGallery: React.FC<any> = ({ initialFiles, onRefresh }) => {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [allFiles, setAllFiles] = useState<CloudFile[]>(initialFiles);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const sentinelRef = useRef<HTMLDivElement>(null);

    // Initial Sync & Deduplication
    useEffect(() => {
        const unique = new Map();
        [...initialFiles, ...allFiles].forEach(f => unique.set(f.messageId, f));
        setAllFiles(Array.from(unique.values()).sort((a, b) => b.date - a.date));
    }, [initialFiles]);

    const handleLoadMore = async () => {
        if (loadingMore || !hasMore || allFiles.length === 0) return;
        
        setLoadingMore(true);
        const lastId = allFiles[allFiles.length - 1].messageId;
        
        try {
            const older = await fetchCloudFiles(lastId);
            if (older.length === 0) {
                setHasMore(false);
            } else {
                setAllFiles(prev => {
                    const next = [...prev];
                    older.forEach(f => {
                        if (!next.find(x => x.messageId === f.messageId)) next.push(f);
                    });
                    return next;
                });
            }
        } finally {
            setLoadingMore(false);
        }
    };

    // Single Observer Logic
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) handleLoadMore();
        }, { threshold: 0.1 });

        if (sentinelRef.current) observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [allFiles, loadingMore]);

    const groups: Record<string, CloudFile[]> = {};
    allFiles.forEach(f => {
        const date = new Date(f.date * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        if (!groups[date]) groups[date] = [];
        groups[date].push(f);
    });

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>Cloud Stream</h2>
                <button onClick={onRefresh} className="glass-card" style={{ padding: '10px 16px', fontWeight: 'bold', display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer' }}>
                    <IconRefresh size={14} /> SYNC
                </button>
            </div>

            {Object.keys(groups).map(date => (
                <div key={date} style={{ marginBottom: '32px' }}>
                    <div style={{ position: 'sticky', top: '70px', zIndex: 10, padding: '10px 16px', borderRadius: '14px', marginBottom: '16px', fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)' }} className="glass-card">
                        {date.toUpperCase()}
                    </div>
                    <div className="gallery-grid">
                        {groups[date].map((f) => (
                            <CloudItem key={f.messageId} file={f} onClick={() => setSelectedIndex(allFiles.indexOf(f))} />
                        ))}
                    </div>
                </div>
            ))}

            <div ref={sentinelRef} style={{ height: '20px', margin: '20px 0' }} />
            
            {loadingMore && (
                <div style={{ textAlign: 'center', padding: '40px', fontWeight: 800, fontSize: '12px', color: 'var(--primary)' }}>
                    PULLING MORE ITEMS...
                </div>
            )}
        </div>
    );
};

export default CloudGallery;