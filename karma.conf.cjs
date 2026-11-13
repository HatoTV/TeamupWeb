// Karma configuration (Angular defaults) + a Chrome binary that works without a local Chrome install:
// CHROME_BIN if set, otherwise the Playwright Chromium headless shell (`npx playwright install chromium`).
const { existsSync, readdirSync } = require('node:fs');
const { join } = require('node:path');
const os = require('node:os');

function playwrightHeadlessShell() {
  const root =
    process.env.PLAYWRIGHT_BROWSERS_PATH ||
    (process.platform === 'win32'
      ? join(process.env.LOCALAPPDATA || join(os.homedir(), 'AppData', 'Local'), 'ms-playwright')
      : process.platform === 'darwin'
        ? join(os.homedir(), 'Library', 'Caches', 'ms-playwright')
        : join(os.homedir(), '.cache', 'ms-playwright'));
  if (!existsSync(root)) return null;
  const exe = process.platform === 'win32' ? 'chrome-headless-shell.exe' : 'chrome-headless-shell';
  const builds = readdirSync(root)
    .filter((d) => d.startsWith('chromium_headless_shell-'))
    .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]));
  for (const build of builds) {
    for (const sub of readdirSync(join(root, build))) {
      const candidate = join(root, build, sub, exe);
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}

if (!process.env.CHROME_BIN) {
  const shell = playwrightHeadlessShell();
  if (shell) process.env.CHROME_BIN = shell;
}

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma'),
    ],
    client: {
      jasmine: {},
      clearContext: false,
    },
    jasmineHtmlReporter: {
      suppressAll: true,
    },
    coverageReporter: {
      dir: require('node:path').join(__dirname, './coverage/teamup-web'),
      subdir: '.',
      reporters: [{ type: 'html' }, { type: 'text-summary' }],
    },
    reporters: ['progress', 'kjhtml'],
    // Not the default 9876: a browser tab left open on 9876 reconnects and joins the run.
    port: 9879,
    browsers: ['Chrome'],
    restartOnFileChange: true,
  });
};
