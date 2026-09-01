import mongoose from 'mongoose';

const packageSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true, trim: true },
  tagline: { type: String, default: '' },
  duration: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'USD' },
  type: { type: String, default: 'Cultural' },
  vehicle: { type: String, default: 'corolla' },
  image: { type: String, default: 'packages/cultural-triangle.jpg' },
  popular: { type: Boolean, default: false },
  destinations: [{ type: String }],
  includes: [{ type: String }],
  excludes: [{ type: String }],
  itinerary: [{
    day: Number,
    title: String,
    description: String,
    highlights: [String]
  }]
}, { timestamps: true });

packageSchema.index({ type: 1 });
packageSchema.index({ popular: -1 });

export default mongoose.model('Package', packageSchema);
