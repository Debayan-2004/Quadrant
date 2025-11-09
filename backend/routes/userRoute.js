// routes/userRoute.js
import express from "express";
import { registerUser, loginUser, getUserProfile, updateUserGroup } from "../controllers/userController.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/profile", authMiddleware, getUserProfile);
router.put("/profile/group", authMiddleware, updateUserGroup); // Only group update

// Remove the general profile update route since we don't need it anymore
// router.put("/profile", authMiddleware, updateUserProfile); 

export default router;
