const { spawnSync } = require('node:child_process');
const fs = require('node:fs');

const message = process.argv.slice(2).join(' ').trim();
if (!message) {
  console.error('사용법: npm run release:preview -- "변경 내용"');
  process.exit(2);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

function capture(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || `${command} failed`);
  return result.stdout.trim();
}

function eas(args, options = {}) {
  run('npx', ['--yes', 'eas-cli@25.3.0', ...args], options);
}

try {
  if (capture('git', ['branch', '--show-current']) !== 'main') {
    throw new Error('main 브랜치에서만 미리보기 배포를 진행합니다.');
  }

  run('npm', ['run', 'typecheck']);
  run('npm', ['test']);
  run('git', ['add', '--all']);

  const staged = capture('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMRT'])
    .split('\n').filter(Boolean);
  if (!staged.length) throw new Error('커밋할 변경사항이 없습니다.');
  const envFiles = staged.filter(file => file.split('/').some(part => part.startsWith('.env')));
  if (envFiles.length) throw new Error(`환경 파일은 커밋할 수 없습니다: ${envFiles.join(', ')}`);

  const nativeChange = staged.some(file =>
    file === 'app.json' || file === 'package.json' || file === 'package-lock.json' ||
    file.startsWith('ios/') || file.startsWith('android/') || file.startsWith('plugins/')
  );

  if (nativeChange) {
    const previous = JSON.parse(capture('git', ['show', 'HEAD:app.json'])).expo;
    const current = JSON.parse(fs.readFileSync('app.json', 'utf8')).expo;
    const previousBuild = Number(previous.ios?.buildNumber || 0);
    const currentBuild = Number(current.ios?.buildNumber || 0);
    if (current.version === previous.version || currentBuild <= previousBuild) {
      throw new Error('네이티브 변경이 있어요. app.json의 version과 ios.buildNumber를 올린 뒤 다시 실행하세요.');
    }
  }

  run('git', ['commit', '-m', message]);
  run('git', ['push', 'origin', 'HEAD:main']);

  if (nativeChange) {
    console.log('네이티브 설정 변경이 있어 iOS 앱 빌드를 시작합니다.');
    eas(['build', '--platform', 'ios', '--profile', 'preview', '--non-interactive', '--freeze-credentials', '--wait'], {
      env: { ...process.env, NODE_ENV: 'production', EXPO_NO_DOTENV: '1' },
    });
  } else {
    const app = JSON.parse(fs.readFileSync('app.json', 'utf8')).expo;
    const builds = JSON.parse(capture('npx', [
      '--yes', 'eas-cli@25.3.0', 'build:list', '--platform', 'ios', '--status', 'finished',
      '--build-profile', 'preview', '--app-version', app.version, '--limit', '1', '--json', '--non-interactive',
    ]));
    if (!builds.length) {
      throw new Error(`iOS ${app.version} 빌드가 없습니다. npm run build:ios:preview 로 앱을 먼저 빌드하세요.`);
    }
  }

  const easConfig = JSON.parse(fs.readFileSync('eas.json', 'utf8'));
  const apiBaseUrl = easConfig.build.preview.env.EXPO_PUBLIC_API_BASE_URL;
  if (!apiBaseUrl) throw new Error('eas.json의 preview 프로필에 API 주소가 없습니다.');
  eas(['update', '--platform', 'ios', '--channel', 'preview', '--environment', 'preview', '--message', message, '--non-interactive'], {
    env: { ...process.env, EXPO_PUBLIC_API_BASE_URL: apiBaseUrl, EXPO_NO_DOTENV: '1' },
  });
  console.log('미리보기 앱 업데이트를 배포했습니다. 앱을 완전히 닫았다가 다시 열면 업데이트가 적용됩니다.');
} catch (error) {
  console.error(`배포 중단: ${error.message}`);
  process.exit(1);
}
