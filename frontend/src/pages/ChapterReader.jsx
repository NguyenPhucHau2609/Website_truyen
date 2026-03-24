import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  createComment,
  getChapter,
  getChaptersByStory,
  getCommentsByChapter,
  getCommentsByPage,
  getStory,
  saveReadingHistory,
} from '../services/api';

/* ═══════════════════════════════════════════
   Page Comment Panel – floating icon on image
   ═══════════════════════════════════════════ */
function PageCommentPanel({ storyId, chapterId, pageIndex, user }) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getCommentsByPage(chapterId, pageIndex);
      setComments(res.data);
      setCommentCount(res.data.length);
    } catch { }
    setLoading(false);
  };

  const toggle = (e) => {
    e.stopPropagation();
    const next = !open;
    setOpen(next);
    if (next) load();
  };

  /* Close when clicking outside */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const submit = async () => {
    if (!user) return alert('Vui lòng đăng nhập để bình luận!');
    if (!text.trim()) return;
    try {
      await createComment({ storyId, chapterId, pageIndex, content: text });
      setText('');
      await load();
    } catch (e) { console.error(e); }
  };

  return (
    <>
      {/* ── Floating icon button on bottom-right of image ── */}
      <button
        onClick={toggle}
        title={`Bình luận trang ${pageIndex + 1}`}
        style={{
          position: 'absolute',
          bottom: '12px',
          right: '12px',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: 'none',
          background: open
            ? 'linear-gradient(135deg, #6366f1, #a855f7)'
            : 'rgba(30, 30, 40, 0.75)',
          backdropFilter: 'blur(10px)',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.1rem',
          boxShadow: open
            ? '0 0 16px rgba(99,102,241,0.5)'
            : '0 2px 12px rgba(0,0,0,0.4)',
          transition: 'all 0.25s ease',
          zIndex: 10,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.15)';
          e.currentTarget.style.boxShadow = '0 0 18px rgba(99,102,241,0.6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = open
            ? '0 0 16px rgba(99,102,241,0.5)'
            : '0 2px 12px rgba(0,0,0,0.4)';
        }}
      >
        💬
        {/* Badge for comment count */}
        {commentCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            minWidth: '18px',
            height: '18px',
            borderRadius: '9px',
            background: 'linear-gradient(135deg, #ef4444, #f97316)',
            color: '#fff',
            fontSize: '0.6rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            boxShadow: '0 2px 6px rgba(239,68,68,0.5)',
          }}>
            {commentCount > 99 ? '99+' : commentCount}
          </span>
        )}
      </button>

      {/* ── Slide-out comment panel ── */}
      {open && (
        <div
          ref={panelRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: '60px',
            right: '12px',
            width: '340px',
            maxWidth: 'calc(100% - 24px)',
            maxHeight: '420px',
            background: 'rgba(22, 22, 30, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
            zIndex: 20,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'fadeSlideUp 0.25s ease',
          }}
        >
          {/* Panel header */}
          <div style={{
            padding: '0.7rem 1rem',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0' }}>
              💬 Bình luận trang {pageIndex + 1}
            </span>
            <button
              onClick={toggle}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '1.1rem',
                lineHeight: 1,
                padding: '2px',
              }}
            >✕</button>
          </div>

          {/* Comment list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.6rem 0.85rem' }}>
            {loading ? (
              <p style={{ color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center', margin: '1rem 0' }}>Đang tải...</p>
            ) : comments.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '0.8rem', textAlign: 'center', margin: '1rem 0' }}>Chưa có bình luận nào.</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} style={{
                  padding: '0.5rem 0',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}>
                  <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'baseline', marginBottom: '2px' }}>
                    <strong style={{ color: '#a78bfa', fontSize: '0.78rem' }}>{c.username || 'Ẩn danh'}</strong>
                    <span style={{ fontSize: '0.6rem', color: '#64748b' }}>{new Date(c.createdAt).toLocaleString('vi-VN')}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.4 }}>{c.content}</p>
                </div>
              ))
            )}
          </div>

          {/* Input row */}
          <div style={{
            padding: '0.6rem 0.85rem',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            gap: '0.4rem',
          }}>
            <input
              ref={inputRef}
              style={{
                flex: 1,
                fontSize: '0.82rem',
                padding: '0.45rem 0.7rem',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.06)',
                color: '#e2e8f0',
                outline: 'none',
                transition: 'border 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = '#6366f1'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              placeholder="Viết bình luận..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
            <button
              onClick={submit}
              style={{
                padding: '0.4rem 0.7rem',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                color: '#fff',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'opacity 0.2s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >Gửi</button>
          </div>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════
   Main Chapter Reader
   ═══════════════════════════════════════════ */
export default function ChapterReader() {
  const { storyId, chapterId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { themeKey } = useTheme();

  const [story, setStory] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  // Reader settings
  const [fontSize, setFontSize] = useState(18);
  const [fontFamily, setFontFamily] = useState('Georgia');
  const [bgColor, setBgColor] = useState('');
  const [textColor, setTextColor] = useState('');
  const [lineHeight, setLineHeight] = useState(1.8);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    loadChapter();
  }, [chapterId]);

  useEffect(() => {
    const getVar = (name, fallback) => {
      if (typeof window === 'undefined') return fallback;
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    };
    setBgColor(getVar('--bg-card', '#ffffff'));
    setTextColor(getVar('--text-primary', '#0f172a'));
  }, [themeKey]);

  const loadChapter = async () => {
    setLoading(true);
    try {
      const [chRes, sRes, chsRes, cmRes] = await Promise.all([
        getChapter(chapterId),
        getStory(storyId),
        getChaptersByStory(storyId),
        getCommentsByChapter(chapterId),
      ]);
      setChapter(chRes.data);
      setStory(sRes.data);
      setChapters(chsRes.data);
      setComments(cmRes.data);
      if (user) saveReadingHistory({ storyId, chapterId }).catch(() => {});
      try {
        const readChapters = JSON.parse(localStorage.getItem('readChapters') || '[]');
        if (!readChapters.includes(chapterId)) {
          readChapters.push(chapterId);
          localStorage.setItem('readChapters', JSON.stringify(readChapters));
        }
      } catch {}
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const currentIndex = chapters.findIndex((c) => c.id === chapterId);
  const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const nextChapter = currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;
  const isManga = story?.type === 'MANGA';

  const handleComment = async () => {
    if (!user) return alert('Vui long dang nhap!');
    if (!newComment.trim()) return;
    await createComment({ storyId, chapterId, content: newComment });
    setNewComment('');
    const cmRes = await getCommentsByChapter(chapterId);
    setComments(cmRes.data);
  };

  if (loading) return <div className="loading"><div className="spinner" />Dang tai...</div>;
  if (!chapter || !story) return <div className="container"><p>Khong tim thay chuong.</p></div>;

  return (
    <div style={{ minHeight: '100vh', background: isManga ? 'var(--bg-primary)' : bgColor, transition: 'background 0.25s ease' }}>
      {/* CSS keyframes for panel animation */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Top Navigation */}
      <div style={{
        background: 'var(--bg-header)',
        backdropFilter: 'blur(10px)',
        padding: '0.75rem 1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.5rem',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        borderBottom: '1px solid var(--border)',
      }}>
        <Link to={`/story/${storyId}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600 }}>
          ← {story.title}
        </Link>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select
            value={chapterId}
            onChange={(e) => navigate(`/story/${storyId}/chapter/${e.target.value}`)}
            style={{
              padding: '0.35rem 0.6rem',
              borderRadius: '6px',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              fontSize: '0.85rem',
            }}
          >
            {chapters.map((ch) => (
              <option key={ch.id} value={ch.id}>Ch.{ch.chapterNumber}: {ch.title}</option>
            ))}
          </select>
          {!isManga && (
            <button
              onClick={() => setShowSettings(!showSettings)}
              style={{
                background: showSettings ? 'var(--accent)' : 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '0.35rem 0.65rem',
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              ⚙️
            </button>
          )}
        </div>
      </div>

      {/* Novel Settings Panel */}
      {showSettings && !isManga && (
        <div style={{
          background: 'var(--bg-card)',
          padding: '1rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          justifyContent: 'center',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
        }}>
          <label>Co chu: <input type="range" min="14" max="28" value={fontSize} onChange={(e) => setFontSize(+e.target.value)} /> {fontSize}px</label>
          <label>Dan dong: <input type="range" min="1.2" max="3" step="0.1" value={lineHeight} onChange={(e) => setLineHeight(+e.target.value)} /> {lineHeight}</label>
          <label>Font:
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              style={{
                marginLeft: '4px',
                padding: '2px 6px',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
              }}
            >
              <option value="Georgia">Georgia</option>
              <option value="Inter">Inter</option>
              <option value="serif">Serif</option>
              <option value="monospace">Monospace</option>
            </select>
          </label>
          <label>Nen: <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} /></label>
          <label>Chu: <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} /></label>
        </div>
      )}

      {/* Chapter Title */}
      <div style={{ textAlign: 'center', padding: '1.5rem 1rem 0.5rem', color: 'var(--text-primary)' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Chuong {chapter.chapterNumber}: {chapter.title}</h2>
        <span style={{
          padding: '0.15rem 0.5rem',
          borderRadius: '4px',
          fontSize: '0.7rem',
          fontWeight: 700,
          background: isManga ? 'var(--badge-manga-bg)' : 'var(--badge-novel-bg)',
          color: isManga ? 'var(--warning)' : 'var(--accent)',
        }}>{isManga ? 'Truyen Tranh' : 'Light Novel'}</span>
      </div>

      {/* Content */}
      <div style={{ maxWidth: isManga ? '900px' : '750px', margin: '0 auto', padding: '1rem' }}>
        {isManga ? (
          /* === MANGA READER: Image Pages with floating comment icon === */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            {chapter.pages && chapter.pages.length > 0 ? (
              chapter.pages.map((page, idx) => (
                <div key={idx} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {/* Page wrapper with relative positioning for the floating icon */}
                  <div style={{ position: 'relative', width: '100%', maxWidth: '900px' }}>
                    {/* Page number label */}
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: '0.65rem',
                      color: 'rgba(255,255,255,0.7)',
                      padding: '2px 10px',
                      borderRadius: '10px',
                      background: 'rgba(0,0,0,0.45)',
                      backdropFilter: 'blur(4px)',
                      fontWeight: 600,
                      zIndex: 5,
                      pointerEvents: 'none',
                    }}>
                      Trang {idx + 1} / {chapter.pages.length}
                    </div>

                    {/* Image */}
                    <img
                      src={page}
                      alt={`Trang ${idx + 1}`}
                      style={{ width: '100%', display: 'block', borderRadius: '2px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                      loading="lazy"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />

                    {/* Floating comment icon + panel */}
                    <PageCommentPanel
                      storyId={storyId}
                      chapterId={chapterId}
                      pageIndex={idx}
                      user={user}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎨</div>
                <p>Chuong nay chua co hinh anh.</p>
              </div>
            )}
          </div>
        ) : (
          /* === NOVEL READER: Text Content === */
          <div style={{
            fontSize: `${fontSize}px`,
            fontFamily,
            color: textColor,
            lineHeight,
            whiteSpace: 'pre-wrap',
            textAlign: 'justify',
            padding: '1.5rem',
            background: bgColor,
            borderRadius: '12px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow)',
          }}>
            {chapter.content || 'Chuong nay chua co noi dung.'}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', padding: '1.5rem', flexWrap: 'wrap' }}>
        {prevChapter && (
          <Link to={`/story/${storyId}/chapter/${prevChapter.id}`} className="btn btn-outline" style={{ minWidth: '140px', textAlign: 'center' }}>← Chuong truoc</Link>
        )}
        <Link to={`/story/${storyId}`} className="btn btn-outline">📚 Danh sach</Link>
        {nextChapter && (
          <Link to={`/story/${storyId}/chapter/${nextChapter.id}`} className="btn btn-primary" style={{ minWidth: '140px', textAlign: 'center' }}>Chuong tiep →</Link>
        )}
      </div>

      {/* Chapter-level Comments */}
      <div style={{ maxWidth: '750px', margin: '0 auto', padding: '1rem' }}>
        <div className="card">
          <h3>💬 Binh luan chuong ({comments.length})</h3>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', marginTop: '0.75rem' }}>
            <input
              className="form-control"
              style={{ flex: 1 }}
              placeholder="Viet binh luan..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleComment()}
            />
            <button className="btn btn-primary" onClick={handleComment}>Gui</button>
          </div>
          {comments.map((c) => (
            <div key={c.id} style={{ padding: '0.6rem', borderBottom: '1px solid var(--border)', marginBottom: '0.4rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.2rem' }}>
                <strong style={{ color: 'var(--accent)', fontSize: '0.85rem' }}>{c.username || 'An danh'}</strong>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{new Date(c.createdAt).toLocaleString('vi-VN')}</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>{c.content}</p>
            </div>
          ))}
          {comments.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>Chua co binh luan cho chuong nay.</p>}
        </div>
      </div>
    </div>
  );
}
