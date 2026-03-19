import { useState, useEffect, useRef, createContext, useContext, useCallback } from "react";
import * as api from "./api/index.js";
import { getStoredUser, clearAuth, ApiError } from "./api/client.js";

// ─── Oak Tree SVG Logo ────────────────────────────────────────────────────────
function OakTreeIcon({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="20" cy="16" rx="13" ry="11" fill="var(--accent)" />
      <ellipse cx="11" cy="17" rx="7" ry="6" fill="var(--accent)" />
      <ellipse cx="29" cy="17" rx="7" ry="6" fill="var(--accent)" />
      <ellipse cx="17" cy="13" rx="6" ry="4.5" fill="var(--accent-mid)" opacity="0.55" />
      <path d="M17 27 Q18 24 20 24 Q22 24 23 27 L22.5 36 Q21.5 37 20 37 Q18.5 37 17.5 36 Z" fill="var(--bark)" />
      <path d="M17.5 34 Q14 35 12 37" stroke="var(--bark)" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M22.5 34 Q26 35 28 37" stroke="var(--bark)" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function OakLeafAccent({ size = 18, opacity = 0.18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ opacity }}>
      <path d="M10 1C7.5 1 4 3.5 4 7C4 8.5 4.5 10 5.5 11L5 16L10 14L15 16L14.5 11C15.5 10 16 8.5 16 7C16 3.5 12.5 1 10 1Z" fill="currentColor" />
      <line x1="10" y1="5" x2="10" y2="14" stroke="white" strokeWidth="0.7" opacity="0.5" />
    </svg>
  );
}

const USE_API = !!import.meta.env.VITE_API_URL;

// ─── Auth Context ───────────────────────────────────────────────────────────
const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());

  const login = async (email, password) => {
    if (USE_API) {
      const u = await api.auth.login(email, password);
      setUser(u);
      return u;
    }
    // Mock login
    const role = email.toLowerCase().includes("admin") ? "admin" : "member";
    const u = { email, displayName: email.split("@")[0], id: crypto.randomUUID(), role, joinedAt: new Date().toISOString() };
    setUser(u);
    return u;
  };

  const signup = async (email, displayName, password) => {
    if (USE_API) {
      await api.auth.signup(email, displayName, password);
      const u = await api.auth.login(email, password);
      setUser(u);
      return u;
    }
    // Mock signup
    const role = email.toLowerCase().includes("admin") ? "admin" : "member";
    const u = { email, displayName, id: crypto.randomUUID(), role, joinedAt: new Date().toISOString() };
    setUser(u);
    return u;
  };

  const logout = async () => {
    if (USE_API) await api.auth.logout();
    else clearAuth();
    setUser(null);
  };

  const updateDisplayName = async (newName) => {
    if (USE_API) await api.me.updateMe({ displayName: newName });
    setUser((prev) => (prev ? { ...prev, displayName: newName } : null));
    if (USE_API) {
      const stored = getStoredUser();
      if (stored) { stored.displayName = newName; localStorage.setItem("hob_user", JSON.stringify(stored)); }
    }
  };

  const deleteAccount = async () => {
    if (USE_API) await api.me.deleteMe();
    else clearAuth();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, signup, updateDisplayName, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Seed Data ───────────────────────────────────────────────────────────────
const INITIAL_POSTS = [
  {
    id: "p1",
    title: "Spring Farmers Market Returns April 5th!",
    body: "The community farmers market is back for its 8th year running. Local vendors will offer fresh produce, baked goods, handmade crafts, and live music from 8am–1pm at Meadowbrook Park.\n\n**What to expect:**\n- Over 30 local vendors\n- Live acoustic music\n- Kids' activity corner\n- Free parking at the rec center lot\n\nBring your reusable bags and support our local growers!",
    category: "news",
    author: "MarketMaven",
    authorId: "u1",
    imageUrl: null,
    likes: 24,
    likedBy: [],
    comments: [
      { id: "c1", body: "Can't wait! Last year's honey vendor was amazing.", author: "BeeKeeper42", createdAt: "2026-03-14T09:00:00Z" },
      { id: "c2", body: "Will there be gluten-free options this year?", author: "HealthyEats", createdAt: "2026-03-14T11:30:00Z" },
    ],
    urgency: null,
    status: "active",
    reportCount: 0,
    createdAt: "2026-03-14T08:00:00Z",
  },
  {
    id: "p2",
    title: "⚠️ Package Thefts on Birchwood Lane",
    body: "Three households on Birchwood Lane reported stolen packages this week, all between 2–4pm on weekday afternoons. Security camera footage shows a gray sedan with no plates.\n\n**If you have information**, please contact the non-emergency police line at the number posted on the community board. Do NOT approach the vehicle.\n\nConsider using a lockbox or having packages delivered to a pickup point.",
    category: "watch",
    author: "WatchfulOne",
    authorId: "u2",
    imageUrl: null,
    likes: 41,
    likedBy: [],
    comments: [
      { id: "c3", body: "I saw a similar car near Elm St yesterday around 3pm.", author: "EagleEye", createdAt: "2026-03-13T16:00:00Z" },
    ],
    urgency: "caution",
    status: "active",
    reportCount: 0,
    createdAt: "2026-03-13T14:00:00Z",
  },
  {
    id: "p3",
    title: "The Sunset from Cedar Hill Was Incredible Last Night",
    body: "Took a walk up Cedar Hill around 6:30pm and caught this absolutely stunning sunset. The colors were unreal — deep oranges melting into purples with the silhouette of the old oak tree.\n\nIf you haven't hiked up there recently, I highly recommend it. The wildflowers are starting to bloom along the trail too.",
    category: "photos",
    author: "NatureLover",
    authorId: "u3",
    imageUrl: null,
    likes: 67,
    likedBy: [],
    comments: [
      { id: "c4", body: "Gorgeous! That old oak is my favorite spot.", author: "TreeHugger", createdAt: "2026-03-12T20:00:00Z" },
      { id: "c5", body: "The wildflowers were beautiful when I went Tuesday!", author: "GardenGal", createdAt: "2026-03-13T07:00:00Z" },
    ],
    urgency: null,
    status: "active",
    reportCount: 0,
    createdAt: "2026-03-12T18:30:00Z",
  },
  {
    id: "p4",
    title: "Free Little Library Now Open on Maple Street",
    body: "I just finished building and stocking our neighborhood's first Free Little Library! It's located at 142 Maple St, next to the blue mailbox.\n\nTake a book, leave a book. All genres welcome. There's a separate kids' section on the bottom shelf.\n\nSpecial thanks to everyone who donated books during the collection last month.",
    category: "community",
    author: "BookwormBob",
    authorId: "u4",
    imageUrl: null,
    likes: 53,
    likedBy: [],
    comments: [
      { id: "c6", body: "This is wonderful! I'll bring some mystery novels this weekend.", author: "PageTurner", createdAt: "2026-03-11T10:00:00Z" },
    ],
    urgency: null,
    status: "active",
    reportCount: 0,
    createdAt: "2026-03-11T09:00:00Z",
  },
  {
    id: "p5",
    title: "Road Closure: Oak Avenue Repaving March 20-22",
    body: "The city has scheduled Oak Avenue for repaving from March 20 through 22. The road will be fully closed to traffic during this time.\n\n**Detour route:** Use Birch St → Willow Dr → reconnect at the Oak/Main intersection.\n\nTrash collection for affected addresses will be moved to Wednesday that week.",
    category: "news",
    author: "CityUpdates",
    authorId: "u5",
    imageUrl: null,
    likes: 18,
    likedBy: [],
    comments: [],
    urgency: null,
    status: "active",
    reportCount: 0,
    createdAt: "2026-03-10T12:00:00Z",
  },
  {
    id: "p6",
    title: "🔴 Water Main Break — Boil Water Advisory",
    body: "The water utility has issued a boil water advisory for the Meadowbrook subdivision effective immediately. A water main break was discovered early this morning on Pine Street.\n\n**Until further notice:**\n- Boil all water for drinking and cooking\n- Run taps for 5 minutes before use once advisory lifts\n- Bottled water available at the rec center\n\nExpected repair timeline: 24–48 hours.",
    category: "watch",
    author: "SafetyFirst",
    authorId: "u6",
    imageUrl: null,
    likes: 89,
    likedBy: [],
    comments: [
      { id: "c7", body: "Thank you for the heads up! Heading to get bottled water now.", author: "PreparedPete", createdAt: "2026-03-10T08:00:00Z" },
      { id: "c8", body: "Is the advisory just for Meadowbrook or wider area?", author: "CuriousCat", createdAt: "2026-03-10T08:30:00Z" },
    ],
    urgency: "alert",
    status: "active",
    reportCount: 0,
    createdAt: "2026-03-10T07:00:00Z",
  },
  {
    id: "p7",
    title: "Morning Fog Over the Lake — Pure Magic",
    body: "Woke up early for a jog and the lake was completely covered in morning fog. The way the light filtered through the trees was something out of a painting.\n\nThese are the moments that make this neighborhood special. Sometimes you just have to slow down and look around.",
    category: "photos",
    author: "EarlyBird",
    authorId: "u7",
    imageUrl: null,
    likes: 44,
    likedBy: [],
    comments: [],
    urgency: null,
    status: "active",
    reportCount: 0,
    createdAt: "2026-03-09T06:30:00Z",
  },
  {
    id: "p8",
    title: "Volunteers Needed: Community Garden Spring Cleanup",
    body: "Our annual spring cleanup at the community garden is happening Saturday, March 22 from 9am–12pm. We need help with:\n\n- Clearing winter debris from raised beds\n- Repainting the tool shed\n- Spreading fresh mulch on pathways\n- Planting early-season seedlings\n\nAll tools and gloves provided. Bring water and sunscreen. Kids welcome — we'll have a planting station just for them!\n\nSign up by replying here or just show up.",
    category: "community",
    author: "GreenThumb",
    authorId: "u8",
    imageUrl: null,
    likes: 36,
    likedBy: [],
    comments: [
      { id: "c9", body: "Count me in! I'll bring coffee and donuts for the crew.", author: "MorningJoe", createdAt: "2026-03-09T10:00:00Z" },
      { id: "c10", body: "My kids would love the planting station. See you there!", author: "FamilyFun", createdAt: "2026-03-09T14:00:00Z" },
    ],
    urgency: null,
    status: "active",
    reportCount: 0,
    createdAt: "2026-03-09T08:00:00Z",
  },
];

// ─── Constants ───────────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: "all",       label: "All Posts",  icon: "◉",  color: "var(--cat-all)",       bgActive: "var(--cat-all-bg)" },
  { key: "news",      label: "News",       icon: "📰", color: "var(--cat-news)",      bgActive: "var(--cat-news-bg)" },
  { key: "watch",     label: "Watch",      icon: "👁️", color: "var(--cat-watch)",     bgActive: "var(--cat-watch-bg)" },
  { key: "community", label: "Community",  icon: "🏘️", color: "var(--cat-community)", bgActive: "var(--cat-community-bg)" },
  { key: "photos",    label: "Photos",     icon: "📸", color: "var(--cat-photos)",    bgActive: "var(--cat-photos-bg)" },
];

const URGENCY = {
  info:    { label: "Info",    bg: "var(--urgency-info-bg)",    border: "var(--urgency-info-border)",    text: "var(--urgency-info-text)",    icon: "🟢" },
  caution: { label: "Caution", bg: "var(--urgency-caution-bg)", border: "var(--urgency-caution-border)", text: "var(--urgency-caution-text)", icon: "🟡" },
  alert:   { label: "Alert",   bg: "var(--urgency-alert-bg)",   border: "var(--urgency-alert-border)",   text: "var(--urgency-alert-text)",   icon: "🔴" },
};

const REPORT_REASONS = [
  "Spam",
  "Misinformation",
  "Harassment",
  "Inappropriate content",
  "Privacy violation",
  "Other",
];

const URGENCY_ORDER = { alert: 0, caution: 1, info: 2 };

// ─── Utility Helpers ─────────────────────────────────────────────────────────
const timeAgo = (dateStr) => {
  const now = new Date();
  const past = new Date(dateStr);
  const mins = Math.floor((now - past) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return past.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const formatJoinDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

// Normalize API post shape to match local state shape
function normalizeApiComment(c) {
  return {
    id: c.commentId || c.id,
    body: c.body,
    author: c.authorDisplayName || c.author || "Unknown",
    parentCommentId: c.parentCommentId || null,
    createdAt: c.createdAt,
  };
}

function normalizeApiPost(p) {
  return {
    id: p.postId || p.id,
    title: p.title,
    body: p.body || "",
    category: p.category,
    author: p.authorDisplayName || p.author || "Unknown",
    authorId: p.authorId,
    imageUrl: p.imageKey ? `${import.meta.env.VITE_CDN_URL || ""}/${p.imageKey}` : null,
    likes: p.likeCount ?? p.likes ?? 0,
    likedBy: p.likedBy || [],
    comments: (p.comments || []).map(normalizeApiComment),
    urgency: p.urgency || null,
    status: p.status || "active",
    reportCount: p.reportCount || 0,
    createdAt: p.createdAt,
  };
}

const avatarColor = (name) =>
  `hsl(${(name || "?").charCodeAt(0) * 37 % 360}, 55%, 65%)`;

const compressImage = (file, maxWidth = 1200) =>
  new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width: w, height: h } = img;
      if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.src = url;
  });

// ─── Simple Markdown Renderer ─────────────────────────────────────────────────
function RenderMarkdown({ text }) {
  if (!text) return null;
  const lines = text.split("\n");
  const elements = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("**") && line.endsWith("**")) {
      elements.push(
        <p key={i} style={{ fontWeight: 700, margin: "12px 0 4px" }}>
          {line.slice(2, -2)}
        </p>
      );
    } else if (line.startsWith("- ")) {
      const items = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(
          <li key={i} style={{ marginLeft: 20, listStyleType: "disc", padding: "2px 0" }}>
            {renderInline(lines[i].slice(2))}
          </li>
        );
        i++;
      }
      elements.push(<ul key={`ul-${i}`} style={{ margin: "8px 0" }}>{items}</ul>);
      continue;
    } else if (line.trim() === "") {
      elements.push(<div key={i} style={{ height: 8 }} />);
    } else {
      elements.push(
        <p key={i} style={{ margin: "4px 0", lineHeight: 1.7 }}>
          {renderInline(line)}
        </p>
      );
    }
    i++;
  }
  return <>{elements}</>;
}

function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : p
  );
}

// ─── Small Shared UI Atoms ───────────────────────────────────────────────────
function CategoryBadge({ category, compact }) {
  const cat = CATEGORIES.find((c) => c.key === category) || CATEGORIES[0];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: compact ? "2px 8px" : "3px 10px",
      borderRadius: 20, fontSize: compact ? 11 : 12, fontWeight: 600,
      background: cat.bgActive, color: cat.color, letterSpacing: "0.02em",
      textTransform: "uppercase",
    }}>
      {cat.icon} {cat.label}
    </span>
  );
}

function UrgencyBanner({ urgency, large }) {
  if (!urgency) return null;
  const u = URGENCY[urgency];
  return (
    <div style={{
      background: u.bg, border: `2px solid ${u.border}`, borderRadius: 8,
      padding: large ? "10px 18px" : "8px 14px",
      fontSize: large ? 15 : 13, fontWeight: 700, color: u.text,
      display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
    }}>
      {u.icon} {u.label.toUpperCase()} — Neighborhood Watch
    </div>
  );
}

function Avatar({ name, size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: avatarColor(name || "?"),
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontSize: size * 0.42, fontWeight: 700,
    }}>
      {(name || "?")[0].toUpperCase()}
    </div>
  );
}

function Toast({ message, onDismiss }) {
  return (
    <div style={{
      position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
      background: "var(--toast-bg)", color: "var(--toast-text)", padding: "12px 24px", borderRadius: 12,
      fontSize: 14, fontWeight: 600, zIndex: 2000, boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
      display: "flex", alignItems: "center", gap: 12,
    }}>
      ✅ {message}
      <button onClick={onDismiss} style={{
        background: "rgba(128,128,128,0.2)", border: "none", color: "var(--toast-text)",
        width: 22, height: 22, borderRadius: "50%", cursor: "pointer",
        fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center",
      }}>✕</button>
    </div>
  );
}

// ─── PostCard ─────────────────────────────────────────────────────────────────
function PostCard({ post, onSelect, showLargeBadge }) {
  return (
    <article
      onClick={() => onSelect(post.id)}
      style={{
        background: "var(--card-bg)", borderRadius: 14, padding: 24,
        cursor: "pointer", transition: "all 0.2s ease",
        border: "1px solid var(--border)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,0,0,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
      }}
    >
      {post.urgency && <UrgencyBanner urgency={post.urgency} large={showLargeBadge} />}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <CategoryBadge category={post.category} compact />
        <span style={{ color: "var(--text-muted)", fontSize: 12 }}>·</span>
        <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{timeAgo(post.createdAt)}</span>
      </div>
      <h2 style={{
        fontSize: 20, fontWeight: 700, color: "var(--text-primary)",
        margin: "0 0 8px", lineHeight: 1.35, fontFamily: "var(--font-heading)",
      }}>
        {post.title}
      </h2>
      {post.imageUrl && (
        <div style={{ marginBottom: 12, borderRadius: 10, overflow: "hidden" }}>
          <img src={post.imageUrl} alt="" style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }} />
        </div>
      )}
      <p style={{
        color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6,
        margin: "0 0 16px", display: "-webkit-box", WebkitLineClamp: 3,
        WebkitBoxOrient: "vertical", overflow: "hidden",
      }}>
        {post.body.replace(/[*#\-]/g, "").slice(0, 200)}...
      </p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Avatar name={post.author} size={28} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>{post.author}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 13, color: "var(--text-muted)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>♥ {post.likes}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>💬 {post.comments.length}</span>
        </div>
      </div>
    </article>
  );
}

// ─── PostDetail ───────────────────────────────────────────────────────────────
function PostDetail({ post, onBack, onLike, onComment, onReport }) {
  const { user } = useAuth();
  const [comment, setComment] = useState("");
  const [showReportModal, setShowReportModal] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");

  const handleComment = () => {
    if (!comment.trim() || !user) return;
    onComment(post.id, comment.trim());
    setComment("");
  };

  const handleReply = () => {
    if (!replyText.trim() || !user) return;
    onComment(post.id, replyText.trim(), replyingTo);
    setReplyText("");
    setReplyingTo(null);
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <button
        onClick={onBack}
        style={{
          background: "none", border: "none", color: "var(--accent)",
          cursor: "pointer", fontSize: 14, fontWeight: 600, padding: "8px 0",
          marginBottom: 16, display: "flex", alignItems: "center", gap: 6,
        }}
      >
        ← Back to feed
      </button>

      <article style={{
        background: "var(--card-bg)", borderRadius: 16, padding: 32,
        border: "1px solid var(--border)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}>
        {post.urgency && <UrgencyBanner urgency={post.urgency} />}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <CategoryBadge category={post.category} />
          <span style={{ color: "var(--text-muted)", fontSize: 13 }}>·</span>
          <span style={{ color: "var(--text-muted)", fontSize: 13 }}>{timeAgo(post.createdAt)}</span>
        </div>

        <h1 style={{
          fontSize: 28, fontWeight: 800, color: "var(--text-primary)",
          margin: "0 0 20px", lineHeight: 1.3, fontFamily: "var(--font-heading)",
        }}>
          {post.title}
        </h1>

        <div style={{
          display: "flex", alignItems: "center", gap: 10, marginBottom: 24,
          paddingBottom: 20, borderBottom: "1px solid var(--border)",
        }}>
          <Avatar name={post.author} size={36} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{post.author}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {new Date(post.createdAt).toLocaleDateString("en-US", {
                weekday: "long", month: "long", day: "numeric", year: "numeric",
              })}
            </div>
          </div>
        </div>

        <div style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.8 }}>
          <RenderMarkdown text={post.body} />
        </div>

        {post.imageUrl && (
          <div style={{ marginTop: 20, borderRadius: 12, overflow: "hidden" }}>
            <img src={post.imageUrl} alt="" style={{ width: "100%", maxHeight: 420, objectFit: "cover", display: "block" }} />
          </div>
        )}

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginTop: 28, paddingTop: 20, borderTop: "1px solid var(--border)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => { if (!user) return; onLike(post.id); }}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 18px",
                borderRadius: 24, border: "1px solid var(--border)",
                background: user && post.likedBy.includes(user.id) ? "var(--accent)" : "transparent",
                color: user && post.likedBy.includes(user.id) ? "#fff" : "var(--text-secondary)",
                cursor: user ? "pointer" : "default", fontSize: 14, fontWeight: 600, transition: "all 0.2s",
              }}
              title={!user ? "Sign in to like" : ""}
            >
              ♥ {post.likes}
            </button>
            <span style={{ fontSize: 14, color: "var(--text-muted)" }}>💬 {post.comments.length} comments</span>
          </div>
          {user && user.id !== post.authorId && (
            <button
              onClick={() => setShowReportModal(true)}
              style={{
                background: "none", border: "1px solid var(--border)",
                color: "var(--text-muted)", fontSize: 12, fontWeight: 600,
                padding: "6px 14px", borderRadius: 8, cursor: "pointer",
              }}
            >
              ⚑ Report
            </button>
          )}
        </div>
      </article>

      {/* Comments */}
      <div style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16, fontFamily: "var(--font-heading)" }}>
          Comments
        </h3>

        {user ? (
          <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
            <Avatar name={user.displayName} size={36} />
            <div style={{ flex: 1 }}>
              <textarea
                value={comment} onChange={(e) => setComment(e.target.value)}
                placeholder="Share your thoughts..."
                style={{
                  width: "100%", padding: 14, borderRadius: 12,
                  border: "1px solid var(--border)", background: "var(--card-bg)",
                  color: "var(--text-primary)", fontSize: 14, resize: "vertical",
                  minHeight: 80, fontFamily: "inherit", outline: "none", boxSizing: "border-box",
                }}
              />
              <button onClick={handleComment} disabled={!comment.trim()} style={{
                marginTop: 8, padding: "8px 20px", borderRadius: 8, border: "none",
                background: comment.trim() ? "var(--accent)" : "var(--border)",
                color: comment.trim() ? "#fff" : "var(--text-muted)",
                fontSize: 13, fontWeight: 600, cursor: comment.trim() ? "pointer" : "default",
              }}>
                Post Comment
              </button>
            </div>
          </div>
        ) : (
          <p style={{
            color: "var(--text-muted)", fontSize: 14, fontStyle: "italic",
            marginBottom: 20, padding: "12px 16px", background: "var(--bg-secondary)", borderRadius: 10,
          }}>
            Sign in to join the conversation.
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {post.comments.filter((c) => !c.parentCommentId).map((c) => (
            <div key={c.id}>
              <div style={{ display: "flex", gap: 12, padding: 16, borderRadius: 12, background: "var(--bg-secondary)" }}>
                <Avatar name={c.author} size={32} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{c.author}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{timeAgo(c.createdAt)}</span>
                  </div>
                  <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 8px" }}>{c.body}</p>
                  {user && (
                    <button
                      onClick={() => setReplyingTo(replyingTo === c.id ? null : c.id)}
                      style={{
                        background: "none", border: "none", color: "var(--text-muted)",
                        fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0,
                      }}
                    >
                      ↩ Reply
                    </button>
                  )}
                </div>
              </div>

              {/* Reply form */}
              {replyingTo === c.id && (
                <div style={{ display: "flex", gap: 10, marginTop: 8, marginLeft: 44 }}>
                  <Avatar name={user.displayName} size={28} />
                  <div style={{ flex: 1 }}>
                    <textarea
                      value={replyText} onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Replying to ${c.author}...`}
                      rows={2}
                      style={{
                        width: "100%", padding: 10, borderRadius: 10,
                        border: "1px solid var(--border)", background: "var(--card-bg)",
                        color: "var(--text-primary)", fontSize: 13, resize: "vertical",
                        fontFamily: "inherit", outline: "none", boxSizing: "border-box",
                      }}
                    />
                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                      <button onClick={handleReply} disabled={!replyText.trim()} style={{
                        padding: "6px 16px", borderRadius: 8, border: "none",
                        background: replyText.trim() ? "var(--accent)" : "var(--border)",
                        color: replyText.trim() ? "#fff" : "var(--text-muted)",
                        fontSize: 12, fontWeight: 600, cursor: replyText.trim() ? "pointer" : "default",
                      }}>
                        Post Reply
                      </button>
                      <button onClick={() => { setReplyingTo(null); setReplyText(""); }} style={{
                        padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border)",
                        background: "transparent", color: "var(--text-muted)", fontSize: 12, cursor: "pointer",
                      }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Nested replies */}
              {post.comments.filter((r) => r.parentCommentId === c.id).map((reply) => (
                <div key={reply.id} style={{ display: "flex", gap: 12, padding: 14, borderRadius: 12, background: "var(--bg-secondary)", marginTop: 6, marginLeft: 44, borderLeft: "2px solid var(--border)" }}>
                  <Avatar name={reply.author} size={28} />
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{reply.author}</span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{timeAgo(reply.createdAt)}</span>
                    </div>
                    <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>{reply.body}</p>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {showReportModal && (
        <ReportModal
          post={post}
          onClose={() => setShowReportModal(false)}
          onReport={(reason) => {
            onReport(post.id, reason);
            setShowReportModal(false);
          }}
        />
      )}
    </div>
  );
}

// ─── CreatePostForm ───────────────────────────────────────────────────────────
function CreatePostForm({ onSubmit, onCancel }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("community");
  const [urgency, setUrgency] = useState("info");
  const [imageDataUrl, setImageDataUrl] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageFile = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) { alert("Image must be under 5MB."); return; }
    const compressed = await compressImage(file);
    setImageDataUrl(compressed);
  };

  const handleSubmit = () => {
    if (!title.trim() || !body.trim()) return;
    onSubmit({
      title: title.trim(),
      body: body.trim(),
      category,
      urgency: category === "watch" ? urgency : null,
      imageUrl: imageDataUrl,
    });
  };

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", marginBottom: 24, fontFamily: "var(--font-heading)" }}>
        Share with Highland
      </h2>
      <div style={{ background: "var(--card-bg)", borderRadius: 16, padding: 28, border: "1px solid var(--border)" }}>

        {/* Category */}
        <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Category</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {CATEGORIES.filter((c) => c.key !== "all").map((c) => (
            <button key={c.key} onClick={() => setCategory(c.key)} style={{
              padding: "8px 16px", borderRadius: 24,
              border: `2px solid ${category === c.key ? c.color : "var(--border)"}`,
              background: category === c.key ? c.bgActive : "transparent",
              color: category === c.key ? c.color : "var(--text-muted)",
              fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
            }}>
              {c.icon} {c.label}
            </button>
          ))}
        </div>

        {/* Urgency (Watch only) */}
        {category === "watch" && (
          <>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Urgency Level</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {Object.entries(URGENCY).map(([key, val]) => (
                <button key={key} onClick={() => setUrgency(key)} style={{
                  padding: "8px 16px", borderRadius: 24,
                  border: `2px solid ${urgency === key ? val.border : "var(--border)"}`,
                  background: urgency === key ? val.bg : "transparent",
                  color: urgency === key ? val.text : "var(--text-muted)",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}>
                  {val.icon} {val.label}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Title */}
        <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Title</label>
        <input
          value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120}
          placeholder="What's happening in the neighborhood?"
          style={{
            width: "100%", padding: 14, borderRadius: 10, border: "1px solid var(--border)",
            background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 16,
            fontWeight: 600, marginBottom: 6, outline: "none", boxSizing: "border-box",
            fontFamily: "var(--font-heading)",
          }}
        />
        <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 16px" }}>{title.length}/120</p>

        {/* Body with Write/Preview tabs */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Details</label>
          <div style={{ display: "flex", borderRadius: 8, border: "1px solid var(--border)", overflow: "hidden" }}>
            {["Write", "Preview"].map((tab) => {
              const active = tab === "Write" ? !previewMode : previewMode;
              return (
                <button key={tab} onClick={() => setPreviewMode(tab === "Preview")} style={{
                  padding: "5px 14px", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer",
                  background: active ? "var(--accent)" : "transparent",
                  color: active ? "#fff" : "var(--text-muted)",
                  transition: "all 0.15s",
                }}>{tab}</button>
              );
            })}
          </div>
        </div>

        {previewMode ? (
          <div style={{
            width: "100%", minHeight: 200, padding: 14, borderRadius: 10,
            border: "1px solid var(--border)", background: "var(--bg-secondary)",
            color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.7,
            marginBottom: 6, boxSizing: "border-box",
          }}>
            {body.trim()
              ? <RenderMarkdown text={body} />
              : <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Nothing to preview yet.</span>}
          </div>
        ) : (
          <textarea
            value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000}
            placeholder="Share the full story... (Markdown supported)" rows={10}
            style={{
              width: "100%", padding: 14, borderRadius: 10, border: "1px solid var(--border)",
              background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 14,
              lineHeight: 1.7, resize: "vertical", marginBottom: 6, outline: "none",
              fontFamily: "inherit", boxSizing: "border-box",
            }}
          />
        )}
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 20 }}>{body.length}/5000 · Markdown formatting supported</p>

        {/* Image Upload */}
        <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Image <span style={{ textTransform: "none", fontWeight: 400, color: "var(--text-muted)" }}>(optional)</span>
        </label>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={async (e) => { e.preventDefault(); setDragOver(false); await handleImageFile(e.dataTransfer.files[0]); }}
          onClick={() => !imageDataUrl && fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? "var(--accent)" : "var(--border)"}`,
            borderRadius: 10, marginBottom: 20, overflow: "hidden",
            background: dragOver ? "var(--accent-light)" : "var(--bg-secondary)",
            transition: "all 0.15s", cursor: imageDataUrl ? "default" : "pointer",
          }}
        >
          {imageDataUrl ? (
            <div style={{ position: "relative" }}>
              <img src={imageDataUrl} alt="Preview" style={{ width: "100%", maxHeight: 240, objectFit: "cover", display: "block" }} />
              <button
                onClick={(e) => { e.stopPropagation(); setImageDataUrl(null); }}
                style={{
                  position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)",
                  color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}
              >
                ✕ Remove
              </button>
            </div>
          ) : (
            <div style={{ padding: "24px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>📸</div>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 4px", fontWeight: 600 }}>
                Drag & drop an image or click to browse
              </p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>JPG, PNG, WebP · max 5MB · resized to 1200px</p>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }}
            onChange={async (e) => { await handleImageFile(e.target.files[0]); e.target.value = ""; }} />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={handleSubmit} disabled={!title.trim() || !body.trim()} style={{
            padding: "12px 28px", borderRadius: 10, border: "none",
            background: title.trim() && body.trim() ? "var(--accent)" : "var(--border)",
            color: title.trim() && body.trim() ? "#fff" : "var(--text-muted)",
            fontSize: 15, fontWeight: 700, cursor: title.trim() && body.trim() ? "pointer" : "default",
          }}>
            Publish Post
          </button>
          <button onClick={onCancel} style={{
            padding: "12px 28px", borderRadius: 10, border: "1px solid var(--border)",
            background: "transparent", color: "var(--text-secondary)", fontSize: 15, fontWeight: 600, cursor: "pointer",
          }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AuthModal ────────────────────────────────────────────────────────────────
function AuthModal({ mode, onClose, onSwitch }) {
  const { login, signup } = useAuth();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!email.includes("@")) return setError("Please enter a valid email.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (mode === "signup") {
      if (!displayName.trim()) return setError("Display name is required.");
      if (displayName.trim().length < 3) return setError("Display name must be at least 3 characters.");
      if (password !== confirm) return setError("Passwords don't match.");
      try {
        await signup(email, displayName.trim(), password);
        onClose();
      } catch (e) {
        setError(e.message || "Signup failed. Please try again.");
      }
    } else {
      try {
        await login(email, password);
        onClose();
      } catch (e) {
        setError(e.message || "Login failed. Check your email and password.");
      }
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--card-bg)", borderRadius: 20, padding: 36,
          width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        }}
      >
        {showForgot ? (
          <>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 4px", fontFamily: "var(--font-heading)" }}>
              Reset Password
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 24px" }}>
              Enter your email and we'll send a reset link.
            </p>
            {resetSent ? (
              <div style={{ background: "var(--urgency-info-bg)", color: "var(--urgency-info-text)", padding: "12px 16px", borderRadius: 10, fontSize: 14, fontWeight: 600, marginBottom: 20, lineHeight: 1.5 }}>
                ✅ Reset link sent to <strong>{resetEmail}</strong>. Check your inbox.
              </div>
            ) : (
              <>
                <input
                  type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="Your email address"
                  style={{
                    width: "100%", padding: 14, borderRadius: 10, border: "1px solid var(--border)",
                    background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 14,
                    marginBottom: 12, outline: "none", boxSizing: "border-box",
                  }}
                />
                <button
                  onClick={async () => {
                    if (!resetEmail.includes("@")) return;
                    try {
                      if (USE_API) await api.auth.forgotPassword(resetEmail);
                      setResetSent(true);
                    } catch (e) {
                      setResetSent(true); // Always show success to prevent email enumeration
                    }
                  }}
                  style={{
                    width: "100%", padding: 14, borderRadius: 10, border: "none",
                    background: "var(--accent)", color: "#fff", fontSize: 15,
                    fontWeight: 700, cursor: "pointer", marginBottom: 16,
                  }}
                >
                  Send Reset Link
                </button>
              </>
            )}
            <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
              <span onClick={() => { setShowForgot(false); setResetSent(false); setResetEmail(""); }} style={{ color: "var(--accent)", fontWeight: 600, cursor: "pointer" }}>
                ← Back to sign in
              </span>
            </p>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 4px", fontFamily: "var(--font-heading)" }}>
              {mode === "login" ? "Welcome Back" : "Join The Highland Oak"}
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 24px" }}>
              {mode === "login" ? "Sign in to post and interact." : "Create your anonymous community account."}
            </p>

            {error && (
              <div style={{ background: "var(--urgency-alert-bg)", color: "var(--urgency-alert-text)", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16, fontWeight: 600 }}>
                {error}
              </div>
            )}

            {mode === "signup" && (
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display Name (public, anonymous)" style={{ width: "100%", padding: 14, borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 14, marginBottom: 12, outline: "none", boxSizing: "border-box" }} />
            )}
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (private, never shared)" style={{ width: "100%", padding: 14, borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 14, marginBottom: 12, outline: "none", boxSizing: "border-box" }} />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" style={{ width: "100%", padding: 14, borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 14, marginBottom: 12, outline: "none", boxSizing: "border-box" }} />
            {mode === "signup" && (
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm Password" style={{ width: "100%", padding: 14, borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 14, marginBottom: 12, outline: "none", boxSizing: "border-box" }} />
            )}

            {mode === "login" && (
              <p style={{ textAlign: "right", fontSize: 12, color: "var(--text-muted)", margin: "-4px 0 12px" }}>
                <span onClick={() => setShowForgot(true)} style={{ color: "var(--accent)", fontWeight: 600, cursor: "pointer" }}>
                  Forgot password?
                </span>
              </p>
            )}

            <button onClick={handleSubmit} style={{ width: "100%", padding: 14, borderRadius: 10, border: "none", background: "var(--accent)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 8, marginBottom: 16 }}>
              {mode === "login" ? "Sign In" : "Create Account"}
            </button>

            <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
              {mode === "login" ? "New here? " : "Already have an account? "}
              <span onClick={onSwitch} style={{ color: "var(--accent)", fontWeight: 600, cursor: "pointer" }}>
                {mode === "login" ? "Create an account" : "Sign in"}
              </span>
            </p>

            {mode === "signup" && (
              <p style={{ textAlign: "center", fontSize: 11, color: "var(--text-muted)", marginTop: 12, lineHeight: 1.5 }}>
                🔒 Your email is private and never displayed. Only your display name is visible to neighbors.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── ReportModal ──────────────────────────────────────────────────────────────
function ReportModal({ post, onClose, onReport }) {
  const [reason, setReason] = useState(REPORT_REASONS[0]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--card-bg)", borderRadius: 20, padding: 32,
          width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 6px", fontFamily: "var(--font-heading)" }}>
          Report Post
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 20px", lineHeight: 1.5 }}>
          Help keep the neighborhood board safe and respectful.
        </p>

        <div style={{
          padding: "10px 14px", background: "var(--bg-secondary)",
          borderRadius: 8, marginBottom: 20, fontSize: 13, color: "var(--text-secondary)",
          fontWeight: 600, borderLeft: "3px solid var(--accent)",
        }}>
          {post.title.slice(0, 60)}{post.title.length > 60 ? "…" : ""}
        </div>

        <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Reason for Report
        </label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          style={{
            width: "100%", padding: "12px 14px", borderRadius: 10,
            border: "1px solid var(--border)", background: "var(--bg-secondary)",
            color: "var(--text-primary)", fontSize: 14, marginBottom: 20,
            outline: "none", cursor: "pointer", boxSizing: "border-box",
          }}
        >
          {REPORT_REASONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => onReport(reason)}
            style={{
              flex: 1, padding: "12px", borderRadius: 10, border: "none",
              background: "var(--urgency-alert-border)", color: "#fff", fontSize: 14,
              fontWeight: 700, cursor: "pointer",
            }}
          >
            Submit Report
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "12px 20px", borderRadius: 10, border: "1px solid var(--border)",
              background: "transparent", color: "var(--text-secondary)",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── WatchDashboard ───────────────────────────────────────────────────────────
function WatchDashboard({ posts, onSelect }) {
  const watchPosts = posts.filter((p) => p.category === "watch" && p.status === "active");

  const alertPosts = watchPosts.filter((p) => p.urgency === "alert");
  const cautionPosts = watchPosts.filter((p) => p.urgency === "caution");
  const infoPosts = watchPosts.filter((p) => p.urgency === "info");

  const sortedPosts = [
    ...alertPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    ...cautionPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    ...infoPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  ];

  const statCards = [
    { label: "Active Alerts",   count: alertPosts.length,   color: "var(--urgency-alert-text)",   bg: "var(--urgency-alert-bg)",   subtleBorder: "var(--urgency-alert-subtle)",   icon: "🔴" },
    { label: "Caution Notices", count: cautionPosts.length, color: "var(--urgency-caution-text)", bg: "var(--urgency-caution-bg)", subtleBorder: "var(--urgency-caution-subtle)", icon: "🟡" },
    { label: "Info Posts",      count: infoPosts.length,    color: "var(--urgency-info-text)",    bg: "var(--urgency-info-bg)",    subtleBorder: "var(--urgency-info-subtle)",    icon: "🟢" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 6px", fontFamily: "var(--font-heading)" }}>
          👁️ Highland Watch
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0 }}>
          Safety alerts for Highland City, sorted by urgency level.
        </p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
        {statCards.map((s) => (
          <div key={s.label} style={{
            background: s.bg, borderRadius: 14, padding: "18px 20px",
            border: `2px solid ${s.subtleBorder}`,
          }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.count}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: s.color, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Active Alert Banner */}
      {alertPosts.length > 0 && (
        <div style={{
          background: "var(--urgency-alert-bg)", border: "2px solid var(--urgency-alert-border)", borderRadius: 12,
          padding: "14px 18px", marginBottom: 24,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ fontSize: 22 }}>🚨</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--urgency-alert-text)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Active Alert
            </div>
            <div style={{ fontSize: 14, color: "var(--urgency-alert-text)", fontWeight: 600, opacity: 0.85 }}>
              {alertPosts[0].title}
            </div>
          </div>
          <button
            onClick={() => onSelect(alertPosts[0].id)}
            style={{
              background: "var(--urgency-alert-border)", color: "#fff", border: "none",
              padding: "8px 16px", borderRadius: 8, fontSize: 13,
              fontWeight: 600, cursor: "pointer",
            }}
          >
            View
          </button>
        </div>
      )}

      {/* Posts */}
      {sortedPosts.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>✅</p>
          <p style={{ fontSize: 16, fontWeight: 600 }}>No active watch posts</p>
          <p style={{ fontSize: 14 }}>All clear in the neighborhood!</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {sortedPosts.map((post) => (
            <PostCard key={post.id} post={post} onSelect={onSelect} showLargeBadge />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ProfilePage ──────────────────────────────────────────────────────────────
function ProfilePage({ posts, onSelectPost, onNavigate }) {
  const { user, updateDisplayName, deleteAccount } = useAuth();
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState(user?.displayName || "");
  const [nameError, setNameError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  if (!user) {
    return (
      <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
        <p style={{ fontSize: 40, marginBottom: 12 }}>🔐</p>
        <p style={{ fontSize: 16, fontWeight: 600 }}>Sign in to view your profile</p>
      </div>
    );
  }

  const myPosts = posts.filter((p) => p.authorId === user.id && p.status === "active");
  const totalLikes = myPosts.reduce((sum, p) => sum + p.likes, 0);

  const handleSaveName = () => {
    setNameError("");
    if (newName.trim().length < 3) return setNameError("Display name must be at least 3 characters.");
    updateDisplayName(newName.trim());
    setEditing(false);
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmText !== user.displayName) return;
    deleteAccount();
    onNavigate({ page: "feed" });
  };

  const roleBadgeStyle = {
    display: "inline-block", padding: "3px 10px", borderRadius: 20,
    fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
    background: user.role === "admin" ? "#FEF9C3" : "var(--accent-light)",
    color: user.role === "admin" ? "#A16207" : "var(--accent)",
    marginLeft: 8,
  };

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      {/* Profile Header */}
      <div style={{
        background: "var(--card-bg)", borderRadius: 16, padding: 28,
        border: "1px solid var(--border)", marginBottom: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20 }}>
          <Avatar name={user.displayName} size={64} />
          <div>
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
                {user.displayName}
              </h2>
              <span style={roleBadgeStyle}>{user.role}</span>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
              Member since {formatJoinDate(user.joinedAt)}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 20 }}>
          <div style={{ background: "var(--bg-secondary)", borderRadius: 10, padding: "12px 18px", flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)" }}>{myPosts.length}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Posts</div>
          </div>
          <div style={{ background: "var(--bg-secondary)", borderRadius: 10, padding: "12px 18px", flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--accent)" }}>{totalLikes}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Likes Received</div>
          </div>
        </div>
      </div>

      {/* Edit Display Name */}
      <div style={{
        background: "var(--card-bg)", borderRadius: 16, padding: 24,
        border: "1px solid var(--border)", marginBottom: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: editing ? 16 : 0 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>Display Name</h3>
          {!editing && (
            <button
              onClick={() => { setEditing(true); setNewName(user.displayName); }}
              style={{
                background: "none", border: "1px solid var(--border)", color: "var(--accent)",
                padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              Edit
            </button>
          )}
        </div>

        {!editing && (
          <p style={{ margin: "8px 0 0", fontSize: 15, color: "var(--text-secondary)", fontWeight: 600 }}>
            {user.displayName}
          </p>
        )}

        {editing && (
          <>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={40}
              placeholder="New display name"
              style={{
                width: "100%", padding: 12, borderRadius: 8, border: "1px solid var(--border)",
                background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 14,
                outline: "none", boxSizing: "border-box", marginBottom: nameError ? 6 : 12,
              }}
            />
            {nameError && (
              <p style={{ fontSize: 12, color: "#B91C1C", margin: "0 0 10px", fontWeight: 600 }}>{nameError}</p>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleSaveName}
                style={{
                  padding: "8px 20px", borderRadius: 8, border: "none",
                  background: "var(--accent)", color: "#fff", fontSize: 13,
                  fontWeight: 700, cursor: "pointer",
                }}
              >
                Save
              </button>
              <button
                onClick={() => { setEditing(false); setNameError(""); }}
                style={{
                  padding: "8px 18px", borderRadius: 8, border: "1px solid var(--border)",
                  background: "transparent", color: "var(--text-secondary)",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>

      {/* My Posts */}
      <div style={{
        background: "var(--card-bg)", borderRadius: 16, padding: 24,
        border: "1px solid var(--border)", marginBottom: 20,
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px", color: "var(--text-primary)" }}>
          My Posts ({myPosts.length})
        </h3>
        {myPosts.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>You haven't posted yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {myPosts.map((p) => (
              <div
                key={p.id}
                onClick={() => onSelectPost(p.id)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 14px", borderRadius: 10, background: "var(--bg-secondary)",
                  cursor: "pointer", transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-light)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-secondary)")}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.title}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                    {timeAgo(p.createdAt)} · {p.category}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: "var(--text-muted)", marginLeft: 12 }}>
                  <span>♥ {p.likes}</span>
                  <span>💬 {p.comments.length}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div style={{
        background: "var(--card-bg)", borderRadius: 16, padding: 24,
        border: "2px solid var(--admin-report-border)",
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px", color: "var(--urgency-alert-text)" }}>
          Danger Zone
        </h3>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px", lineHeight: 1.5 }}>
          Deleting your account is permanent and cannot be undone. All your posts and comments will remain but will be attributed to a deleted account.
        </p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              padding: "10px 20px", borderRadius: 8, border: "1px solid var(--admin-report-border)",
              background: "transparent", color: "var(--urgency-alert-text)",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}
          >
            Delete Account
          </button>
        ) : (
          <div>
            <p style={{ fontSize: 13, color: "var(--urgency-alert-text)", fontWeight: 600, margin: "0 0 10px" }}>
              Type your display name <strong>{user.displayName}</strong> to confirm:
            </p>
            <input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={user.displayName}
              style={{
                width: "100%", padding: 12, borderRadius: 8, border: "1px solid var(--admin-report-border)",
                background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 14,
                outline: "none", boxSizing: "border-box", marginBottom: 12,
              }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== user.displayName}
                style={{
                  padding: "10px 20px", borderRadius: 8, border: "none",
                  background: deleteConfirmText === user.displayName ? "var(--urgency-alert-border)" : "var(--border)",
                  color: deleteConfirmText === user.displayName ? "#fff" : "var(--text-muted)",
                  fontSize: 13, fontWeight: 700,
                  cursor: deleteConfirmText === user.displayName ? "pointer" : "default",
                }}
              >
                Yes, Delete My Account
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); }}
                style={{
                  padding: "10px 18px", borderRadius: 8, border: "1px solid var(--border)",
                  background: "transparent", color: "var(--text-secondary)",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AdminDashboard ───────────────────────────────────────────────────────────
function AdminDashboard({ posts, reports, onHidePost, onRestorePost, onDeletePost, onDismissReport }) {
  const { user } = useAuth();

  if (!user || user.role !== "admin") {
    return (
      <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
        <p style={{ fontSize: 40, marginBottom: 12 }}>🔐</p>
        <p style={{ fontSize: 16, fontWeight: 600 }}>Admin access required</p>
      </div>
    );
  }

  const activePosts = posts.filter((p) => p.status === "active");
  const hiddenPosts = posts.filter((p) => p.status === "hidden");
  const pendingReports = reports.filter((r) => {
    const p = posts.find((post) => post.id === r.postId);
    return p && p.status === "active";
  });

  // Group reports by postId
  const reportsByPost = {};
  pendingReports.forEach((r) => {
    if (!reportsByPost[r.postId]) reportsByPost[r.postId] = [];
    reportsByPost[r.postId].push(r);
  });

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 6px", fontFamily: "var(--font-heading)" }}>
          🛡️ Admin Dashboard
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0 }}>
          Moderation tools and community statistics.
        </p>
      </div>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Active Posts",    value: activePosts.length,                   color: "var(--urgency-info-text)",    bg: "var(--urgency-info-bg)",    subtleBorder: "var(--urgency-info-subtle)",    icon: "📝" },
          { label: "Pending Reports", value: Object.keys(reportsByPost).length,    color: "var(--urgency-caution-text)", bg: "var(--urgency-caution-bg)", subtleBorder: "var(--urgency-caution-subtle)", icon: "⚑" },
          { label: "Hidden Posts",    value: hiddenPosts.length,                   color: "var(--admin-neutral-text)",   bg: "var(--bg-secondary)",       subtleBorder: "var(--admin-neutral-subtle)",   icon: "🚫" },
        ].map((s) => (
          <div key={s.label} style={{
            background: s.bg, borderRadius: 14, padding: "18px 20px",
            border: `1px solid ${s.subtleBorder}`,
          }}>
            <div style={{ fontSize: 26, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: s.color, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Reports Queue */}
      <div style={{
        background: "var(--card-bg)", borderRadius: 16, padding: 24,
        border: "1px solid var(--border)", marginBottom: 20,
      }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 16px", color: "var(--text-primary)" }}>
          Reports Queue ({Object.keys(reportsByPost).length})
        </h3>

        {Object.keys(reportsByPost).length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>No pending reports. Community looks great!</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {Object.entries(reportsByPost).map(([postId, postReports]) => {
              const post = posts.find((p) => p.id === postId);
              if (!post) return null;
              return (
                <div key={postId} style={{
                  border: "1px solid var(--admin-report-border)", borderRadius: 12, padding: 16,
                  background: "var(--admin-report-bg)",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                        {post.title}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        by {post.author} · {postReports.length} report{postReports.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <span style={{
                      background: "var(--urgency-alert-bg)", color: "var(--urgency-alert-text)", padding: "3px 10px",
                      borderRadius: 20, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
                    }}>
                      {postReports.length} reports
                    </span>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                    {postReports.map((r) => (
                      <span key={r.id} style={{
                        background: "var(--urgency-alert-bg)", color: "var(--urgency-alert-text)",
                        padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                      }}>
                        {r.reason}
                      </span>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={() => onHidePost(postId)}
                      style={{
                        padding: "7px 16px", borderRadius: 8, border: "none",
                        background: "var(--urgency-alert-border)", color: "#fff",
                        fontSize: 12, fontWeight: 700, cursor: "pointer",
                      }}
                    >
                      Hide Post
                    </button>
                    <button
                      onClick={() => onDismissReport(postId)}
                      style={{
                        padding: "7px 16px", borderRadius: 8, border: "1px solid var(--border)",
                        background: "transparent", color: "var(--text-secondary)",
                        fontSize: 12, fontWeight: 600, cursor: "pointer",
                      }}
                    >
                      Dismiss Reports
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Hidden Posts */}
      <div style={{
        background: "var(--card-bg)", borderRadius: 16, padding: 24,
        border: "1px solid var(--border)",
      }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 16px", color: "var(--text-primary)" }}>
          Hidden Posts ({hiddenPosts.length})
        </h3>

        {hiddenPosts.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>No hidden posts.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {hiddenPosts.map((post) => (
              <div key={post.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 16px", borderRadius: 10, background: "var(--bg-secondary)",
                border: "1px solid var(--border)", gap: 12,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {post.title}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    by {post.author} · hidden · {post.reportCount} report{post.reportCount !== 1 ? "s" : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => onRestorePost(post.id)}
                    style={{
                      padding: "6px 14px", borderRadius: 8, border: "1px solid var(--urgency-info-border)",
                      background: "transparent", color: "var(--urgency-info-text)",
                      fontSize: 12, fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => onDeletePost(post.id)}
                    style={{
                      padding: "6px 14px", borderRadius: 8, border: "none",
                      background: "var(--urgency-alert-border)", color: "#fff",
                      fontSize: 12, fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    Delete Forever
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main App Content ─────────────────────────────────────────────────────────
function AppContent() {
  const { user, logout } = useAuth();

  // State
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [reports, setReports] = useState([]);
  const [view, setView] = useState({ page: "feed" });
  const [activeCategory, setActiveCategory] = useState("all");
  const [authModal, setAuthModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // Derived
  const selectedPost = view.page === "post" ? posts.find((p) => p.id === view.postId) : null;
  const activeAlerts = posts.filter((p) => p.category === "watch" && p.urgency === "alert" && p.status === "active");

  const filteredPosts = posts.filter((p) => {
    if (p.status !== "active") return false;
    if (activeCategory !== "all" && p.category !== activeCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q);
    }
    return true;
  });

  // Load posts from API when VITE_API_URL is configured
  useEffect(() => {
    if (!USE_API) return;
    api.posts.listPosts({ category: activeCategory === "all" ? undefined : activeCategory })
      .then(({ items }) => {
        if (items && items.length) setPosts(items.map(normalizeApiPost));
      })
      .catch(console.error);
  }, [activeCategory]);

  // Toast helper
  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Navigate helper
  const navigate = useCallback((newView) => {
    setView(newView);
    if (newView.page === "feed") {
      setSearchQuery("");
    }
  }, []);

  // Handlers
  const handleLike = useCallback(
    async (postId) => {
      if (!user) return;
      // Optimistic update
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          const liked = p.likedBy.includes(user.id);
          return {
            ...p,
            likes: liked ? p.likes - 1 : p.likes + 1,
            likedBy: liked ? p.likedBy.filter((id) => id !== user.id) : [...p.likedBy, user.id],
          };
        })
      );
      if (USE_API) {
        try {
          const { likeCount, liked } = await api.posts.likePost(postId);
          setPosts((prev) =>
            prev.map((p) => (p.id === postId ? { ...p, likes: likeCount, likedBy: liked ? [...p.likedBy, user.id] : p.likedBy.filter((id) => id !== user.id) } : p))
          );
        } catch (e) {
          console.error("Like failed:", e);
        }
      }
    },
    [user]
  );

  const handleComment = useCallback(
    async (postId, body, parentCommentId = null) => {
      if (!user) return;
      if (USE_API) {
        try {
          const comment = await api.comments.createComment(postId, body, parentCommentId);
          const normalized = normalizeApiComment(comment);
          setPosts((prev) =>
            prev.map((p) =>
              p.id !== postId ? p : { ...p, comments: [...p.comments, normalized] }
            )
          );
        } catch (e) {
          console.error("Comment failed:", e);
        }
      } else {
        setPosts((prev) =>
          prev.map((p) =>
            p.id !== postId ? p : {
              ...p,
              comments: [...p.comments, { id: crypto.randomUUID(), body, author: user.displayName, parentCommentId, createdAt: new Date().toISOString() }],
            }
          )
        );
      }
    },
    [user]
  );

  const handleCreatePost = useCallback(
    async (postData) => {
      if (!user) return;
      if (USE_API) {
        try {
          const created = await api.posts.createPost({
            title: postData.title,
            body: postData.body,
            category: postData.category,
            urgency: postData.urgency,
            // imageKey from S3 presign flow — skipped for now since form gives data URL
            // TODO: implement full S3 presign upload when CreatePostForm passes File object
          });
          const normalized = normalizeApiPost(created);
          setPosts((prev) => [normalized, ...prev]);
          navigate({ page: "feed" });
          showToast("Post published!");
        } catch (e) {
          showToast(`Failed to create post: ${e.message}`);
        }
      } else {
        const newPost = {
          id: crypto.randomUUID(),
          imageUrl: null,
          ...postData,
          author: user.displayName,
          authorId: user.id,
          likes: 0,
          likedBy: [],
          comments: [],
          status: "active",
          reportCount: 0,
          createdAt: new Date().toISOString(),
        };
        setPosts((prev) => [newPost, ...prev]);
        navigate({ page: "feed" });
      }
    },
    [user, navigate, showToast]
  );

  const handleReport = useCallback(
    async (postId, reason) => {
      if (!user) return;
      if (USE_API) {
        try {
          await api.posts.reportPost(postId, reason);
          showToast("Report submitted. Thank you.");
        } catch (e) {
          showToast("Report failed. Please try again.");
        }
      } else {
        const post = posts.find((p) => p.id === postId);
        if (!post) return;
        const newReport = {
          id: crypto.randomUUID(),
          postId,
          postTitle: post.title,
          reason,
          reportedBy: user.id,
          createdAt: new Date().toISOString(),
        };
        setReports((prev) => [...prev, newReport]);
        setPosts((prev) =>
          prev.map((p) => {
            if (p.id !== postId) return p;
            const newCount = p.reportCount + 1;
            return { ...p, reportCount: newCount, status: newCount >= 3 ? "hidden" : p.status };
          })
        );
        showToast("Report submitted. Thank you.");
      }
    },
    [user, posts, showToast]
  );

  // Admin handlers
  const handleHidePost = useCallback(async (postId) => {
    if (USE_API) { try { await api.admin.updatePostStatus(postId, "hidden"); } catch (e) { showToast(`Error: ${e.message}`); return; } }
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, status: "hidden" } : p)));
    showToast("Post hidden.");
  }, [showToast]);

  const handleRestorePost = useCallback(async (postId) => {
    if (USE_API) { try { await api.admin.updatePostStatus(postId, "active"); } catch (e) { showToast(`Error: ${e.message}`); return; } }
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, status: "active", reportCount: 0 } : p)));
    setReports((prev) => prev.filter((r) => r.postId !== postId));
    showToast("Post restored.");
  }, [showToast]);

  const handleDeletePost = useCallback(async (postId) => {
    if (USE_API) { try { await api.admin.hardDeletePost(postId); } catch (e) { showToast(`Error: ${e.message}`); return; } }
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setReports((prev) => prev.filter((r) => r.postId !== postId));
    showToast("Post permanently deleted.");
  }, [showToast]);

  const handleDismissReport = useCallback((postId) => {
    setReports((prev) => prev.filter((r) => r.postId !== postId));
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, reportCount: 0 } : p)));
    showToast("Reports dismissed.");
  }, [showToast]);

  // Render main content area
  const renderMain = () => {
    if (view.creating && user) {
      return (
        <CreatePostForm
          onSubmit={handleCreatePost}
          onCancel={() => navigate({ page: "feed" })}
        />
      );
    }

    switch (view.page) {
      case "privacy":
        return <PrivacyPolicyPage />;
      case "terms":
        return <TermsOfServicePage />;
      case "watch":
        return (
          <WatchDashboard
            posts={posts}
            onSelect={(id) => navigate({ page: "post", postId: id })}
          />
        );
      case "profile":
        return (
          <ProfilePage
            posts={posts}
            onSelectPost={(id) => navigate({ page: "post", postId: id })}
            onNavigate={navigate}
          />
        );
      case "admin":
        return (
          <AdminDashboard
            posts={posts}
            reports={reports}
            onHidePost={handleHidePost}
            onRestorePost={handleRestorePost}
            onDeletePost={handleDeletePost}
            onDismissReport={handleDismissReport}
          />
        );
      case "post":
        if (selectedPost) {
          return (
            <PostDetail
              post={selectedPost}
              onBack={() => navigate({ page: "feed" })}
              onLike={handleLike}
              onComment={handleComment}
              onReport={handleReport}
            />
          );
        }
        // post not found (e.g. deleted) — fall back silently
        return null;
      case "feed":
      default:
        return (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
                {searchQuery ? `Search: "${searchQuery}"` : (CATEGORIES.find((c) => c.key === activeCategory)?.label || "All Posts")}
              </h2>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{filteredPosts.length} posts</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {filteredPosts.length === 0 ? (
                <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
                  <p style={{ fontSize: 40, marginBottom: 12 }}>🏡</p>
                  <p style={{ fontSize: 16, fontWeight: 600 }}>
                    {searchQuery ? "No posts match your search" : "No posts yet in this category"}
                  </p>
                  <p style={{ fontSize: 14 }}>
                    {searchQuery ? "Try different keywords." : "Be the first to share something!"}
                  </p>
                </div>
              ) : (
                filteredPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onSelect={(id) => navigate({ page: "post", postId: id })}
                  />
                ))
              )}
            </div>
          </>
        );
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      {/* Active Alert Banner */}
      {activeAlerts.length > 0 && view.page !== "watch" && (
        <div style={{
          background: "var(--urgency-alert-border)", color: "#fff", padding: "10px 20px",
          fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center",
          justifyContent: "center", gap: 8,
        }}>
          🔴 ACTIVE ALERT: {activeAlerts[0].title}
          <button
            onClick={() => navigate({ page: "post", postId: activeAlerts[0].id })}
            style={{
              background: "rgba(255,255,255,0.2)", border: "none", color: "#fff",
              padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}
          >
            View Details
          </button>
        </div>
      )}

      {/* Header */}
      <header style={{
        borderBottom: "1px solid var(--border)", padding: "0 24px",
        position: "sticky", top: 0, zIndex: 100,
        backgroundColor: "var(--header-bg)", backdropFilter: "blur(12px)",
        boxShadow: "0 1px 0 var(--border), 0 2px 8px rgba(0,0,0,0.04)",
      }}>
        {/* Top accent bar */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: "linear-gradient(90deg, var(--accent) 0%, var(--accent-mid) 50%, var(--oak-gold) 100%)",
        }} />
        <div style={{
          maxWidth: 1120, margin: "0 auto", display: "flex",
          alignItems: "center", justifyContent: "space-between", height: 64, gap: 16,
        }}>
          {/* Logo */}
          <div
            style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", flexShrink: 0 }}
            onClick={() => { navigate({ page: "feed" }); setActiveCategory("all"); setSearchQuery(""); }}
          >
            <div style={{
              width: 42, height: 42, borderRadius: 10, background: "var(--accent-light)",
              border: "1.5px solid var(--accent-border)", display: "flex",
              alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <OakTreeIcon size={30} />
            </div>
            <div>
              <h1 style={{ fontSize: 17, fontWeight: 800, margin: 0, lineHeight: 1.15, fontFamily: "var(--font-heading)", color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
                The Highland Oak
              </h1>
              <p style={{ fontSize: 10, margin: 0, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>
                Bulletin Board
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div style={{ flex: 1, maxWidth: 340, position: "relative" }}>
            <span style={{
              position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
              color: "var(--text-muted)", fontSize: 16, pointerEvents: "none",
            }}>
              🔍
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (view.page !== "feed") navigate({ page: "feed" });
              }}
              placeholder="Search posts..."
              style={{
                width: "100%", padding: "9px 14px 9px 38px", borderRadius: 24,
                border: "1px solid var(--border)", background: "var(--bg-secondary)",
                color: "var(--text-primary)", fontSize: 14, outline: "none",
                boxSizing: "border-box", transition: "border-color 0.15s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>

          {/* Right Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode((d) => !d)}
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              style={{
                background: "var(--bg-secondary)", border: "1px solid var(--border)",
                borderRadius: 10, width: 38, height: 38, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
              }}
            >
              {darkMode ? "☀️" : "🌙"}
            </button>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen((o) => !o)}
              style={{
                background: "var(--bg-secondary)", border: "1px solid var(--border)",
                borderRadius: 10, width: 38, height: 38, cursor: "pointer",
                display: "none", alignItems: "center", justifyContent: "center",
                fontSize: 18,
              }}
              className="mobile-hamburger"
            >
              {mobileMenuOpen ? "✕" : "☰"}
            </button>

            {user ? (
              <>
                <button
                  onClick={() => navigate({ page: "feed", creating: true })}
                  style={{
                    padding: "8px 18px", borderRadius: 10, border: "none",
                    background: "var(--accent)", color: "#fff", fontSize: 13,
                    fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                    whiteSpace: "nowrap",
                  }}
                >
                  ✏️ New Post
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    onClick={() => navigate({ page: "profile" })}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      background: "none", border: "none", cursor: "pointer", padding: 0,
                    }}
                  >
                    <Avatar name={user.displayName} size={32} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }} className="hide-mobile">
                      {user.displayName}
                    </span>
                  </button>
                  <button
                    onClick={logout}
                    style={{
                      background: "none", border: "1px solid var(--border)", padding: "6px 12px",
                      borderRadius: 8, color: "var(--text-muted)", fontSize: 12, cursor: "pointer",
                    }}
                    className="hide-mobile"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => setAuthModal("login")}
                  style={{
                    padding: "8px 18px", borderRadius: 10, border: "1px solid var(--border)",
                    background: "transparent", color: "var(--text-primary)", fontSize: 13,
                    fontWeight: 600, cursor: "pointer",
                  }}
                  className="hide-mobile"
                >
                  Sign In
                </button>
                <button
                  onClick={() => setAuthModal("signup")}
                  style={{
                    padding: "8px 18px", borderRadius: 10, border: "none",
                    background: "var(--accent)", color: "#fff", fontSize: 13,
                    fontWeight: 700, cursor: "pointer",
                  }}
                >
                  Join Now
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div style={{
            borderTop: "1px solid var(--border)", padding: "12px 0",
            background: "var(--header-bg)",
          }}>
            <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>
                Categories
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                {CATEGORIES.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => { setActiveCategory(c.key); navigate({ page: "feed" }); setMobileMenuOpen(false); }}
                    style={{
                      padding: "7px 14px", borderRadius: 20,
                      border: `1px solid ${activeCategory === c.key ? "var(--accent)" : "var(--border)"}`,
                      background: activeCategory === c.key ? "var(--accent-light)" : "transparent",
                      color: activeCategory === c.key ? "var(--accent)" : "var(--text-secondary)",
                      fontSize: 13, fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    {c.icon} {c.label}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button
                  onClick={() => { navigate({ page: "watch" }); setMobileMenuOpen(false); }}
                  style={{ padding: "7px 14px", borderRadius: 20, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  👁️ Watch Dashboard
                </button>
                {user && (
                  <button
                    onClick={() => { navigate({ page: "profile" }); setMobileMenuOpen(false); }}
                    style={{ padding: "7px 14px", borderRadius: 20, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                  >
                    👤 My Profile
                  </button>
                )}
                {user && user.role === "admin" && (
                  <button
                    onClick={() => { navigate({ page: "admin" }); setMobileMenuOpen(false); }}
                    style={{ padding: "7px 14px", borderRadius: 20, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                  >
                    🛡️ Admin Panel
                  </button>
                )}
                {user && (
                  <button
                    onClick={() => { logout(); setMobileMenuOpen(false); }}
                    style={{ padding: "7px 14px", borderRadius: 20, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                  >
                    Sign Out
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Layout */}
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "24px 24px 60px", display: "flex", gap: 28 }}>
        {/* Sidebar */}
        <aside className="sidebar" style={{ width: 240, flexShrink: 0, position: "sticky", top: 88, alignSelf: "flex-start" }}>
          <nav>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px", padding: "0 12px" }}>
              Categories
            </p>
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => { setActiveCategory(c.key); navigate({ page: "feed" }); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "10px 12px", borderRadius: 10, border: "none",
                  background: view.page === "feed" && activeCategory === c.key && !searchQuery ? "var(--accent-light)" : "transparent",
                  color: view.page === "feed" && activeCategory === c.key && !searchQuery ? "var(--accent)" : "var(--text-secondary)",
                  fontSize: 14, fontWeight: view.page === "feed" && activeCategory === c.key && !searchQuery ? 700 : 500,
                  cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 16 }}>{c.icon}</span> {c.label}
                <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>
                  {c.key === "all"
                    ? posts.filter((p) => p.status === "active").length
                    : posts.filter((p) => p.status === "active" && p.category === c.key).length}
                </span>
              </button>
            ))}
          </nav>

          <div style={{ height: 1, background: "var(--border)", margin: "16px 0" }} />

          <nav>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px", padding: "0 12px" }}>
              Pages
            </p>
            <button
              onClick={() => navigate({ page: "watch" })}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "10px 12px", borderRadius: 10, border: "none",
                background: view.page === "watch" ? "var(--accent-light)" : "transparent",
                color: view.page === "watch" ? "var(--accent)" : "var(--text-secondary)",
                fontSize: 14, fontWeight: view.page === "watch" ? 700 : 500,
                cursor: "pointer", textAlign: "left", transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: 16 }}>👁️</span> Watch Dashboard
            </button>

            {user && (
              <button
                onClick={() => navigate({ page: "profile" })}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "10px 12px", borderRadius: 10, border: "none",
                  background: view.page === "profile" ? "var(--accent-light)" : "transparent",
                  color: view.page === "profile" ? "var(--accent)" : "var(--text-secondary)",
                  fontSize: 14, fontWeight: view.page === "profile" ? 700 : 500,
                  cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 16 }}>👤</span> My Profile
              </button>
            )}

            {user && user.role === "admin" && (
              <button
                onClick={() => navigate({ page: "admin" })}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "10px 12px", borderRadius: 10, border: "none",
                  background: view.page === "admin" ? "var(--urgency-caution-bg)" : "transparent",
                  color: view.page === "admin" ? "var(--urgency-caution-text)" : "var(--text-secondary)",
                  fontSize: 14, fontWeight: view.page === "admin" ? 700 : 500,
                  cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 16 }}>🛡️</span> Admin Panel
                {reports.length > 0 && (
                  <span style={{
                    marginLeft: "auto", background: "var(--urgency-alert-border)", color: "#fff",
                    borderRadius: "50%", width: 20, height: 20,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700,
                  }}>
                    {reports.filter((r) => {
                      const p = posts.find((post) => post.id === r.postId);
                      return p && p.status === "active";
                    }).length || null}
                  </span>
                )}
              </button>
            )}
          </nav>

          <div style={{
            marginTop: 24, padding: 16,
            background: "linear-gradient(135deg, var(--accent-light) 0%, var(--bg-secondary) 100%)",
            borderRadius: 12, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6,
            border: "1px solid var(--accent-border)", position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: -4, right: -4, color: "var(--accent)" }}>
              <OakLeafAccent size={32} opacity={0.2} />
            </div>
            <p style={{ fontWeight: 700, color: "var(--accent)", margin: "0 0 6px", fontSize: 13 }}>
              🔒 Privacy Promise
            </p>
            Your identity stays private. Only your display name is visible to your Highland neighbors. No personal info is ever shared or sold.
            <div style={{ marginTop: 10, display: "flex", gap: 12 }}>
              <span
                onClick={() => navigate({ page: "privacy" })}
                style={{ color: "var(--accent)", fontWeight: 600, cursor: "pointer", fontSize: 11 }}
              >
                Privacy Policy
              </span>
              <span
                onClick={() => navigate({ page: "terms" })}
                style={{ color: "var(--accent)", fontWeight: 600, cursor: "pointer", fontSize: 11 }}
              >
                Terms of Service
              </span>
            </div>
          </div>

          <div style={{
            marginTop: 14, padding: "10px 14px", borderRadius: 10,
            background: "var(--bg-secondary)", border: "1px solid var(--border)",
            fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5, textAlign: "center",
          }}>
            <span style={{ color: "var(--accent)", fontWeight: 700 }}>🌳 Highland City</span>
            <br />Community Board · Est. 2024
          </div>
        </aside>

        {/* Main Content */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {renderMain()}
        </main>
      </div>

      {/* Footer */}
      <footer style={{
        borderTop: "1px solid var(--border)", background: "var(--bg-secondary)",
        padding: "28px 24px",
      }}>
        <div style={{
          maxWidth: 1120, margin: "0 auto",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <OakTreeIcon size={24} />
            <div>
              <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, color: "var(--text-primary)", fontSize: 14 }}>
                The Highland Oak Bulletin Board
              </span>
              <span style={{ color: "var(--text-muted)", fontSize: 12, marginLeft: 8 }}>
                · Highland City Community
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 20, fontSize: 12, color: "var(--text-muted)" }}>
            <span>🔒 Privacy-first platform</span>
            <span>· Anonymous posting</span>
            <span>· Community moderated</span>
          </div>
          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>
            © {new Date().getFullYear()} The Highland Oak · Est. 2024
          </p>
        </div>
      </footer>

      {/* Auth Modal */}
      {authModal && (
        <AuthModal
          mode={authModal}
          onClose={() => setAuthModal(null)}
          onSwitch={() => setAuthModal((prev) => (prev === "login" ? "signup" : "login"))}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}

      {/* Global Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;0,9..144,800;1,9..144,400&family=Source+Sans+3:wght@400;500;600;700&display=swap');

        :root {
          --font-heading: 'Fraunces', Georgia, serif;
          --font-body: 'Source Sans 3', system-ui, sans-serif;
          /* Oak & parchment palette */
          --bg-primary: #F3F0E6;
          --bg-secondary: #E9E5D8;
          --card-bg: #FDFCF8;
          --header-bg: rgba(253,252,248,0.95);
          --border: #D8D3C2;
          --text-primary: #1C2A18;
          --text-secondary: #445040;
          --text-muted: #7E8C78;
          /* Forest green accent */
          --accent: #3A6830;
          --accent-mid: #5A9850;
          --accent-hover: #2A5222;
          --accent-light: rgba(58,104,48,0.10);
          --accent-border: rgba(58,104,48,0.22);
          /* Oak bark */
          --bark: #6B4C2A;
          --oak-gold: #8B6914;
          --oak-gold-light: rgba(139,105,20,0.12);
          --urgency-alert-bg: #FEE2E2;
          --urgency-alert-border: #DC2626;
          --urgency-alert-text: #B91C1C;
          --urgency-alert-subtle: rgba(220, 38, 38, 0.2);
          --urgency-caution-bg: #FEF9C3;
          --urgency-caution-border: #CA8A04;
          --urgency-caution-text: #A16207;
          --urgency-caution-subtle: rgba(202, 138, 4, 0.2);
          --urgency-info-bg: #DCFCE7;
          --urgency-info-border: #16A34A;
          --urgency-info-text: #15803D;
          --urgency-info-subtle: rgba(22, 163, 74, 0.2);
          --admin-neutral-text: #6B7280;
          --admin-neutral-subtle: rgba(107, 114, 128, 0.2);
          --admin-report-bg: #FFF5F5;
          --admin-report-border: #FCA5A5;
          --toast-bg: #2C2416;
          --toast-text: #F0EBE3;
          --cat-all: #6B7280;       --cat-all-bg: rgba(107, 114, 128, 0.1);
          --cat-news: #2563EB;      --cat-news-bg: rgba(37, 99, 235, 0.1);
          --cat-watch: #DC2626;     --cat-watch-bg: rgba(220, 38, 38, 0.1);
          --cat-community: #059669; --cat-community-bg: rgba(5, 150, 105, 0.1);
          --cat-photos: #D97706;    --cat-photos-bg: rgba(217, 119, 6, 0.1);
        }

        .dark-mode {
          --bg-primary: #121A0F;
          --bg-secondary: #1A2416;
          --card-bg: #20301A;
          --header-bg: rgba(18,26,15,0.95);
          --border: #2C3E26;
          --text-primary: #E4EDE0;
          --text-secondary: #A4B89E;
          --text-muted: #6A8064;
          --accent: #5A9850;
          --accent-mid: #74B868;
          --accent-hover: #4A8040;
          --accent-light: rgba(90,152,80,0.12);
          --accent-border: rgba(90,152,80,0.25);
          --bark: #9A7450;
          --oak-gold: #C4A030;
        }

        * { box-sizing: border-box; }
        body { font-family: var(--font-body); margin: 0; -webkit-font-smoothing: antialiased; }

        @media (max-width: 768px) {
          .sidebar { display: none !important; }
          .mobile-hamburger { display: flex !important; }
          .hide-mobile { display: none !important; }
        }

        input:focus, textarea:focus, select:focus {
          border-color: var(--accent) !important;
          outline: none;
        }

        ::selection {
          background: var(--accent);
          color: #fff;
        }

        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
      `}</style>

      {/* Dark mode class toggling via wrapper div */}
      <style>{`
        body { background: ${darkMode ? "#121A0F" : "#F3F0E6"}; }
      `}</style>

      {/* Apply dark-mode class to root */}
      {darkMode && (
        <style>{`
          :root {
            --bg-primary: #121A0F;
            --bg-secondary: #1A2416;
            --card-bg: #20301A;
            --header-bg: rgba(18,26,15,0.95);
            --border: #2C3E26;
            --text-primary: #E4EDE0;
            --text-secondary: #A4B89E;
            --text-muted: #6A8064;
            --accent: #5A9850;
            --accent-mid: #74B868;
            --accent-hover: #4A8040;
            --accent-light: rgba(90,152,80,0.12);
            --accent-border: rgba(90,152,80,0.25);
            --bark: #9A7450;
            --oak-gold: #C4A030;
            --urgency-alert-bg: #2D0A0A;
            --urgency-alert-border: #EF4444;
            --urgency-alert-text: #FCA5A5;
            --urgency-alert-subtle: rgba(239, 68, 68, 0.25);
            --urgency-caution-bg: #2D1800;
            --urgency-caution-border: #F59E0B;
            --urgency-caution-text: #FCD34D;
            --urgency-caution-subtle: rgba(245, 158, 11, 0.25);
            --urgency-info-bg: #052E16;
            --urgency-info-border: #22C55E;
            --urgency-info-text: #86EFAC;
            --urgency-info-subtle: rgba(34, 197, 94, 0.25);
            --admin-neutral-text: #9CA3AF;
            --admin-neutral-subtle: rgba(156, 163, 175, 0.2);
            --admin-report-bg: #2A0A0A;
            --admin-report-border: rgba(239, 68, 68, 0.35);
            --toast-bg: #F0EBE3;
            --toast-text: #2C2416;
            --cat-all: #9CA3AF;       --cat-all-bg: rgba(156, 163, 175, 0.12);
            --cat-news: #60A5FA;      --cat-news-bg: rgba(96, 165, 250, 0.12);
            --cat-watch: #F87171;     --cat-watch-bg: rgba(248, 113, 113, 0.12);
            --cat-community: #34D399; --cat-community-bg: rgba(52, 211, 153, 0.12);
            --cat-photos: #FBBF24;    --cat-photos-bg: rgba(251, 191, 36, 0.12);
          }
        `}</style>
      )}
    </div>
  );
}

// ─── Privacy Policy Page ──────────────────────────────────────────────────────
function PrivacyPolicyPage() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px" }}>
      <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 32, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>
        Privacy Policy
      </h1>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 32 }}>Last updated: March 2026</p>
      {[
        ["Information We Collect", "We collect your email address (stored in Cognito, never exposed), your chosen display name, and the content you post. We do not collect your real name, address, or any government-issued ID."],
        ["How We Use Your Information", "Your email is used solely for account authentication and password resets. Your display name is shown alongside your posts and comments. We do not sell or share your data with third parties."],
        ["Content You Post", "Posts and comments are visible to all visitors. You can delete your own posts and comments at any time. Deleting your account anonymizes all your past posts (author shown as 'Deleted User')."],
        ["Cookies & Storage", "We store authentication tokens in your browser's localStorage for session persistence. No advertising or tracking cookies are used."],
        ["Data Retention", "Account data is retained until you delete your account. Post content may be retained in anonymized form after account deletion."],
        ["Contact", "Questions? Reach us at the email on the community board or post a question in the Community category."],
      ].map(([heading, body]) => (
        <div key={heading} style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>{heading}</h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>{body}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Terms of Service Page ────────────────────────────────────────────────────
function TermsOfServicePage() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px" }}>
      <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 32, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>
        Terms of Service
      </h1>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 32 }}>Last updated: March 2026</p>
      {[
        ["Use of the Platform", "Highland Oak Neighborhood Board is a community platform for local residents. You must be a resident or community member to create an account. Commercial use, spam, or off-topic advertising is prohibited."],
        ["Content Standards", "Do not post: personal attacks or harassment, private information about others without consent, content that is illegal or incites illegal activity, misinformation about public safety matters."],
        ["Moderation", "Posts may be hidden or removed by moderators if they violate these terms. Repeat violations may result in account suspension."],
        ["Disclaimer", "This platform is community-run and provided as-is. We are not responsible for the accuracy of information posted by community members. For emergencies, always contact official services (911, non-emergency police line)."],
        ["Changes", "These terms may be updated. Continued use of the platform constitutes acceptance of the current terms."],
      ].map(([heading, body]) => (
        <div key={heading} style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>{heading}</h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>{body}</p>
        </div>
      ))}
    </div>
  );
}

// ─── App Entry ────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
