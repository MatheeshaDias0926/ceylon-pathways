import mongoose from 'mongoose';

const testimonialSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  origin: { type: String, default: 'International Traveler' },
  rating: { type: Number, default: 5, min: 1, max: 5 },
  avatar: { type: String, default: 'hero/beach.jpg' },
  text: { type: String, required: true },
  featured: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
}, { timestamps: true });

testimonialSchema.index({ featured: 1, createdAt: -1 });

export default mongoose.model('Testimonial', testimonialSchema);
