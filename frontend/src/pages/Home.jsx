import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getCategories,
  getChaptersByStory,
  getTrendingStories,
  getNewReleases,
  getRecommendations,
  getHotStories as getStoriesHotTop10,
} from "../services/api";
import { useAuth } from "../context/AuthContext";

function getReadChapters() {
  try {
    return JSON.parse(localStorage.getItem("readChapters") || "[]");
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
  const [hotTop10, setHotTop10] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = user?.id;

    Promise.all([
      getTrendingStories(8),
      getNewReleases(8),
      getRecommendations(userId, 8),
      getCategories(),
      getStoriesHotTop10().catch(() => ({ data: null })),
    ])
      .then(([tRes, nRes, rRes, cRes, hotRes]) => {
        const tStories = tRes.data || [];
        const nStories = nRes.data || [];
        const rStories = rRes.data || [];

        setTrending(tStories);
        setNewReleases(nStories);
        setRecommendations(rStories);
        setCategories(cRes.data || []);
        setHotTop10(hotRes.data);

        const allVisibleStories = [...tStories, ...nStories, ...rStories];
        const uniqueIds = [...new Set(allVisibleStories.map((s) => s.id))];

        // Prefetch latest chapters for visible stories
        Promise.all(
          uniqueIds.map((id) =>
            getChaptersByStory(id)
              .then((r) => ({ storyId: id, chapters: r.data || [] }))
              .catch(() => ({ storyId: id, chapters: [] })),
          ),
        ).then((results) => {
          const map = {};
          results.forEach(({ storyId, chapters }) => {
            const sorted = [...chapters].sort(
              (a, b) => b.chapterNumber - a.chapterNumber,
            );
            map[storyId] = sorted.slice(0, 2);
          });
          setChaptersMap(map);
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  if (loading)
    return (
      <div className="loading">
        <div className="spinner" />
        Dang tai...
      </div>
    );

  return (
    <div className="container">
      {/* Hero */}
      <div
        style={{
          background: `linear-gradient(135deg, var(--accent-soft), var(--accent-soft-2))`,
          borderRadius: "16px",
          padding: "3rem 2rem",
          textAlign: "center",
          marginBottom: "2.5rem",
          border: "1px solid var(--accent-border)",
        }}
      >
        <h1
          style={{
            fontSize: "2.2rem",
            fontWeight: 800,
            marginBottom: "0.75rem",
          }}
        >
          📖 Kham pha the gioi truyen
        </h1>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "1.05rem",
            maxWidth: "600px",
            margin: "0 auto 1.5rem",
          }}
        >
          Truyen tranh & Light Novel — Doc mien phi, moi luc moi noi.
        </p>
        <div
          style={{
            display: "flex",
            gap: "1rem",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Link
            to="/stories?type=MANGA"
            className="btn btn-primary"
            style={{ fontSize: "1rem", padding: "0.75rem 2rem" }}
          >
            🎨 Truyen Tranh
          </Link>
          <Link
            to="/stories?type=NOVEL"
            className="btn btn-outline"
            style={{ fontSize: "1rem", padding: "0.75rem 2rem" }}
          >
            📝 Light Novel
          </Link>
        </div>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div style={{ marginBottom: "2.5rem" }}>
          <h2 className="section-title">📁 The loai</h2>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {categories.map((c) => (
              <Link
                key={c.id}
                to={`/stories?category=${c.id}`}
                className="category-tag"
                style={{ fontSize: "0.85rem", padding: "0.4rem 1rem" }}
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div style={{ marginBottom: "2.5rem" }}>
          <h2 className="section-title">⭐ De xuat hay nhat</h2>
          <div className="story-grid">
            {recommendations.map((s) => (
              <StoryCard
                key={s.id}
                story={s}
                chapters={chaptersMap[s.id] || []}
              />
            ))}
          </div>
        </div>
      )}

      {/* Hot */}
      {trending.length > 0 && (
        <div style={{ marginBottom: "2.5rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h2 className="section-title">🔥 Truyen hot nhat</h2>
            <Link to="/stories?sort=views" style={{ fontSize: "0.85rem" }}>
              Xem tat ca →
            </Link>
          </div>
          <div className="story-grid">
            {trending.map((s) => (
              <StoryCard
                key={s.id}
                story={s}
                chapters={chaptersMap[s.id] || []}
              />
            ))}
          </div>
        </div>
      )}

      {/* New Releases */}
      {newReleases.length > 0 && (
        <div style={{ marginBottom: "2.5rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h2 className="section-title">🆕 Truyen moi cap nhat</h2>
            <Link to="/stories?sort=updatedAt" style={{ fontSize: "0.85rem" }}>
              Xem tat ca →
            </Link>
          </div>
          <div className="story-grid">
            {newReleases.map((s) => (
              <StoryCard
                key={s.id}
                story={s}
                chapters={chaptersMap[s.id] || []}
              />
            ))}
          </div>
        </div>
      )}

      {hotTop10 &&
        (hotTop10.topByViews?.length > 0 ||
          hotTop10.topByRating?.length > 0) && (
          <section
            className="home-hot-section"
            aria-label="Nội dung hot Top 10"
          >
            <h2 className="home-hot-section-title">
              <span className="home-hot-title-icon" aria-hidden>
                🔥
              </span>
              Bảng Xếp Hạng - Top 10
            </h2>
            <div className="home-hot-lists-grid">
              <div className="hot-list-col home-hot-list-col">
                <div className="hot-list-header">
                  <span className="hot-list-icon">👁</span>
                  <h3>Top 10 Lượt xem</h3>
                </div>
                <div className="hot-list">
                  {(hotTop10.topByViews || []).map((s, i) => (
                    <HomeHotStoryRow
                      key={s.id}
                      story={s}
                      rank={i + 1}
                      index={i}
                      variant="views"
                    />
                  ))}
                </div>
              </div>
              <div className="hot-list-col home-hot-list-col">
                <div className="hot-list-header">
                  <span className="hot-list-icon">⭐</span>
                  <h3>Top 10 Rating cao nhất</h3>
                </div>
                <div className="hot-list">
                  {(hotTop10.topByRating || []).map((s, i) => (
                    <HomeHotStoryRow
                      key={s.id}
                      story={s}
                      rank={i + 1}
                      index={i}
                      variant="rating"
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

      {trending.length === 0 && newReleases.length === 0 && (
        <div className="empty-state">
          <div className="icon">📚</div>
          <p>Chua co truyen nao.</p>
        </div>
      )}
    </div>
  );
}

const HOT_TYPE_STYLES = {
  MANGA: { bg: "rgba(255, 179, 71, 0.18)", color: "#ffb347" },
  NOVEL: { bg: "rgba(108, 99, 255, 0.22)", color: "#b8b0ff" },
};

const HOT_STATUS_STYLES = {
  ONGOING: { bg: "rgba(82, 199, 234, 0.15)", color: "#52c7ea" },
  COMPLETED: { bg: "rgba(76, 175, 80, 0.15)", color: "#4caf50" },
  DROPPED: { bg: "rgba(244, 67, 54, 0.15)", color: "#f44336" },
};

const HOT_STATUS_LABELS = {
  ONGOING: "Đang ra",
  COMPLETED: "Đã hoàn thành",
  DROPPED: "Đã drop",
};

function HotTop10StarRating({ score }) {
  const s = Math.min(5, Math.max(0, Number(score) || 0));
  const full = Math.floor(s);
  const half = s - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return (
    <span className="star-display">
      {Array.from({ length: full }, (_, i) => (
        <span key={`f${i}`} className="star full">
          ★
        </span>
      ))}
      {half === 1 && (
        <span className="star half" key="h">
          ★
        </span>
      )}
      {Array.from({ length: empty }, (_, i) => (
        <span key={`e${i}`} className="star empty">
          ★
        </span>
      ))}
      <span className="score-num">{s.toFixed(1)}</span>
    </span>
  );
}

function HomeHotStoryRow({ story, rank, index, variant }) {
  const typeStyle = HOT_TYPE_STYLES[story.type] || HOT_TYPE_STYLES.NOVEL;
  const statusStyle =
    HOT_STATUS_STYLES[story.status] || HOT_STATUS_STYLES.ONGOING;
  const rankBg =
    index === 0
      ? "#e6c200"
      : index === 1
        ? "#b8bcc6"
        : index === 2
          ? "#cd7f32"
          : "rgba(255,255,255,0.1)";
  const rankColor = index < 3 ? "#1a1a2e" : "rgba(255,255,255,0.65)";

  return (
    <Link
      to={`/story/${story.id}`}
      className="hot-story-item home-hot-story-item"
    >
      <span
        className="rank-badge"
        style={{
          background: rankBg,
          color: rankColor,
        }}
      >
        #{rank}
      </span>
      <div className="hot-story-cover">
        {story.coverImage ? (
          <img src={story.coverImage} alt="" />
        ) : (
          <div className="cover-placeholder">
            {story.type === "MANGA" ? "🎨" : "📝"}
          </div>
        )}
      </div>
      <div className="hot-story-info">
        <div className="hot-story-title">{story.title}</div>
        <div className="hot-story-meta">
          <span
            className="pill"
            style={{ background: typeStyle.bg, color: typeStyle.color }}
          >
            {story.type === "MANGA" ? "Manga" : "Novel"}
          </span>
          <span
            className="pill"
            style={{ background: statusStyle.bg, color: statusStyle.color }}
          >
            {HOT_STATUS_LABELS[story.status] || story.status}
          </span>
        </div>
        <div className="hot-story-stats home-hot-story-stats">
          {variant === "views" ? (
            <>
              <span className="home-hot-stat-primary">
                👁 {story.views?.toLocaleString() || 0}
              </span>
              <HotTop10StarRating score={story.averageRating || 0} />
            </>
          ) : (
            <>
              <HotTop10StarRating score={story.averageRating || 0} />
              <span className="home-hot-stat-secondary">
                👁 {story.views?.toLocaleString() || 0}
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return "";
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Vua xong";
  if (diffMin < 60) return `${diffMin} phut truoc`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} gio truoc`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay} ngay truoc`;
  return new Date(dateStr).toLocaleDateString("vi-VN");
}

function StoryCard({ story, chapters }) {
  const readChapters = getReadChapters();

  return (
    <div className="story-card">
      <Link
        to={`/story/${story.id}`}
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <div className="story-cover">
          {story.coverImage ? (
            <img
              src={story.coverImage}
              alt={story.title}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            "📖"
          )}
        </div>
        <div className="story-info">
          <h3>{story.title}</h3>
          <div className="story-meta">
            <span
              style={{
                padding: "0.15rem 0.4rem",
                borderRadius: "4px",
                fontSize: "0.65rem",
                fontWeight: 700,
                background:
                  story.type === "MANGA"
                    ? "var(--badge-manga-bg)"
                    : "var(--badge-novel-bg)",
                color:
                  story.type === "MANGA" ? "var(--warning)" : "var(--accent)",
              }}
            >
              {story.type === "MANGA" ? "🎨 Manga" : "📝 Novel"}
            </span>
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
                className={`story-card-chapter ${isRead ? "read" : "unread"}`}
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
