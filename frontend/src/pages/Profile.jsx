import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getReadingHistory, getBookmarks, deleteBookmark, deleteReadingHistoryItem, getStory, getFollowedStories, getChaptersByStory } from '../services/api';

// Helper: get read chapters from localStorage
function getReadChapters() {
  try {
    return JSON.parse(localStorage.getItem('readChapters') || '[]');
  } catch { return []; }
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay} ngày trước`;
  return new Date(dateStr).toLocaleDateString('vi-VN');
}

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'history');
  const [history, setHistory] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [followedStories, setFollowedStories] = useState([]);
  const [chaptersMap, setChaptersMap] = useState({});
  const [storyCache, setStoryCache] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    loadData();
  }, [user]);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t) setTab(t);
  }, [searchParams]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [hRes, bRes] = await Promise.all([getReadingHistory(), getBookmarks()]);
      setHistory(hRes.data);
      setBookmarks(bRes.data);

      // Load story titles for history & bookmarks
      const ids = new Set([
        ...hRes.data.map(h => h.storyId),
        ...bRes.data.map(b => b.storyId)
      ]);
      const cache = {};
      for (const sid of ids) {
        try {
          const s = await getStory(sid);
          cache[sid] = s.data;
        } catch (e) { cache[sid] = { title: 'Truyện đã xóa' }; }
      }
      setStoryCache(cache);

      // Load followed stories
      try {
        const fRes = await getFollowedStories();
        setFollowedStories(fRes.data);

        // Fetch 2 latest chapters per followed story
        if (fRes.data.length > 0) {
          const chResults = await Promise.all(
            fRes.data.map(s =>
              getChaptersByStory(s.id)
                .then(r => ({ storyId: s.id, chapters: r.data }))
                .catch(() => ({ storyId: s.id, chapters: [] }))
            )
          );
          const map = {};
          chResults.forEach(({ storyId, chapters }) => {
            const sorted = [...chapters].sort((a, b) => b.chapterNumber - a.chapterNumber);
            map[storyId] = sorted.slice(0, 2);
          });
          setChaptersMap(map);
        }
      } catch (e) { console.error(e); }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleDeleteBookmark = async (id) => {
    await deleteBookmark(id);
    setBookmarks(bookmarks.filter(b => b.id !== id));
  };

  const handleDeleteHistory = async (id) => {
    await deleteReadingHistoryItem(id);
    setHistory(history.filter(h => h.id !== id));
  };

  if (!user) return null;

  return (
    <div className="container">
      <div className="profile-header">
        {user.avatar ? (
          <img src={user.avatar} alt={user.username} className="profile-avatar-img" referrerPolicy="no-referrer" />
        ) : (
          <div className="profile-avatar">{user.username?.[0]?.toUpperCase()}</div>
        )}
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{user.username}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{user.email}</p>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            {user.roles?.map(r => (
              <span key={r} className="category-tag">{r.replace('ROLE_', '')}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
          📚 Lịch sử đọc ({history.length})
        </button>
        <button className={`tab ${tab === 'bookmarks' ? 'active' : ''}`} onClick={() => setTab('bookmarks')}>
          📑 Bookmark ({bookmarks.length})
        </button>
        <button className={`tab ${tab === 'following' ? 'active' : ''}`} onClick={() => setTab('following')}>
          ❤️ Theo dõi ({followedStories.length})
        </button>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" />Đang tải...</div>
      ) : (
        <>
          {tab === 'history' && (
            <div className="card">
              {history.length > 0 ? (
                history.map(h => (
                  <div key={h.id} className="chapter-item">
                    <div>
                      <Link to={`/story/${h.storyId}`} style={{ fontWeight: 600 }}>
                        {storyCache[h.storyId]?.title || 'Đang tải...'}
                      </Link>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        Đọc lần cuối: {new Date(h.lastReadAt).toLocaleString('vi-VN')}
                      </div>
                    </div>
                    <button className="btn btn-sm btn-outline" onClick={() => handleDeleteHistory(h.id)}>✕</button>
                  </div>
                ))
              ) : (
                <div className="empty-state"><p>Chưa có lịch sử đọc.</p></div>
              )}
            </div>
          )}

          {tab === 'bookmarks' && (
            <div className="card">
              {bookmarks.length > 0 ? (
                bookmarks.map(b => (
                  <div key={b.id} className="chapter-item">
                    <div>
                      <Link to={`/story/${b.storyId}`} style={{ fontWeight: 600 }}>
                        {storyCache[b.storyId]?.title || 'Đang tải...'}
                      </Link>
                      {b.note && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{b.note}</div>}
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {new Date(b.createdAt).toLocaleString('vi-VN')}
                      </div>
                    </div>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDeleteBookmark(b.id)}>Xóa</button>
                  </div>
                ))
              ) : (
                <div className="empty-state"><p>Chưa có bookmark nào.</p></div>
              )}
            </div>
          )}

          {tab === 'following' && (
            followedStories.length > 0 ? (
              <div className="story-grid">
                {followedStories.map(story => (
                  <FollowedStoryCard key={story.id} story={story} chapters={chaptersMap[story.id] || []} />
                ))}
              </div>
            ) : (
              <div className="card">
                <div className="empty-state"><p>Chưa theo dõi truyện nào.</p></div>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}

function FollowedStoryCard({ story, chapters }) {
  const readChapters = getReadChapters();

  return (
    <div className="story-card" style={{ textDecoration: 'none', color: 'inherit' }}>
      <Link to={`/story/${story.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div className="story-cover">
          {story.coverImage ? (
            <img src={story.coverImage} alt={story.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : '📖'}
        </div>
        <div className="story-info">
          <h3>{story.title}</h3>
          <div className="story-meta">
            <span style={{
              padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700,
              background: story.type === 'MANGA' ? 'rgba(255,179,71,0.2)' : 'rgba(108,99,255,0.2)',
              color: story.type === 'MANGA' ? 'var(--warning)' : 'var(--accent)'
            }}>{story.type === 'MANGA' ? '🎨 Manga' : '📝 Novel'}</span>
            <span>👁 {story.views || 0}</span>
            <span>⭐ {story.averageRating || 0}</span>
          </div>
        </div>
      </Link>

      {/* 2 Latest Chapters */}
      {chapters.length > 0 && (
        <div className="story-card-chapters">
          {chapters.map(ch => {
            const isRead = readChapters.includes(ch.id);
            return (
              <Link
                key={ch.id}
                to={`/story/${story.id}/chapter/${ch.id}`}
                className={`story-card-chapter ${isRead ? 'read' : 'unread'}`}
                title={`Ch.${ch.chapterNumber}: ${ch.title}`}
              >
                <span className="ch-name">Ch.{ch.chapterNumber}</span>
                <span className="ch-time">{formatTimeAgo(ch.createdAt)}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
