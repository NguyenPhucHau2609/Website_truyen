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

  useEffect(() => {
    getCommentsByPage(chapterId, pageIndex)
      .then(res => setCommentCount(res.data.length))
      .catch(() => {});
  }, [chapterId, pageIndex]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getCommentsByPage(chapterId, pageIndex);
      setComments(res.data);
      setCommentCount(res.data.length);
    } catch {}
    setLoading(false);
  };

  const toggle = (e) => {
    e.stopPropagation();
    const next = !open;
    setOpen(next);
    if (next) load();
  };

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
    await createComment({ storyId, chapterId, pageIndex, content: text });
    setText('');
    await load();
  };

  return (
    <>
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
          fontSize: '1.1rem',
          zIndex: 10,
        }}
      >
        💬
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
          }}>
            {commentCount > 99 ? '99+' : commentCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: '60px',
            right: '12px',
            width: '340px',
            maxHeight: '420px',
            background: 'rgba(22,22,30,0.95)',
            borderRadius: '16px',
            zIndex: 20,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '0.7rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            💬 Bình luận trang {pageIndex + 1}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0.6rem' }}>
            {loading ? 'Đang tải...' :
              comments.length === 0 ? 'Chưa có bình luận' :
                comments.map(c => (
                  <div key={c.id}>
                    <strong>{c.username}</strong>
                    <p>{c.content}</p>
                  </div>
                ))
            }
          </div>

          <div style={{ display: 'flex', padding: '0.5rem' }}>
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              style={{ flex: 1 }}
            />
            <button onClick={submit}>Gửi</button>
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
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadChapter(); }, [chapterId]);

  const loadChapter = async () => {
    setLoading(true);
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
    setLoading(false);
  };

  if (loading) return <div>Đang tải...</div>;
  if (!chapter || !story) return <div>Không tìm thấy chương</div>;

  return (
    <div>
      <h2>Chương {chapter.chapterNumber}: {chapter.title}</h2>

      {story.type === 'MANGA' && (
        <div>
          {chapter.pages.map((page, idx) => (
            <div key={idx} style={{ position: 'relative', maxWidth: 900, margin: '0 auto' }}>
              <img src={page} alt="" style={{ width: '100%' }} />
              <PageCommentPanel
                storyId={storyId}
                chapterId={chapterId}
                pageIndex={idx}
                user={user}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}