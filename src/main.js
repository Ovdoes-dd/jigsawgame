import { BootScene } from './scenes/BootScene.js';
import { MainMenu } from './scenes/MainMenu.js';
import { Select } from './scenes/Select.js';          // 若不存在，可注释掉此行及 scene 列表内对应引用
import { Leaderboard } from './scenes/Leaderboard.js';
import { Jigsaw } from './scenes/Jigsaw.js';
import { ChallengeMenu } from './scenes/ChallengeMenu.js';

/* 全局错误可视化 */
const errorDiv = document.getElementById('error-log');
function logErr(msg) {
  if (errorDiv) {
    errorDiv.textContent += (msg + '\n');
  }
  console.error(msg);
}
window.addEventListener('error', e => {
  logErr('[WindowError] ' + (e.message || e.error?.message || e.filename));
});
window.addEventListener('unhandledrejection', e => {
  logErr('[UnhandledRejection] ' + (e.reason && e.reason.message ? e.reason.message : e.reason));
});

if (typeof Phaser === 'undefined') {
  logErr('Phaser 未加载：请检查 index.html 中的 <script src="./lib/phaser.js">');
}

if (typeof document !== 'undefined') {
  document.title = 'jigsawGame';
}

const config = {
  type: Phaser.AUTO,
  title: 'jigsawGame',
  parent: 'game-container',
  width: 1280,
  height: 720,
  backgroundColor: '#0d1117',
  pixelArt: false,
  // BootScene 必须放首位
  scene: [BootScene, MainMenu, Select, Leaderboard, ChallengeMenu, Jigsaw],
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
};

const game = new Phaser.Game(config);

/* Phaser 级别日志 */
//game.events.on('hidden', () => logErr('[Phaser] canvas hidden'));
//game.events.on('visible', () => logErr('[Phaser] canvas visible'));