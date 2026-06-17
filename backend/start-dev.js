/**
 * start-dev.js
 * Kills port 5000 before starting the server — prevents EADDRINUSE on nodemon restarts.
 */
const { execSync, spawn } = require('child_process');

try {
  execSync('npx kill-port 5000', { stdio: 'inherit' });
} catch (_) {
  // port was already free — ignore
}

const child = spawn('npx', ['tsx', 'src/index.ts'], {
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => process.exit(code ?? 0));
