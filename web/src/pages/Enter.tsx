import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { BrandMark } from "../components/BrandMark";
import { EnterPageChrome } from "../components/EnterPageChrome";
const LazyCosmicScene = lazy(() => import("../components/landing/CosmicScene").then(m => ({ default: m.CosmicScene })));
const DiscoveriesFlow = lazy(() => import("../components/landing/DiscoveriesFlow").then(m => ({ default: m.DiscoveriesFlow })));
const ClustersMap = lazy(() => import("../components/landing/ClustersMap").then(m => ({ default: m.ClustersMap })));
const MemoryNebula = lazy(() => import("../components/landing/MemoryNebula").then(m => ({ default: m.MemoryNebula })));
const ObservatorySearch = lazy(() => import("../components/landing/ObservatorySearch").then(m => ({ default: m.ObservatorySearch })));
const MissionsControl = lazy(() => import("../components/landing/MissionsControl").then(m => ({ default: m.MissionsControl })));
const KnowledgeGalaxy = lazy(() => import("../components/landing/KnowledgeGalaxy").then(m => ({ default: m.KnowledgeGalaxy })));
const CosmicFooter = lazy(() => import("../components/landing/CosmicFooter").then(m => ({ default: m.CosmicFooter })));

import { MouseGlow } from "../components/landing/MouseGlow";
import { HeroDock } from "../components/landing/HeroDock";
import { ArrowRight, LoaderCircle, Mail } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatCoordsInput } from "@knowhere/shared";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { usePageSeo } from "../hooks/usePageSeo";
import { SEO } from "../lib/seo";
import { appNavigations } from "../lib/navigation";
import "../landing.css";

/* ═══════════════════════════════
   AUTH LOGIC — preserved exactly
   ═══════════════════════════════ */

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EnterAuthProps = {
  placement?: "hero" | "standalone";
};

function EnterAuth({ placement = "hero" }: EnterAuthProps) {
  const { signInWithGoogle, enterWithCoords, requestCoordsRecovery } =
    useAuth();
  const [coords, setCoords] = useState("");
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<"coords" | "email" | "recover">("coords");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const busy = useRef(false);
  const lastCoordsAttempt = useRef("");

  const loadSuggestions = useCallback(async () => {
    setSuggestionsLoading(true);
    try {
      const { suggestions: next } = await api.coordsSuggestions(4);
      setSuggestions(next);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load Coords suggestions."
      );
    } finally {
      setSuggestionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mode === "coords") void loadSuggestions();
  }, [mode, loadSuggestions]);

  const pickSuggestion = (value: string) => {
    setError("");
    lastCoordsAttempt.current = "";
    setCoords(value);
  };

  const openWithCoords = async (nextCoords: string, nextEmail?: string) => {
    if (busy.current) return;
    busy.current = true;
    setStatus("loading");
    setError("");
    setMessage("");
    try {
      const result = await enterWithCoords(nextCoords, nextEmail);
      if ("needsEmail" in result) {
        setMode("email");
        setMessage(
          "New Coords. Add a recovery email in case you forget them."
        );
        setStatus("idle");
        return;
      }
      if (result.created)
        setMessage("Knowhere opened. Welcome aboard.");
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Could not enter Knowhere.";
      setError(msg);
      setStatus("idle");
      lastCoordsAttempt.current = "";
      if (msg.toLowerCase().includes("claimed")) {
        setCoords("");
        void loadSuggestions();
      }
    } finally {
      busy.current = false;
    }
  };

  const sendRecovery = async (nextEmail: string) => {
    if (busy.current) return;
    busy.current = true;
    setStatus("loading");
    setError("");
    setMessage("");
    try {
      setMessage(await requestCoordsRecovery(nextEmail));
      setMode("coords");
      setCoords("");
      setEmail("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recovery failed.");
    } finally {
      setStatus("idle");
      busy.current = false;
    }
  };

  useEffect(() => {
    if (mode !== "coords" || coords.length !== 7 || status === "loading")
      return;
    if (lastCoordsAttempt.current === coords) return;
    lastCoordsAttempt.current = coords;
    void openWithCoords(coords);
  }, [coords, mode, status]);

  const submitEmail = (event: FormEvent) => {
    event.preventDefault();
    if (!emailPattern.test(email)) {
      setError("Enter a valid recovery email.");
      return;
    }
    void openWithCoords(coords, email);
  };

  const submitRecovery = (event: FormEvent) => {
    event.preventDefault();
    if (!emailPattern.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    void sendRecovery(email);
  };

  const wrapperClass =
    placement === "hero" ? "enter-gate landing-gate" : "enter-auth";

  return (
    <div className={wrapperClass}>
      <div className="coords-stage">
        <AnimatePresence mode="wait">
          {mode === "recover" ? (
            <motion.form
              key="recover"
              className="coords-flow"
              onSubmit={submitRecovery}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <label className="field coords-field">
                <span>Recovery email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoFocus
                />
              </label>
              <p className="enter-hint">
                We'll email a recovery link if this address belongs to an
                account.
              </p>
              <div className="enter-actions">
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    setMode("coords");
                    setEmail("");
                    setError("");
                    setMessage("");
                  }}
                >
                  Back
                </button>
                <button
                  className="button primary"
                  disabled={status === "loading"}
                >
                  {status === "loading" ? (
                    <>
                      <LoaderCircle className="spin" size={16} /> Sending
                    </>
                  ) : (
                    "Send recovery link"
                  )}
                </button>
              </div>
            </motion.form>
          ) : (
            <motion.div
              key="coords"
              className="coords-flow"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <p className="enter-hint" style={{ marginTop: 0, marginBottom: "16px" }}>
                Coords act as your unique, passwordless access code (e.g., AB-1234). Enter an existing one to log in, or a new one to sign up.
              </p>
              <label className="field coords-field">
                <span>Enter or Create Coords</span>
                <div className="coords-input-wrap">
                  <input
                    className="coords-input"
                    value={coords}
                    onChange={(e) =>
                      setCoords(formatCoordsInput(e.target.value))
                    }
                    placeholder="AB-1234"
                    inputMode="text"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={7}
                    autoFocus={mode === "coords"}
                    aria-label="Coords"
                  />
                  {status === "loading" && (
                    <LoaderCircle
                      className="spin coords-spinner"
                      size={20}
                      aria-hidden="true"
                    />
                  )}
                </div>
              </label>

              {mode === "coords" && (
                <div className="coords-suggestions">
                  <div className="coords-suggestions-head">
                    <span className="coords-suggestions-label">
                      Or pick a new coordinate:
                    </span>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => void loadSuggestions()}
                      disabled={status === "loading" || suggestionsLoading}
                    >
                      {suggestionsLoading ? "Loading…" : "Rescan"}
                    </button>
                  </div>
                  <div
                    className="coords-suggestions-list"
                    role="listbox"
                    aria-label="Suggested Coords"
                  >
                    {suggestionsLoading ? (
                      <p className="enter-hint">Scanning…</p>
                    ) : (
                      suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          className={`coords-chip${coords === suggestion ? " active" : ""}`}
                          onClick={() => pickSuggestion(suggestion)}
                          disabled={status === "loading"}
                          role="option"
                          aria-selected={coords === suggestion}
                        >
                          {suggestion}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {mode === "email" && (
                <form className="coords-email-form" onSubmit={submitEmail}>
                  <label className="field coords-field">
                    <span>
                      <Mail size={14} /> Recovery email
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoFocus
                    />
                  </label>
                  <div className="enter-actions">
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => {
                        setMode("coords");
                        setEmail("");
                        setMessage("");
                        setError("");
                      }}
                    >
                      Back
                    </button>
                    <button
                      className="button primary"
                      disabled={status === "loading"}
                    >
                      {status === "loading" ? (
                        <>
                          <LoaderCircle className="spin" size={16} /> Opening
                        </>
                      ) : (
                        <>
                          Open <BrandMark />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {mode === "coords" && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setMode("recover");
                    setError("");
                    setMessage("");
                    setEmail("");
                  }}
                >
                  Forgot your Coords?
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {message && (
          <p className="enter-message" role="status">
            {message}
          </p>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="enter-divider">
        <span>or</span>
      </div>
      <button
        className="google-button"
        type="button"
        onClick={signInWithGoogle}
      >
        <svg
          className="google-g-svg"
          viewBox="0 0 24 24"
          width="18"
          height="18"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            fill="#EA4335"
          />
        </svg>
        Continue with Google
        <ArrowRight className="google-arrow" />
      </button>
    </div>
  );
}

/* ═══════════════
   ENTER PAGE
   ═══════════════ */

export function Enter() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (user && !loading && appNavigations <= 1) {
      const returnTo = searchParams.get("returnTo");
      if (returnTo) {
        window.location.href = returnTo;
      } else {
        navigate("/dashboard");
      }
    }
  }, [user, loading, navigate, searchParams]);

  usePageSeo({
    title: SEO.home.title,
    description: SEO.home.description,
    path: "/",
    keywords: SEO.home.keywords,
  });

  const navLinks = (
    <>
      <a href="#discoveries">Discover</a>
      <a href="#clusters">Intelligence</a>
      <a href="#observatory">Search</a>
      <a href="#missions">Missions</a>
    </>
  );

  return (
    <div className="landing-page">
      <Suspense fallback={null}>
        <LazyCosmicScene />
      </Suspense>
      <MouseGlow />

      <EnterPageChrome nav={navLinks}>
        <main id="main-content" className="landing-main">
          {/* ── Hero with Dock ── */}
          <section className="landing-hero" id="enter">
            <HeroDock>
              {user ? (
                <div
                  className="enter-gate landing-gate"
                  style={{ display: "grid", gap: "11.9px" }}
                >
                  <p className="enter-gate-kicker" style={{ margin: 0 }}>
                    Welcome back
                  </p>
                  <p
                    className="enter-hint"
                    style={{ margin: 0, fontSize: "11.9px", lineHeight: "1.5" }}
                  >
                    You are signed in and ready to access your private
                    collection.
                  </p>
                  <Link
                    to="/dashboard"
                    className="google-button"
                    style={{ textDecoration: "none" }}
                  >
                    Open Collection <ArrowRight className="google-arrow" />
                  </Link>
                </div>
              ) : (
                <EnterAuth placement="hero" />
              )}
            </HeroDock>
          </section>

          {/* ── Content Sections ── */}
          <Suspense fallback={null}>
            <DiscoveriesFlow />
            <ClustersMap />
            <MemoryNebula />
            <ObservatorySearch />
            <MissionsControl />
            <KnowledgeGalaxy />
            <CosmicFooter />
          </Suspense>
        </main>
      </EnterPageChrome>
    </div>
  );
}
