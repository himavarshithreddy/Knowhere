import { randomBytes } from "node:crypto";
import { firebaseAuth } from "../firebase.js";

function recoveryPassword() {
  return randomBytes(32).toString("base64url");
}

export async function createFirebaseRecoveryAccount(email: string) {
  const password = recoveryPassword();
  const user = await firebaseAuth().createUser({ email, password });
  return user.uid;
}

export async function ensureFirebaseRecoveryAccount(email: string, existingUid?: string | null) {
  if (existingUid) return existingUid;

  try {
    return await createFirebaseRecoveryAccount(email);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "auth/email-already-exists") {
      const user = await firebaseAuth().getUserByEmail(email);
      return user.uid;
    }
    throw error;
  }
}
