import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { BrandMark } from "../components/BrandMark";
import { EnterPageChrome } from "../components/EnterPageChrome";
import { Link, useNavigate } from "react-router-dom";
import { Compass, LoaderCircle, Mail } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { formatCoordsInput } from "@knowhere/shared";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { usePageSeo } from "../hooks/usePageSeo";
import { SEO } from "../lib/seo";
import { isSignInWithEmailLink } from "firebase/auth";
import { auth } from "../lib/firebase";

export function Recover() {
  const { verifyRecoveryLink, completeCoordsRecovery } = useAuth();
  const navigate = useNavigate();

  usePageSeo({
    title: SEO.recover.title,
    description: SEO.recover.description,
    path: "/recover",
    robots: SEO.recover.robots
  });
  const [coords, setCoords] = useState("");
  const [email, setEmail] = useState("");
  const [emailHint, setEmailHint] = useState("");
  const [status, setStatus] = useState<"checking" | "needs-email" | "ready" | "loading" | "invalid">("checking");
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const busy = useRef(false);
  const lastCoordsAttempt = useRef("");
  const link = window.location.href;

  const loadSuggestions = useCallback(async () => {
    setSuggestionsLoading(true);
    try {
      const { suggestions: next } = await api.coordsSuggestions(4);
      setSuggestions(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load Coords suggestions.");
    } finally {
      setSuggestionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "ready") void loadSuggestions();
  }, [status, loadSuggestions]);

  useEffect(() => {
    if (!isSignInWithEmailLink(auth, link)) {
      setStatus("invalid");
      setError("Open this page from the recovery link in your email.");
      return;
    }

    const stored = window.localStorage.getItem("knowhereRecoveryEmail") ?? "";
    if (stored) {
      void verifyRecoveryLink(link, stored)
        .then((verified) => {
          setEmail(verified);
          setStatus("ready");
        })
        .catch((e) => {
          setStatus("invalid");
          setError(e instanceof Error ? e.message : "This recovery link is invalid or has expired.");
        });
      return;
    }

    setStatus("needs-email");
  }, [link, verifyRecoveryLink]);

  const confirmEmail = async (event: FormEvent) => {
    event.preventDefault();
    if (!emailHint.trim() || busy.current) return;
    busy.current = true;
    setError("");
    setStatus("checking");
    try {
      const verified = await verifyRecoveryLink(link, emailHint.trim());
      setEmail(verified);
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not verify recovery link.");
      setStatus("needs-email");
    } finally {
      busy.current = false;
    }
  };

  const saveCoords = async (nextCoords: string) => {
    if (busy.current) return;
    busy.current = true;
    setStatus("loading");
    setError("");
    try {
      await completeCoordsRecovery(nextCoords);
      navigate("/library", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update your Coords.");
      setStatus("ready");
      lastCoordsAttempt.current = "";
    } finally {
      busy.current = false;
    }
  };

  const submitCoords = (event: FormEvent) => {
    event.preventDefault();
    if (coords.length !== 7 || busy.current) return;
    void saveCoords(coords);
  };

  useEffect(() => {
    if (status !== "ready" || coords.length !== 7) return;
    if (lastCoordsAttempt.current === coords) return;
    lastCoordsAttempt.current = coords;
    void saveCoords(coords);
  }, [coords, status]);

  return <EnterPageChrome nav={<Link to="/">Back to enter</Link>}>
    <main className="enter-main enter-main-focus">
      <motion.section
        className="enter-auth"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="eyebrow"><Compass size={15} /> Account recovery</p>
        <h2>Create new Coords.</h2>
        <p className="enter-auth-copy">
          {email
            ? `Verified ${email}. Choose a new pair to dock at Knowhere again.`
            : status === "needs-email"
              ? "Confirm the recovery email you used when requesting the link."
              : status === "invalid"
                ? "This recovery link is not valid."
                : "Verifying your recovery link…"}
        </p>

        <div className="coords-stage">
          <AnimatePresence mode="wait">
            {status === "checking" ? <motion.p
              key="checking"
              className="enter-hint"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <LoaderCircle className="spin" size={16} /> Verifying recovery link…
            </motion.p> : status === "invalid" ? <motion.div
              key="invalid"
              className="coords-flow"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {error && <p className="form-error" role="alert">{error}</p>}
              <div className="enter-actions">
                <Link to="/" className="button secondary">Back to enter</Link>
              </div>
            </motion.div> : status === "needs-email" ? <motion.form
              key="needs-email"
              className="coords-flow"
              onSubmit={confirmEmail}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <label className="field coords-field">
                <span><Mail size={14} /> Recovery email</span>
                <input
                  type="email"
                  value={emailHint}
                  onChange={(e) => setEmailHint(e.target.value)}
                  placeholder="you@example.com"
                  autoFocus
                />
              </label>
              <p className="enter-hint">Use the same address you entered when requesting recovery.</p>
              <div className="enter-actions">
                <Link to="/" className="button secondary">Back</Link>
                <button type="submit" className="button primary" disabled={!emailHint.trim() || busy.current}>
                  {busy.current ? <><LoaderCircle className="spin" size={16} /> Verifying</> : "Continue"}
                </button>
              </div>
              {error && <p className="form-error" role="alert">{error}</p>}
            </motion.form> : <motion.form
              key="ready"
              className="coords-flow"
              onSubmit={submitCoords}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <label className="field coords-field">
                <span>New Coords</span>
                <div className="coords-input-wrap">
                  <input
                    className="coords-input"
                    value={coords}
                    onChange={(e) => setCoords(formatCoordsInput(e.target.value))}
                    placeholder="XY-9876"
                    inputMode="text"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={7}
                    autoFocus
                    aria-label="New Coords"
                  />
                  {status === "loading" && <LoaderCircle className="spin coords-spinner" size={20} aria-hidden="true" />}
                </div>
              </label>

              <div className="coords-suggestions">
                <div className="coords-suggestions-head">
                  <span className="coords-suggestions-label">Open Coords</span>
                  <button type="button" className="text-button" onClick={() => void loadSuggestions()} disabled={status === "loading" || suggestionsLoading}>
                    {suggestionsLoading ? "Loading…" : "Rescan"}
                  </button>
                </div>
                <div className="coords-suggestions-list" role="listbox" aria-label="Suggested Coords">
                  {suggestionsLoading ? <p className="enter-hint">Scanning for open Coords…</p> : suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className={`coords-chip${coords === suggestion ? " active" : ""}`}
                      onClick={() => {
                        lastCoordsAttempt.current = "";
                        setCoords(suggestion);
                      }}
                      disabled={status === "loading"}
                      role="option"
                      aria-selected={coords === suggestion}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              <p className="enter-hint">Complete your new Coords and the airlock opens.</p>

              <div className="enter-actions">
                <button type="submit" className="button primary" disabled={status === "loading" || coords.length !== 7}>
                  {status === "loading" ? <><LoaderCircle className="spin" size={16} /> Saving</> : <>Save &amp; enter <BrandMark /></>}
                </button>
              </div>
              {error && <p className="form-error" role="alert">{error}</p>}
            </motion.form>}
          </AnimatePresence>
        </div>
      </motion.section>
    </main>
  </EnterPageChrome>;
}
