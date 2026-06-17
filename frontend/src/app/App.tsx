import { useState, useEffect } from "react";
import {
  Search, User, Moon, Sun, TrendingUp, TrendingDown,
  CheckCircle2, Briefcase, MapPin, DollarSign, Brain,
  Menu, X, ArrowRight, Shield, Globe, Zap, Mail, Bell,
  Clock, ChevronRight, BarChart2, Star, Bookmark, LogOut,
} from "lucide-react";
import { 
  BrowserRouter, 
  Routes, 
  Route, 
  Link, 
  useParams, 
  useNavigate, 
  useLocation, 
  useSearchParams 
} from "react-router";
import { 
  fetchCategories, 
  fetchArticles, 
  fetchArticleById, 
  fetchVerificationReport,
  fetchDailyBrief,
  fetchAiSummary,
  Category, 
  Article,
  VerificationReport,
  VerificationStatus
} from "./services/api";
import {
  AuthProvider,
  useAuth,
  LoginView,
  RegisterView,
  ForgotPasswordView,
  OnboardingView,
  ProfileView,
  MyFeedView,
} from "./components/AuthViews";

// ── Types ──────────────────────────────────────────────────────────────────
type Sentiment = "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "positive" | "negative" | "neutral";

interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string;
  remote: boolean;
  posted: string;
}

interface MarketItem {
  symbol: string;
  name: string;
  price: string;
  change: string;
  up: boolean;
}

// ── Static Data ────────────────────────────────────────────────────────────
const BREAKING_ITEMS = [
  "Fed signals potential rate cuts as inflation cools to 2.1% — closest to target in four years",
  "OpenAI launches GPT-5 with multi-step reasoning abilities that stun researchers worldwide",
  "Global markets rally on strong June jobs report — S&P 500 closes at record 5,847",
  "EU passes landmark AI Accountability Act with sweeping enterprise deployment requirements",
  "NVIDIA reports record $36.4B quarterly revenue; stock surges 8.2% in after-hours trading",
  "Bitcoin breaks $105,000 as institutional ETF demand hits all-time high of $8.2B net inflows",
];

const STOCKS: MarketItem[] = [
  { symbol: "SPX", name: "S&P 500", price: "5,847.32", change: "+0.82%", up: true },
  { symbol: "NDX", name: "Nasdaq 100", price: "20,412.18", change: "+1.14%", up: true },
  { symbol: "AAPL", name: "Apple", price: "$213.47", change: "+0.43%", up: true },
  { symbol: "NVDA", name: "NVIDIA", price: "$912.38", change: "+8.21%", up: true },
  { symbol: "MSFT", name: "Microsoft", price: "$435.20", change: "-0.18%", up: false },
  { symbol: "TSLA", name: "Tesla", price: "$248.90", change: "-1.32%", up: false },
  { symbol: "AMZN", name: "Amazon", price: "$197.55", change: "+0.67%", up: true },
  { symbol: "GOOG", name: "Alphabet", price: "$185.20", change: "+0.91%", up: true },
  { symbol: "META", name: "Meta", price: "$572.14", change: "+1.43%", up: true },
];

const CRYPTO: MarketItem[] = [
  { symbol: "BTC", name: "Bitcoin", price: "$105,247", change: "+3.82%", up: true },
  { symbol: "ETH", name: "Ethereum", price: "$3,847", change: "+2.14%", up: true },
  { symbol: "SOL", name: "Solana", price: "$187.42", change: "+4.37%", up: true },
  { symbol: "BNB", name: "BNB Chain", price: "$612.80", change: "-0.94%", up: false },
  { symbol: "XRP", name: "XRP", price: "$0.642", change: "-1.18%", up: false },
];

const JOBS: Job[] = [
  { id: 1, title: "Senior ML Engineer", company: "OpenAI", location: "San Francisco, CA", type: "Full-time", salary: "$280K–$420K", remote: false, posted: "2d ago" },
  { id: 2, title: "AI Product Manager", company: "Google DeepMind", location: "London, UK", type: "Full-time", salary: "£120K–£180K", remote: true, posted: "1d ago" },
  { id: 3, title: "Quantitative Analyst", company: "Citadel Securities", location: "Chicago, IL", type: "Full-time", salary: "$200K–$350K", remote: false, posted: "3d ago" },
  { id: 4, title: "Blockchain Engineer", company: "Coinbase", location: "Remote", type: "Full-time", salary: "$160K–$240K", remote: true, posted: "1d ago" },
  { id: 5, title: "AI Research Intern", company: "Anthropic", location: "San Francisco, CA", type: "Internship", salary: "$8,000/mo", remote: false, posted: "5h ago" },
  { id: 6, title: "Financial Data Scientist", company: "Bloomberg LP", location: "New York, NY", type: "Full-time", salary: "$180K–$260K", remote: false, posted: "4d ago" },
];

// ── Helpers ────────────────────────────────────────────────────────────────
function sentimentStyle(s: Sentiment) {
  const norm = s.toLowerCase();
  if (norm === "positive") return "text-emerald-700 dark:text-emerald-400";
  if (norm === "negative") return "text-red-700 dark:text-red-400";
  return "text-gray-500";
}

function sentimentLabel(s: Sentiment) {
  const norm = s.toLowerCase();
  if (norm === "positive") return "▲ Positive";
  if (norm === "negative") return "▼ Negative";
  return "● Neutral";
}

function credibilityStyle(score: number) {
  if (score >= 95) return "text-emerald-700 dark:text-emerald-400";
  if (score >= 85) return "text-amber-700 dark:text-amber-400";
  return "text-orange-700 dark:text-orange-400";
}

// ── Sub-components ─────────────────────────────────────────────────────────
function CategoryTag({ category }: { category: string }) {
  return (
    <span
      className="inline-block px-2 py-0.5 text-[9px] font-bold tracking-[0.18em] uppercase border border-current opacity-60 animate-fade-in"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {category}
    </span>
  );
}

function VerificationBadge({ status }: { status: string }) {
  const norm = (status || 'UNVERIFIED').toUpperCase();
  let label = "Unverified";
  let style = "text-gray-500 bg-gray-100 dark:bg-gray-900/40 dark:text-gray-400 border-gray-200 dark:border-gray-800";
  
  if (norm === "VERIFIED") {
    label = "Verified";
    style = "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/25 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50";
  } else if (norm === "PARTIALLY_VERIFIED") {
    label = "Partially Verified";
    style = "text-amber-700 bg-amber-50 dark:bg-amber-950/25 dark:text-amber-400 border-amber-200 dark:border-amber-900/50";
  } else if (norm === "CONFLICTING_REPORTS") {
    label = "Conflicting";
    style = "text-red-700 bg-red-50 dark:bg-red-950/25 dark:text-red-400 border-red-200 dark:border-red-900/50";
  }

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold tracking-wider uppercase border ${style}`}
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {label}
    </span>
  );
}

function CredibilityBadge({ score }: { score: number }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-medium ${credibilityStyle(score)}`}
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      <CheckCircle2 size={10} />
      {score}% Credibility
    </span>
  );
}

function SectionHeader({ title, label }: { title: string; label?: string }) {
  return (
    <div className="mb-4 border-t-[2px] border-foreground pt-2.5 flex items-center justify-between">
      <h2
        className="text-[11px] font-black tracking-[0.22em] uppercase"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {title}
      </h2>
      {label && (
        <span
          className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#D4AF37]"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

function ArticleCard({ article, compact = false }: { article: Article; compact?: boolean }) {
  const categoryName = typeof article.category === 'string' ? article.category : article.category?.name;
  const sourceName = typeof article.source === 'string' ? article.source : article.source?.name;

  return (
    <article className="group border-b border-border pb-4 mb-4 last:border-0 last:pb-0 last:mb-0 transition-all duration-300">
      {article.imageId && !compact && (
        <div className="mb-3 overflow-hidden bg-muted aspect-video">
          <Link to={`/article/${article.id}`}>
            <img
              src={article.imageId.startsWith('http') ? article.imageId : `https://images.unsplash.com/photo-${article.imageId}?w=560&h=315&fit=crop&auto=format`}
              alt={article.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </Link>
        </div>
      )}
      <div className="flex items-center gap-2 mb-2">
        <CategoryTag category={categoryName || 'General'} />
        <span
          className="text-[10px] text-muted-foreground flex items-center gap-1"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          <Clock size={9} />
          {article.time}
        </span>
      </div>
      <h3
        className={`font-black leading-snug mb-2 cursor-pointer group-hover:text-[#D4AF37] transition-colors duration-150 ${compact ? "text-sm" : "text-[15px]"}`}
        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
      >
        <Link to={`/article/${article.id}`} className="block">
          {article.title}
        </Link>
      </h3>
      {!compact && (
        <p className="text-sm leading-relaxed mb-3 text-muted-foreground line-clamp-3">
          {article.summary}
        </p>
      )}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          {article.sourceUrl ? (
            <a 
              href={article.sourceUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-[11px] font-semibold text-muted-foreground hover:text-[#D4AF37] underline transition-colors"
            >
              {sourceName}
            </a>
          ) : (
            <span className="text-[11px] text-muted-foreground font-medium">{sourceName}</span>
          )}
          <VerificationBadge status={article.verificationStatus} />
          <CredibilityBadge score={article.credibility} />
        </div>
        <span
          className={`text-[10px] ${sentimentStyle(article.sentiment)}`}
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {sentimentLabel(article.sentiment)}
        </span>
      </div>
      {!compact && (
        <Link
          to={`/article/${article.id}`}
          className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold tracking-[0.18em] uppercase text-[#D4AF37] border-b border-[#D4AF37]/40 pb-0.5 hover:gap-2 hover:border-[#D4AF37] transition-all duration-200"
        >
          Read More <ArrowRight size={10} />
        </Link>
      )}
    </article>
  );
}

function StockRow({ item }: { item: MarketItem }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <div>
        <span
          className="text-xs font-bold"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {item.symbol}
        </span>
        <span className="ml-2 text-[11px] text-muted-foreground">{item.name}</span>
      </div>
      <div className="text-right">
        <div
          className="text-xs font-medium"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {item.price}
        </div>
        <div
          className={`text-[10px] flex items-center justify-end gap-0.5 ${item.up ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {item.up ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
          {item.change}
        </div>
      </div>
    </div>
  );
}

// ── Common States ──────────────────────────────────────────────────────────
function ArticleSkeleton() {
  return (
    <div className="animate-pulse border-b border-border pb-4 mb-4 last:border-0 last:pb-0 last:mb-0">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-4 bg-muted w-16 rounded" />
        <div className="h-3 bg-muted w-12 rounded" />
      </div>
      <div className="h-5 bg-muted w-full mb-2 rounded" />
      <div className="h-5 bg-muted w-4/5 mb-3 rounded" />
      <div className="h-3.5 bg-muted w-full mb-1 rounded" />
      <div className="h-3.5 bg-muted w-11/12 mb-3 rounded" />
      <div className="flex justify-between items-center mt-2">
        <div className="flex gap-2">
          <div className="h-4 bg-muted w-12 rounded" />
          <div className="h-4 bg-muted w-16 rounded" />
        </div>
        <div className="h-3 bg-muted w-10 rounded" />
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="text-center py-16 px-4 border border-destructive/20 bg-destructive/5 my-6 max-w-xl mx-auto">
      <p className="text-destructive font-semibold text-sm mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-foreground text-background text-xs font-bold uppercase tracking-wider hover:bg-[#D4AF37] hover:text-black transition-colors duration-200"
      >
        Retry Connection
      </button>
    </div>
  );
}

// ── Main Page Content ───────────────────────────────────────────────────────
function AppContent() {
  const [dark, setDark] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [searchVal, setSearchVal] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  // Dynamic Categories State
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [errCats, setErrCats] = useState<string | null>(null);

  const loadCategories = async () => {
    try {
      setLoadingCats(true);
      setErrCats(null);
      const data = await fetchCategories();
      setCategories(data);
    } catch (e) {
      setErrCats("Server offline");
    } finally {
      setLoadingCats(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const liveTime = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      navigate(`/?search=${encodeURIComponent(searchVal.trim())}`);
    } else {
      navigate('/');
    }
  };

  // Check active category for style updates
  const getActiveCategoryName = () => {
    if (location.pathname === '/') return 'All';
    if (location.pathname.startsWith('/category/')) {
      const slug = location.pathname.split('/')[2];
      const match = categories.find(c => c.slug === slug);
      return match ? match.name : slug;
    }
    return '';
  };

  const activeCategory = getActiveCategoryName();

  return (
    <>
      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track {
          animation: ticker-scroll 40s linear infinite;
          width: max-content;
        }
        .ticker-track:hover { animation-play-state: paused; }

        @keyframes stock-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .stock-track {
          animation: stock-scroll 28s linear infinite;
          width: max-content;
        }

        ::-webkit-scrollbar { width: 3px; height: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.25); }

        .nav-scroll::-webkit-scrollbar { display: none; }

        body { font-family: 'Inter', system-ui, sans-serif; }
      `}</style>

      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">

        {/* ── Edition Bar ── */}
        <div className="bg-secondary border-b border-border">
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-1.5 flex items-center justify-between">
            <span
              className="text-[10px] text-muted-foreground hidden sm:block"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Est. 2026 · Vol. I · No. 1
            </span>
            <span
              className="text-[10px] text-muted-foreground text-center flex-1 sm:flex-none"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {today}
            </span>
            <span
              className="text-[10px] text-muted-foreground hidden sm:block"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Trusted · Verified · Independent
            </span>
          </div>
        </div>

        {/* ── Masthead ── */}
        <header className="max-w-screen-xl mx-auto px-4 sm:px-6 pt-5 pb-3">
          <div className="text-center mb-4">
            <div className="h-[3px] bg-foreground w-full mb-0.5" />
            <div className="h-px bg-foreground w-full mb-3" />
            <h1
              className="text-[clamp(2.5rem,8vw,6rem)] font-black leading-none tracking-tight mb-1.5"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              <Link to="/">Worth Knowing</Link>
            </h1>
            <p
              className="text-[10px] tracking-[0.35em] uppercase text-muted-foreground mb-3"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              AI-Powered · Multi-Source Verified · Credibility Rated
            </p>
            <div className="h-px bg-foreground w-full mb-0.5" />
            <div className="h-[3px] bg-foreground w-full" />
          </div>

          {/* Controls row */}
          <div className="flex items-center gap-3 pt-3 pb-2 border-b border-border">
            <button
              className="lg:hidden p-1 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <div className="flex-1 max-w-sm">
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 border border-border bg-card px-3 py-2 focus-within:border-[#D4AF37] transition-colors">
                <Search size={13} className="text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  placeholder="Search stories, topics, companies…"
                  className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                />
              </form>
            </div>

            <div className="ml-auto flex items-center gap-2.5">
              <HeaderUserMenu />
              <button
                onClick={() => setDark(!dark)}
                className="p-1.5 text-muted-foreground hover:text-[#D4AF37] transition-colors"
                aria-label="Toggle dark mode"
              >
                {dark ? <Sun size={17} /> : <Moon size={17} />}
              </button>
              <Link
                to="/my-feed"
                className="hidden sm:flex items-center gap-1.5 bg-foreground text-background text-[10px] font-bold tracking-[0.18em] uppercase px-3.5 py-2 hover:bg-[#D4AF37] hover:text-black transition-colors duration-200"
              >
                <Star size={11} />
                My Feed
              </Link>
            </div>
          </div>
        </header>

        {/* ── Breaking News Ticker ── */}
        <div className="bg-[#D4AF37] overflow-hidden">
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
            <div className="flex items-center h-9 gap-4">
              <span
                className="shrink-0 text-[10px] font-black tracking-[0.25em] uppercase text-black border-r border-black/20 pr-4"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                BREAKING
              </span>
              <div className="overflow-hidden flex-1">
                <div className="ticker-track flex">
                  {[...BREAKING_ITEMS, ...BREAKING_ITEMS].map((item, i) => (
                    <span
                      key={i}
                      className="text-[12px] font-medium text-black whitespace-nowrap mr-10"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      {item}
                      <span className="mx-5 opacity-40">◆</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Category Navigation ── */}
        <nav className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-40">
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
            <div className="flex items-center overflow-x-auto nav-scroll gap-0">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`shrink-0 px-4 py-3 text-[10px] font-bold tracking-[0.18em] uppercase whitespace-nowrap border-b-[2px] transition-all duration-150 ${
                  activeCategory === "All"
                    ? "border-[#D4AF37] text-[#D4AF37]"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                All
              </Link>
              {loadingCats ? (
                <div className="h-4 w-24 bg-muted animate-pulse rounded ml-4" />
              ) : errCats ? (
                <span className="text-[10px] text-destructive italic px-4 uppercase tracking-[0.18em]">{errCats}</span>
              ) : (
                categories.map((cat) => (
                  <Link
                    key={cat.id}
                    to={`/category/${cat.slug}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`shrink-0 px-4 py-3 text-[10px] font-bold tracking-[0.18em] uppercase whitespace-nowrap border-b-[2px] transition-all duration-150 ${
                      activeCategory === cat.name
                        ? "border-[#D4AF37] text-[#D4AF37]"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    {cat.name}
                  </Link>
                ))
              )}
            </div>
          </div>
        </nav>

        {/* ── Main Content ── */}
        <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8">
          <Routes>
            <Route path="/" element={<HomeView liveTime={liveTime} />} />
            <Route path="/category/:slug" element={<CategoryView liveTime={liveTime} />} />
            <Route path="/article/:id" element={<ArticleDetailsView />} />
            <Route path="/login" element={<LoginView />} />
            <Route path="/register" element={<RegisterView />} />
            <Route path="/forgot-password" element={<ForgotPasswordView />} />
            <Route path="/onboarding" element={<OnboardingView />} />
            <Route path="/profile" element={<ProfileView />} />
            <Route path="/my-feed" element={<MyFeedView />} />
          </Routes>

          {/* ── AI Features Panel ── */}
          <section className="mb-12 bg-card border border-border p-6 sm:p-8 mt-12">
            <div className="flex items-center gap-2 mb-7">
              <Brain size={15} className="text-[#D4AF37]" />
              <h2
                className="text-[11px] font-black tracking-[0.25em] uppercase"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                AI-Powered Intelligence Features
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { Icon: Brain, label: "Daily AI Summary", desc: "Synthesized from 500+ sources daily" },
                { Icon: Shield, label: "Credibility Rating", desc: "Multi-source fact verification engine" },
                { Icon: BarChart2, label: "Sentiment Analysis", desc: "Real-time narrative tone detection" },
                { Icon: Globe, label: "Multi-Source Badge", desc: "Cross-publication claim verification" },
                { Icon: Zap, label: "Key Takeaways", desc: "AI-generated highlights per story" },
                { Icon: Star, label: "Personalized Feed", desc: "Adapts to your reading behavior" },
              ].map(({ Icon, label, desc }, i) => (
                <div
                  key={i}
                  className="p-4 border border-border text-center cursor-pointer group hover:border-[#D4AF37]/50 hover:bg-secondary transition-all duration-200"
                >
                  <div className="w-9 h-9 border border-[#D4AF37]/30 bg-[#D4AF37]/8 flex items-center justify-center mx-auto mb-3 group-hover:bg-[#D4AF37]/15 transition-colors">
                    <Icon size={16} className="text-[#D4AF37]" />
                  </div>
                  <div
                    className="text-[11px] font-bold mb-1.5"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    {label}
                  </div>
                  <div className="text-[10px] leading-snug text-muted-foreground">{desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Jobs Section ── */}
          <section className="mb-12">
            <div className="mb-6 border-t-[2px] border-foreground pt-3 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <h2
                  className="text-2xl font-black"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Opportunities
                </h2>
                <p
                  className="text-[10px] text-muted-foreground mt-1"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  48,000+ tech & finance positions · Updated hourly
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {["All Roles", "Tech", "Finance", "Remote Only", "Internship"].map((f) => (
                  <button
                    key={f}
                    className="text-[9px] font-bold tracking-[0.18em] uppercase px-2.5 py-1.5 border border-border hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {JOBS.map((job) => (
                <div
                  key={job.id}
                  className="bg-card border border-border p-5 group cursor-pointer hover:border-[#D4AF37]/40 transition-all duration-200"
                >
                  <div className="mb-3">
                    <span
                      className={`inline-block text-[8px] font-bold tracking-[0.2em] uppercase px-1.5 py-0.5 mb-2 ${
                        job.remote
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/25 dark:text-emerald-400"
                          : job.type === "Internship"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/25 dark:text-blue-400"
                          : "bg-secondary text-muted-foreground"
                      }`}
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      {job.remote ? "Remote" : job.type}
                    </span>
                    <h3
                      className="text-base font-black leading-snug group-hover:text-[#D4AF37] transition-colors"
                      style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                      {job.title}
                    </h3>
                    <p className="text-sm font-semibold text-muted-foreground mt-1">{job.company}</p>
                  </div>
                  <div className="space-y-1.5 mb-4">
                    <div
                      className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      <MapPin size={10} />
                      {job.location}
                    </div>
                    <div
                      className="flex items-center gap-1.5 text-[11px] font-bold text-[#D4AF37]"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      <DollarSign size={10} />
                      {job.salary}
                    </div>
                    <div
                      className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      <Clock size={10} />
                      Posted {job.posted}
                    </div>
                  </div>
                  <button className="w-full py-2 text-[10px] font-bold tracking-[0.18em] uppercase border border-foreground flex items-center justify-center gap-1.5 hover:bg-foreground hover:text-background transition-all duration-200">
                    <Briefcase size={10} />
                    Apply Now
                  </button>
                </div>
              ))}
            </div>
          </section>
        </main>

        {/* ── Footer ── */}
        <footer className="border-t-[2px] border-foreground bg-secondary">

          {/* Newsletter */}
          <div className="border-b border-border py-10">
            <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
              <div className="max-w-lg mx-auto text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Mail size={14} className="text-[#D4AF37]" />
                  <span
                    className="text-[11px] font-black tracking-[0.25em] uppercase"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    The Worth Knowing Daily
                  </span>
                </div>
                <p
                  className="text-sm text-muted-foreground mb-5"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  <em>AI-curated. Verified sources. Zero noise. Delivered at 6 AM.</em>
                </p>
                <div className="flex gap-0">
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 min-w-0 px-4 py-2.5 text-sm border border-border border-r-0 bg-background outline-none focus:border-[#D4AF37] transition-colors"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  />
                  <button className="shrink-0 bg-[#D4AF37] text-black text-[10px] font-black tracking-[0.18em] uppercase px-5 py-2.5 hover:bg-[#c4a030] transition-colors">
                    Subscribe
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-10">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
              {[
                { heading: "About", links: ["Our Mission", "Editorial Team", "Methodology", "Investors"] },
                { heading: "Transparency", links: ["Editorial Policy", "Source Standards", "AI Disclosure", "Corrections"] },
                { heading: "Legal", links: ["Privacy Policy", "Terms of Service", "Cookie Policy", "GDPR"] },
                { heading: "Contact", links: ["Editorial", "Advertising", "Press", "Careers"] },
              ].map(({ heading, links }) => (
                <div key={heading}>
                  <div
                    className="text-[10px] font-black tracking-[0.22em] uppercase mb-3 border-t-[2px] border-foreground pt-2.5"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    {heading}
                  </div>
                  <ul className="space-y-2">
                    {links.map((l) => (
                      <li key={l}>
                        <a
                          href="#"
                          className="text-[12px] text-muted-foreground hover:text-[#D4AF37] transition-colors"
                          style={{ fontFamily: "'Inter', sans-serif" }}
                        >
                          {l}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border">
              <span
                className="text-xl font-black"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Worth Knowing
              </span>
              <span
                className="text-[10px] text-muted-foreground text-center"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                © 2026 Worth Knowing · AI-Powered · Human-Edited · Independently Owned
              </span>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span
                  className="text-[10px] text-muted-foreground"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Live · {liveTime}
                </span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

// ── 1. Homepage View ────────────────────────────────────────────────────────
function HomeView({ liveTime }: { liveTime: string }) {
  const [searchParams] = useSearchParams();
  const search = searchParams.get('search') || undefined;

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [morningBriefOpen, setMorningBriefOpen] = useState(false);
  const [dailyBrief, setDailyBrief] = useState<{
    title: string;
    content: string;
    categories: string[];
    generatedAt: string;
  } | null>(null);

  const loadHomeData = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch dynamic articles matching search (if active) + today's brief in parallel
      const [articlesData, briefData] = await Promise.allSettled([
        fetchArticles({ search, limit: 30 }),
        fetchDailyBrief()
      ]);
      if (articlesData.status === 'fulfilled') setArticles(articlesData.value.data);
      else throw new Error('Failed to load articles');
      if (briefData.status === 'fulfilled' && briefData.value) setDailyBrief(briefData.value);
    } catch (e) {
      setError("Unable to load latest articles. Verify that the backend server is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHomeData();
  }, [search]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 py-6">
        <div className="lg:col-span-2">
          <div className="animate-pulse bg-muted aspect-[16/9] mb-4 rounded" />
          <div className="h-7 bg-muted w-3/4 mb-3 rounded" />
          <div className="h-4 bg-muted w-full mb-2 rounded" />
          <div className="h-4 bg-muted w-5/6 mb-4 rounded" />
        </div>
        <div className="space-y-6">
          <ArticleSkeleton />
          <ArticleSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadHomeData} />;
  }

  if (articles.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground border border-border border-dashed">
        <Globe className="mx-auto mb-4 opacity-30 text-[#D4AF37]" size={32} />
        <p className="text-sm font-semibold">No news articles found.</p>
        {search && <p className="text-xs mt-1">Try refining your search keyword.</p>}
      </div>
    );
  }

  const heroArticle = articles[0];
  const secondaryHero = articles.slice(1, 3);
  const aiArticles = articles.filter(a => a.category.slug === 'ai-technology').slice(0, 3);
  const topStories = articles.slice(3, 6);
  const marketAnalysis = articles.filter(a => ['stock-market', 'economy'].includes(a.category.slug)).slice(0, 3);

  // Fallback lists if arrays are empty (safe safeguards)
  if (secondaryHero.length === 0) secondaryHero.push(heroArticle);
  if (topStories.length === 0) topStories.push(heroArticle);

  return (
    <>
      {/* ── Hero Section ── */}
      <section className="mb-8 border-b border-border pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 lg:gap-6">

          {/* Primary hero */}
          <div className="lg:col-span-2 lg:border-r border-border lg:pr-6">
            <div className="flex items-center gap-2 mb-3">
              <span
                className="bg-foreground text-background text-[9px] font-black tracking-[0.25em] uppercase px-2 py-0.5"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                FEATURED
              </span>
              <span
                className="text-[10px] text-muted-foreground"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                Today's Lead Story
              </span>
            </div>

            {heroArticle.imageId && (
              <div className="overflow-hidden bg-muted aspect-[16/9] mb-5">
                <Link to={`/article/${heroArticle.id}`}>
                  <img
                    src={heroArticle.imageId.startsWith('http') ? heroArticle.imageId : `https://images.unsplash.com/photo-${heroArticle.imageId}?w=840&h=473&fit=crop&auto=format`}
                    alt={heroArticle.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                  />
                </Link>
              </div>
            )}

            <CategoryTag category={heroArticle.category.name} />
            <h2
              className="text-[clamp(1.6rem,3.5vw,2.5rem)] font-black leading-tight mt-2 mb-3 cursor-pointer hover:text-[#D4AF37] transition-colors duration-200"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              <Link to={`/article/${heroArticle.id}`}>{heroArticle.title}</Link>
            </h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground mb-5 max-w-prose">
              {heroArticle.summary}
            </p>
            <div className="flex items-center flex-wrap gap-x-4 gap-y-2 mb-5">
              {heroArticle.sourceUrl ? (
                <a 
                  href={heroArticle.sourceUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-sm font-bold hover:text-[#D4AF37] underline transition-colors"
                >
                  {heroArticle.source.name}
                </a>
              ) : (
                <span className="text-sm font-semibold">{heroArticle.source.name}</span>
              )}
              <span
                className="text-[10px] text-muted-foreground flex items-center gap-1"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                <Clock size={9} />{heroArticle.time}
              </span>
              <VerificationBadge status={heroArticle.verificationStatus} />
              <CredibilityBadge score={heroArticle.credibility} />
              <span
                className={`text-[10px] ${sentimentStyle(heroArticle.sentiment)}`}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {sentimentLabel(heroArticle.sentiment)}
              </span>
            </div>
            <Link 
              to={`/article/${heroArticle.id}`}
              className="inline-flex items-center gap-2 bg-foreground text-background text-[10px] font-bold tracking-[0.18em] uppercase px-5 py-2.5 hover:bg-[#D4AF37] hover:text-black transition-colors duration-200"
            >
              Read Full Story <ArrowRight size={12} />
            </Link>
          </div>

          {/* Secondary hero stories */}
          <div className="flex flex-col gap-6 mt-6 lg:mt-0">
            {secondaryHero.map((article, i) => (
              <div
                key={article.id}
                className={`group cursor-pointer ${i === 0 ? "border-b border-border pb-6" : ""}`}
              >
                {article.imageId && (
                  <div className="overflow-hidden bg-muted aspect-video mb-3">
                    <Link to={`/article/${article.id}`}>
                      <img
                        src={article.imageId.startsWith('http') ? article.imageId : `https://images.unsplash.com/photo-${article.imageId}?w=420&h=236&fit=crop&auto=format`}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </Link>
                  </div>
                )}
                <CategoryTag category={article.category.name} />
                <h3
                  className="text-[15px] font-black leading-snug mt-2 mb-2 group-hover:text-[#D4AF37] transition-colors duration-150"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  <Link to={`/article/${article.id}`}>{article.title}</Link>
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">
                  {article.summary}
                </p>
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-xs font-medium">{article.source.name}</span>
                  <CredibilityBadge score={article.credibility} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Live Markets Strip ── */}
      <section className="-mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 bg-secondary border-y border-border overflow-hidden mb-8">
        <div className="flex items-center gap-5">
          <span
            className="shrink-0 text-[9px] font-black tracking-[0.22em] uppercase flex items-center gap-1.5 text-muted-foreground"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            <BarChart2 size={11} className="text-[#D4AF37]" />
            LIVE MARKETS
          </span>
          <div className="overflow-hidden flex-1">
            <div className="stock-track flex gap-8">
              {[...STOCKS, ...CRYPTO, ...STOCKS, ...CRYPTO].map((item, i) => (
                <span
                  key={i}
                  className="shrink-0 inline-flex items-center gap-2 text-xs"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  <span className="font-bold">{item.symbol}</span>
                  <span className="text-muted-foreground">{item.price}</span>
                  <span className={item.up ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                    {item.change}
                  </span>
                </span>
              ))}
            </div>
          </div>
          <span
            className="shrink-0 text-[9px] text-muted-foreground flex items-center gap-1"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
            {liveTime}
          </span>
        </div>
      </section>

      {/* ── Main 3-Column Grid ── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">

        {/* Left: AI & Tech */}
        <div>
          <SectionHeader title="AI & Technology" label="Trending" />
          {aiArticles.length > 0 ? (
            aiArticles.map((a) => <ArticleCard key={a.id} article={a} />)
          ) : (
            <p className="text-xs text-muted-foreground italic">No trending AI stories.</p>
          )}

          <div className="mt-6">
            <SectionHeader title="New AI Tools Today" />
            <div className="space-y-0">
              {[
                { name: "Gemini 2.5 Ultra", org: "Google", note: "Extended context to 2M tokens" },
                { name: "Claude 4 Artifacts", org: "Anthropic", note: "Live code execution in browser" },
                { name: "Sora HD", org: "OpenAI", note: "4K video generation at 60fps" },
                { name: "Runway Gen-4", org: "Runway", note: "Consistent character control" },
                { name: "Grok 3.5", org: "xAI", note: "Real-time web search integration" },
              ].map((tool, i) => (
                <div key={i} className="flex items-start gap-3 py-3 border-b border-border last:border-0 group cursor-pointer">
                  <div className="w-7 h-7 bg-[#D4AF37] flex items-center justify-center shrink-0 mt-0.5">
                    <Zap size={12} className="text-black" />
                  </div>
                  <div>
                    <div
                      className="text-[13px] font-black group-hover:text-[#D4AF37] transition-colors"
                      style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                      {tool.name}
                    </div>
                    <div
                      className="text-[10px] text-muted-foreground mt-0.5"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {tool.org} · {tool.note}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center: Top Stories + Morning Brief + Analysis */}
        <div className="lg:border-x border-border lg:px-8">
          <SectionHeader title="Top Stories" label="Most Read" />
          {topStories.map((a) => <ArticleCard key={a.id} article={a} />)}

          {/* Morning Brief */}
          <div className="mt-6 p-5 border border-[#D4AF37]/30 bg-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Brain size={14} className="text-[#D4AF37]" />
                <span
                  className="text-[10px] font-black tracking-[0.22em] uppercase"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  AI Morning Brief
                </span>
              </div>
              <span
                className="text-[9px] text-muted-foreground"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                5-min read
              </span>
            </div>
            {dailyBrief ? (
              <>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <span
                    className="font-black text-foreground"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    {dailyBrief.title}
                  </span>
                  {" "}
                  {dailyBrief.content.split('\n\n')[0]?.slice(0, 220)}…
                </p>
                <button
                  onClick={() => setMorningBriefOpen(!morningBriefOpen)}
                  className="mt-3 text-[10px] font-bold tracking-[0.18em] uppercase text-[#D4AF37] flex items-center gap-1 hover:gap-2 transition-all"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {morningBriefOpen ? "Collapse" : "Read Full Brief"}
                  <ChevronRight
                    size={11}
                    className={`transition-transform duration-200 ${morningBriefOpen ? "rotate-90" : ""}`}
                  />
                </button>
                {morningBriefOpen && (
                  <div className="mt-4 pt-4 border-t border-border space-y-3 text-sm leading-relaxed text-muted-foreground">
                    {dailyBrief.content.split('\n\n').map((paragraph, idx) => {
                      if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                        return (
                          <p key={idx}>
                            <span className="font-black text-foreground" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                              {paragraph.replace(/\*\*/g, '')}
                            </span>
                          </p>
                        );
                      }
                      if (paragraph.startsWith('## ') || paragraph.startsWith('### ')) {
                        return (
                          <p key={idx} className="font-black text-foreground pt-2" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                            {paragraph.replace(/^#{2,3}\s+/, '')}
                          </p>
                        );
                      }
                      return <p key={idx}>{paragraph}</p>;
                    })}
                    <p className="text-[10px] text-muted-foreground pt-2 border-t border-border" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      Generated: {new Date(dailyBrief.generatedAt).toLocaleString()} · Categories: {dailyBrief.categories.join(', ')}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <span
                    className="font-black text-foreground"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    Today in brief:
                  </span>
                  {" "}The AI Morning Brief is generated daily at 6:00 AM. Check back then for your curated 5-minute read covering markets, technology, geopolitics, and more.
                </p>
                <button
                  onClick={() => setMorningBriefOpen(!morningBriefOpen)}
                  className="mt-3 text-[10px] font-bold tracking-[0.18em] uppercase text-[#D4AF37] flex items-center gap-1 hover:gap-2 transition-all"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {morningBriefOpen ? "Collapse" : "See Categories"}
                  <ChevronRight
                    size={11}
                    className={`transition-transform duration-200 ${morningBriefOpen ? "rotate-90" : ""}`}
                  />
                </button>
                {morningBriefOpen && (
                  <div className="mt-4 pt-4 border-t border-border space-y-3 text-sm leading-relaxed text-muted-foreground">
                    {["AI & Technology", "Markets & Business", "Economy & Policy", "Global Affairs", "Science", "Personal Finance"].map((cat, i) => (
                      <p key={i}>
                        <span className="font-black text-foreground" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                          {cat}:
                        </span>
                        {" "}Briefing available after 6:00 AM daily.
                      </p>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Market Analysis */}
          <div className="mt-6">
            <SectionHeader title="Economic Reports" label="Analysis" />
            {marketAnalysis.length > 0 ? (
              marketAnalysis.map((a) => <ArticleCard key={a.id} article={a} compact />)
            ) : (
              <p className="text-xs text-muted-foreground italic">No market analysis stories.</p>
            )}
          </div>
        </div>

        {/* Right: Stocks + Crypto + Finance */}
        <div>
          <SectionHeader title="Stock Market" label="Live" />
          <div className="bg-card border border-border p-4 mb-7">
            {STOCKS.slice(0, 7).map((item) => (
              <StockRow key={item.symbol} item={item} />
            ))}
            <button className="mt-3 text-[10px] font-bold tracking-[0.18em] uppercase text-[#D4AF37] flex items-center gap-1 hover:gap-2 transition-all">
              Full Dashboard <ArrowRight size={10} />
            </button>
          </div>

          <SectionHeader title="Crypto Markets" label="Live" />
          <div className="bg-card border border-border p-4 mb-7">
            {CRYPTO.map((item) => (
              <StockRow key={item.symbol} item={item} />
            ))}
            <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span
                className="text-[10px] text-muted-foreground"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                Total cap: $3.84T · +2.1% 24h
              </span>
            </div>
          </div>

          <SectionHeader title="Quick Finance" />
          <div className="space-y-0">
            {[
              { label: "US 10Y Yield", value: "4.18%", delta: "▼ -4bps", up: true },
              { label: "USD / EUR", value: "0.9248", delta: "▼ -0.12%", up: false },
              { label: "Gold (oz)", value: "$2,341", delta: "▲ +0.34%", up: true },
              { label: "Crude Oil WTI", value: "$78.42", delta: "▼ -1.12%", up: false },
              { label: "VIX Fear Index", value: "12.8", delta: "▼ Low vol.", up: true },
              { label: "Fed Funds Rate", value: "5.25%", delta: "● Unchanged", up: true },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                <span className="text-[12px] text-muted-foreground">{item.label}</span>
                <div className="text-right">
                  <div
                    className="text-xs font-bold"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {item.value}
                  </div>
                  <div
                    className={`text-[10px] ${item.up ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {item.delta}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

// ── 2. Category Page View ──────────────────────────────────────────────────
function CategoryView({ liveTime }: { liveTime: string }) {
  const { slug } = useParams<{ slug: string }>();

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCategoryData = async () => {
    if (!slug) return;
    try {
      setLoading(true);
      setError(null);
      const data = await fetchArticles({ categorySlug: slug, limit: 30 });
      setArticles(data.data);
    } catch (e) {
      setError("Failed to fetch articles. Ensure the API backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategoryData();
  }, [slug]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 py-6">
        <ArticleSkeleton />
        <ArticleSkeleton />
        <ArticleSkeleton />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadCategoryData} />;
  }

  const categoryName = articles[0]?.category.name || slug.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div>
      <div className="mb-8 border-t-[2px] border-foreground pt-3 animate-fade-in">
        <h2
          className="text-3xl font-black"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          {categoryName}
        </h2>
        <p
          className="text-xs text-muted-foreground mt-1"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {articles.length} stories · Updated continuously · {liveTime}
        </p>
      </div>

      {articles.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <div key={article.id} className="bg-card border border-border p-5">
              <ArticleCard article={article} />
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center text-muted-foreground text-sm border border-border border-dashed">
          <Globe className="mx-auto mb-4 opacity-30 text-[#D4AF37]" size={32} />
          No stories in this category yet.
        </div>
      )}
    </div>
  );
}

// ── 3. Article Details Page View ───────────────────────────────────────────
function ArticleDetailsView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<VerificationReport | null>(null);
  const [aiSummary, setAiSummary] = useState<{
    headlineSummary: string;
    keyTakeaways: string[];
    whyItMatters: string;
    tags: string[];
    readingTimeMinutes: number;
    confidence: number;
    flaggedForReview: boolean;
  } | null>(null);
  const [bookmarked, setBookmarked] = useState(false);

  const loadArticleData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const [data, reportResult, aiResult] = await Promise.allSettled([
        fetchArticleById(id),
        fetchVerificationReport(id),
        fetchAiSummary(id)
      ]);
      if (data.status === 'fulfilled') setArticle(data.value);
      else throw new Error('Article not found');
      if (reportResult.status === 'fulfilled') setReport(reportResult.value);
      if (aiResult.status === 'fulfilled' && aiResult.value) setAiSummary(aiResult.value);
    } catch (e) {
      setError("Article not found or server unreachable.");
    } finally {
      setLoading(false);
    }
  };

  const toggleBookmark = async () => {
    if (!isAuthenticated || !article) return;
    try {
      const { apiAddBookmark, apiRemoveBookmark, apiIsBookmarked } = await import('./services/authApi');
      if (bookmarked) {
        await apiRemoveBookmark(article.id);
        setBookmarked(false);
      } else {
        await apiAddBookmark(article.id);
        setBookmarked(true);
      }
    } catch (e) {
      console.warn('Bookmark toggle failed:', e);
    }
  };

  useEffect(() => {
    loadArticleData();
  }, [id]);

  useEffect(() => {
    const checkBookmark = async () => {
      if (!isAuthenticated || !article) return;
      try {
        const { apiIsBookmarked } = await import('./services/authApi');
        const result = await apiIsBookmarked(article.id);
        setBookmarked(result);
      } catch { /* silent */ }
    };
    checkBookmark();
  }, [isAuthenticated, article]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-8 animate-pulse">
        <div className="h-4 bg-muted w-24 mb-4 rounded" />
        <div className="h-10 bg-muted w-full mb-4 rounded" />
        <div className="h-10 bg-muted w-3/4 mb-6 rounded" />
        <div className="h-4 bg-muted w-1/3 mb-8 rounded" />
        <div className="bg-muted aspect-video w-full mb-8 rounded" />
        <div className="space-y-3">
          <div className="h-4 bg-muted w-full rounded" />
          <div className="h-4 bg-muted w-full rounded" />
          <div className="h-4 bg-muted w-5/6 rounded" />
        </div>
      </div>
    );
  }

  if (error || !article) {
    return <ErrorState message={error || "Article not found"} onRetry={loadArticleData} />;
  }

  return (
    <article className="max-w-3xl mx-auto py-8 animate-fade-in">
      
      {/* Back button */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-[10px] font-bold tracking-[0.18em] uppercase flex items-center gap-1.5 text-[#D4AF37] border-b border-[#D4AF37]/40 pb-0.5 hover:gap-2 hover:border-[#D4AF37] transition-all duration-200"
        >
          <ArrowRight size={10} className="rotate-180" /> Back
        </button>
        <div className="flex items-center gap-3">
          {aiSummary && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              <Clock size={10} /> {aiSummary.readingTimeMinutes} min read
            </span>
          )}
          {isAuthenticated && (
            <button
              onClick={toggleBookmark}
              id="btn-article-bookmark"
              className={`flex items-center gap-1.5 px-3 py-1.5 border text-[10px] font-bold tracking-wider uppercase transition-all ${
                bookmarked
                  ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                  : 'border-border text-muted-foreground hover:border-[#D4AF37] hover:text-[#D4AF37]'
              }`}
            >
              <Bookmark size={11} />
              {bookmarked ? 'Saved' : 'Save'}
            </button>
          )}
        </div>
      </div>

      {/* Category Tag & clock */}
      <div className="flex items-center gap-3 mb-4">
        <CategoryTag category={article.category.name} />
        <span
          className="text-[11px] text-muted-foreground flex items-center gap-1"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          <Clock size={10} />
          {article.time} · Published {new Date(article.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
      </div>

      {/* Title */}
      <h1
        className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight mb-6"
        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
      >
        {article.title}
      </h1>

      {/* Headline AI Summary */}
      {aiSummary?.headlineSummary && (
        <p className="text-base font-semibold text-[#D4AF37] mb-4 italic border-l-2 border-[#D4AF37]/50 pl-3" style={{ fontFamily: "'Inter', sans-serif" }}>
          {aiSummary.headlineSummary}
        </p>
      )}

      {/* Meta blocks */}
      <div className="flex items-center justify-between gap-4 py-4 border-y border-border mb-8 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Source</span>
            {article.sourceUrl ? (
              <a 
                href={article.sourceUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-sm font-black hover:text-[#D4AF37] underline transition-colors"
              >
                {article.source.name}
              </a>
            ) : (
              <span className="text-sm font-black">{article.source.name}</span>
            )}
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Verification</span>
            <div className="flex items-center gap-2 mt-0.5">
              <VerificationBadge status={article.verificationStatus} />
              <CredibilityBadge score={article.credibility} />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">AI Sentiment</span>
          <span
            className={`text-xs font-bold ${sentimentStyle(article.sentiment)}`}
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {sentimentLabel(article.sentiment)}
          </span>
        </div>
      </div>

      {/* Photo */}
      {article.imageId && (
        <div className="mb-8 overflow-hidden bg-muted aspect-[16/10] border border-border">
          <img
            src={article.imageId.startsWith('http') ? article.imageId : `https://images.unsplash.com/photo-${article.imageId}?w=1200&h=750&fit=crop&auto=format`}
            alt={article.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Summary Standfirst */}
      <p
        className="text-lg sm:text-xl font-bold leading-relaxed text-foreground mb-8 border-l-4 border-[#D4AF37] pl-4 italic"
        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
      >
        {article.summary}
      </p>

      {/* AI Key Takeaways */}
      {aiSummary && aiSummary.keyTakeaways && aiSummary.keyTakeaways.length > 0 && (
        <div className="mb-8 p-5 bg-card border border-[#D4AF37]/30">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={13} className="text-[#D4AF37]" />
            <span className="text-[10px] font-black tracking-[0.22em] uppercase" style={{ fontFamily: "'Inter', sans-serif" }}>Key Takeaways</span>
          </div>
          <ul className="space-y-2">
            {aiSummary.keyTakeaways.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-1 shrink-0 w-4 h-4 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[8px] font-black text-[#D4AF37]">{i + 1}</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Rich Body Content */}
      <div className="text-base sm:text-lg leading-relaxed text-muted-foreground space-y-6">
        {article.content ? (
          article.content.split('\n\n').map((paragraph, index) => {
            if (paragraph.startsWith('### ')) {
              return (
                <h3
                  key={index}
                  className="text-xl sm:text-2xl font-black text-foreground pt-4 mb-2"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {paragraph.replace('### ', '')}
                </h3>
              );
            }
            return <p key={index}>{paragraph}</p>;
          })
        ) : (
          <p>Full article text is loading or currently unavailable.</p>
        )}
      </div>

      {/* Why It Matters */}
      {aiSummary?.whyItMatters && (
        <div className="mt-8 p-5 bg-card border border-[#D4AF37]/20">
          <div className="flex items-center gap-2 mb-2">
            <Globe size={13} className="text-[#D4AF37]" />
            <span className="text-[10px] font-black tracking-[0.22em] uppercase" style={{ fontFamily: "'Inter', sans-serif" }}>Why It Matters</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed italic">{aiSummary.whyItMatters}</p>
        </div>
      )}

      {/* Tags */}
      {aiSummary?.tags && aiSummary.tags.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {aiSummary.tags.map((tag, i) => (
            <span key={i} className="px-2 py-0.5 text-[9px] font-bold tracking-[0.15em] uppercase border border-border text-muted-foreground hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors cursor-pointer">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Fact-Check & Verification Panel */}
      {report && (
        <div className="mt-12 border border-[#D4AF37]/45 bg-card p-6 shadow-sm rounded-none">
          <div className="flex items-center justify-between border-b border-border pb-4 mb-5 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-[#D4AF37]" />
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ fontFamily: "'Inter', sans-serif" }}>
                Source Verification & Credibility Report
              </h3>
            </div>
            <span className="text-[10px] text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              Last verified: {new Date(report.verifiedAt).toLocaleString()}
            </span>
          </div>

          {/* Banners for Warnings */}
          {(report.headlineClickbait || report.headlineSensational || report.misleadingContent) && (
            <div className="mb-5 space-y-2">
              {report.headlineClickbait && (
                <div className="bg-amber-500/10 text-amber-800 dark:text-amber-400 p-3 text-xs flex items-center gap-2 border border-amber-500/20">
                  <span className="font-extrabold uppercase tracking-wider text-[9px] border border-current px-1.5 py-0.5 shrink-0 rounded-none">Headline Alert</span>
                  <span>The AI engine flagged this headline as potentially sensationalized or containing clickbait elements.</span>
                </div>
              )}
              {report.misleadingContent && (
                <div className="bg-red-500/10 text-red-800 dark:text-red-400 p-3 text-xs flex items-center gap-2 border border-red-500/20">
                  <span className="font-extrabold uppercase tracking-wider text-[9px] border border-current px-1.5 py-0.5 shrink-0 rounded-none">Misleading Content</span>
                  <span>Caution: Potential factual gaps or exaggerated claims detected in text comparison.</span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="md:col-span-2 space-y-4">
              {/* Status explanation */}
              <div>
                <h4 className="text-[10px] font-black text-foreground mb-1 uppercase tracking-wider" style={{ fontFamily: "'Inter', sans-serif" }}>Verification Summary</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{report.whyVerified}</p>
              </div>

              {/* Calculation explanation */}
              <div>
                <h4 className="text-[10px] font-black text-foreground mb-1 uppercase tracking-wider" style={{ fontFamily: "'Inter', sans-serif" }}>Credibility Score Explanation</h4>
                <p className="text-sm text-muted-foreground leading-relaxed italic">{report.scoreExplanation}</p>
              </div>
            </div>

            <div className="bg-secondary p-4 flex flex-col items-center justify-center border border-border text-center">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Credibility Index</span>
              <span className="text-4xl font-black text-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {report.overrideCredibility !== null && report.overrideCredibility !== undefined ? report.overrideCredibility : report.credibilityScore}%
              </span>
              <div className="mt-2.5">
                <VerificationBadge status={report.overrideStatus || report.status} />
              </div>
              <span className="text-[10px] text-muted-foreground mt-3" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Verified by <span className="font-bold text-foreground">{report.sourcesCount}</span> source{report.sourcesCount > 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Supporting Sources */}
          {report.supportingSources && report.supportingSources.length > 0 && (
            <div className="border-t border-border pt-5 mb-4">
              <h4 className="text-[10px] font-black text-foreground mb-3 uppercase tracking-wider" style={{ fontFamily: "'Inter', sans-serif" }}>Supporting Sources Used for Verification</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {report.supportingSources.map((src: any, index: number) => (
                  <a 
                    key={index} 
                    href={src.url || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center justify-between p-3 border border-border bg-background hover:border-[#D4AF37]/50 transition-colors group"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-black group-hover:text-[#D4AF37] transition-colors">{src.name}</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{src.matchType || 'Corroborating Report'}</span>
                    </div>
                    <ChevronRight size={11} className="text-muted-foreground group-hover:text-[#D4AF37] transition-colors" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Auditing Details */}
          {((report.missingEvidence && report.missingEvidence.length > 0) || (report.unsupportedClaims && report.unsupportedClaims.length > 0)) && (
            <div className="border-t border-border pt-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
              {report.missingEvidence && report.missingEvidence.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-black text-amber-700 dark:text-amber-500 mb-2 uppercase tracking-wider" style={{ fontFamily: "'Inter', sans-serif" }}>Missing Evidence / Details</h4>
                  <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
                    {report.missingEvidence.map((item: string, i: number) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
              )}
              {report.unsupportedClaims && report.unsupportedClaims.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-black text-red-700 dark:text-red-500 mb-2 uppercase tracking-wider" style={{ fontFamily: "'Inter', sans-serif" }}>Unsupported Claims</h4>
                  <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
                    {report.unsupportedClaims.map((item: string, i: number) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Override Admin info */}
          {report.overrideStatus && (
            <div className="mt-5 pt-4 border-t border-dashed border-border flex flex-col gap-1 text-[11px] text-[#D4AF37] bg-secondary p-3.5 border border-border">
              <span className="font-extrabold uppercase tracking-widest text-[9px]">Administrative Override Applied</span>
              <span>Reason: {report.overrideReason}</span>
              <span className="text-[10px] text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Overridden on: {new Date(report.overriddenAt || '').toLocaleString()}</span>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

// ── Header User Menu ────────────────────────────────────────────────────────
function HeaderUserMenu() {
  const { user, isAuthenticated, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (loading) {
    return <div className="w-7 h-7 rounded-full bg-muted animate-pulse" />;
  }

  if (!isAuthenticated) {
    return (
      <Link
        to="/login"
        id="btn-header-login"
        className="flex items-center gap-1.5 p-1.5 text-muted-foreground hover:text-[#D4AF37] transition-colors"
        aria-label="Sign In"
      >
        <User size={17} />
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        id="btn-header-profile"
        onClick={() => setOpen(!open)}
        className="w-8 h-8 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center hover:bg-[#D4AF37]/30 transition-colors"
        aria-label="Profile menu"
      >
        <span className="text-[11px] font-black text-[#D4AF37]" style={{ fontFamily: "'Playfair Display', serif" }}>
          {(user?.name || user?.email || "U")[0].toUpperCase()}
        </span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border shadow-xl z-50">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-[11px] font-bold truncate">{user?.name || "Reader"}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
            </div>
            <div className="py-1">
              <Link
                to="/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-[11px] hover:bg-secondary transition-colors"
              >
                <User size={12} /> Profile & Settings
              </Link>
              <Link
                to="/my-feed"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-[11px] hover:bg-secondary transition-colors"
              >
                <Star size={12} /> My Feed
              </Link>
              <Link
                to="/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-[11px] hover:bg-secondary transition-colors"
              >
                <Bookmark size={12} /> Bookmarks
              </Link>
            </div>
            <div className="border-t border-border py-1">
              <button
                onClick={() => { logout(); setOpen(false); navigate("/"); }}
                className="flex items-center gap-2 px-4 py-2.5 text-[11px] text-red-600 dark:text-red-400 hover:bg-secondary transition-colors w-full text-left"
              >
                <LogOut size={12} /> Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Root Entry ─────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
