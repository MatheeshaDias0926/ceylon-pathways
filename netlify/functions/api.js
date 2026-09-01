import serverless from 'serverless-http';
import { connectDB } from '../../db/connection.js';
import app from '../../server.js';

let isConnected = false;

const serverlessHandler = serverless(app);

export const handler = async (event, context) => {
  // Allow function execution to finish without waiting for background connections
  context.callbackWaitsForEmptyEventLoop = false;

  // Connect to MongoDB Atlas (reuses connection across invocations)
  if (!isConnected) {
    await connectDB();
    isConnected = true;
  }

  return await serverlessHandler(event, context);
};
