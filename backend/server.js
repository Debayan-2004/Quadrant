import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/mongodb.js';
import userRouter from './routes/userRoute.js';
import attendanceRouter from './routes/attendanceRoute.js';

// Load environment variables
dotenv.config();

// Initialize app
const app = express();

// Set the PORT to use the hosting environment's variable, or default to 4000
const PORT = process.env.PORT || 4000;

// Connect to MongoDB (connectDB relies on process.env.MONGODB_URI)
connectDB();

// --- CRITICAL DEPLOYMENT FIX: CORS CONFIGURATION ---

// 1. Define allowed origins. The VERCEL_FRONTEND_URL must be set on the host (e.g., Render/Heroku).
const allowedOrigins = [
  'http://localhost:5173', // Local development
  process.env.VERCEL_FRONTEND_URL, // Production frontend URL (e.g., https://your-app-name.vercel.app)
];

app.use(express.json());

// Apply CORS middleware
app.use(
  cors({
    // Only allow requests from our defined list of origins
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl requests, or same-origin requests)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // Log the blocked origin for debugging
        console.warn('CORS Blocked Origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// --- END CORS FIX ---

// API Routes
app.use('/api/user', userRouter);
app.use('/api/attendance', attendanceRouter);

// Health check route
app.get('/', (req, res) => {
  res.send('✅ Attendance API is running...');
});

// Simple 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: `Route ${req.method} ${req.url} not found` 
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.message);
  // Safely send the error stack only in non-production environments
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'production' ? null : err.stack
  });
});

// Start Server
app.listen(PORT, () => console.log(`🚀 Server running on PORT: ${PORT}`));