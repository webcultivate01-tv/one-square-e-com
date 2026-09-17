import express from "express";
import isAuth from "../middleware/isAuth.js";
import upload from "../middleware/upload.js";
import { getProfile, updateAvatar, updateProfile } from "../controllers/userController.js";

const router = express.Router();

router.use(isAuth);

router.get("/getprofile", getProfile);
router.put("/updateprofile", updateProfile);
router.put("/updateavatar", upload.single("avatar"), updateAvatar);

export default router;
