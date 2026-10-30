const mongoose = require('mongoose');

const tutorProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    subjects: [{ type: String, trim: true }],
    hourlyRate: { type: Number, default: 0, min: 0 },
    bio: { type: String, default: '' },
    location: { type: String, default: '' },
    availability: { type: String, default: '' },
    isVerified: { type: Boolean, default: false },
    avgRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    walletBalance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TutorProfile', tutorProfileSchema);
