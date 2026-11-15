import React, { useState, useMemo } from 'react';
import { CloudFile, FileCategory } from '../types';
import { 
  deleteFileFromTelegram, 
  deleteMultipleFilesFromTelegram, 
  downloadFileFromTelegram,
  getThumbnail
} from '../services/cloud';
import CloudItem from './CloudItem';
import MediaViewer from './MediaViewer';
import { 
  IconRefresh, 
  IconSearch, 
  IconGrid, 
  IconList, 
  IconDownload, 
  IconTrash, 
  IconCheck, 
  IconX,
  IconSparkles,
  IconVideo,
  IconImage,
  IconMusic,
  IconFileText,
  IconArchive
} from './Icons';
import { formatBytes } from './StorageMetrics';

interface Props {
  initialFiles: CloudFile[];
  initialCategoryFilter?: FileCategory;
  onRefresh: () => Promise<void>;
  onLoadMore: () => void;
  loadingMore: boolean;
  onFileDeleted?: (messageId: number, size: number, category: FileCategory) => void;
  onBatchFilesDeleted?: (deleted: { messageId: number; size: number; category: FileCategory }[]) => void;
}

type SortOption = 'newest' | 'oldest' | 'largest' | 'smallest' | 'name';

const CloudGallery: React.FC<Props> = ({ 
  initialFiles, 
  initialCategoryFilter = 'all',
  onRefresh, 
  onLoadMore, 
  loadingMore,
  onFileDeleted,
  onBatchFilesDeleted
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<FileCategory>(initialCategoryFilter);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Multi-select state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Delete modal state
  const [deleteModalState, setDeleteModalState] = useState<{
    open: boolean;
    filesToDelete: CloudFile[];
  }>({ open: false, filesToDelete: [] });

  // Download state
  const [batchDownloading, setBatchDownloading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSyncClick = async () => {
    setIsSyncing(true);
    try {
      await onRefresh();
      showToast('Cloud stream nodes refreshed');
    } finally {
      setIsSyncing(false);
    }
  };

  // Filter & Search & Sort logic
  const filteredAndSortedFiles = useMemo(() => {
    let result = [...initialFiles];

    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(f => f.name.toLowerCase().includes(q));
    }

    // 2. Category Filter
    if (categoryFilter !== 'all') {
      result = result.filter(f => f.category === categoryFilter);
    }

    // 3. Sorting
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => b.date - a.date);
        break;
      case 'oldest':
        result.sort((a, b) => a.date - b.date);
        break;
      case 'largest':
        result.sort((a, b) => b.size - a.size);
        break;
      case 'smallest':
        result.sort((a, b) => a.size - b.size);
        break;
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return result;
  }, [initialFiles, searchQuery, categoryFilter, sortBy]);

  // Date Grouping for Grid View
  const groups = useMemo(() => {
    const acc: Record<string, CloudFile[]> = {};
    filteredAndSortedFiles.forEach(f => {
      const date = new Date(f.date * 1000).toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
      if (!acc[date]) acc[date] = [];
      acc[date].push(f);
    });
    return acc;
  }, [filteredAndSortedFiles]);

  // Selection handlers
  const toggleSelectId = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredAndSortedFiles.map(f => f.messageId)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  // Download File helper
  const handleDownloadSingle = async (file: CloudFile) => {
    showToast(`Downloading "${file.name}"...`);
    try {
      const buf = await downloadFileFromTelegram(file.messageId, () => {});
      const blob = new Blob([buf], { type: file.mimeType });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
      showToast(`Downloaded "${file.name}"`);
    } catch (e) {
      showToast(`Failed to download ${file.name}`);
    }
  };

  // Batch Download
  const handleBatchDownload = async () => {
    const toDownload = filteredAndSortedFiles.filter(f => selectedIds.has(f.messageId));
    if (toDownload.length === 0) return;

    setBatchDownloading(true);
    showToast(`Downloading ${toDownload.length} files...`);

    for (let i = 0; i < toDownload.length; i++) {
      const f = toDownload[i];
      try {
        const buf = await downloadFileFromTelegram(f.messageId, () => {});
        const blob = new Blob([buf], { type: f.mimeType });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = f.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 10000);
        await new Promise(r => setTimeout(r, 400));
      } catch (err) {
        console.error("Batch download err:", err);
      }
    }
    setBatchDownloading(false);
    showToast(`Finished downloading ${toDownload.length} files`);
    setIsSelectMode(false);
    setSelectedIds(new Set());
  };

  // Delete Action Confirm
  const executeDelete = async () => {
    const files = deleteModalState.filesToDelete;
    setDeleteModalState({ open: false, filesToDelete: [] });

    if (files.length === 1) {
      const file = files[0];
      try {
        await deleteFileFromTelegram(file.messageId);
        onFileDeleted?.(file.messageId, file.size, file.category);
        showToast(`Deleted "${file.name}" from Telegram Cloud`);
      } catch (e) {
        showToast('Failed to delete file');
      }
    } else if (files.length > 1) {
      try {
        const ids = files.map(f => f.messageId);
        await deleteMultipleFilesFromTelegram(ids);
        onBatchFilesDeleted?.(files.map(f => ({ messageId: f.messageId, size: f.size, category: f.category })));
        showToast(`Deleted ${files.length} files from Telegram Cloud`);
        setIsSelectMode(false);
        setSelectedIds(new Set());
      } catch (e) {
        showToast('Failed to delete files');
      }
    }
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { all: initialFiles.length, image: 0, video: 0, document: 0, audio: 0, archive: 0 };
    initialFiles.forEach(f => {
      if (f.category in counts) {
        counts[f.category as keyof typeof counts]++;
      }
    });
    return counts;
  }, [initialFiles]);

  return (
    <div style={{ paddingBottom: '120px' }}>
      {/* Toast Alert */}
      {toastMessage && (
        <div 
          className="animate-toast" 
          style={{ 
            position: 'fixed', 
            top: '20px', 
            left: '50%', 
            zIndex: 10002, 
            background: 'var(--surface)', 
            color: 'var(--text)', 
            padding: '12px 28px', 
            borderRadius: '100px', 
            fontWeight: 800, 
            fontSize: '12px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)' 
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalState.open && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ 
                width: '60px', 
                height: '60px', 
                borderRadius: '50%', 
                background: 'rgba(239, 68, 68, 0.1)', 
                color: 'var(--error)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                margin: '0 auto 16px auto'
              }}>
                <IconTrash size={28} />
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 800 }}>
                Delete from Telegram Cloud?
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                {deleteModalState.filesToDelete.length === 1 
                  ? `Are you sure you want to permanently delete "${deleteModalState.filesToDelete[0].name}" from your Saved Messages?` 
                  : `Are you sure you want to permanently delete ${deleteModalState.filesToDelete.length} files from your Saved Messages?`}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setDeleteModalState({ open: false, filesToDelete: [] })} 
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
                onClick={executeDelete} 
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
                DELETE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header & Search Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px' }}>
                Cloud Stream
              </h2>
              <span className="badge badge-primary">
                {filteredAndSortedFiles.length} {filteredAndSortedFiles.length === 1 ? 'file' : 'files'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
              Live stream from Telegram Saved Messages
            </p>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => {
                setIsSelectMode(!isSelectMode);
                if (isSelectMode) setSelectedIds(new Set());
              }}
              className="glass-card"
              style={{
                padding: '8px 16px',
                fontWeight: 800,
                fontSize: '11px',
                cursor: 'pointer',
                color: isSelectMode ? 'var(--primary)' : 'var(--text)',
                borderColor: isSelectMode ? 'var(--primary)' : 'var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <IconCheck size={14} />
              {isSelectMode ? 'CANCEL SELECT' : 'SELECT'}
            </button>

            {/* View Mode Toggle */}
            <div className="glass-card" style={{ display: 'flex', padding: '3px', borderRadius: '12px' }}>
              <button
                onClick={() => setViewMode('grid')}
                title="Grid View"
                style={{
                  padding: '6px 10px',
                  borderRadius: '9px',
                  border: 'none',
                  background: viewMode === 'grid' ? 'var(--primary)' : 'transparent',
                  color: viewMode === 'grid' ? 'white' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <IconGrid size={15} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                title="List View"
                style={{
                  padding: '6px 10px',
                  borderRadius: '9px',
                  border: 'none',
                  background: viewMode === 'list' ? 'var(--primary)' : 'transparent',
                  color: viewMode === 'list' ? 'white' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <IconList size={15} />
              </button>
            </div>

            <button 
              onClick={handleSyncClick} 
              disabled={isSyncing}
              className="glass-card" 
              style={{ 
                padding: '8px 16px', 
                fontWeight: 800, 
                display: 'flex', 
                gap: '8px', 
                alignItems: 'center', 
                fontSize: '11px', 
                cursor: 'pointer', 
                color: 'var(--text)', 
                opacity: isSyncing ? 0.6 : 1 
              }}
            >
              <IconRefresh size={14} className={isSyncing ? 'spin' : ''} /> 
              {isSyncing ? 'SYNCING...' : 'SYNC NODES'}
            </button>
          </div>
        </div>

        {/* Search & Sort Row */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search Box */}
          <div style={{ flex: '1 1 260px', position: 'relative' }}>
            <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, display: 'flex' }}>
              <IconSearch size={16} />
            </div>
            <input 
              type="text" 
              placeholder="Search files by name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 38px 12px 38px',
                borderRadius: '14px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: '13px',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex'
                }}
              >
                <IconX size={16} />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              style={{
                padding: '12px 18px',
                borderRadius: '14px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: '12px',
                fontWeight: 700,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="largest">Sort: Largest Size</option>
              <option value="smallest">Sort: Smallest Size</option>
              <option value="name">Sort: Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="tabs-scroll-container">
          {[
            { id: 'all', label: 'All Files', count: categoryCounts.all },
            { id: 'image', label: 'Photos', count: categoryCounts.image },
            { id: 'video', label: 'Videos', count: categoryCounts.video },
            { id: 'document', label: 'Documents', count: categoryCounts.document },
            { id: 'audio', label: 'Audio', count: categoryCounts.audio },
            { id: 'archive', label: 'Archives', count: categoryCounts.archive },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setCategoryFilter(tab.id as FileCategory)}
              style={{
                padding: '8px 18px',
                borderRadius: '100px',
                border: categoryFilter === tab.id ? '1px solid var(--primary)' : '1px solid var(--border)',
                background: categoryFilter === tab.id ? 'var(--primary-light)' : 'var(--surface)',
                color: categoryFilter === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: 800,
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{tab.label}</span>
              <span style={{ 
                opacity: 0.7, 
                fontSize: '9px', 
                background: 'rgba(0,0,0,0.06)', 
                padding: '1px 6px', 
                borderRadius: '100px' 
              }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {filteredAndSortedFiles.length === 0 && (
        <div className="glass-card" style={{ textAlign: 'center', padding: '80px 20px', margin: '40px 0' }}>
          <div style={{ fontSize: '42px', marginBottom: '16px' }}>🔍</div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 800 }}>No files found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '360px', margin: '0 auto 20px auto' }}>
            {searchQuery 
              ? `No items match the query "${searchQuery}". Try a different keyword.` 
              : `No files in category "${categoryFilter}".`}
          </p>
          {(searchQuery || categoryFilter !== 'all') && (
            <button
              onClick={() => { setSearchQuery(''); setCategoryFilter('all'); }}
              style={{
                padding: '10px 24px',
                borderRadius: '100px',
                background: 'var(--primary)',
                color: 'white',
                border: 'none',
                fontWeight: 800,
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              CLEAR FILTERS
            </button>
          )}
        </div>
      )}

      {/* Grid View with Date Grouping */}
      {viewMode === 'grid' && Object.keys(groups).map(date => (
        <div key={date} style={{ marginBottom: '32px' }}>
          <div 
            style={{ 
              position: 'sticky', 
              top: '64px', 
              zIndex: 10, 
              padding: '8px 16px', 
              borderRadius: '12px', 
              marginBottom: '14px', 
              fontSize: '11px', 
              fontWeight: 800, 
              letterSpacing: '0.8px', 
              color: 'var(--text-secondary)',
              display: 'inline-block'
            }} 
            className="glass-card"
          >
            {date.toUpperCase()} • <span style={{ opacity: 0.6 }}>{groups[date].length} {groups[date].length === 1 ? 'item' : 'items'}</span>
          </div>

          <div className="gallery-grid">
            {groups[date].map((f) => (
              <CloudItem 
                key={f.messageId} 
                file={f} 
                isSelected={selectedIds.has(f.messageId)}
                isSelectMode={isSelectMode}
                onToggleSelect={() => toggleSelectId(f.messageId)}
                onClick={() => setSelectedIndex(initialFiles.indexOf(f))} 
                onQuickDownload={() => handleDownloadSingle(f)}
                onQuickDelete={() => setDeleteModalState({ open: true, filesToDelete: [f] })}
              />
            ))}
          </div>
        </div>
      ))}

      {/* List View */}
      {viewMode === 'list' && filteredAndSortedFiles.length > 0 && (
        <div className="file-list-view">
          {filteredAndSortedFiles.map((f) => {
            const size = formatBytes(f.size);
            const dateStr = new Date(f.date * 1000).toLocaleDateString(undefined, { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            });

            return (
              <div 
                key={f.messageId} 
                className="file-list-item"
                onClick={() => {
                  if (isSelectMode) toggleSelectId(f.messageId);
                  else setSelectedIndex(initialFiles.indexOf(f));
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, flex: 1 }}>
                  {isSelectMode && (
                    <input 
                      type="checkbox" 
                      checked={selectedIds.has(f.messageId)}
                      onChange={() => toggleSelectId(f.messageId)}
                      style={{ cursor: 'pointer' }}
                    />
                  )}
                  
                  {/* Category Icon */}
                  <div style={{ 
                    width: '38px', 
                    height: '38px', 
                    borderRadius: '10px', 
                    background: 'var(--surface-secondary)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {f.category === 'video' ? <IconVideo size={18} color="var(--accent-video)" /> :
                     f.category === 'audio' ? <IconMusic size={18} color="var(--accent-audio)" /> :
                     f.category === 'document' ? <IconFileText size={18} color="var(--accent-doc)" /> :
                     f.category === 'archive' ? <IconArchive size={18} color="var(--accent-other)" /> :
                     <IconImage size={18} color="var(--primary)" />}
                  </div>

                  {/* File name & category */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ 
                      fontWeight: 700, 
                      fontSize: '13px', 
                      color: 'var(--text)', 
                      whiteSpace: 'nowrap', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis' 
                    }}>
                      {f.name}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', gap: '8px', marginTop: '2px' }}>
                      <span className={`badge badge-${f.category === 'image' ? 'photo' : f.category}`}>
                        {f.category.toUpperCase()}
                      </span>
                      <span>{dateStr}</span>
                    </div>
                  </div>
                </div>

                {/* Right metadata & actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)', minWidth: '70px', textAlign: 'right' }}>
                    {size.val} {size.unit}
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDownloadSingle(f); }}
                      style={{ 
                        background: 'var(--accent)', 
                        border: 'none', 
                        color: 'var(--primary)', 
                        padding: '6px 10px', 
                        borderRadius: '8px', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Download file"
                    >
                      <IconDownload size={14} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setDeleteModalState({ open: true, filesToDelete: [f] }); }}
                      style={{ 
                        background: 'rgba(239, 68, 68, 0.1)', 
                        border: 'none', 
                        color: 'var(--error)', 
                        padding: '6px 10px', 
                        borderRadius: '8px', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Delete file"
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Action Bar for Multi-select */}
      {isSelectMode && selectedIds.size > 0 && (
        <div className="floating-action-bar">
          <span style={{ fontSize: '13px', fontWeight: 800 }}>
            {selectedIds.size} {selectedIds.size === 1 ? 'file' : 'files'} selected
          </span>
          <button 
            onClick={selectAll} 
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--primary)', 
              fontWeight: 800, 
              fontSize: '11px', 
              cursor: 'pointer' 
            }}
          >
            SELECT ALL
          </button>
          <button 
            onClick={deselectAll} 
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--text-muted)', 
              fontWeight: 800, 
              fontSize: '11px', 
              cursor: 'pointer' 
            }}
          >
            DESELECT
          </button>

          <button 
            onClick={handleBatchDownload} 
            disabled={batchDownloading}
            style={{ 
              background: 'var(--primary)', 
              color: 'white', 
              border: 'none', 
              padding: '8px 18px', 
              borderRadius: '100px', 
              fontWeight: 800, 
              fontSize: '11px', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <IconDownload size={13} />
            {batchDownloading ? 'DOWNLOADING...' : 'DOWNLOAD'}
          </button>

          <button 
            onClick={() => {
              const toDelete = filteredAndSortedFiles.filter(f => selectedIds.has(f.messageId));
              setDeleteModalState({ open: true, filesToDelete: toDelete });
            }} 
            style={{ 
              background: 'var(--error)', 
              color: 'white', 
              border: 'none', 
              padding: '8px 18px', 
              borderRadius: '100px', 
              fontWeight: 800, 
              fontSize: '11px', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <IconTrash size={13} />
            DELETE
          </button>
        </div>
      )}

      {/* Load More Media Button */}
      {filteredAndSortedFiles.length > 0 && (
        <div style={{ textAlign: 'center', padding: '50px 0 20px 0', width: '100%', display: 'flex', justifyContent: 'center' }}>
          <button 
            onClick={(e) => { e.preventDefault(); onLoadMore(); }} 
            disabled={loadingMore}
            style={{ 
              background: 'var(--primary)', 
              color: 'white', 
              border: 'none', 
              padding: '14px 44px', 
              borderRadius: '100px', 
              fontWeight: 800, 
              fontSize: '12px', 
              letterSpacing: '0.5px',
              cursor: 'pointer',
              boxShadow: '0 10px 25px rgba(99, 102, 241, 0.3)',
              opacity: loadingMore ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {loadingMore ? <IconRefresh size={16} className="spin" /> : <IconSparkles size={16} />}
            {loadingMore ? 'PULLING NODES...' : 'LOAD MORE MEDIA'}
          </button>
        </div>
      )}

      {/* Media Viewer Lightbox */}
      {selectedIndex !== null && (
        <MediaViewer 
          files={initialFiles} 
          currentIndex={selectedIndex} 
          onClose={() => setSelectedIndex(null)} 
          onIndexChange={setSelectedIndex}
          onDelete={async (id: number) => { 
            const f = initialFiles.find(x => x.messageId === id);
            await deleteFileFromTelegram(id); 
            if (f) onFileDeleted?.(id, f.size, f.category);
            setSelectedIndex(null); 
            showToast('File deleted from Telegram Cloud');
          }}
          onDownload={handleDownloadSingle}
        />
      )}
    </div>
  );
};

export default CloudGallery;
