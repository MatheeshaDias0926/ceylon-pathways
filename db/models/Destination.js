import mongoose from 'mongoose';

const destinationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  region: { type: String, default: 'Cultural Triangle' },
  shortDesc: { type: String, default: '' },
  description: { type: String, default: '' },
  image: { type: String, default: 'destinations/sigiriya.jpg' },
  lat: { type: Number, default: 7.8731 },
  lng: { type: Number, default: 80.7718 },
  typicalDuration: { type: String, default: 'Half Day' },
  bestTime: { type: String, default: 'Year-round' }
}, { timestamps: true });

destinationSchema.index({ region: 1 });

export default mongoose.model('Destination', destinationSchema);
