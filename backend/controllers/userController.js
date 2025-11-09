// controllers/userController.js
import validator from "validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";

// Helper function to create a JWT
const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// User Registration
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "All fields are required" 
      });
    }

    const exists = await userModel.findOne({ email });
    if (exists) {
      return res.status(409).json({ 
        success: false, 
        message: "User already exists" 
      });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid email format" 
      });
    }
    
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new userModel({
      name,
      email,
      password: hashedPassword,
    });

    const user = await newUser.save();
    const token = createToken(user._id);
    
    res.status(201).json({ 
      success: true, 
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
    
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error during registration" 
    });
  }
};

// User Login
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Email and password are required" 
      });
    }

    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid email or password" 
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid email or password" 
      });
    }

    const token = createToken(user._id);
    
    res.status(200).json({ 
      success: true, 
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
    
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error during login" 
    });
  }
};

// Get User Profile
const getUserProfile = async (req, res) => {
  try {
    const user = req.user;
    
    res.status(200).json({ 
      success: true, 
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        group: user.group
      }
    });
    
  } catch (error) {
    console.error("Profile Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching profile" 
    });
  }
};

// Update User Group - FIXED VERSION
const updateUserGroup = async (req, res) => {
  try {
    console.log("🟡 UPDATE GROUP - Request received:", {
      userId: req.user?._id,
      body: req.body
    });

    const { group } = req.body;
    
    if (!req.user?._id) {
      console.error("❌ No user ID in request");
      return res.status(401).json({ 
        success: false,
        message: 'User not authenticated' 
      });
    }
    
    if (!['A', 'B', 'C'].includes(group)) {
      console.error("❌ Invalid group:", group);
      return res.status(400).json({ 
        success: false,
        message: 'Group must be A, B, or C' 
      });
    }

    console.log("🟡 Updating user group:", req.user._id, "->", group);

    const user = await userModel.findByIdAndUpdate(
      req.user._id,
      { group: group },
      { 
        new: true, 
        runValidators: true 
      }
    ).select('-password');

    console.log("🟡 Database update result:", user);

    if (!user) {
      console.error("❌ User not found:", req.user._id);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log("✅ Group updated successfully!");
    console.log("✅ User after update:", {
      id: user._id,
      name: user.name, 
      group: user.group
    });
    
    res.json({
      success: true,
      message: 'Group updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        group: user.group
      }
    });
  } catch (error) {
    console.error('❌ Error updating group:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while updating group',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export { registerUser, loginUser, getUserProfile, updateUserGroup };
