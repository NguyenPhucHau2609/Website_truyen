import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  createChapter,
  createStory,
  deleteChapter,
  deleteStory,
  getAuthors,
  getCategories,
  getManageChaptersByStory,
  getMyChapters,
  getMyStories,
  updateChapter,
  updateStory,
  uploadImage,
  uploadMangaPages,
} from "../services/api";

const APPROVAL_LABELS = {
  PENDING: "Cho duyet",
  APPROVED: "Da duyet",
  REJECTED: "Tu choi",
};

const STORY_STATUS_LABELS = {
  ONGOING: "Dang ra",
  COMPLETED: "Hoan thanh",
  DROPPED: "Tam dung",
};

const emptyStoryForm = {
  title: "",
  description: "",
  status: "ONGOING",
  coverImage: "",
  categoryIds: [],
  authorIds: [],
  type: "NOVEL",
};

const emptyChapterForm = {
  storyId: "",
  chapterNumber: 1,
  title: "",
  content: "",
  pages: [],
};

const approvalOf = (item) => item?.approvalStatus || "APPROVED";
const formatDate = (value) => (value ? new Date(value).toLocaleString("vi-VN") : "-");

export default function CreatorStudio() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState([]);
  const [myChapters, setMyChapters] = useState([]);
  const [selectedStoryId, setSelectedStoryId] = useState("");
  const [selectedStoryChapters, setSelectedStoryChapters] = useState([]);
  const [categories, setCategories] = useState([]);
  const [authors, setAuthors] = useState([]);

  const [storyForm, setStoryForm] = useState(emptyStoryForm);
  const [chapterForm, setChapterForm] = useState(emptyChapterForm);
  const [editStoryId, setEditStoryId] = useState(null);
  const [editChapterId, setEditChapterId] = useState(null);

  const [coverUploading, setCoverUploading] = useState(false);
  const [pagesUploading, setPagesUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [mangaFiles, setMangaFiles] = useState([]);

  const coverInputRef = useRef(null);
  const mangaInputRef = useRef(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login");
      return;
    }
    loadData();
  }, [user, authLoading]);

  const loadData = async (preferredStoryId) => {
    setLoading(true);
    try {
      const [storiesRes, chaptersRes, categoriesRes, authorsRes] = await Promise.all([
        getMyStories(),
        getMyChapters(),
        getCategories(),
        getAuthors(),
      ]);

      const nextStories = storiesRes.data || [];
      const nextChapters = chaptersRes.data || [];
      const nextSelected =
        preferredStoryId ||
        (nextStories.some((story) => story.id === selectedStoryId) ? selectedStoryId : nextStories[0]?.id) ||
        "";

      setStories(nextStories);
      setMyChapters(nextChapters);
      setCategories(categoriesRes.data || []);
      setAuthors(authorsRes.data || []);
      setSelectedStoryId(nextSelected);

      if (nextSelected) {
        const chaptersByStory = await getManageChaptersByStory(nextSelected);
        setSelectedStoryChapters(chaptersByStory.data || []);
      } else {
        setSelectedStoryChapters([]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const resetStoryForm = () => {
    setStoryForm(emptyStoryForm);
    setEditStoryId(null);
  };

  const resetChapterForm = (storyId = selectedStoryId) => {
    setChapterForm({
      ...emptyChapterForm,
      storyId: storyId || "",
      chapterNumber: storyId === selectedStoryId ? selectedStoryChapters.length + 1 : 1,
    });
    setEditChapterId(null);
    setMangaFiles([]);
    setUploadProgress("");
  };

  const getStoryTitle = (storyId) => stories.find((story) => story.id === storyId)?.title || storyId;
  const selectedStoryType =
    stories.find((story) => story.id === (chapterForm.storyId || selectedStoryId))?.type || "NOVEL";

  const handleCoverUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCoverUploading(true);
    try {
      const response = await uploadImage(file);
      setStoryForm((prev) => ({ ...prev, coverImage: response.data.url }));
    } catch (error) {
      alert(error.response?.data?.message || error.message);
    } finally {
      setCoverUploading(false);
    }
  };

  const handleUploadMangaPages = async () => {
    if (!mangaFiles.length) return;
    setPagesUploading(true);
    setUploadProgress(`Dang upload ${mangaFiles.length} anh...`);
    try {
      const response = await uploadMangaPages(mangaFiles);
      setChapterForm((prev) => ({ ...prev, pages: [...prev.pages, ...response.data.urls] }));
      setMangaFiles([]);
      setUploadProgress(`Da upload ${response.data.urls.length} anh.`);
    } catch (error) {
      setUploadProgress(error.response?.data?.message || error.message);
    } finally {
      setPagesUploading(false);
    }
  };

  const handleSaveStory = async () => {
    try {
      if (editStoryId) {
        await updateStory(editStoryId, storyForm);
      } else {
        await createStory(storyForm);
      }
      resetStoryForm();
      await loadData(selectedStoryId);
      alert("Da luu truyen. Truyen dang cho admin duyet.");
    } catch (error) {
      alert(error.response?.data?.message || error.message);
    }
  };

  const handleEditStory = (story) => {
    setStoryForm({
      title: story.title || "",
      description: story.description || "",
      status: story.status || "ONGOING",
      coverImage: story.coverImage || "",
      categoryIds: story.categories?.map((category) => category.id) || [],
      authorIds: story.authors?.map((author) => author.id) || [],
      type: story.type || "NOVEL",
    });
    setEditStoryId(story.id);
  };

  const handleDeleteStory = async (storyId) => {
    if (!confirm("Xoa truyen nay?")) return;
    await deleteStory(storyId);
    await loadData(selectedStoryId === storyId ? "" : selectedStoryId);
  };

  const handleSaveChapter = async () => {
    try {
      const payload = { ...chapterForm };
      if (!payload.storyId) {
        alert("Hay chon truyen.");
        return;
      }
      if (selectedStoryType === "MANGA") {
        payload.content = null;
      } else {
        payload.pages = [];
      }

      if (editChapterId) {
        await updateChapter(editChapterId, payload);
      } else {
        await createChapter(payload);
      }

      await loadData(payload.storyId);
      resetChapterForm(payload.storyId);
      alert("Da luu chuong. Chuong dang cho admin duyet.");
    } catch (error) {
      alert(error.response?.data?.message || error.message);
    }
  };

  const handleEditChapter = (chapter) => {
    setChapterForm({
      storyId: chapter.storyId,
      chapterNumber: chapter.chapterNumber,
      title: chapter.title || "",
      content: chapter.content || "",
      pages: chapter.pages || [],
    });
    setEditChapterId(chapter.id);
    setUploadProgress("");
  };

  const handleDeleteChapter = async (chapterId) => {
    if (!confirm("Xoa chuong nay?")) return;
    await deleteChapter(chapterId);
    await loadData(selectedStoryId);
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        Dang tai...
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 className="page-title" style={{ marginBottom: "0.5rem" }}>
          Phong dang truyen
        </h1>
        <p style={{ color: "var(--text-secondary)" }}>
          User co the gui manga hoac light novel, them chuong va theo doi lich su duyet.
        </p>
      </div>

      <div className="stats-grid" style={{ marginBottom: "1.5rem" }}>
        <div className="stat-card">
          <div className="stat-value">{stories.length}</div>
          <div className="stat-label">Truyen da gui</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{myChapters.length}</div>
          <div className="stat-label">Chuong da gui</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {
              [...stories, ...myChapters].filter((item) => approvalOf(item) === "PENDING")
                .length
            }
          </div>
          <div className="stat-label">Dang cho duyet</div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <div className="card">
          <h2 style={{ marginBottom: "1rem" }}>
            {editStoryId ? "Sua truyen va gui duyet lai" : "Gui truyen moi"}
          </h2>
          <div className="form-group">
            <label>Loai truyen</label>
            <select
              className="form-control"
              value={storyForm.type}
              onChange={(event) => setStoryForm({ ...storyForm, type: event.target.value })}
            >
              <option value="NOVEL">Light Novel</option>
              <option value="MANGA">Manga</option>
            </select>
          </div>
          <div className="form-group">
            <label>Ten truyen</label>
            <input
              className="form-control"
              value={storyForm.title}
              onChange={(event) => setStoryForm({ ...storyForm, title: event.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Mo ta</label>
            <textarea
              className="form-control"
              value={storyForm.description}
              onChange={(event) => setStoryForm({ ...storyForm, description: event.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Anh bia</label>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button
                className="btn btn-outline btn-sm"
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={coverUploading}
              >
                {coverUploading ? "Dang upload..." : "Upload anh"}
              </button>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                style={{ display: "none" }}
              />
            </div>
            <input
              className="form-control"
              style={{ marginTop: "0.75rem" }}
              placeholder="Hoac dan URL anh bia"
              value={storyForm.coverImage}
              onChange={(event) => setStoryForm({ ...storyForm, coverImage: event.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Tinh trang</label>
            <select
              className="form-control"
              value={storyForm.status}
              onChange={(event) => setStoryForm({ ...storyForm, status: event.target.value })}
            >
              <option value="ONGOING">Dang ra</option>
              <option value="COMPLETED">Hoan thanh</option>
              <option value="DROPPED">Tam dung</option>
            </select>
          </div>
          <div className="form-group">
            <label>The loai</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {categories.map((category) => (
                <label
                  key={category.id}
                  style={{
                    padding: "0.3rem 0.6rem",
                    borderRadius: "999px",
                    background: storyForm.categoryIds.includes(category.id)
                      ? "var(--accent)"
                      : "var(--bg-glass)",
                    cursor: "pointer",
                    color: "white",
                    fontSize: "0.8rem",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={storyForm.categoryIds.includes(category.id)}
                    style={{ display: "none" }}
                    onChange={(event) => {
                      const categoryIds = event.target.checked
                        ? [...storyForm.categoryIds, category.id]
                        : storyForm.categoryIds.filter((id) => id !== category.id);
                      setStoryForm({ ...storyForm, categoryIds });
                    }}
                  />
                  {category.name}
                </label>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Tac gia</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {authors.map((author) => (
                <label
                  key={author.id}
                  style={{
                    padding: "0.3rem 0.6rem",
                    borderRadius: "999px",
                    background: storyForm.authorIds.includes(author.id)
                      ? "var(--success)"
                      : "var(--bg-glass)",
                    cursor: "pointer",
                    color: "white",
                    fontSize: "0.8rem",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={storyForm.authorIds.includes(author.id)}
                    style={{ display: "none" }}
                    onChange={(event) => {
                      const authorIds = event.target.checked
                        ? [...storyForm.authorIds, author.id]
                        : storyForm.authorIds.filter((id) => id !== author.id);
                      setStoryForm({ ...storyForm, authorIds });
                    }}
                  />
                  {author.name}
                </label>
              ))}
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={resetStoryForm}>
              Lam moi
            </button>
            <button className="btn btn-primary" onClick={handleSaveStory} disabled={coverUploading}>
              {editStoryId ? "Cap nhat va gui duyet" : "Gui truyen"}
            </button>
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: "1rem" }}>
            {editChapterId ? "Sua chuong va gui duyet lai" : "Them chuong"}
          </h2>
          <div className="form-group">
            <label>Truyen</label>
            <select
              className="form-control"
              value={chapterForm.storyId}
              onChange={async (event) => {
                const storyId = event.target.value;
                setChapterForm({ ...chapterForm, storyId, content: "", pages: [] });
                setSelectedStoryId(storyId);
                if (storyId) {
                  const chaptersByStory = await getManageChaptersByStory(storyId);
                  setSelectedStoryChapters(chaptersByStory.data || []);
                } else {
                  setSelectedStoryChapters([]);
                }
              }}
            >
              <option value="">Chon truyen...</option>
              {stories.map((story) => (
                <option key={story.id} value={story.id}>
                  {story.type === "MANGA" ? "Manga" : "Novel"} - {story.title}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>So chuong</label>
            <input
              className="form-control"
              type="number"
              value={chapterForm.chapterNumber}
              onChange={(event) =>
                setChapterForm({ ...chapterForm, chapterNumber: Number(event.target.value) })
              }
            />
          </div>
          <div className="form-group">
            <label>Tieu de</label>
            <input
              className="form-control"
              value={chapterForm.title}
              onChange={(event) => setChapterForm({ ...chapterForm, title: event.target.value })}
            />
          </div>

          {selectedStoryType === "MANGA" ? (
            <div className="form-group">
              <label>Trang anh</label>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                <button className="btn btn-outline btn-sm" type="button" onClick={() => mangaInputRef.current?.click()}>
                  Chon anh
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  type="button"
                  onClick={handleUploadMangaPages}
                  disabled={!mangaFiles.length || pagesUploading}
                >
                  {pagesUploading ? "Dang upload..." : "Upload trang"}
                </button>
                <input
                  ref={mangaInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => setMangaFiles(Array.from(event.target.files || []))}
                  style={{ display: "none" }}
                />
              </div>
              {uploadProgress && (
                <p style={{ marginBottom: "0.75rem", color: "var(--text-secondary)" }}>{uploadProgress}</p>
              )}
              {chapterForm.pages.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {chapterForm.pages.map((page, index) => (
                    <div
                      key={`${page}-${index}`}
                      style={{
                        display: "flex",
                        gap: "0.75rem",
                        alignItems: "center",
                        background: "var(--bg-primary)",
                        borderRadius: "8px",
                        padding: "0.55rem 0.75rem",
                      }}
                    >
                      <span style={{ flex: 1, wordBreak: "break-all" }}>Trang {index + 1}</span>
                      <button
                        className="btn btn-danger btn-sm"
                        type="button"
                        onClick={() =>
                          setChapterForm((prev) => ({
                            ...prev,
                            pages: prev.pages.filter((_, pageIndex) => pageIndex !== index),
                          }))
                        }
                      >
                        Xoa
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="form-group">
              <label>Noi dung</label>
              <textarea
                className="form-control"
                style={{ minHeight: "260px" }}
                value={chapterForm.content}
                onChange={(event) => setChapterForm({ ...chapterForm, content: event.target.value })}
              />
            </div>
          )}

          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => resetChapterForm()}>
              Lam moi
            </button>
            <button className="btn btn-primary" onClick={handleSaveChapter} disabled={pagesUploading}>
              {editChapterId ? "Cap nhat chuong" : "Gui chuong"}
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ marginBottom: "1rem" }}>Danh sach truyen cua toi</h2>
        {stories.length ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Truyen</th>
                  <th>Loai</th>
                  <th>Tinh trang</th>
                  <th>Duyet</th>
                  <th>Cap nhat</th>
                  <th>Ghi chu admin</th>
                  <th>Hanh dong</th>
                </tr>
              </thead>
              <tbody>
                {stories.map((story) => (
                  <tr key={story.id}>
                    <td>{story.title}</td>
                    <td>{story.type === "MANGA" ? "Manga" : "Light Novel"}</td>
                    <td>
                      <span className={`status-badge status-${story.status}`}>
                        {STORY_STATUS_LABELS[story.status] || story.status}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge status-${approvalOf(story)}`}>
                        {APPROVAL_LABELS[approvalOf(story)]}
                      </span>
                    </td>
                    <td>{formatDate(story.updatedAt)}</td>
                    <td>{story.reviewNote || "-"}</td>
                    <td>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <button className="btn btn-sm btn-outline" onClick={() => handleEditStory(story)}>
                          Sua
                        </button>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={async () => {
                            setSelectedStoryId(story.id);
                            setChapterForm((prev) => ({ ...prev, storyId: story.id }));
                            const chaptersByStory = await getManageChaptersByStory(story.id);
                            setSelectedStoryChapters(chaptersByStory.data || []);
                          }}
                        >
                          Chon truyen
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDeleteStory(story.id)}>
                          Xoa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p>Ban chua gui truyen nao.</p>
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "1rem",
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: "1rem",
          }}
        >
          <h2 style={{ margin: 0 }}>Chuong theo truyen dang chon</h2>
          <select
            className="form-control"
            style={{ maxWidth: "320px" }}
            value={selectedStoryId}
            onChange={async (event) => {
              const storyId = event.target.value;
              setSelectedStoryId(storyId);
              setChapterForm((prev) => ({ ...prev, storyId }));
              if (storyId) {
                const chaptersByStory = await getManageChaptersByStory(storyId);
                setSelectedStoryChapters(chaptersByStory.data || []);
              } else {
                setSelectedStoryChapters([]);
              }
            }}
          >
            <option value="">Chon truyen...</option>
            {stories.map((story) => (
              <option key={story.id} value={story.id}>
                {story.title}
              </option>
            ))}
          </select>
        </div>

        {selectedStoryId && selectedStoryChapters.length ? (
          <ul className="chapter-list">
            {selectedStoryChapters.map((chapter) => (
              <li key={chapter.id} className="chapter-item">
                <div>
                  <div className="chapter-title">
                    Ch.{chapter.chapterNumber}: {chapter.title}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "0.75rem",
                      flexWrap: "wrap",
                      marginTop: "0.35rem",
                      fontSize: "0.8rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <span className={`status-badge status-${approvalOf(chapter)}`}>
                      {APPROVAL_LABELS[approvalOf(chapter)]}
                    </span>
                    <span>Cap nhat: {formatDate(chapter.updatedAt)}</span>
                    {chapter.reviewNote && <span>Note: {chapter.reviewNote}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button className="btn btn-sm btn-outline" onClick={() => handleEditChapter(chapter)}>
                    Sua
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDeleteChapter(chapter.id)}>
                    Xoa
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">
            <p>{selectedStoryId ? "Truyen nay chua co chuong." : "Hay chon truyen de xem chuong."}</p>
          </div>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginBottom: "1rem" }}>Lich su chuong da gui</h2>
        {myChapters.length ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Truyen</th>
                  <th>Chuong</th>
                  <th>Duyet</th>
                  <th>Cap nhat</th>
                  <th>Ghi chu admin</th>
                </tr>
              </thead>
              <tbody>
                {myChapters.map((chapter) => (
                  <tr key={chapter.id}>
                    <td>{getStoryTitle(chapter.storyId)}</td>
                    <td>
                      Ch.{chapter.chapterNumber}: {chapter.title}
                    </td>
                    <td>
                      <span className={`status-badge status-${approvalOf(chapter)}`}>
                        {APPROVAL_LABELS[approvalOf(chapter)]}
                      </span>
                    </td>
                    <td>{formatDate(chapter.updatedAt)}</td>
                    <td>{chapter.reviewNote || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p>Ban chua gui chuong nao.</p>
          </div>
        )}
      </div>
    </div>
  );
}
