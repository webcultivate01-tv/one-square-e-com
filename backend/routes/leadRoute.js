import express from "express";
import isAuth from "../middleware/isAuth.js";
import isAdmin from "../middleware/isAdmin.js";
import { readLimit, writeLimit } from "../middleware/rateLimit.js";
import { addLeadNote, getLeadNotes } from "../controllers/leadController.js";

const router = express.Router();

// Permission is checked per lead type inside the controller (enquiries / orders).
router.get("/:type/:id/notes", isAuth, isAdmin, readLimit, getLeadNotes);
router.post("/:type/:id/notes", isAuth, isAdmin, writeLimit, addLeadNote);

export default router;
