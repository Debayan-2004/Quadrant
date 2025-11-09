import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1] || req.headers.token;

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Not Authorized. Login again." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await userModel.findById(decoded.id).select("-password");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth Error:", error);
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
};

export default authMiddleware;
