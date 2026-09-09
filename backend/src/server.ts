import app from './app';
import { env } from './config/env';
import { startAllJobs } from './jobs';

const PORT = env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🌾 AgriTrace API v1 running on http://localhost:${PORT}`);
  console.log(`🚀 Mode: ${env.NODE_ENV} | Connected via Supabase Client`);
  console.log(`🌐 Base Route: http://localhost:${PORT}/api/v1`);
  console.log(`=======================================================`);

  // Initialize background scheduled workers
  try {
    startAllJobs();
  } catch (err) {
    console.error('Warning: Could not start background jobs:', err);
  }
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated.');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated.');
  });
});
