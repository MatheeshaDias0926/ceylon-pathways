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

  // Handle URL path resolution on Vercel
  const targetUrl = req.originalUrl || req.url || '';
  if (targetUrl) {
    req.url = targetUrl.startsWith('/api') ? targetUrl : ('/api' + (targetUrl.startsWith('/') ? targetUrl : '/' + targetUrl));
  }

  return app(req, res);
}
