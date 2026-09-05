// ── DealFlow360 API – Server Entry Point ──

import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

import { app } from './app.js';

const PORT = process.env.API_PORT ?? 3001;

app.listen(PORT, () => {
  console.log(`\n🚀 DealFlow360 API running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});
