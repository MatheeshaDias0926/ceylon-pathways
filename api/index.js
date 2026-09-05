import app from '../server.js';
import { connectDB } from '../db/connection.js';

let isConnected = false;

export default async function handler(req, res) {
  // Connect to MongoDB Atlas (reuses connection across invocations)
  if (!isConnected) {
    try {
      await connectDB();
      isConnected = true;
    } catch (err) {
      console.error('MongoDB connection error in Vercel function:', err);
    }
  }

  // Ensure req.url matches the /api prefix expected by routes in server.js
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }

  return app(req, res);
}
