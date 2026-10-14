/**
 * BAZERIGHT VERIFY - Production Server Entry Point for Hostinger & Cloud Environments
 * 
 * Hostinger Node.js hosting expects an entry file (default: server.js) in the project root.
 * This launcher boots the bundled production server in dist/server.cjs.
 * 
 * Compatible with Node.js 22+, Hostinger Express app manager, PM2, and Passenger.
 */
import dotenv from 'dotenv';
dotenv.config({ override: true });
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Enforce production mode for Hostinger and cloud production runners
process.env.NODE_ENV = 'production';

// Path to compiled production server bundle
const bundlePath = path.join(__dirname, 'dist', 'server.cjs');

if (!fs.existsSync(bundlePath)) {
  console.error('================================================================');
  console.error('[BAZERIGHT VERIFY] ERROR: Production bundle not found!');
  console.error('Expected file at: ' + bundlePath);
  console.error('Please run "npm run build" to compile the frontend and backend.');
  console.error('================================================================');
  process.exit(1);
}

// Launch the compiled production server
try {
  require(bundlePath);
} catch (err) {
  console.error('[BAZERIGHT VERIFY] Fatal error starting server from bundle:', err);
  process.exit(1);
}
