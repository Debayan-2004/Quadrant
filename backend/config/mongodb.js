import mongoose from "mongoose";

const connectDB = async () => {
    try {
        console.log('🔗 Attempting MongoDB connection...');
        
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        console.log(`📊 Database: ${conn.connection.name}`);
        return conn;
        
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        process.exit(1);
    }
}

mongoose.connection.on('connected', () => {
    console.log("🎉 Mongoose connected to MongoDB");
});

mongoose.connection.on('error', (err) => {
    console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('⚠️ Mongoose disconnected from MongoDB');
});

export default connectDB;