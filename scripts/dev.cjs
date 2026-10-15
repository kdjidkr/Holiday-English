const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const interfaces = os.networkInterfaces();
const lanAddress = Object.values(interfaces).flat().find(item => item && item.family === 'IPv4' && !item.internal)?.address;
const expoCli = require.resolve('expo/bin/cli');
const env = {
  ...process.env,
  NODE_ENV: process.env.NODE_ENV || 'development',
  EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || (lanAddress ? `http://${lanAddress}:3000` : 'http://localhost:3000'),
};
const children = [
  spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], { stdio: 'inherit', env }),
  spawn(process.execPath, [expoCli, 'start', ...process.argv.slice(2)], { stdio: 'inherit', env }),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (!child.killed) child.kill('SIGTERM');
  process.exitCode = code;
}
for (const child of children) child.on('exit', code => stop(code || 0));
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
