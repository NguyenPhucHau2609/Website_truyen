import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getChapter, getChaptersByStory, getStory, getCommentsByChapter, createComment, saveReadingHistory } from '../services/api';

export default function ChapterReader() {
  const { storyId, chapterId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [story, setStory] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  // Novel reader settings
  const [fontSize, setFontSize] = useState(18);
  const [fontFamily, setFontFamily] = useState('Georgia');
  const [bgColor, setBgColor] = useState('#1a1a2e');
  const [textColor, setTextColor] = useState('#e0e0e0');
  const [lineHeight, setLineHeight] = useState(1.8);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    loadChapter();
  }, [chapterId]);

  const loadChapter = async () => {
    setLoading(true);
    try {
      const [chRes, sRes, chsRes, cmRes] = await Promise.all([
        getChapter(chapterId), getStory(storyId), getChaptersByStory(storyId), getCommentsByChapter(chapterId)
      ]);
      setChapter(chRes.data);
      setStory(sRes.data);
      setChapters(chsRes.data);
      setComments(cmRes.data);
      if (user) saveReadingHistory({ storyId, chapterId }).catch(() => {});
      // Save to localStorage for read tracking on story cards
      try {
        const readChapters = JSON.parse(localStorage.getItem('readChapters') || '[]');
        if (!readChapters.includes(chapterId)) {
          readChapters.push(chapterId);
          localStorage.setItem('readChapters', JSON.stringify(readChapters));
        }
      } catch {}
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const currentIndex = chapters.findIndex(c => c.id === chapterId);
  const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const nextChapter = currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;
  const isManga = story?.type === 'MANGA';

  const handleComment = async () => {
    if (!user) return alert('Vui lòng đăng nhập!');
    if (!newComment.trim()) return;
    await createComment({ storyId, chapterId, content: newComment });
    setNewComment('');
    const cmRes = await getCommentsByChapter(chapterId);
    setComments(cmRes.data);
  };

  if (loading) return <div className="loading"><div className="spinner" />Đang tải...</div>;
  if (!chapter || !story) return <div className="container"><p>Không tìm thấy chương.</p></div>;

  return (
    <div style={{ minHeight: '100vh', background: isManga ? '#0a0a0a' : bgColor }}>
      {/* Top Navigation */}
      <div style={{
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', padding: '0.75rem 1rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem',
        position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <Link to={`/story/${storyId}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '0.85rem' }}>
          ← {story.title}
        </Link>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select value={chapterId} onChange={e => navigate(`/story/${storyId}/chapter/${e.target.value}`)}
            style={{ padding: '0.3rem 0.5rem', borderRadius: '6px', background: '#2a2a3a', color: '#fff', border: '1px solid #444', fontSize: '0.8rem' }}>
            {chapters.map(ch => (
              <option key={ch.id} value={ch.id}>Ch.{ch.chapterNumber}: {ch.title}</option>
            ))}
          </select>
          {!isManga && (
            <button onClick={() => setShowSettings(!showSettings)}
              style={{ background: showSettings ? 'var(--accent)' : '#2a2a3a', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem' }}>
              ⚙️
            </button>
          )}
        </div>
      </div>

      {/* Novel Settings Panel */}
      {showSettings && !isManga && (
        <div style={{
          background: 'rgba(20,20,30,0.95)', padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', fontSize: '0.8rem'
        }}>
          <label style={{ color: '#ccc' }}>Cỡ chữ: <input type="range" min="14" max="28" value={fontSize} onChange={e => setFontSize(+e.target.value)} /> {fontSize}px</label>
          <label style={{ color: '#ccc' }}>Dãn dòng: <input type="range" min="1.2" max="3" step="0.1" value={lineHeight} onChange={e => setLineHeight(+e.target.value)} /> {lineHeight}</label>
          <label style={{ color: '#ccc' }}>Font:
            <select value={fontFamily} onChange={e => setFontFamily(e.target.value)} style={{ marginLeft: '4px', padding: '2px 6px', background: '#2a2a3a', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}>
              <option value="Georgia">Georgia</option>
              <option value="Inter">Inter</option>
              <option value="serif">Serif</option>
              <option value="monospace">Monospace</option>
            </select>
          </label>
          <label style={{ color: '#ccc' }}>Nền: <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} /></label>
          <label style={{ color: '#ccc' }}>Chữ: <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} /></label>
        </div>
      )}

      {/* Chapter Title */}
      <div style={{ textAlign: 'center', padding: '1.5rem 1rem 0.5rem', color: '#fff' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Chương {chapter.chapterNumber}: {chapter.title}</h2>
        <span style={{
          padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700,
          background: isManga ? 'rgba(255,179,71,0.2)' : 'rgba(108,99,255,0.2)',
          color: isManga ? 'var(--warning)' : 'var(--accent)'
        }}>{isManga ? '🎨 Truyện Tranh' : '📝 Light Novel'}</span>
      </div>

      {/* Content */}
      <div style={{ maxWidth: isManga ? '900px' : '750px', margin: '0 auto', padding: '1rem' }}>
        {isManga ? (
          /* === MANGA READER: Image Pages === */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            {chapter.pages && chapter.pages.length > 0 ? (
              chapter.pages.map((page, idx) => (
                <img key={idx} src={page} alt={`Trang ${idx + 1}`}
                  style={{ width: '100%', maxWidth: '900px', display: 'block', borderRadius: '2px' }}
                  loading="lazy"
                  onError={e => { e.target.style.display = 'none'; }}
                />
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎨</div>
                <p>Chương này chưa có hình ảnh.</p>
              </div>
            )}
          </div>
        ) : (
          /* === NOVEL READER: Text Content === */
          <div style={{
            fontSize: `${fontSize}px`, fontFamily: fontFamily, color: textColor,
            lineHeight: lineHeight, whiteSpace: 'pre-wrap', textAlign: 'justify',
            padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px'
          }}>
            {chapter.content || 'Chương này chưa có nội dung.'}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', padding: '1.5rem', flexWrap: 'wrap' }}>
        {prevChapter && (
          <Link to={`/story/${storyId}/chapter/${prevChapter.id}`} className="btn btn-outline" style={{ minWidth: '140px', textAlign: 'center' }}>← Chương trước</Link>
        )}
        <Link to={`/story/${storyId}`} className="btn btn-outline">📚 Danh sách</Link>
        {nextChapter && (
          <Link to={`/story/${storyId}/chapter/${nextChapter.id}`} className="btn btn-primary" style={{ minWidth: '140px', textAlign: 'center' }}>Chương tiếp →</Link>
        )}
      </div>

      {/* Comments */}
      <div style={{ maxWidth: '750px', margin: '0 auto', padding: '1rem' }}>
        <div className="card">
          <h3>💬 Bình luận chương ({comments.length})</h3>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', marginTop: '0.75rem' }}>
            <input className="form-control" style={{ flex: 1 }} placeholder="Viết bình luận..." value={newComment} onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleComment()} />
            <button className="btn btn-primary" onClick={handleComment}>Gửi</button>
          </div>
          {comments.map(c => (
            <div key={c.id} style={{ padding: '0.6rem', borderBottom: '1px solid var(--border)', marginBottom: '0.4rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.2rem' }}>
                <strong style={{ color: 'var(--accent)', fontSize: '0.85rem' }}>{c.username || 'Ẩn danh'}</strong>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{new Date(c.createdAt).toLocaleString('vi-VN')}</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>{c.content}</p>
            </div>
          ))}
          {comments.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>Chưa có bình luận cho chương này.</p>}
        </div>
      </div>
    </div>
  );
}
