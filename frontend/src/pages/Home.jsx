import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCategories, getChaptersByStory, getTrendingStories, getNewReleases, getRecommendations } from '../services/api';
import { useAuth } from '../context/AuthContext';

function getReadChapters() {
  try {
    return JSON.parse(localStorage.getItem('readChapters') || '[]');
  } catch {
    return [];
  }
}

export default function Home() {
  const { user } = useAuth();
  const [trending, setTrending] = useState([]);
  const [newReleases, setNewReleases] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [chaptersMap, setChaptersMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = user?.id;
    
    Promise.all([
      getTrendingStories(8),
      getNewReleases(8),
      getRecommendations(userId, 8),
      getCategories()
    ])
      .then(([tRes, nRes, rRes, cRes]) => {
        const tStories = tRes.data || [];
        const nStories = nRes.data || [];
        const rStories = rRes.data || [];
        
        setTrending(tStories);
        setNewReleases(nStories);
        setRecommendations(rStories);
        setCategories(cRes.data || []);

        const allVisibleStories = [...tStories, ...nStories, ...rStories];
        const uniqueIds = [...new Set(allVisibleStories.map(s => s.id))];

        // Prefetch latest chapters for visible stories
        Promise.all(
          uniqueIds.map((id) =>
            getChaptersByStory(id)
              .then((r) => ({ storyId: id, chapters: r.data || [] }))
              .catch(() => ({ storyId: id, chapters: [] }))
          )
        ).then((results) => {
          const map = {};
          results.forEach(({ storyId, chapters }) => {
            const sorted = [...chapters].sort((a, b) => b.chapterNumber - a.chapterNumber);
            map[storyId] = sorted.slice(0, 2);
          });
          setChaptersMap(map);
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div className="loading"><div className="spinner" />Dang tai...</div>;

  return (
    <div className="container">
      {/* Hero */}
      <div style={{
        background: `linear-gradient(135deg, var(--accent-soft), var(--accent-soft-2))`,
        borderRadius: '16px', padding: '3rem 2rem', textAlign: 'center', marginBottom: '2.5rem',
        border: '1px solid var(--accent-border)'
      }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '0.75rem' }}>📖 Kham pha the gioi truyen</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '600px', margin: '0 auto 1.5rem' }}>
          Truyen tranh & Light Novel — Doc mien phi, moi luc moi noi.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/stories?type=MANGA" className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}>🎨 Truyen Tranh</Link>
          <Link to="/stories?type=NOVEL" className="btn btn-outline" style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}>📝 Light Novel</Link>
        </div>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 className="section-title">📁 The loai</h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {categories.map((c) => (
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
          <h2 className="section-title">⭐ De xuat hay nhat</h2>
          <div className="story-grid">{recommendations.map((s) => <StoryCard key={s.id} story={s} chapters={chaptersMap[s.id] || []} />)}</div>
        </div>
      )}

      {/* Hot */}
      {trending.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="section-title">🔥 Truyen hot nhat</h2>
            <Link to="/stories?sort=views" style={{ fontSize: '0.85rem' }}>Xem tat ca →</Link>
          </div>
          <div className="story-grid">{trending.map((s) => <StoryCard key={s.id} story={s} chapters={chaptersMap[s.id] || []} />)}</div>
        </div>
      )}

      {/* New Releases */}
      {newReleases.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="section-title">🆕 Truyen moi cap nhat</h2>
            <Link to="/stories?sort=updatedAt" style={{ fontSize: '0.85rem' }}>Xem tat ca →</Link>
          </div>
          <div className="story-grid">{newReleases.map((s) => <StoryCard key={s.id} story={s} chapters={chaptersMap[s.id] || []} />)}</div>
        </div>
      )}

      {trending.length === 0 && newReleases.length === 0 && (
        <div className="empty-state"><div className="icon">📚</div><p>Chua co truyen nao.</p></div>
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
  if (diffMin < 1) return 'Vua xong';
  if (diffMin < 60) return `${diffMin} phut truoc`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} gio truoc`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay} ngay truoc`;
  return new Date(dateStr).toLocaleDateString('vi-VN');
}

function StoryCard({ story, chapters }) {
  const readChapters = getReadChapters();

  return (
    <div className="story-card">
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
              background: story.type === 'MANGA' ? 'var(--badge-manga-bg)' : 'var(--badge-novel-bg)',
              color: story.type === 'MANGA' ? 'var(--warning)' : 'var(--accent)'
            }}>{story.type === 'MANGA' ? '🎨 Manga' : '📝 Novel'}</span>
            <span>👁 {story.views || 0}</span>
            <span>⭐ {story.averageRating || 0}</span>
          </div>
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
    </div>
  );
}
