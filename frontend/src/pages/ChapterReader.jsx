import { useEffect, useState, useRef } from 'react';
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

const GIPHY_KEY = import.meta.env.VITE_GIPHY_API_KEY || '';

export default function ChapterReader() {
  const { storyId, chapterId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { themeKey } = useTheme();

  const [story, setStory] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [comments, setComments] = useState([]);
  const [visibleCount, setVisibleCount] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearch, setGifSearch] = useState('');
  const [gifResults, setGifResults] = useState([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [selectedGifUrl, setSelectedGifUrl] = useState(null);
  const [selectedGifSize, setSelectedGifSize] = useState(null);
  const [gifError, setGifError] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const searchTimer = useRef(null);

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
      setVisibleCount(5);
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
  const readerTopOffset = 'var(--header-height, 64px)';

  const handleComment = async () => {
    if (!user) return alert('Vui long dang nhap!');
    if (!newComment.trim() && !selectedGifUrl) return;
    if (selectedGifSize && selectedGifSize > 2 * 1024 * 1024) {
      alert('GIF lớn hơn 2MB, vui lòng chọn GIF nhỏ hơn.');
      return;
    }
    try {
      setSending(true);
      await createComment({
        storyId,
        chapterId,
        chapterNumber: chapter?.chapterNumber,
        content: newComment,
        gifUrl: selectedGifUrl || null,
        gifSize: selectedGifSize || null,
      });
    } catch (e) {
      if (e?.response?.status === 401) {
        alert('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
        setSending(false);
        return;
      }
      setSending(false);
      throw e;
    }
    setNewComment('');
    setSelectedGifUrl(null);
    setSelectedGifSize(null);
    setShowGifPicker(false);
    const cmRes = await getCommentsByStory(storyId);
    setComments(cmRes.data);
    setVisibleCount(5);
    setSending(false);
  };

  const searchGifs = async (keyword) => {
    const q = keyword.trim();
    if (q.startsWith('http') || q.length > 80) {
      setGifError('Từ khóa quá dài hoặc là một URL, hãy nhập từ khóa ngắn.');
      setGifResults([]);
      return;
    }
    setGifError('');
    if (!q) return loadTrendingGifs();
    setGifLoading(true);
    try {
      const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(q)}&limit=12&rating=g`);
      const data = await res.json();
      setGifResults(data.data || []);
    } catch (e) {
      console.error(e);
      setGifError('Không tải được GIF. Thử lại sau.');
    }
    setGifLoading(false);
  };

  const loadTrendingGifs = async () => {
    setGifError('');
    setGifLoading(true);
    try {
      const res = await fetch(`https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=12&rating=g`);
      const data = await res.json();
      setGifResults(data.data || []);
    } catch (e) {
      console.error(e);
      setGifError('Không tải được GIF nổi bật.');
    }
    setGifLoading(false);
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
        gap: '0.75rem 1rem',
        position: 'sticky',
        top: readerTopOffset,
        zIndex: 80,
        borderBottom: '1px solid var(--border)',
      }}>
        <Link to={`/story/${storyId}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600, flex: '1 1 260px', minWidth: 0, maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          ← {story.title}
        </Link>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', flex: '1 1 240px', minWidth: 0, maxWidth: '100%' }}>
          <select
            value={chapterId}
            onChange={(e) => navigate(`/story/${storyId}/chapter/${e.target.value}`)}
            style={{
              flex: '1 1 220px',
              width: '100%',
              minWidth: '180px',
              maxWidth: '320px',
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
                flexShrink: 0,
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
          <label>Cỡ chữ: <input type="range" min="14" max="28" value={fontSize} onChange={(e) => setFontSize(+e.target.value)} /> {fontSize}px</label>
          <label>Dãn dòng: <input type="range" min="1.2" max="3" step="0.1" value={lineHeight} onChange={(e) => setLineHeight(+e.target.value)} /> {lineHeight}</label>
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
          <label>Nền: <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} /></label>
          <label>Chữ: <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} /></label>
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0px' }}>
            {chapter.pages && chapter.pages.length > 0 ? (
              chapter.pages.map((page, idx) => (
                <img
                  key={idx}
                  src={page}
                  alt={`Trang ${idx + 1}`}
                  style={{ width: '100%', maxWidth: '900px', display: 'block', borderRadius: '2px', background: 'var(--bg-card)' }}
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
            <button
              className="btn btn-outline"
              style={{ minWidth: '64px' }}
              onClick={() => {
                setShowGifPicker((v) => !v);
                if (!showGifPicker) {
                  setGifResults([]);
                  setGifSearch('');
                  loadTrendingGifs();
                }
              }}
            >
              GIF
            </button>
            <button className="btn btn-primary" onClick={handleComment} disabled={sending}>Gui</button>
          </div>
          {selectedGifUrl && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
              <img src={selectedGifUrl} alt="gif" style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: '8px' }} />
              <button className="btn btn-outline" onClick={() => { setSelectedGifUrl(null); setSelectedGifSize(null); }}>Xoa GIF</button>
            </div>
          )}
          {showGifPicker && (
            <div style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '0.75rem', marginBottom: '1rem', background: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  className="form-control"
                  placeholder="Tim GIF..."
                  value={gifSearch}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (searchTimer.current) clearTimeout(searchTimer.current);
                    searchTimer.current = setTimeout(() => searchGifs(value), 350);
                    setGifSearch(value);
                  }}
                />
                <button className="btn btn-outline" onClick={() => searchGifs(gifSearch)}>Tim</button>
              </div>
              {gifError && <p style={{ color: 'var(--warning)', margin: '0 0 0.4rem 0' }}>{gifError}</p>}
              {gifLoading && <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Dang tai GIF...</p>}
              {!gifLoading && !gifError && (
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                  {['funny', 'meme', 'wow', 'sad', 'celebrate', 'cute'].map((tag) => (
                    <button
                      key={tag}
                      className="btn btn-outline"
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}
                      onClick={() => { setGifSearch(tag); searchGifs(tag); }}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.4rem', maxHeight: '260px', overflowY: 'auto' }}>
                {gifResults.map((g) => (
                  <div key={g.id} style={{ position: 'relative', width: '100%', height: '90px' }}>
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'var(--bg-card)', border: '1px solid var(--border)',
                      borderRadius: '8px', opacity: 0.4
                    }} />
                    <img
                      src={g.images?.downsized?.url}
                      alt={g.title}
                      loading="lazy"
                      style={{ width: '100%', height: '90px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer', border: selectedGifUrl === g.images?.downsized?.url ? '2px solid var(--accent)' : '1px solid var(--border)' }}
                      onLoad={(e) => { e.currentTarget.previousSibling.style.display = 'none'; }}
                      onClick={() => {
                        const size = parseInt(g.images?.downsized?.size || '0', 10);
                        if (size > 2 * 1024 * 1024) {
                          alert('GIF lớn hơn 2MB, chọn GIF khác.');
                          return;
                        }
                        const probe = new Image();
                        probe.onload = () => {
                          setSelectedGifUrl(g.images?.downsized?.url);
                          setSelectedGifSize(size || null);
                          setShowGifPicker(false);
                        };
                        probe.onerror = () => alert('Không tải được GIF này, thử cái khác.');
                        probe.src = g.images?.downsized?.url;
                      }}
                      onError={(e) => {
                        const fallback = g.images?.downsized?.url;
                        if (fallback && e.target.src !== fallback) e.target.src = fallback;
                      }}
                    />
                  </div>
                ))}
                {!gifLoading && gifResults.length === 0 && gifSearch && <p style={{ color: 'var(--text-secondary)' }}>Khong tim thay GIF.</p>}
              </div>
            </div>
          )}
          {comments.slice(0, visibleCount).map((c) => (
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
              {c.gifUrl && (!c.gifSize || c.gifSize <= 2 * 1024 * 1024) && (
                <img
                  src={c.gifUrl}
                  alt="gif"
                  loading="lazy"
                  style={{
                    marginTop: '0.35rem',
                    width: '180px',
                    height: '120px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    objectFit: 'cover'
                  }}
                  onError={(e) => {
                    if (c.gifUrl && e.target.src !== c.gifUrl) e.target.src = c.gifUrl;
                  }}
                />
              )}
              {c.gifUrl && c.gifSize && c.gifSize > 2 * 1024 * 1024 && (
                <p style={{ marginTop: '0.3rem', fontSize: '0.8rem', color: 'var(--warning)' }}>
                  GIF &gt; 2MB không hiển thị.
                </p>
              )}
            </div>
          ))}
          {comments.length > visibleCount && (
            <button
              className="btn btn-outline"
              style={{ width: '100%', marginTop: '0.5rem' }}
              onClick={() => setVisibleCount((v) => Math.min(comments.length, v + 5))}
            >
              Xem thêm ({comments.length - visibleCount})
            </button>
          )}
          {comments.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>Chua co binh luan nao cho truyen nay.</p>}
        </div>
      </div>
    </div>
  );
}
