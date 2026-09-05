import mongoose from 'mongoose';

const enquirySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  type: { type: String, default: 'enquiry' },
  name: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, default: '' },
  message: { type: String, default: '' },
  packageId: { type: String, default: '' },
  packageTitle: { type: String, default: '' },
  travelDates: { type: String, default: '' },
  date: { type: String, default: '' },
  travelers: { type: Number, default: 1 },
  guests: { type: String, default: '' },
  adults: { type: String, default: '' },
  tripDays: { type: Number, default: 7 },
  destinations: { type: [String], default: [] },
  vehicle: { type: String, default: '' },
  hotelTier: { type: String, default: '' },
  status: { type: String, enum: ['new', 'contacted', 'quoted', 'booked', 'closed', 'cancelled'], default: 'new' },
  notes: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true, strict: false });

enquirySchema.index({ status: 1 });
enquirySchema.index({ timestamp: -1 });

export default mongoose.model('Enquiry', enquirySchema);
