import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getReadingHistory,
  getBookmarks,
  deleteBookmark,
  deleteReadingHistoryItem,
  getStory,
  getChapter,
  getFollowedStories,
  getChaptersByStory,
} from '../services/api';

// Helper: lấy danh sách chương đã đọc từ localStorage
function getReadChapters() {
  try {
    return JSON.parse(localStorage.getItem('readChapters') || '[]');
  } catch {
    return [];
  }
}

// Helper: kiểm tra ID MongoDB hợp lệ (24 ký tự hex)
function isValidMongoId(id) {
  return id && typeof id === 'string' && /^[a-f\d]{24}$/i.test(id);
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
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'history');
  const [history, setHistory] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [followedStories, setFollowedStories] = useState([]);
  const [chaptersMap, setChaptersMap] = useState({});
  const [storyCache, setStoryCache] = useState({});
  const [chapterCache, setChapterCache] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Đợi AuthContext load xong trước khi kiểm tra user
    if (authLoading) return;
    
    if (!user) {
      navigate('/login');
      return;
    }
    loadData();
  }, [user, authLoading]);

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

      // Lọc chỉ các storyId hợp lệ
      const storyIds = Array.from(
        new Set([
          ...hRes.data.map((h) => h.storyId).filter(isValidMongoId),
          ...bRes.data.map((b) => b.storyId).filter(isValidMongoId),
        ])
      );

      const storyResults = await Promise.all(
        storyIds.map((sid) =>
          getStory(sid)
            .then((res) => ({ sid, data: res.data }))
            .catch((err) => {
              // Im lặng xử lý lỗi cho truyện không tồn tại
              return { sid, data: { title: 'Truyện không tồn tại', id: sid } };
            })
        )
      );

      const cache = {};
      storyResults.forEach(({ sid, data }) => {
        cache[sid] = data;
      });
      setStoryCache(cache);

      // Lọc chỉ các chapterId hợp lệ
      const chapterIds = Array.from(
        new Set([
          ...hRes.data.map((h) => h.chapterId).filter(isValidMongoId),
          ...bRes.data.map((b) => b.chapterId).filter(isValidMongoId),
        ])
      );

      if (chapterIds.length > 0) {
        const chResults = await Promise.all(
          chapterIds.map((cid) =>
            getChapter(cid)
              .then((res) => ({ cid, data: res.data }))
              .catch(() => ({ cid, data: null }))
          )
        );
        const chCache = {};
        chResults.forEach(({ cid, data }) => {
          chCache[cid] = data;
        });
        setChapterCache(chCache);
      } else {
        setChapterCache({});
      }

      const fRes = await getFollowedStories();
      setFollowedStories(fRes.data);

      if (fRes.data.length > 0) {
        const chResults = await Promise.all(
          fRes.data.map((s) =>
            getChaptersByStory(s.id)
              .then((r) => ({ storyId: s.id, chapters: r.data }))
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
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleDeleteBookmark = async (id) => {
    await deleteBookmark(id);
    setBookmarks(bookmarks.filter((b) => b.id !== id));
  };

  const handleDeleteHistory = async (id) => {
    await deleteReadingHistoryItem(id);
    setHistory(history.filter((h) => h.id !== id));
  };

  if (!user) return null;

  return (
    <div className="container">
      <div className="profile-header">
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.username}
            className="profile-avatar-img"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="profile-avatar">{user.username?.[0]?.toUpperCase()}</div>
        )}
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{user.username}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{user.email}</p>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            {user.roles?.map((r) => (
              <span key={r} className="category-tag">
                {r.replace('ROLE_', '')}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab ${tab === 'history' ? 'active' : ''}`}
          onClick={() => setTab('history')}
        >
          Lịch sử đọc ({history.length})
        </button>
        <button
          className={`tab ${tab === 'bookmarks' ? 'active' : ''}`}
          onClick={() => setTab('bookmarks')}
        >
          Bookmark ({bookmarks.length})
        </button>
        <button
          className={`tab ${tab === 'following' ? 'active' : ''}`}
          onClick={() => setTab('following')}
        >
          Theo dõi ({followedStories.length})
        </button>
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner" />
          Đang tải...
        </div>
      ) : (
        <>
          {tab === 'history' && (
            <div>
              {history.length > 0 ? (
                <div className="story-grid">
                  {history.map((h) => {
                    const story = storyCache[h.storyId] || {};
                    const chapter = h.chapterId ? chapterCache[h.chapterId] : null;
                    const actionLink = h.chapterId
                      ? `/story/${h.storyId}/chapter/${h.chapterId}`
                      : `/story/${h.storyId}`;
                    return (
                      <LibraryStoryCard
                        key={h.id}
                        story={story}
                        chapter={chapter}
                        timestampLabel={`Đọc lần cuối ${formatTimeAgo(h.lastReadAt)}`}
                        actionHref={actionLink}
                        actionLabel={
                          chapter ? `Tiếp tục Ch.${chapter?.chapterNumber || ''}` : 'Tiếp tục đọc'
                        }
                        onDelete={() => handleDeleteHistory(h.id)}
                        deleteLabel="Xóa lịch sử"
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="card">
                  <div className="empty-state">
                    <p>Chưa có lịch sử đọc.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'bookmarks' && (
            <div>
              {bookmarks.length > 0 ? (
                <div className="story-grid">
                  {bookmarks.map((b) => {
                    const story = storyCache[b.storyId] || {};
                    const chapter = b.chapterId ? chapterCache[b.chapterId] : null;
                    const actionLink = b.chapterId
                      ? `/story/${b.storyId}/chapter/${b.chapterId}`
                      : `/story/${b.storyId}`;
                    return (
                      <LibraryStoryCard
                        key={b.id}
                        story={story}
                        chapter={chapter}
                        note={b.note}
                        timestampLabel={`Đánh dấu ${formatTimeAgo(b.createdAt)}`}
                        actionHref={actionLink}
                        actionLabel="Đọc ngay"
                        onDelete={() => handleDeleteBookmark(b.id)}
                        deleteLabel="Gỡ bookmark"
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="card">
                  <div className="empty-state">
                    <p>Chưa có bookmark nào.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'following' &&
            (followedStories.length > 0 ? (
              <div className="story-grid">
                {followedStories.map((story) => (
                  <FollowedStoryCard
                    key={story.id}
                    story={story}
                    chapters={chaptersMap[story.id] || []}
                  />
                ))}
              </div>
            ) : (
              <div className="card">
                <div className="empty-state">
                  <p>Chưa theo dõi truyện nào.</p>
                </div>
              </div>
            ))}
        </>
      )}
    </div>
  );
}

function FollowedStoryCard({ story, chapters }) {
  const readChapters = getReadChapters();
  const recentChapter = chapters?.[0];
  const actionHref = recentChapter
    ? `/story/${story.id}/chapter/${recentChapter.id}`
    : `/story/${story.id}`;

  return (
    <div className="story-card">
      <Link to={`/story/${story.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div className="story-cover">
          {story.coverImage ? (
            <img
              src={story.coverImage}
              alt={story.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            '📚'
          )}
        </div>
        <div className="story-info">
          <h3>{story.title}</h3>
          <div className="story-meta">
            <span
              style={{
                padding: '0.15rem 0.4rem',
                borderRadius: '4px',
                fontSize: '0.65rem',
                fontWeight: 700,
                background:
                  story.type === 'MANGA' ? 'var(--badge-manga-bg)' : 'var(--badge-novel-bg)',
                color: story.type === 'MANGA' ? 'var(--warning)' : 'var(--accent)',
              }}
            >
              {story.type === 'MANGA' ? '🎨 Manga' : '📖 Novel'}
            </span>
            <span>Views {story.views || 0}</span>
            <span>Rating {story.averageRating || 0}</span>
          </div>
          {recentChapter && (
            <div className="story-meta" style={{ marginTop: 6, fontSize: '0.82rem' }}>
              <strong>Ch.{recentChapter.chapterNumber}</strong> · {recentChapter.title}
            </div>
          )}
        </div>
      </Link>

      {chapters.length > 0 && (
        <div className="story-card-chapters">
          {chapters.map((ch) => {
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

      <div className="story-card-footer">
        <div className="story-footer-left">
          {recentChapter && (
            <span className="muted">Cập nhật {formatTimeAgo(recentChapter.createdAt)}</span>
          )}
        </div>
        <div className="story-actions">
          <Link to={actionHref} className="btn btn-sm btn-primary">
            {recentChapter ? `Đọc Ch.${recentChapter.chapterNumber}` : 'Xem truyện'}
          </Link>
        </div>
      </div>
    </div>
  );
}

function LibraryStoryCard({
  story,
  chapter,
  actionHref,
  actionLabel,
  timestampLabel,
  note,
  onDelete,
  deleteLabel,
}) {
  const isManga = story?.type === 'MANGA';
  return (
    <div className="story-card">
      <Link
        to={story?.id ? `/story/${story.id}` : '#'}
        style={{ textDecoration: 'none', color: 'inherit' }}
      >
        <div className="story-cover">
          {story?.coverImage ? (
            <img
              src={story.coverImage}
              alt={story?.title || 'Truyện'}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            'Không có ảnh'
          )}
        </div>
        <div className="story-info">
          <h3>{story?.title || 'Truyện không tồn tại'}</h3>
          <div className="story-meta">
            <span
              style={{
                padding: '0.15rem 0.4rem',
                borderRadius: '4px',
                fontSize: '0.65rem',
                fontWeight: 700,
                background: isManga ? 'var(--badge-manga-bg)' : 'var(--badge-novel-bg)',
                color: isManga ? 'var(--warning)' : 'var(--accent)',
              }}
            >
              {isManga ? '[Manga]' : '[Novel]'}
            </span>
            <span>Views {story?.views || 0}</span>
            <span>Rating {story?.averageRating || 0}</span>
          </div>
          {chapter && (
            <div className="story-meta" style={{ marginTop: 6, fontSize: '0.82rem' }}>
              <strong>Ch.{chapter.chapterNumber}</strong> - {chapter.title}
            </div>
          )}
          {note && <div className="story-note">{note}</div>}
        </div>
      </Link>
      <div className="story-card-footer">
        <div className="story-footer-left">
          {timestampLabel && <span className="muted">{timestampLabel}</span>}
        </div>
        <div className="story-actions">
          <Link to={actionHref} className="btn btn-sm btn-primary">
            {actionLabel}
          </Link>
          <button className="btn btn-sm btn-outline" onClick={onDelete}>
            {deleteLabel}
          </button>
        </div>
      </div>
    </div>
  );
}