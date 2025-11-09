import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    group: {
        type: String,
        enum: ['A', 'B', 'C', null],
        default: null
    }
}, { 
    minimize: false,
    timestamps: true 
});

const userModel = mongoose.models.user || mongoose.model('User', userSchema);

export default userModel;