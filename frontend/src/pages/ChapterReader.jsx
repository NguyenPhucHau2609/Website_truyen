import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  createComment,
  getChapter,
  getChaptersByStory,
  getCommentsByStory,
  getStory,
  saveReadingHistory,
} from '../services/api';

export default function ChapterReader() {
  const { storyId, chapterId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { themeKey } = useTheme();

  const [story, setStory] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [comments, setComments] = useState([]);
  const [page, setPage] = useState(1);
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
        getCommentsByStory(storyId),
      ]);
      setChapter(chRes.data);
      setStory(sRes.data);
      setChapters(chsRes.data);
      setComments(cmRes.data);
      setPage(1);
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
    await createComment({ storyId, chapterId, chapterNumber: chapter?.chapterNumber, content: newComment });
    setNewComment('');
    const cmRes = await getCommentsByStory(storyId);
    setComments(cmRes.data);
    setPage(1);
  };

  if (loading) return <div className="loading"><div className="spinner" />Dang tai...</div>;
  if (!chapter || !story) return <div className="container"><p>Khong tim thay chuong.</p></div>;

  return (
    <div style={{ minHeight: '100vh', background: isManga ? 'var(--bg-primary)' : bgColor, transition: 'background 0.25s ease' }}>
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
          /* === MANGA READER: Image Pages === */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            {chapter.pages && chapter.pages.length > 0 ? (
              chapter.pages.map((page, idx) => (
                <img
                  key={idx}
                  src={page}
                  alt={`Trang ${idx + 1}`}
                  style={{ width: '100%', maxWidth: '900px', display: 'block', borderRadius: '2px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                  loading="lazy"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
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

      {/* Comments */}
      <div style={{ maxWidth: '750px', margin: '0 auto', padding: '1rem' }}>
        <div className="card">
          <h3>💬 Binh luan truyen ({comments.length})</h3>
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
          {(() => {
            const pageSize = 10;
            const totalPages = Math.max(1, Math.ceil(comments.length / pageSize));
            const safePage = Math.min(page, totalPages);
            const start = (safePage - 1) * pageSize;
            const current = comments.slice(start, start + pageSize);
            return (
              <>
                {current.map((c) => (
                  <div key={c.id} style={{ padding: '0.8rem', borderBottom: '1px solid var(--border)', marginBottom: '0.4rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <strong style={{ color: 'var(--accent)', fontSize: '0.9rem' }}>{c.username || 'An danh'}</strong>
                      {c.chapterNumber && (
                        <span style={{
                          background: 'var(--bg-card)',
                          color: 'var(--accent)',
                          borderRadius: '999px',
                          padding: '0.1rem 0.55rem',
                          fontSize: '0.72rem',
                          border: '1px solid var(--border)'
                        }}>
                          Chuong {c.chapterNumber}
                        </span>
                      )}
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{new Date(c.createdAt).toLocaleString('vi-VN')}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{c.content}</p>
                  </div>
                ))}
                {comments.length > pageSize && (
                  <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-outline"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                      disabled={safePage === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      ←
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        className={`btn ${p === safePage ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      className="btn btn-outline"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                      disabled={safePage === totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      →
                    </button>
                  </div>
                )}
              </>
            );
          })()}
          {comments.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>Chua co binh luan nao cho truyen nay.</p>}
        </div>
      </div>
    </div>
  );
}
