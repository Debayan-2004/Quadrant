import express from 'express';
import { 
  markAttendance, 
  getAttendance, 
  removeAttendance,
  testDatabase,
  getSubjectStats  // ✅ Add this import
} from '../controllers/attendanceController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.post('/mark', authMiddleware, markAttendance);
router.get('/my', authMiddleware, getAttendance);
router.delete('/remove', authMiddleware, removeAttendance);
router.get('/stats/subject', authMiddleware, getSubjectStats); // ✅ Add this route
router.get('/test-db', authMiddleware, testDatabase);

export default router;

