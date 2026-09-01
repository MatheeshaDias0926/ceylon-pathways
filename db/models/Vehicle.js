import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  type: { type: String, default: 'Sedan' },
  seats: { type: Number, default: 3, min: 1 },
  luggage: { type: String, default: '2 medium bags' },
  ac: { type: Boolean, default: true },
  pricePerDay: { type: Number, default: 45, min: 0 },
  currency: { type: String, default: 'USD' },
  available: { type: Boolean, default: true },
  image: { type: String, default: 'vehicles/prius.jpg' },
  description: { type: String, default: '' }
}, { timestamps: true });

vehicleSchema.index({ available: 1 });

export default mongoose.model('Vehicle', vehicleSchema);
