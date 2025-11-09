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
const PORT = process.env.PORT || 4000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: ['http://localhost:5173'], 
    credentials: true,
  })
);

// API Routes
app.use('/api/user', userRouter);
app.use('/api/attendance', attendanceRouter);

// Health check route
app.get('/', (req, res) => {
  res.send('✅ Attendance API is running...');
});

// ✅ FIXED: Remove the problematic 404 handler entirely for now
// Or use this alternative approach:

// Alternative 1: Simple 404 handler without wildcard
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: `Route ${req.method} ${req.url} not found` 
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error' 
  });
});

// Start Server
app.listen(PORT, () => console.log(`🚀 Server running on PORT: ${PORT}`));
