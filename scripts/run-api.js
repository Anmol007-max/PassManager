const { spawn } = require('child_process');
const path = require('path');

const isWin = process.platform === 'win32';
const cmd = isWin ? 'mvnw.cmd' : './mvnw';
const args = process.argv.slice(2);
const goals = args.length ? args : ['spring-boot:run', '-Dspring-boot.run.profiles=dev'];

const child = spawn(cmd, goals, {
  cwd: path.join(__dirname, '..', 'backend'),
  stdio: 'inherit',
  shell: isWin               // required on Windows for .cmd files
});

child.on('exit', code => process.exit(code ?? 0));
['SIGINT', 'SIGTERM'].forEach(sig => process.on(sig, () => child.kill(sig)));
