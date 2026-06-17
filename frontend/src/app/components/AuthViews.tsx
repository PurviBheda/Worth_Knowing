import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import {
  Eye, EyeOff, Loader2, CheckCircle2, XCircle, User, Mail,
  Lock, ArrowRight, Bookmark, BookmarkCheck, Clock, Bell,
  BellOff, Heart, Building2, LogOut, Settings, Star, ChevronRight,
  Check, Trash2, RefreshCcw, LayoutDashboard, Newspaper, BookOpen,
  TrendingUp
} from "lucide-react";
import {
  apiRegister, apiLogin, apiLogout, apiForgotPassword,
  apiGetMe, apiUpdateProfile, apiCompleteOnboarding,
  apiGetBookmarks, apiAddBookmark, apiRemoveBookmark,
  apiGetHistory,
  apiGetNotifications, apiMarkNotificationRead, apiMarkAllNotificationsRead,
  apiGetPersonalizedFeed,
  apiGetPreferences, apiUpdatePreferences,
  apiGetFollowedTopics, apiGetFollowedCompanies,
  apiFollowTopic, apiUnfollowTopic,
  UserProfile, UserPreferences, Bookmark as BookmarkType,
  ReadingHistoryItem, NotificationItem, FollowedTopic, FollowedCompany
} from "../services/authApi";
import type { Article } from "../services/api";

// ── Auth Context ─────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: UserProfile | null;
  preferences: UserPreferences | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updatePrefs: (prefs: Partial<UserPreferences>) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("wk_token"));
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const stored = localStorage.getItem("wk_token");
    if (!stored) { setLoading(false); return; }
    try {
      const { user: u, preferences: p } = await apiGetMe();
      setUser(u);
      setPreferences(p);
      localStorage.setItem("wk_user", JSON.stringify(u));
    } catch {
      localStorage.removeItem("wk_token");
      localStorage.removeItem("wk_user");
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshUser(); }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const { user: u, token: t, preferences: p } = await apiLogin(email, password);
    localStorage.setItem("wk_token", t);
    localStorage.setItem("wk_user", JSON.stringify(u));
    setToken(t);
    setUser(u);
    setPreferences(p);
  };

  const register = async (email: string, password: string, name?: string) => {
    const { user: u, token: t } = await apiRegister(email, password, name);
    localStorage.setItem("wk_token", t);
    localStorage.setItem("wk_user", JSON.stringify(u));
    setToken(t);
    setUser(u);
  };

  const logout = () => {
    apiLogout();
    setUser(null);
    setToken(null);
    setPreferences(null);
    localStorage.removeItem("wk_token");
    localStorage.removeItem("wk_user");
  };

  const updatePrefs = async (prefs: Partial<UserPreferences>) => {
    const { preferences: updated } = await apiUpdatePreferences(prefs);
    setPreferences(updated);
  };

  return (
    <AuthContext.Provider value={{
      user, preferences, token, loading, login, register, logout,
      refreshUser, updatePrefs, isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

// ── Shared UI ────────────────────────────────────────────────────────────────

function FormInput({
  id, label, type = "text", value, onChange, placeholder, required, icon: Icon, error
}: {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
  required?: boolean; icon?: any; error?: string;
}) {
  const [showPw, setShowPw] = useState(false);
  const actualType = type === "password" ? (showPw ? "text" : "password") : type;
  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-[10px] font-bold tracking-[0.18em] uppercase mb-1.5 text-muted-foreground"
        style={{ fontFamily: "'Inter', sans-serif" }}>{label}</label>
      <div className="relative">
        {Icon && <Icon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />}
        <input
          id={id} type={actualType} value={value} required={required}
          onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className={`w-full ${Icon ? "pl-9" : "pl-3"} ${type === "password" ? "pr-10" : "pr-3"} py-2.5 bg-card border ${error ? "border-red-500" : "border-border focus:border-[#D4AF37]"} text-sm outline-none transition-colors`}
          style={{ fontFamily: "'Inter', sans-serif" }}
        />
        {type === "password" && (
          <button type="button" onClick={() => setShowPw(!showPw)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
            {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-[10px] text-red-500">{error}</p>}
    </div>
  );
}

function Alert({ type, children }: { type: "error" | "success" | "info"; children: ReactNode }) {
  const styles = {
    error: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400",
    success: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400",
    info: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40 text-blue-700 dark:text-blue-400"
  };
  return (
    <div className={`border px-4 py-3 text-sm mb-4 flex items-start gap-2 ${styles[type]}`}>
      {type === "error" && <XCircle size={14} className="mt-0.5 shrink-0" />}
      {type === "success" && <CheckCircle2 size={14} className="mt-0.5 shrink-0" />}
      <span>{children}</span>
    </div>
  );
}

function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="h-[3px] bg-foreground w-full mb-0.5" />
          <div className="h-px bg-foreground w-full mb-5" />
          <h1 className="text-3xl font-black mb-2" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>{subtitle}</p>}
          <div className="h-px bg-foreground w-full mt-5 mb-0.5" />
          <div className="h-[3px] bg-foreground w-full" />
        </div>
        <div className="bg-card border border-border p-8">
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Login View ────────────────────────────────────────────────────────────────

export function LoginView() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Sign In" subtitle="Welcome back to Worth Knowing">
      {error && <Alert type="error">{error}</Alert>}
      <form onSubmit={handleSubmit}>
        <FormInput id="login-email" label="Email Address" type="email" value={email} onChange={setEmail}
          placeholder="you@example.com" required icon={Mail} />
        <FormInput id="login-password" label="Password" type="password" value={password} onChange={setPassword}
          placeholder="••••••••" required icon={Lock} />
        <div className="text-right mb-5">
          <Link to="/forgot-password" className="text-[11px] text-[#D4AF37] hover:underline">Forgot password?</Link>
        </div>
        <button type="submit" disabled={loading} id="btn-login"
          className="w-full py-3 bg-foreground text-background text-[11px] font-black tracking-[0.2em] uppercase hover:bg-[#D4AF37] hover:text-black transition-colors duration-200 disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
          {loading ? "Signing In…" : "Sign In"}
        </button>
      </form>
      <p className="text-center text-[11px] text-muted-foreground mt-6">
        Don't have an account?{" "}
        <Link to="/register" className="text-[#D4AF37] font-bold hover:underline">Create one</Link>
      </p>
    </AuthCard>
  );
}

// ── Register View ─────────────────────────────────────────────────────────────

export function RegisterView() {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isAuthenticated) navigate("/onboarding", { replace: true });
  }, [isAuthenticated, navigate]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email) e.email = "Email is required";
    if (password.length < 8) e.password = "Password must be at least 8 characters";
    if (password !== confirm) e.confirm = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setError("");
    setLoading(true);
    try {
      await register(email, password, name || undefined);
      navigate("/onboarding");
    } catch (err: any) {
      setError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Create Account" subtitle="Join Worth Knowing — free forever">
      {error && <Alert type="error">{error}</Alert>}
      <form onSubmit={handleSubmit}>
        <FormInput id="reg-name" label="Full Name (optional)" type="text" value={name} onChange={setName}
          placeholder="Jane Doe" icon={User} />
        <FormInput id="reg-email" label="Email Address" type="email" value={email} onChange={setEmail}
          placeholder="you@example.com" required icon={Mail} error={errors.email} />
        <FormInput id="reg-password" label="Password" type="password" value={password} onChange={setPassword}
          placeholder="Min. 8 characters" required icon={Lock} error={errors.password} />
        <FormInput id="reg-confirm" label="Confirm Password" type="password" value={confirm} onChange={setConfirm}
          placeholder="Repeat password" required icon={Lock} error={errors.confirm} />

        <div className="mb-5 p-3 bg-secondary border border-border">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            By creating an account you agree to our Terms of Service and Privacy Policy.
            Your data is never sold to third parties.
          </p>
        </div>

        <button type="submit" disabled={loading} id="btn-register"
          className="w-full py-3 bg-foreground text-background text-[11px] font-black tracking-[0.2em] uppercase hover:bg-[#D4AF37] hover:text-black transition-colors duration-200 disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
          {loading ? "Creating Account…" : "Create Account"}
        </button>
      </form>
      <p className="text-center text-[11px] text-muted-foreground mt-6">
        Already have an account?{" "}
        <Link to="/login" className="text-[#D4AF37] font-bold hover:underline">Sign in</Link>
      </p>
    </AuthCard>
  );
}

// ── Forgot Password View ──────────────────────────────────────────────────────

export function ForgotPasswordView() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiForgotPassword(email);
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Reset Password" subtitle="We'll send you a secure reset link">
      {sent ? (
        <div className="text-center py-6">
          <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-4" />
          <p className="font-semibold mb-2">Check your email</p>
          <p className="text-sm text-muted-foreground mb-6">
            If <strong>{email}</strong> is registered, a reset link has been sent.
          </p>
          <Link to="/login" className="text-[11px] font-bold tracking-wider uppercase text-[#D4AF37] hover:underline flex items-center justify-center gap-1">
            <ArrowRight size={12} /> Back to Sign In
          </Link>
        </div>
      ) : (
        <>
          {error && <Alert type="error">{error}</Alert>}
          <form onSubmit={handleSubmit}>
            <FormInput id="fp-email" label="Email Address" type="email" value={email} onChange={setEmail}
              placeholder="you@example.com" required icon={Mail} />
            <button type="submit" disabled={loading} id="btn-forgot"
              className="w-full py-3 bg-foreground text-background text-[11px] font-black tracking-[0.2em] uppercase hover:bg-[#D4AF37] hover:text-black transition-colors duration-200 disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
              {loading ? "Sending…" : "Send Reset Link"}
            </button>
          </form>
          <p className="text-center text-[11px] text-muted-foreground mt-6">
            <Link to="/login" className="text-[#D4AF37] font-bold hover:underline">← Back to Sign In</Link>
          </p>
        </>
      )}
    </AuthCard>
  );
}

// ── Onboarding View ───────────────────────────────────────────────────────────

const ALL_INTERESTS = [
  { slug: "ai-technology", name: "AI & Technology", icon: "🤖" },
  { slug: "startups", name: "Startups", icon: "🚀" },
  { slug: "business", name: "Business", icon: "💼" },
  { slug: "stock-market", name: "Stock Market", icon: "📈" },
  { slug: "cryptocurrency", name: "Cryptocurrency", icon: "₿" },
  { slug: "politics", name: "Politics", icon: "🏛️" },
  { slug: "science", name: "Science", icon: "🔬" },
  { slug: "global-affairs", name: "Global Affairs", icon: "🌍" },
  { slug: "economy", name: "Economy", icon: "🏦" },
  { slug: "personal-finance", name: "Personal Finance", icon: "💰" },
  { slug: "jobs", name: "Jobs", icon: "👔" },
];

export function OnboardingView() {
  const { user, refreshUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated) navigate("/login", { replace: true });
  }, [isAuthenticated, navigate]);

  const toggle = (slug: string) => {
    setSelected(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]);
  };

  const handleComplete = async () => {
    if (selected.length < 3) {
      setError("Please select at least 3 interests to personalize your feed.");
      return;
    }
    setSaving(true);
    try {
      await apiCompleteOnboarding(selected);
      await refreshUser();
      navigate("/", { replace: true });
    } catch {
      setError("Failed to save preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="text-center mb-10">
        <div className="h-[3px] bg-foreground w-full mb-0.5" />
        <div className="h-px bg-foreground w-full mb-6" />
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 mb-4">
          <Star size={22} className="text-[#D4AF37]" />
        </div>
        <h1 className="text-3xl font-black mb-2" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          Welcome, {user?.name?.split(" ")[0] || "Reader"}
        </h1>
        <p className="text-sm text-muted-foreground">Select your interests to personalize your Worth Knowing feed.</p>
        <p className="text-[10px] text-muted-foreground mt-1 tracking-wider uppercase">Choose at least 3 topics</p>
        <div className="h-px bg-foreground w-full mt-6 mb-0.5" />
        <div className="h-[3px] bg-foreground w-full" />
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        {ALL_INTERESTS.map(({ slug, name, icon }) => {
          const isSelected = selected.includes(slug);
          return (
            <button
              key={slug}
              id={`interest-${slug}`}
              onClick={() => toggle(slug)}
              className={`relative p-4 border-2 text-left transition-all duration-200 group ${
                isSelected
                  ? "border-[#D4AF37] bg-[#D4AF37]/8 text-foreground"
                  : "border-border bg-card hover:border-[#D4AF37]/50 hover:bg-secondary"
              }`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-[#D4AF37] rounded-full flex items-center justify-center">
                  <Check size={10} className="text-black" />
                </div>
              )}
              <div className="text-2xl mb-2">{icon}</div>
              <div className="text-[11px] font-bold leading-tight" style={{ fontFamily: "'Inter', sans-serif" }}>{name}</div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4">
        <span className="text-[11px] text-muted-foreground">
          {selected.length} selected {selected.length >= 3 ? "✓" : `(need ${3 - selected.length} more)`}
        </span>
        <div className="flex gap-3">
          <button onClick={() => navigate("/")}
            className="px-5 py-2.5 border border-border text-[10px] font-bold tracking-wider uppercase hover:border-foreground transition-colors">
            Skip for now
          </button>
          <button onClick={handleComplete} disabled={saving} id="btn-complete-onboarding"
            className="px-6 py-2.5 bg-[#D4AF37] text-black text-[10px] font-black tracking-wider uppercase hover:bg-[#c4a030] transition-colors disabled:opacity-50 flex items-center gap-2">
            {saving ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={12} />}
            {saving ? "Saving…" : "Personalize My Feed"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── User Profile View ─────────────────────────────────────────────────────────

type ProfileTab = "overview" | "bookmarks" | "history" | "notifications" | "settings";

export function ProfileView() {
  const { user, isAuthenticated, logout, refreshUser, preferences, updatePrefs } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");

  // Profile edit
  const [editName, setEditName] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // Data states
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
  const [bookmarkTotal, setBookmarkTotal] = useState(0);
  const [history, setHistory] = useState<ReadingHistoryItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [followedTopics, setFollowedTopics] = useState<FollowedTopic[]>([]);
  const [followedCompanies, setFollowedCompanies] = useState<FollowedCompany[]>([]);
  const [personalFeed, setPersonalFeed] = useState<Article[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) navigate("/login", { state: { from: "/profile" }, replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (user) setEditName(user.name || "");
  }, [user]);

  const loadTabData = useCallback(async (tab: ProfileTab) => {
    setDataLoading(true);
    try {
      if (tab === "bookmarks") {
        const res = await apiGetBookmarks(1, 20);
        setBookmarks(res.data);
        setBookmarkTotal(res.pagination.totalItems);
      } else if (tab === "history") {
        const res = await apiGetHistory(1, 20);
        setHistory(res.data);
      } else if (tab === "notifications") {
        const res = await apiGetNotifications();
        setNotifications(res.data);
        setUnreadCount(res.unreadCount);
      } else if (tab === "overview") {
        const [tRes, cRes, fRes] = await Promise.allSettled([
          apiGetFollowedTopics(),
          apiGetFollowedCompanies(),
          apiGetPersonalizedFeed(1)
        ]);
        if (tRes.status === "fulfilled") setFollowedTopics(tRes.value.topics);
        if (cRes.status === "fulfilled") setFollowedCompanies(cRes.value.companies);
        if (fRes.status === "fulfilled") setPersonalFeed((fRes.value as any).data || []);
      }
    } catch { /* silently fail */ }
    setDataLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) loadTabData(activeTab);
  }, [activeTab, isAuthenticated, loadTabData]);

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveMsg("");
    try {
      await apiUpdateProfile({ name: editName });
      await refreshUser();
      setSaveMsg("Profile updated successfully!");
    } catch {
      setSaveMsg("Failed to update profile.");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 3000);
    }
  };

  const handleMarkAllRead = async () => {
    await apiMarkAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const handleMarkRead = async (id: string) => {
    await apiMarkNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleRemoveBookmark = async (articleId: number) => {
    await apiRemoveBookmark(articleId);
    setBookmarks(prev => prev.filter(b => b.articleId !== articleId));
    setBookmarkTotal(prev => prev - 1);
  };

  const handleUnfollowTopic = async (slug: string) => {
    await apiUnfollowTopic(slug);
    setFollowedTopics(prev => prev.filter(t => t.topicSlug !== slug));
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (!isAuthenticated) return null;

  const TABS: { id: ProfileTab; label: string; icon: any; badge?: number }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "bookmarks", label: "Bookmarks", icon: Bookmark, badge: bookmarkTotal || undefined },
    { id: "history", label: "History", icon: Clock },
    { id: "notifications", label: "Alerts", icon: Bell, badge: unreadCount || undefined },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const notifTypeStyle = (type: NotificationItem["type"]) => {
    const styles: Record<string, string> = {
      BREAKING_NEWS: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
      DAILY_BRIEF: "bg-[#D4AF37]/15 text-[#8B6914] dark:text-[#D4AF37]",
      MARKET_ALERT: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
      JOB_ALERT: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
      SYSTEM: "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400",
    };
    return styles[type] || styles.SYSTEM;
  };

  const notifTypeLabel: Record<string, string> = {
    BREAKING_NEWS: "Breaking",
    DAILY_BRIEF: "Brief",
    MARKET_ALERT: "Market",
    JOB_ALERT: "Jobs",
    SYSTEM: "System",
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Profile Header */}
      <div className="bg-card border border-border p-6 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-[#D4AF37]/20 border-2 border-[#D4AF37]/40 flex items-center justify-center flex-shrink-0">
          {user?.profilePicture ? (
            <img src={user.profilePicture} alt="Profile" className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="text-2xl font-black text-[#D4AF37]" style={{ fontFamily: "'Playfair Display', serif" }}>
              {(user?.name || user?.email || "U")[0].toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-black leading-none mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
            {user?.name || "Anonymous Reader"}
          </h2>
          <p className="text-sm text-muted-foreground mb-2">{user?.email}</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded border ${
              user?.isEmailVerified
                ? "text-emerald-700 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-400"
                : "text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/40 dark:text-amber-400"
            }`}>
              {user?.isEmailVerified ? <CheckCircle2 size={9} /> : <XCircle size={9} />}
              {user?.isEmailVerified ? "Verified" : "Email Unverified"}
            </span>
            <span className="inline-flex items-center gap-1 text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded border border-border bg-secondary text-muted-foreground">
              {user?.role}
            </span>
            {user?.onboardingCompleted && (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded border border-[#D4AF37]/40 bg-[#D4AF37]/8 text-[#8B6914] dark:text-[#D4AF37]">
                <Star size={9} /> Personalized
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {!user?.onboardingCompleted && (
            <Link to="/onboarding"
              className="flex items-center gap-1.5 px-3 py-2 bg-[#D4AF37] text-black text-[10px] font-black tracking-wider uppercase hover:bg-[#c4a030] transition-colors">
              <Star size={11} /> Set Interests
            </Link>
          )}
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2 border border-border text-[10px] font-bold tracking-wider uppercase hover:border-red-400 hover:text-red-500 transition-colors">
            <LogOut size={11} /> Sign Out
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-border mb-6 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            id={`profile-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex items-center gap-1.5 px-4 py-3 text-[10px] font-bold tracking-[0.15em] uppercase whitespace-nowrap border-b-2 transition-all ${
              activeTab === tab.id
                ? "border-[#D4AF37] text-[#D4AF37]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            <tab.icon size={12} />
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-[#D4AF37] text-black text-[8px] font-black rounded-full leading-none">
                {tab.badge > 99 ? "99+" : tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {dataLoading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      ) : (
        <>
          {/* ── OVERVIEW ── */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Bookmarks", value: bookmarkTotal, icon: Bookmark },
                  { label: "Articles Read", value: history.length, icon: BookOpen },
                  { label: "Topics Followed", value: followedTopics.length, icon: Heart },
                  { label: "Companies", value: followedCompanies.length, icon: Building2 },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="bg-card border border-border p-4 text-center">
                    <Icon size={16} className="text-[#D4AF37] mx-auto mb-2" />
                    <div className="text-2xl font-black" style={{ fontFamily: "'Playfair Display', serif" }}>{value}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{label}</div>
                  </div>
                ))}
              </div>

              {/* Followed Topics */}
              {followedTopics.length > 0 && (
                <div className="bg-card border border-border p-5">
                  <h3 className="text-[11px] font-black tracking-[0.2em] uppercase mb-4 border-b border-border pb-2"
                    style={{ fontFamily: "'Inter', sans-serif" }}>Followed Topics</h3>
                  <div className="flex flex-wrap gap-2">
                    {followedTopics.map(t => (
                      <div key={t.id} className="flex items-center gap-1 px-3 py-1.5 bg-secondary border border-border text-[11px]">
                        <span className="font-medium">{t.topicName}</span>
                        <button onClick={() => handleUnfollowTopic(t.topicSlug)}
                          className="ml-1 text-muted-foreground hover:text-red-500 transition-colors">
                          <XCircle size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Personalized Feed Preview */}
              {personalFeed.length > 0 && (
                <div className="bg-card border border-border p-5">
                  <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
                    <h3 className="text-[11px] font-black tracking-[0.2em] uppercase"
                      style={{ fontFamily: "'Inter', sans-serif" }}>Your Personalized Feed</h3>
                    <Link to="/my-feed" className="text-[10px] text-[#D4AF37] font-bold hover:underline flex items-center gap-1">
                      View All <ChevronRight size={10} />
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {personalFeed.slice(0, 4).map(article => (
                      <Link key={article.id} to={`/article/${article.id}`}
                        className="flex items-start gap-3 group hover:bg-secondary p-2 -mx-2 rounded transition-colors">
                        <Newspaper size={14} className="text-[#D4AF37] mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-[#D4AF37] transition-colors"
                            style={{ fontFamily: "'Playfair Display', serif" }}>{article.title}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{article.source?.name} · {article.time}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── BOOKMARKS ── */}
          {activeTab === "bookmarks" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">{bookmarkTotal} saved article{bookmarkTotal !== 1 ? "s" : ""}</p>
              </div>
              {bookmarks.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-border">
                  <Bookmark size={32} className="text-muted-foreground mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-muted-foreground">No bookmarks yet.</p>
                  <Link to="/" className="mt-4 inline-flex items-center gap-1 text-[11px] text-[#D4AF37] font-bold hover:underline">
                    Browse Articles <ArrowRight size={11} />
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {bookmarks.map(bm => (
                    <div key={bm.id} className="bg-card border border-border p-4 flex items-start gap-4 group hover:border-[#D4AF37]/40 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] font-bold tracking-wider uppercase text-[#D4AF37] border border-[#D4AF37]/30 px-1.5 py-0.5">
                            {bm.article?.category?.name || "General"}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock size={9} /> {bm.article?.time}
                          </span>
                        </div>
                        <Link to={`/article/${bm.articleId}`}>
                          <h4 className="text-sm font-bold leading-snug line-clamp-2 group-hover:text-[#D4AF37] transition-colors"
                            style={{ fontFamily: "'Playfair Display', serif" }}>
                            {bm.article?.title}
                          </h4>
                        </Link>
                        <p className="text-[11px] text-muted-foreground mt-1">{bm.article?.source?.name}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <button onClick={() => handleRemoveBookmark(bm.articleId)}
                          className="text-muted-foreground hover:text-red-500 transition-colors p-1" title="Remove bookmark">
                          <Trash2 size={13} />
                        </button>
                        <Link to={`/article/${bm.articleId}`}
                          className="text-[9px] font-bold tracking-wider uppercase text-[#D4AF37] hover:underline flex items-center gap-0.5">
                          Read <ArrowRight size={9} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── HISTORY ── */}
          {activeTab === "history" && (
            <div>
              <p className="text-sm text-muted-foreground mb-4">{history.length} recently read article{history.length !== 1 ? "s" : ""}</p>
              {history.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-border">
                  <Clock size={32} className="text-muted-foreground mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-muted-foreground">No reading history yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map(item => (
                    <div key={item.id} className="bg-card border border-border p-4 flex items-start gap-4 group hover:border-[#D4AF37]/40 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] font-bold tracking-wider uppercase text-[#D4AF37] border border-[#D4AF37]/30 px-1.5 py-0.5">
                            {item.article?.category?.name || "General"}
                          </span>
                          {item.completed && (
                            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                              <CheckCircle2 size={9} /> Read
                            </span>
                          )}
                        </div>
                        <Link to={`/article/${item.articleId}`}>
                          <h4 className="text-sm font-bold leading-snug line-clamp-2 group-hover:text-[#D4AF37] transition-colors"
                            style={{ fontFamily: "'Playfair Display', serif" }}>
                            {item.article?.title}
                          </h4>
                        </Link>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {item.article?.source?.name} · {new Date(item.readAt).toLocaleDateString()} ·{" "}
                          {Math.round(item.readSeconds / 60)}m read
                        </p>
                      </div>
                      <TrendingUp size={13} className={item.completed ? "text-emerald-500" : "text-muted-foreground"} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── NOTIFICATIONS ── */}
          {activeTab === "notifications" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  {unreadCount > 0 ? <><strong className="text-foreground">{unreadCount}</strong> unread</> : "All caught up"}
                </p>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead}
                    className="flex items-center gap-1 text-[10px] font-bold text-[#D4AF37] hover:underline uppercase tracking-wider">
                    <CheckCircle2 size={11} /> Mark all read
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-border">
                  <BellOff size={32} className="text-muted-foreground mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-muted-foreground">No notifications yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.map(n => (
                    <div key={n.id}
                      className={`p-4 border transition-colors cursor-pointer ${
                        n.isRead ? "bg-card border-border" : "bg-[#D4AF37]/5 border-[#D4AF37]/20"
                      }`}
                      onClick={() => !n.isRead && handleMarkRead(n.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 text-[8px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded shrink-0 ${notifTypeStyle(n.type)}`}>
                          {notifTypeLabel[n.type]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold leading-snug">{n.title}</p>
                          <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">{n.body}</p>
                          <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
                            <Clock size={9} /> {new Date(n.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {!n.isRead && (
                          <div className="w-2 h-2 rounded-full bg-[#D4AF37] mt-2 shrink-0" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── SETTINGS ── */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              {/* Profile edit */}
              <div className="bg-card border border-border p-6">
                <h3 className="text-[11px] font-black tracking-[0.2em] uppercase mb-5 border-b border-border pb-3"
                  style={{ fontFamily: "'Inter', sans-serif" }}>Profile Information</h3>
                <div className="max-w-sm space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold tracking-[0.18em] uppercase mb-1.5 text-muted-foreground">
                      Display Name
                    </label>
                    <input value={editName} onChange={e => setEditName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-background border border-border focus:border-[#D4AF37] text-sm outline-none transition-colors"
                      placeholder="Your full name" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold tracking-[0.18em] uppercase mb-1.5 text-muted-foreground">
                      Email Address
                    </label>
                    <input value={user?.email || ""} disabled
                      className="w-full px-3 py-2.5 bg-secondary border border-border text-sm text-muted-foreground cursor-not-allowed" />
                  </div>
                  {saveMsg && (
                    <p className={`text-[11px] font-medium ${saveMsg.includes("success") ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                      {saveMsg}
                    </p>
                  )}
                  <button onClick={handleSaveProfile} disabled={saving}
                    className="px-5 py-2 bg-foreground text-background text-[10px] font-black tracking-wider uppercase hover:bg-[#D4AF37] hover:text-black transition-colors disabled:opacity-50 flex items-center gap-2">
                    {saving ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                    {saving ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </div>

              {/* Notification preferences */}
              <div className="bg-card border border-border p-6">
                <h3 className="text-[11px] font-black tracking-[0.2em] uppercase mb-5 border-b border-border pb-3"
                  style={{ fontFamily: "'Inter', sans-serif" }}>Notification Preferences</h3>
                <div className="space-y-3 max-w-sm">
                  {([
                    { key: "emailBreakingNews", label: "Breaking News (Email)" },
                    { key: "emailDailyBrief", label: "Daily Morning Brief (Email)" },
                    { key: "emailMarketAlerts", label: "Market Alerts (Email)" },
                    { key: "emailJobAlerts", label: "Job Alerts (Email)" },
                    { key: "pushBreakingNews", label: "Breaking News (Push)" },
                    { key: "pushDailyBrief", label: "Daily Brief (Push)" },
                  ] as { key: keyof UserPreferences; label: string }[]).map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <span className="text-sm">{label}</span>
                      <button
                        onClick={() => updatePrefs({ [key]: !preferences?.[key] })}
                        className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
                          preferences?.[key] ? "bg-[#D4AF37]" : "bg-border"
                        }`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                          preferences?.[key] ? "translate-x-4" : "translate-x-0"
                        }`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Interests re-selection */}
              <div className="bg-card border border-border p-6">
                <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
                  <h3 className="text-[11px] font-black tracking-[0.2em] uppercase"
                    style={{ fontFamily: "'Inter', sans-serif" }}>Your Interests</h3>
                  <Link to="/onboarding"
                    className="flex items-center gap-1 text-[10px] text-[#D4AF37] font-bold hover:underline uppercase tracking-wider">
                    <RefreshCcw size={10} /> Edit
                  </Link>
                </div>
                {preferences?.interests && (preferences.interests as string[]).length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {(preferences.interests as string[]).map(slug => {
                      const interest = ALL_INTERESTS.find(i => i.slug === slug);
                      return interest ? (
                        <span key={slug} className="flex items-center gap-1 px-3 py-1.5 bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[11px] font-medium text-[#8B6914] dark:text-[#D4AF37]">
                          {interest.icon} {interest.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No interests selected yet.{" "}
                    <Link to="/onboarding" className="text-[#D4AF37] hover:underline">Set them now →</Link>
                  </p>
                )}
              </div>

              {/* Danger zone */}
              <div className="bg-card border border-red-200 dark:border-red-900/40 p-6">
                <h3 className="text-[11px] font-black tracking-[0.2em] uppercase text-red-600 dark:text-red-400 mb-4"
                  style={{ fontFamily: "'Inter', sans-serif" }}>Account Actions</h3>
                <button onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 text-[10px] font-black tracking-wider uppercase hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
                  <LogOut size={12} /> Sign Out of All Sessions
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── My Feed View ──────────────────────────────────────────────────────────────

export function MyFeedView() {
  const { user, isAuthenticated, preferences } = useAuth();
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!isAuthenticated) navigate("/login", { state: { from: "/my-feed" }, replace: true });
  }, [isAuthenticated, navigate]);

  const loadFeed = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await apiGetPersonalizedFeed(p);
      const data = (res as any).data || [];
      setArticles(prev => p === 1 ? data : [...prev, ...data]);
      setInterests((res as any).interests || []);
      setHasMore((res.pagination?.currentPage || 1) < (res.pagination?.totalPages || 1));
    } catch { /* silently fail */ }
    setLoading(false);
  }, []);

  const loadBookmarkStatus = useCallback(async (arts: Article[]) => {
    if (!isAuthenticated) return;
    const bm = new Set<number>();
    try {
      const res = await apiGetBookmarks(1, 50);
      res.data.forEach((b: any) => bm.add(b.articleId));
    } catch { /* ignore */ }
    setBookmarkedIds(bm);
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) loadFeed(1);
  }, [isAuthenticated, loadFeed]);

  useEffect(() => {
    if (articles.length) loadBookmarkStatus(articles);
  }, [articles.length, loadBookmarkStatus]);

  const toggleBookmark = async (articleId: number) => {
    if (bookmarkedIds.has(articleId)) {
      await apiRemoveBookmark(articleId);
      setBookmarkedIds(prev => { const s = new Set(prev); s.delete(articleId); return s; });
    } else {
      await apiAddBookmark(articleId);
      setBookmarkedIds(prev => new Set([...prev, articleId]));
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      {/* Header */}
      <div className="mb-8 border-t-[2px] border-foreground pt-2.5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[11px] font-black tracking-[0.22em] uppercase" style={{ fontFamily: "'Inter', sans-serif" }}>
              My Personalized Feed
            </h2>
            {interests.length > 0 && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Curated for: {interests.map(s => ALL_INTERESTS.find(i => i.slug === s)?.name || s).join(" · ")}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => loadFeed(1)}
              className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-[#D4AF37] transition-colors uppercase tracking-wider">
              <RefreshCcw size={11} /> Refresh
            </button>
            <Link to="/profile"
              className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-[#D4AF37] transition-colors uppercase tracking-wider">
              <Settings size={11} /> Edit
            </Link>
          </div>
        </div>
      </div>

      {interests.length === 0 && !loading && (
        <div className="mb-6 p-4 bg-[#D4AF37]/8 border border-[#D4AF37]/30">
          <p className="text-sm">
            <strong>Tip:</strong> <Link to="/onboarding" className="text-[#D4AF37] hover:underline">Set your interests</Link> to
            get a truly personalized feed tailored to the topics you care about.
          </p>
        </div>
      )}

      {loading && page === 1 ? (
        <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
          <Loader2 size={20} className="animate-spin text-[#D4AF37]" />
          <span className="text-sm">Building your feed…</span>
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border">
          <Newspaper size={32} className="text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm text-muted-foreground mb-4">No articles found for your interests.</p>
          <Link to="/onboarding"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#D4AF37] text-black text-[10px] font-black tracking-wider uppercase hover:bg-[#c4a030] transition-colors">
            <Star size={12} /> Update Interests
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {articles.map(article => (
            <article key={article.id} className="group border-b border-border pb-6 mb-6 last:border-0">
              {article.imageId && (
                <div className="mb-3 overflow-hidden aspect-video bg-muted">
                  <Link to={`/article/${article.id}`}>
                    <img
                      src={article.imageId.startsWith('http') ? article.imageId : `https://images.unsplash.com/photo-${article.imageId}?w=680&h=383&fit=crop&auto=format`}
                      alt={article.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </Link>
                </div>
              )}
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-block px-2 py-0.5 text-[9px] font-bold tracking-[0.18em] uppercase border border-current opacity-60">
                  {article.category?.name || "General"}
                </span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock size={9} /> {article.time}
                </span>
              </div>
              <h3 className="text-[15px] font-black leading-snug mb-2 cursor-pointer group-hover:text-[#D4AF37] transition-colors duration-150"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                <Link to={`/article/${article.id}`} className="block">{article.title}</Link>
              </h3>
              <p className="text-sm leading-relaxed mb-3 text-muted-foreground line-clamp-3">{article.summary}</p>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-muted-foreground font-medium">{article.source?.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleBookmark(article.id)}
                    className={`p-1.5 rounded transition-colors ${
                      bookmarkedIds.has(article.id)
                        ? "text-[#D4AF37]"
                        : "text-muted-foreground hover:text-[#D4AF37]"
                    }`}
                    title={bookmarkedIds.has(article.id) ? "Remove bookmark" : "Bookmark"}
                  >
                    {bookmarkedIds.has(article.id) ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
                  </button>
                  <Link to={`/article/${article.id}`}
                    className="inline-flex items-center gap-1 text-[10px] font-bold tracking-[0.18em] uppercase text-[#D4AF37] border-b border-[#D4AF37]/40 hover:gap-2 hover:border-[#D4AF37] transition-all duration-200">
                    Read More <ArrowRight size={10} />
                  </Link>
                </div>
              </div>
            </article>
          ))}

          {hasMore && (
            <div className="text-center py-4">
              <button
                onClick={() => { const next = page + 1; setPage(next); loadFeed(next); }}
                disabled={loading}
                className="px-6 py-2.5 border border-border text-[10px] font-bold tracking-wider uppercase hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors flex items-center gap-2 mx-auto">
                {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
                Load More
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Re-export the interests list for use in App.tsx
export { ALL_INTERESTS };
