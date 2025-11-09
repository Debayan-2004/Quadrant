import Attendance from '../models/attendanceModel.js';
import mongoose from 'mongoose';

export const markAttendance = async (req, res) => {
  try {
    console.log("\n===============================");
    console.log("🟢 markAttendance endpoint hit");
    console.log("User ID:", req.user?._id);
    console.log("Request body:", JSON.stringify(req.body, null, 2));

    const userId = req.user?._id;
    const { records } = req.body;

    if (!userId) {
      console.error("❌ User not authenticated");
      return res.status(401).json({ 
        success: false,
        message: "User not authenticated" 
      });
    }

    if (!Array.isArray(records) || records.length === 0) {
      console.error("❌ No records array received");
      return res.status(400).json({ 
        success: false,
        message: "No attendance records provided." 
      });
    }

    console.log("🔹 Processing", records.length, "records");

    const savedRecords = [];
    const errorRecords = [];

    for (const record of records) {
      try {
        console.log(`📝 Processing record:`, record);
        
        // Validate required fields
        if (!record.classDate || !record.timeSlotKey || !record.status) {
          throw new Error('Missing required fields');
        }

        // Use findOneAndUpdate with upsert
        const attendanceRecord = await Attendance.findOneAndUpdate(
          { 
            userId, 
            classDate: record.classDate, 
            timeSlotKey: record.timeSlotKey 
          },
          {
            $set: {
              userId: userId,
              status: record.status,
              subject: record.subject || 'Unknown Subject',
              timeSlot: record.timeSlot || 'Unknown Time',
              classDate: record.classDate,
              timeSlotKey: record.timeSlotKey
            }
          },
          {
            upsert: true,
            new: true,
            runValidators: true
          }
        );
        
        console.log(`✅ Successfully saved: ${record.classDate} - ${record.timeSlotKey} as ${record.status}`);
        savedRecords.push(attendanceRecord);
        
      } catch (recordError) {
        console.error(`❌ Error saving record for ${record.classDate} - ${record.timeSlotKey}:`, recordError.message);
        errorRecords.push({ 
          record, 
          error: recordError.message 
        });
      }
    }

    console.log("📊 Final Results - Saved:", savedRecords.length, "Errors:", errorRecords.length);

    return res.status(200).json({ 
      success: true,
      message: "Attendance processing completed",
      savedCount: savedRecords.length,
      errorCount: errorRecords.length,
      errors: errorRecords
    });

  } catch (error) {
    console.error("❌ Attendance Save Error:");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    
    return res.status(500).json({
      success: false,
      message: "Internal server error while saving records.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getAttendance = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      console.error("❌ No user found in request");
      return res.status(401).json({ 
        success: false,
        message: "User not authenticated" 
      });
    }

    const records = await Attendance.find({ userId });
    console.log("✅ Fetched", records.length, "attendance records for user:", userId);

    return res.status(200).json({
      success: true,
      message: "Attendance fetched successfully",
      count: records.length,
      records
    });
  } catch (error) {
    console.error("❌ Attendance Fetch Error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Internal server error while loading records.", 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const removeAttendance = async (req, res) => {
  try {
    console.log("\n🟢 removeAttendance endpoint hit");
    
    const userId = req.user?._id;
    const { classDate, timeSlotKey } = req.body;

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: "User not authenticated" 
      });
    }

    if (!classDate || !timeSlotKey) {
      return res.status(400).json({ 
        success: false,
        message: "classDate and timeSlotKey are required" 
      });
    }

    console.log(`🗑️ Removing attendance for: ${classDate} - ${timeSlotKey}`);

    const result = await Attendance.deleteOne({
      userId,
      classDate,
      timeSlotKey
    });

    console.log("Delete result:", result);

    if (result.deletedCount === 0) {
      return res.status(404).json({ 
        success: false,
        message: "Attendance record not found" 
      });
    }

    console.log("✅ Attendance removed successfully");
    return res.status(200).json({ 
      success: true,
      message: "Attendance record removed successfully" 
    });

  } catch (error) {
    console.error("❌ Remove Attendance Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while removing record.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Add this missing function
export const testDatabase = async (req, res) => {
  try {
    console.log('🧪 Testing database connection...');
    
    const connectionState = mongoose.connection.readyState;
    const stateMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    const userCount = await mongoose.model('User').countDocuments();
    const attendanceCount = await mongoose.model('Attendance').countDocuments();
    
    res.json({
      success: true,
      connection: stateMap[connectionState],
      collections: collections.map(c => c.name),
      counts: { users: userCount, attendance: attendanceCount }
    });
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Add this function to your attendanceController.js
// Add this function to your attendanceController.js
export const getSubjectStats = async (req, res) => {
  try {
    console.log("\n📊 getSubjectStats endpoint hit");
    const userId = req.user?._id;

    if (!userId) {
      console.error("❌ User not authenticated");
      return res.status(401).json({ 
        success: false,
        message: "User not authenticated" 
      });
    }

    console.log("🔍 Fetching attendance records for user:", userId);
    
    // Get all attendance records for the user
    const attendanceRecords = await Attendance.find({ userId })
      .select('subject classDate timeSlotKey status')
      .lean();

    console.log("📈 Found", attendanceRecords.length, "attendance records");

    // Calculate subject-wise statistics
    const subjectStats = {};
    
    attendanceRecords.forEach(record => {
      if (!record.subject) {
        console.warn("⚠️ Record with missing subject:", record);
        return;
      }

      const subject = record.subject;
      
      if (!subjectStats[subject]) {
        subjectStats[subject] = {
          subject: subject,
          totalClasses: 0,
          attendedClasses: 0,
          cancelledClasses: 0
        };
      }

      // Count ALL marked classes (including cancelled)
      if (record.status && record.status !== 'Future' && record.status !== 'Pending') {
        subjectStats[subject].totalClasses++;
        
        if (record.status === 'Present') {
          subjectStats[subject].attendedClasses++;
        } else if (record.status === 'Cancelled') {
          subjectStats[subject].cancelledClasses++;
        }
      }
    });

    // Convert to array and filter out subjects with no valid classes
    const statsArray = Object.values(subjectStats).filter(
      stat => stat.totalClasses > 0
    );

    console.log("📊 Processed stats for", statsArray.length, "subjects");
    statsArray.forEach(stat => {
      const actualTotal = stat.totalClasses - stat.cancelledClasses;
      const percentage = actualTotal > 0 ? Math.round((stat.attendedClasses / actualTotal) * 100) : 0;
      console.log(`   ${stat.subject}: ${stat.attendedClasses}/${actualTotal} (${percentage}%) - Cancelled: ${stat.cancelledClasses}`);
    });

    res.json({
      success: true,
      stats: statsArray,
      totalRecords: attendanceRecords.length,
      processedSubjects: statsArray.length
    });

  } catch (error) {
    console.error("❌ Error fetching subject stats:", error);
    res.status(500).json({
      success: false,
      message: 'Error fetching attendance statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};