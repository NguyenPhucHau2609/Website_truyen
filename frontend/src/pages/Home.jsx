import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getStories, getCategories, getChaptersByStory } from '../services/api';

// Helper: get read chapters from localStorage
function getReadChapters() {
  try {
    return JSON.parse(localStorage.getItem('readChapters') || '[]');
  } catch { return []; }
}

export default function Home() {
  const [trending, setTrending] = useState([]);
  const [newReleases, setNewReleases] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [chaptersMap, setChaptersMap] = useState({}); // storyId -> [chapter, ...]
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getStories(), getCategories()])
      .then(([sRes, cRes]) => {
        const allStories = sRes.data;
        setCategories(cRes.data);

        // Trending: top 8 by views
        const byViews = [...allStories].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 8);
        setTrending(byViews);

        // New Releases: top 8 by updatedAt
        const byDate = [...allStories].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)).slice(0, 8);
        setNewReleases(byDate);

        // Recommendations: top 8 by averageRating
        const byRating = [...allStories].sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0)).slice(0, 8);
        setRecommendations(byRating);

        // Fetch 2 latest chapters per story
        if (allStories.length > 0) {
          Promise.all(
            allStories.map(s =>
              getChaptersByStory(s.id)
                .then(r => ({ storyId: s.id, chapters: r.data }))
                .catch(() => ({ storyId: s.id, chapters: [] }))
            )
          ).then(results => {
            const map = {};
            results.forEach(({ storyId, chapters }) => {
              // Get 2 latest chapters (sorted desc by chapterNumber)
              const sorted = [...chapters].sort((a, b) => b.chapterNumber - a.chapterNumber);
              map[storyId] = sorted.slice(0, 2);
            });
            setChaptersMap(map);
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" />Đang tải...</div>;

  return (
    <div className="container">
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(108,99,255,0.15), rgba(167,139,250,0.1))',
        borderRadius: '16px', padding: '3rem 2rem', textAlign: 'center', marginBottom: '2.5rem',
        border: '1px solid rgba(108,99,255,0.2)'
      }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '0.75rem' }}>📖 Khám phá thế giới truyện</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '600px', margin: '0 auto 1.5rem' }}>
          Truyện tranh & Light Novel — Đọc miễn phí, mọi lúc mọi nơi.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/stories?type=MANGA" className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}>🎨 Truyện Tranh</Link>
          <Link to="/stories?type=NOVEL" className="btn btn-outline" style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}>📝 Light Novel</Link>
        </div>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 className="section-title">📁 Thể loại</h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {categories.map(c => (
              <Link key={c.id} to={`/stories?category=${c.id}`} className="category-tag" style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}>
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 className="section-title">⭐ Đề xuất hay nhất</h2>
          <div className="story-grid">{recommendations.map(s => <StoryCard key={s.id} story={s} chapters={chaptersMap[s.id] || []} />)}</div>
        </div>
      )}

      {/* Hot */}
      {trending.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="section-title">🔥 Truyện hot nhất</h2>
            <Link to="/stories?sort=views" style={{ fontSize: '0.85rem' }}>Xem tất cả →</Link>
          </div>
          <div className="story-grid">{trending.map(s => <StoryCard key={s.id} story={s} chapters={chaptersMap[s.id] || []} />)}</div>
        </div>
      )}

      {/* New Releases */}
      {newReleases.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="section-title">🆕 Truyện mới cập nhật</h2>
            <Link to="/stories?sort=updatedAt" style={{ fontSize: '0.85rem' }}>Xem tất cả →</Link>
          </div>
          <div className="story-grid">{newReleases.map(s => <StoryCard key={s.id} story={s} chapters={chaptersMap[s.id] || []} />)}</div>
        </div>
      )}

      {trending.length === 0 && newReleases.length === 0 && (
        <div className="empty-state"><div className="icon">📚</div><p>Chưa có truyện nào.</p></div>
      )}
    </div>
  );
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

function StoryCard({ story, chapters }) {
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

      {/* 2 Latest Chapters - below title */}
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
