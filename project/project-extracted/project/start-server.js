import { spawn } from 'child_process';
import path from 'path';

console.log('🚀 Starting Node.js development server...');

// Démarrer le serveur Node.js
const server = spawn('node', ['server/server.js'], {
  cwd: process.cwd(),
  stdio: 'inherit'
});

server.on('error', (error) => {
  console.error('❌ Error starting Node.js server:', error.message);
  process.exit(1);
});

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});

// Gérer l'arrêt propre
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping server...');
  server.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Stopping server...');
  server.kill('SIGTERM');
  process.exit(0);
});