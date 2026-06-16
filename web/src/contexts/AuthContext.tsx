import { useCallback, useContext, useEffect, useRef, useState, createContext, type ReactNode } from "react";
import {
  GoogleAuthProvider, createUserWithEmailAndPassword, isSignInWithEmailLink,
  onAuthStateChanged, sendSignInLinkToEmail, setPersistence, browserLocalPersistence,
  signInWithEmailLink, signInWithPopup, signOut
} from "firebase/auth";
import { api, type AuthUser } from "../lib/api";
import { auth } from "../lib/firebase";

const RECOVERY_EMAIL_KEY = "knowhereRecoveryEmail";
const recoveryMessage = "If an account exists for that email, a recovery link is on its way.";

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  enterWithCoords: (coords: string, email?: string) => Promise<{ needsEmail: true } | { ok: true; created: boolean }>;
  requestCoordsRecovery: (email: string) => Promise<string>;
  verifyRecoveryLink: (link: string, email?: string) => Promise<string>;
  completeCoordsRecovery: (coords: string) => Promise<void>;
  logOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

const toAuthUser = (session: Awaited<ReturnType<typeof api.getMe>>): AuthUser => ({
  uid: session.uid,
  displayName: session.displayName,
  email: session.email,
  photoURL: session.photoURL,
  authProvider: session.authProvider
});

function generatedPassword() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const firebaseSessionPaused = useRef(false);

  const refreshUser = useCallback(async () => {
    const session = await api.getMe();
    setUser(toAuthUser(session));
    return session;
  }, []);

  useEffect(() => {
    let active = true;
    refreshUser()
      .catch(() => active && setUser(null))
      .finally(() => active && setLoading(false));

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser || !active || firebaseSessionPaused.current) return;
      try {
        const idToken = await firebaseUser.getIdToken();
        await api.createSession(idToken);
        if (active) await refreshUser();
      } catch {
        if (active) setUser(null);
      }
    });

    return () => { active = false; unsub(); };
  }, [refreshUser]);

  const signInWithGoogle = async () => {
    await setPersistence(auth, browserLocalPersistence);
    await signInWithPopup(auth, new GoogleAuthProvider());
  };

  const enterWithCoords = async (coords: string, email?: string) => {
    if (email) {
      firebaseSessionPaused.current = true;
      try {
        const credential = await createUserWithEmailAndPassword(auth, email, generatedPassword());
        const idToken = await credential.user.getIdToken();
        const result = await api.coordsEnter(coords, email, idToken);
        await signOut(auth);
        await refreshUser();
        return result;
      } finally {
        firebaseSessionPaused.current = false;
      }
    }

    const result = await api.coordsEnter(coords);
    if ("needsEmail" in result) return result;
    await refreshUser();
    return result;
  };

  const requestCoordsRecovery = async (email: string) => {
    const normalized = email.trim().toLowerCase();
    const result = await api.coordsRecoverPrepare(normalized);
    window.localStorage.setItem(RECOVERY_EMAIL_KEY, normalized);
    await sendSignInLinkToEmail(auth, normalized, {
      url: `${window.location.origin}/recover?mode=beacon`,
      handleCodeInApp: true
    });
    return result.message ?? recoveryMessage;
  };

  const verifyRecoveryLink = async (link: string, emailHint?: string) => {
    if (!isSignInWithEmailLink(auth, link)) {
      throw new Error("This recovery link is invalid or has expired.");
    }

    const stored = window.localStorage.getItem(RECOVERY_EMAIL_KEY) ?? "";
    const email = (emailHint ?? stored).trim().toLowerCase();
    if (!email) throw new Error("Enter the recovery email you used.");

    firebaseSessionPaused.current = true;
    const result = await signInWithEmailLink(auth, email, link);
    window.localStorage.removeItem(RECOVERY_EMAIL_KEY);
    return result.user.email ?? email;
  };

  const completeCoordsRecovery = async (coords: string) => {
    if (!auth.currentUser) throw new Error("Recovery verification is required.");
    try {
      const idToken = await auth.currentUser.getIdToken();
      await api.coordsRecoverComplete(coords, idToken);
      await signOut(auth);
      await refreshUser();
    } finally {
      firebaseSessionPaused.current = false;
    }
  };

  const logOut = async () => {
    await api.logout().catch(() => undefined);
    if (auth.currentUser) await signOut(auth);
    setUser(null);
  };

  return <AuthContext.Provider value={{
    user, loading, signInWithGoogle, enterWithCoords, requestCoordsRecovery, verifyRecoveryLink, completeCoordsRecovery, logOut
  }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
};
