import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  classDate: {
    type: String,
    required: true,
  },
  timeSlotKey: {
    type: String,
    required: true,
  },
  timeSlot: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Cancelled'], // Make sure this matches your frontend
    required: true,
  },
}, {
  timestamps: true,
});

// Prevent duplicate records for same user/time/date
attendanceSchema.index({ userId: 1, classDate: 1, timeSlotKey: 1 }, { unique: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);
export default Attendance;
