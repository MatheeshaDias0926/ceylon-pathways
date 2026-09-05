import mongoose from 'mongoose';

let isConnecting = false;

export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return true;
  }

  if (mongoose.connection.readyState === 2 || isConnecting) {
    // Wait for in-progress connection
    await new Promise((resolve) => {
      const onConnected = () => { cleanup(); resolve(true); };
      const onError = () => { cleanup(); resolve(false); };
      const timer = setTimeout(() => { cleanup(); resolve(false); }, 6000);

      function cleanup() {
        clearTimeout(timer);
        mongoose.connection.removeListener('connected', onConnected);
        mongoose.connection.removeListener('error', onError);
      }

      mongoose.connection.once('connected', onConnected);
      mongoose.connection.once('error', onError);
    });
    return mongoose.connection.readyState === 1;
  }

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn('⚠ MONGODB_URI not set — running in JSON-file fallback mode');
    return false;
  }

  try {
    isConnecting = true;
    const conn = await mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    });

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    return true;
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    return false;
  } finally {
    isConnecting = false;
  }
}

export function isDBConnected() {
  return mongoose.connection.readyState === 1;
}

// Graceful shutdown
process.on('SIGINT', async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
  process.exit(0);
});
