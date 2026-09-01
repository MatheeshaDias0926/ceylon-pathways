import mongoose from 'mongoose';

let isConnected = false;

export async function connectDB() {
  if (isConnected) return;

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn('⚠ MONGODB_URI not set — running in JSON-file fallback mode');
    return false;
  }

  try {
    const conn = await mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    return true;
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    console.warn('⚠ Falling back to JSON-file storage');
    return false;
  }
}

export function isDBConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

// Graceful shutdown
process.on('SIGINT', async () => {
  if (isConnected) {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
  process.exit(0);
});
