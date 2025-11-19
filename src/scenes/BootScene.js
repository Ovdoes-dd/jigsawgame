// 负责最小资源加载 & 切换到 MainMenu
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }
  preload() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const txt = this.add.text(W / 2, H / 2, '加载中...', {
      fontSize: '28px', color: '#ffffff'
    }).setOrigin(0.5);

    // 公共背景与基础图片
    if (!this.textures.exists('background')) {
      this.load.image('background', 'assets/1.jpg');
    }
    if (!this.textures.exists('phoro')) {
      this.load.image('phoro', 'assets/phoro.jpg');
    }
    // 关卡图片
    ['level1','level2','level3'].forEach(l=>{
      const key = 'challenge_' + l;
      if (!this.textures.exists(key)) {
        this.load.image(key, `assets/challenge/${l}.jpg`);
      }
    });

    // 统一预加载常用音频（避免 MainMenu 先调用时未加载）
    const audios = [
      { key: 'bgm_menu', urls: ['assets/audio/bgm_menu.mp3'] },
      { key: 'bgm_jigsaw', urls: ['assets/audio/bgm_jigsaw.mp3'] },
      { key: 'click', urls: ['assets/audio/click.wav'] },
      { key: 'piece_pick', urls: ['assets/audio/piece_pick.wav'] },
      { key: 'piece_drop', urls: ['assets/audio/piece_drop.wav'] },
      { key: 'piece_merge', urls: ['assets/audio/piece_merge.wav'] },
      { key: 'piece_rotate', urls: ['assets/audio/piece_rotate.wav'] },
      { key: 'win', urls: ['assets/audio/win.wav'] }
    ];
    audios.forEach(a => {
      // 只在未存在时加载
      if (!this.sound.get(a.key)) this.load.audio(a.key, a.urls);
    });

    this.load.on('loaderror', (file) => {
      console.warn('[BootScene] 资源加载失败：', file?.src);
    });
    this.load.on('progress', p => {
      txt.setText('加载中... ' + Math.round(p * 100) + '%');
    });
  }
  create() {
    // 标记已经完成初始预加载
    window.__PUZZLE_BOOT_READY__ = true;
    this.scene.start('MainMenu');
  }
}