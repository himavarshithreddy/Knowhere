import { Router } from "express";
import { clearAuthCookie, requireAuth } from "../middleware/auth.js";
import { firebaseAuth } from "../firebase.js";
import { Category, Resource, User } from "../models/index.js";
import { deleteUserFiles } from "../services/storage.js";

export const accountRouter = Router();
accountRouter.use(requireAuth);

accountRouter.delete("/", async (req, res) => {
  const uid = req.auth!.uid;
  const user = await User.findOne({ uid });
  await Promise.all([
    Resource.deleteMany({ userId: uid }),
    Category.deleteMany({ userId: uid }),
    User.deleteOne({ uid }),
    deleteUserFiles(uid),
    user?.authProvider === "google" || user?.firebaseUid
      ? firebaseAuth().deleteUser(user.firebaseUid ?? uid).catch(() => undefined)
      : Promise.resolve()
  ]);
  clearAuthCookie(res);
  res.json({ ok: true });
});
