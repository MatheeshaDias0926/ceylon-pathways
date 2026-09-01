import mongoose from 'mongoose';

const enquirySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, default: '' },
  message: { type: String, default: '' },
  packageId: { type: String, default: '' },
  packageTitle: { type: String, default: '' },
  travelDates: { type: String, default: '' },
  travelers: { type: Number, default: 1 },
  status: { type: String, enum: ['new', 'contacted', 'quoted', 'booked', 'cancelled'], default: 'new' },
  notes: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

enquirySchema.index({ status: 1 });
enquirySchema.index({ timestamp: -1 });

export default mongoose.model('Enquiry', enquirySchema);
