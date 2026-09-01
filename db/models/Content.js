import mongoose from 'mongoose';

const contentSchema = new mongoose.Schema({
  key: { type: String, default: 'site-content', unique: true },
  headline: { type: String, default: 'Discover the Wonder of Sri Lanka' },
  subTagline: { type: String, default: 'Private Tours · Expert Guides · Bespoke Itineraries' },
  modalText: { type: String, default: '' },
  email: { type: String, default: 'info@ceylonpathways.com' },
  whatsapp: { type: String, default: '+94XXXXXXXXX' }
}, { timestamps: true });

export default mongoose.model('Content', contentSchema);
