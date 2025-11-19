import { SoundManager } from '../sound/SoundManager.js';

export class Select extends Phaser.Scene {
  constructor() {
    super('Select');
    this.uiDepth = 2000;

    this.buttonStyles = {
    back: {
      normal: { color: '#ee1c0d', backgroundColor: '#44c4ffb8' },
      hover: { color: '#ee1c0d', backgroundColor: '#44c4fff0' }
    },
    settings: {
      normal: { color: '#ffffffff', backgroundColor: '#6fbbfeb9' },
      hover: { color: '#ffffff', backgroundColor: '#00aaff' }
    },
    importProgress: {
      normal: { color: '#ffffffff', backgroundColor: '#44c4ffb8' },
      hover: { color: '#ffffff', backgroundColor: '#0088cc' }
    },
    importImage: {
      normal: { color: '#ffffff', backgroundColor: 'rgba(15, 170, 226, 0.56)' },
      hover: { color: '#ffffff', backgroundColor: 'rgba(15, 170, 226, 0.85)' }
    },
    difficulty: {
      normal: { color: '#ffffff', backgroundColor: '#6fbbfeb9' },
      hover: { color: '#ffffffff', backgroundColor: '#3939c48b' },
      selected: { color: '#00ffff', backgroundColor: '#3939c4ff' }
    },
    customDiff: {
      normal: { color: '#ffffffff', backgroundColor: '#6fbbfeb9' },
      hover: { color: '#ffffffff', backgroundColor: '#3939c48b' },
      selected: { color: '#ffd700', backgroundColor: '#3939c4ff' }
    },
    modeToggle: {
      normal: { color: '#ffffff', backgroundColor: '#6fbbfeb9' },
      hover: { color: '#00ffff', backgroundColor: '#319fffb9' }
    },
    startGame: {
      normal: { color: '#ffffff', backgroundColor: '#00aaff' },
      hover: { color: '#ffffff', backgroundColor: '#0037ffff' }
    }
  };

    this.BUILTINS = [
      { key: 'phoro', url: 'assets/phoro.jpg', name: 'joker' },
      { key: 'dog', url: 'assets/dog.jpg', name: 'dog&cat' },
      { key: 'bear', url: 'assets/bear.jpg', name: 'bear' },
      { key: 'niaochao', url: 'assets/niaochao.jpg', name: 'stadium' },
      { key: 'level1', url: 'assets/challenge/level1.jpg', name: 'castle' },
      { key: 'level2', url: 'assets/challenge/level2.jpg', name: 'sorakodo' },
      { key: 'level3', url: 'assets/challenge/level3.jpg', name: 'tomorin' }
    ];
    this.CUSTOM_STORE_KEY = 'puzzle_custom_images_v1';

    this.customEntries = [];
    this.thumbNodes = [];
    this.selectedImage = null;
    this.selectedRows = null;
    this.selectedCols = null;

    this.diffButtons = {};
    this.selectedDiffKey = null;
    this.customUI = null;
    this.pieceMode = 'RECT';

    this._settingsPanelNodes = null;
    this._importProgressPanel = null;
  }

  preload() {
    this.load.image('background', 'assets/1.jpg');
    for (const b of this.BUILTINS) {
      if (!this.textures.exists(b.key)) this.load.image(b.key, b.url);
    }
    const audios = [
      { key: 'bgm_menu', urls: ['assets/audio/bgm_menu.mp3'] },
      { key: 'click', urls: ['assets/audio/click.wav'] }
    ];
    audios.forEach(a => { if (!this.sound.get(a.key)) this.load.audio(a.key, a.urls); });
  }

  setupButtonInteractivity(button, styleType) {
  const styles = this.buttonStyles[styleType];
  if (!styles) return;
  
  button.setInteractive({ useHandCursor: true })
    .on('pointerover', () => {
      button.setStyle(styles.hover);
      button.setScale(1.05);
    })
    .on('pointerout', () => {
      button.setStyle(styles.normal);
      button.setScale(1);
    });
    
  return button;
}

// 更新难度按钮的高亮状态
updateDifficultyButton(button, isSelected, isCustom = false) {
  const styleType = isCustom ? 'customDiff' : 'difficulty';
  const styles = this.buttonStyles[styleType];
  
  if (isSelected) {
    button.setStyle(styles.selected || styles.hover);
  } else {
    button.setStyle(styles.normal);
  }
}

  async create() {
    SoundManager.init(this);
    SoundManager.playBGM('bgm_menu');

    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const cx = W / 2;

    // 背景层
    this.add.image(cx, H / 2, 'background')
      .setDisplaySize(W, H)
      .setAlpha(0.7)
      .setDepth(-1);

    this.add.rectangle(cx, H / 2, W, H, 0x10131a, 0.6)
      .setDepth(-999);

    // 1. 主标题：选择图片与难度（增加半透明背景防遮挡，强化阴影）
const title = this.add.text(cx, 69, '选择图片与难度', {
  fontSize: '28px',
  fontStyle: 'bold',
  color: '#ffffff',
  backgroundColor: '#47c8ff00', // 半透黑背景隔离背景图
  padding: { left: 12, right: 12, top: 8, bottom: 8 }, // 增大上下内边距（从3px改为8px）
  shadow: { offsetX: 2, offsetY: 2, color: '#3ad1ff', blur: 6, stroke: true, strokeThickness: 1 },
  border: '4px solid #3ad1ff' // 四周边框
}).setOrigin(0.5);
this.tweens.add({
  targets: title, scaleX: 1.05, scaleY: 1.05,
  duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.InOut'
});

// 装饰线（与标题拉开距离，避免遮挡）
const decorLine = this.add.rectangle(cx, 100, 250, 3, 0x47c8ff, 1).setOrigin(0.5); // 因标题变高，装饰线向下微调（从95→110）

    // 返回按钮
const backBtn = this.add.text(30, 24, '返回', {
  fontSize: '20px',
  fontStyle: 'bold',
  color: this.buttonStyles.back.normal.color,
  backgroundColor: this.buttonStyles.back.normal.backgroundColor,
  padding: { left: 14, right: 14, top: 6, bottom: 6 }
}).setInteractive({ useHandCursor: true })
  .on('pointerdown', () => { SoundManager.playClick(); this.scene.start('MainMenu'); });

// 添加悬停效果
this.setupButtonInteractivity(backBtn, 'back');
    // 设置按钮
const settingsBtn = this.add.text(W - 120, 24, '设置', {
  fontSize: '20px',
  fontStyle: 'bold',
  color: this.buttonStyles.settings.normal.color,
  backgroundColor: this.buttonStyles.settings.normal.backgroundColor,
  padding: { left: 16, right: 16, top: 6, bottom: 6 }
}).setInteractive({ useHandCursor: true })
  .on('pointerdown', () => { SoundManager.playClick(); this.openSettingsPanel(); });

// 添加悬停效果
this.setupButtonInteractivity(settingsBtn, 'settings');
    // 导入进度按钮
const importProgressBtn = this.add.text(30, 70, '导入进度', {
  fontSize: '18px',
  fontStyle: 'bold',
  color: this.buttonStyles.importProgress.normal.color,
  backgroundColor: this.buttonStyles.importProgress.normal.backgroundColor,
  padding: { left: 14, right: 14, top: 6, bottom: 6 },
  shadow: { offsetX: 1, offsetY: 1, color: '#00000080', blur: 1 }
}).setInteractive({ useHandCursor: true })
  .on('pointerdown', () => { SoundManager.playClick(); this.openImportProgressPanel(); });

// 添加悬停效果
this.setupButtonInteractivity(importProgressBtn, 'importProgress');
    // 2. 分类标签：自带图片（优化边框与视觉层次）
const builtInLabel = this.add.text(80, 140, '自带图片', {
  fontSize: '20px',
  fontStyle: 'bold',
  color: '#ffffff',
  backgroundColor: '#2fc2d2c1', // 稍加深背景增强边框对比
  padding: { left: 10, right: 10, top: 3, bottom: 4 }, // 优化内边距比例，底部略宽
  stroke: '#4dd0e1', // 浅蓝色描边，呼应主标题风格
  strokeThickness: 1.2, // 精细边框
  shadow: { 
    offsetX: 1, 
    offsetY: 2, 
    color: '#000000', 
    blur: 3,
    fill: true // 阴影作用于填充，增强边框立体感
  }
});

// 为自带图片标签添加底部小装饰
const builtInLine = this.add.graphics();
builtInLine.lineStyle(1.5, 0x4dd0e1, 0.6);
const lineWidth1 = builtInLabel.width * 1;
builtInLine.beginPath();
builtInLine.moveTo(80 + (builtInLabel.width - lineWidth1)/2, 140 + builtInLabel.height);
builtInLine.lineTo(80 + (builtInLabel.width + lineWidth1)/2, 140 + builtInLabel.height);
builtInLine.stroke();

// 3. 分类标签：已导入图片（强化边框与识别度）
const importedLabel = this.add.text(80, 325, '已导入图片', {
  fontSize: '20px',
  fontStyle: 'bold',
  color: '#ffffff',
  backgroundColor: '#2fc2d2c1',
  padding: { left: 10, right: 10, top: 3, bottom: 4 },
  stroke: '#4dd0e1',
  strokeThickness: 1.2,
  shadow: { 
    offsetX: 1, 
    offsetY: 2, 
    color: '#00000090', 
    blur: 3,
    fill: true
  }
});

// 为已导入图片标签添加底部小装饰
const importedLine = this.add.graphics();
importedLine.lineStyle(1.5, 0x4dd0e1, 0.6);
const lineWidth2 = importedLabel.width * 1;
importedLine.beginPath();
importedLine.moveTo(80 + (importedLabel.width - lineWidth2)/2, 325 + importedLabel.height);
importedLine.lineTo(80 + (importedLabel.width + lineWidth2)/2, 325 + importedLabel.height);
importedLine.stroke();

    // 导入图片按钮
const importImageBtn = this.add.text(W - 140, 320, '导入图片', {
  fontSize: '20px',
  fontStyle: 'bold',
  color: this.buttonStyles.importImage.normal.color,
  backgroundColor: this.buttonStyles.importImage.normal.backgroundColor,
  padding: { left: 14, right: 14, top: 6, bottom: 6 }
}).setInteractive({ useHandCursor: true })
  .on('pointerdown', () => { SoundManager.playClick(); this.importImage(); });

// 添加悬停效果
this.setupButtonInteractivity(importImageBtn, 'importImage');
    // 加载自定义图片提示（与“已导入图片”标签拉开距离，避免遮挡）
    this.customEntries = this.loadCustomEntries();
    const loading = this.add.text(80, 365, '加载自定义图片中...', {
      fontSize: '16px',
      fontStyle: 'italic',
      color: '#aaaaaa',
      shadow: { offsetX: 1, offsetY: 1, color: '#00000080', blur: 1 }
    });
    await this.ensureAllCustomTexturesLoaded();
    loading.destroy();

    // 缩略图绘制（自带图片startY=170，与“自带图片”标签间距30px；自定义图片startY=390，与“已导入图片”标签间距65px，均无遮挡）
    this.redrawThumbnails();
    this.drawDifficultyArea();
    this.drawModeToggle();
    this.setDifficulty('EASY', 3, 3);

    // 开始游戏按钮
const startBtn = this.add.text(cx, H - 56, '开始游戏', {
  fontSize: '24px',
  fontStyle: 'bold',
  color: this.buttonStyles.startGame.normal.color,
  backgroundColor: this.buttonStyles.startGame.normal.backgroundColor,
  padding: { left: 22, right: 22, top: 8, bottom: 8 }
}).setOrigin(0.5).setInteractive({ useHandCursor: true })
  .on('pointerdown', () => { SoundManager.playClick(); this.tryStartGame(); });

// 添加悬停效果
this.setupButtonInteractivity(startBtn, 'startGame');
  }

  /* ---------------- 导入进度面板 ---------------- */
  openImportProgressPanel() {
    if (this._importProgressPanel) return;
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const cx = W / 2, cy = H / 2;
    const pw = 560, ph = 340;

    const close = () => {
      if (!this._importProgressPanel) return;
      const input = this._importProgressPanel._fileInput;
      input?.remove();
      this._importProgressPanel.nodes.forEach(n => n.destroy());
      this._importProgressPanel = null;
    };

    const overlay = this.add.rectangle(cx, cy, W, H, 0x000000, 0.55)
      .setDepth(this.uiDepth + 100)
      .setInteractive()
      .on('pointerdown', () => { /* 点击空白不关闭，避免误触 */ });

    const panel = this.add.rectangle(cx, cy, pw, ph, 0x1c252c, 0.96)
      .setStrokeStyle(2, 0x35505e)
      .setDepth(this.uiDepth + 101);

// 标题：导入拼图进度（向下调整位置并提高层级）
const title = this.add.text(cx, cy - ph / 2 + 45, '导入拼图进度', { // Y轴增加11px，更靠下
  fontSize: '26px',
  fontStyle: 'bold',
  color: '#00ffff',
  padding: { top: 3 }, // 增加顶部内边距，让文字内容向下偏移
  shadow: { offsetX: 1, offsetY: 1, color: '#00000080', blur: 2 },
  borderBottom: '2px solid #00ffff'
}).setOrigin(0.5).setDepth(this.uiDepth + 200); // 大幅提高层级

// 关闭按钮（向下调整位置）
const closeBtn = this.add.text(cx + pw / 2 - 28, cy - ph / 2 + 35, '×', { // Y轴增加13px
  fontSize: '28px',
  fontStyle: 'bold',
  color: '#ff6666',
  padding: { top: 2 },
  shadow: { offsetX: 1, offsetY: 1, color: '#00000080', blur: 1 },
  borderBottom: '2px solid #ff6666'
}).setOrigin(0.5).setDepth(this.uiDepth + 200) // 提高层级
  .setInteractive({ useHandCursor: true })
  .on('pointerdown', () => { SoundManager.playClick(); close(); });

// 说明文字（向下调整位置）
const info = this.add.text(cx, cy - 45, // Y轴增加15px
  '请选择之前导出的存档 JSON 文件。\n(不会出现系统弹窗外的浏览器提示)',
  {
    fontSize: '18px',
    color: '#ddeeff',
    align: 'center',
    lineSpacing: 8,
    wordWrap: { width: pw - 80 },
    padding: { top: 2 },
    shadow: { offsetX: 1, offsetY: 1, color: '#00000080', blur: 1 },
    borderBottom: '1px solid #ddeeff'
  })
  .setOrigin(0.5).setDepth(this.uiDepth + 200); // 提高层级

// 状态标签（向下调整位置）
const statusLabel = this.add.text(cx, cy + 25, '尚未选择文件', { // Y轴增加15px
  fontSize: '18px',
  fontStyle: 'bold',
  color: '#ffb347',
  padding: { top: 2 },
  shadow: { offsetX: 1, offsetY: 1, color: '#00000080', blur: 1 },
  borderBottom: '1px solid #ffb347'
}).setOrigin(0.5).setDepth(this.uiDepth + 200); // 提高层级
    const chooseBtn = this.add.text(cx - 120, cy + 70, '选择文件', {
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#00ffff',
      backgroundColor: '#28333b',
      padding: { left: 20, right: 20, top: 8, bottom: 8 }
    }).setOrigin(0.5).setDepth(this.uiDepth + 102).setInteractive({ useHandCursor: true });

    const importBtn = this.add.text(cx + 120, cy + 70, '开始导入', {
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#666666',
      backgroundColor: '#1b252b',
      padding: { left: 20, right: 20, top: 8, bottom: 8 }
    }).setOrigin(0.5).setDepth(this.uiDepth + 102).setInteractive({ useHandCursor: true });
    importBtn._enabled = false;

    const enableImport = (ok) => {
      importBtn._enabled = ok;
      if (ok) {
        importBtn.setStyle({
          color: '#00ffff',
          backgroundColor: '#28333b',
          fontStyle: 'bold'
        });
      } else {
        importBtn.setStyle({
          color: '#666666',
          backgroundColor: '#1b252b',
          fontStyle: 'bold'
        });
      }
    };

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.style.display = 'none';
    document.body.appendChild(input);

    let loadedJSON = null;
    chooseBtn.on('pointerdown', () => {
      SoundManager.playClick();
      input.click();
    });

    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      statusLabel.setColor('#ffd27f').setText('读取中...');
      try {
        const txt = await file.text();
        const data = JSON.parse(txt);
        if (!data.scene || !Array.isArray(data.pieces)) {
          statusLabel.setColor('#ff6666').setText('无效存档结构');
          loadedJSON = null;
          enableImport(false);
          return;
        }
        loadedJSON = data;
        statusLabel.setColor('#66ff99').setText(`已选择: ${file.name}`);
        enableImport(true);
      } catch {
        loadedJSON = null;
        statusLabel.setColor('#ff6666').setText('解析失败');
        enableImport(false);
      }
    });

    importBtn.on('pointerdown', () => {
      if (!importBtn._enabled) {
        SoundManager.playClick();
        return;
      }
      SoundManager.playClick();
      if (!loadedJSON) return;
      close();
      this.scene.start('Jigsaw', {
        rows: loadedJSON.scene.rows,
        cols: loadedJSON.scene.cols,
        imageKey: loadedJSON.scene.imageKey,
        imageName: loadedJSON.scene.imageName,
        pieceMode: loadedJSON.scene.pieceMode,
        restoreData: loadedJSON
      });
    });

    const cancelBtn = this.add.text(cx, cy + ph / 2 - 50, '取消', {
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ff6666',
      backgroundColor: '#2c2c2c',
      padding: { left: 22, right: 22, top: 8, bottom: 8 }
    }).setOrigin(0.5).setDepth(this.uiDepth + 102).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { SoundManager.playClick(); close(); });

    this._importProgressPanel = {
      nodes: [overlay, panel, title, closeBtn, info, statusLabel, chooseBtn, importBtn, cancelBtn],
      _fileInput: input
    };
  }

  /* ---------------- 设置面板 ---------------- */
  openSettingsPanel() {
    if (this._settingsPanelNodes) return;
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const cx = W / 2, cy = H / 2;
    const panelW = 480, panelH = 300;

    const closePanel = () => {
      if (this._settingsPanelNodes) {
        this._settingsPanelNodes.forEach(n => n.destroy());
        this._settingsPanelNodes = null;
      }
    };

    const overlay = this.add.rectangle(cx, cy, W, H, 0x000000, 0.55)
      .setDepth(this.uiDepth + 100)
      .setInteractive()
      .on('pointerdown', () => { SoundManager.playClick(); closePanel(); });

    const panel = this.add.rectangle(cx, cy, panelW, panelH, 0x202830, 0.98)
      .setStrokeStyle(2, 0x3a4a55)
      .setDepth(this.uiDepth + 101);

    const title = this.add.text(cx, cy - panelH / 2 + 40, '设置', { // 向下调整Y轴位置（+40比原来+32更靠下）
  fontSize: '28px',
  fontStyle: 'bold',
  color: '#00ffff',
  shadow: { offsetX: 1, offsetY: 1, color: '#00000080', blur: 2 },
  padding: { top: 5 } // 增加顶部内边距，避免文字内容太靠上
}).setOrigin(0.5).setDepth(this.uiDepth + 200); // 提高层级，确保在其他元素之上

    const btnClose = this.add.text(cx + panelW / 2 - 50, cy - panelH / 2 + 20, '×', {
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#ff6666',
      shadow: { offsetX: 1, offsetY: 1, color: '#00000080', blur: 1 }
    }).setOrigin(0.5).setDepth(this.uiDepth + 102).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { SoundManager.playClick(); closePanel(); });

   const muteLabel = this.add.text(cx - 160, cy - 60, '静音选项：', { // Y轴上移10单位（从-60到-50）
  fontSize: '20px',
  fontStyle: 'bold',
  color: '#ffffff',
  padding: { top: 3 }, // 增加顶部内边距，让文字内容向下偏移
  shadow: { offsetX: 1, offsetY: 1, color: '#00000080', blur: 1 }
}).setOrigin(0, 0.5).setDepth(this.uiDepth + 200); // 提高层级确保显示在最上层
    const muteBtn = this.add.text(cx - 60, cy - 60, SoundManager.isMuted() ? '开' : '关', {
      fontSize: '20px',
      fontStyle: 'bold',
      color: SoundManager.isMuted() ? '#ff6666' : '#00ffff',
      backgroundColor: '#2f3740',
      padding: { left: 16, right: 16, top: 6, bottom: 6 }
    }).setOrigin(0, 0.5).setDepth(this.uiDepth + 102).setInteractive({ useHandCursor: true });

    const refreshMute = () => {
      muteBtn.setText(SoundManager.isMuted() ? '开' : '关');
      muteBtn.setStyle({
        color: SoundManager.isMuted() ? '#ff6666' : '#00ffff',
        backgroundColor: '#2f3740',
        fontStyle: 'bold',
        padding: { left: 16, right: 16, top: 6, bottom: 6 }
      });
    };
    muteBtn.on('pointerdown', () => {
      SoundManager.playClick();
      SoundManager.toggleMute();
      refreshMute();
    });

    const makeSlider = (labelText, y, initValue, onChange) => {
      const label = this.add.text(cx - 160, y, labelText, {
  fontSize: '20px',
  fontStyle: 'bold',
  color: '#ffffff',
  // 1. 增加顶部内边距：给中文上部留足空间，避免被截断；底部内边距平衡视觉
  padding: { top: 4, bottom: 2, left: 2, right: 2 },
  // 2. 统一垂直对齐：从默认「基线对齐」改为「中线对齐」，解决中英文高度不一致
  verticalAlign: 'middle',
  // 3. 优化阴影：轻微加大blur，增强文字层次感，避免边缘模糊
  shadow: { offsetX: 1, offsetY: 1, color: '#00000080', blur: 2 },
  // 4. 保留原有底部边框，增加轻微描边让文字更清晰（可选但推荐）
  borderBottom: '1px solid #ffffff',
  stroke: '#00000060', // 轻微黑色描边，增强文字边缘辨识度
  strokeThickness: 0.8
})
.setOrigin(0, 0.5) // 保持「水平左对齐、垂直居中」，与y坐标匹配，不破坏原有布局
.setDepth(this.uiDepth + 200); // 提高层级到200，确保文字在滑块组件之上，不被遮挡
      const trackW = 220, trackH = 6, trackX = cx - 60;
      const track = this.add.rectangle(trackX, y, trackW, trackH, 0x0d1117, 0.9)
        .setStrokeStyle(1, 0x3a4a55, 1)
        .setOrigin(0, 0.5)
        .setDepth(this.uiDepth + 102);
      const fill = this.add.rectangle(trackX, y, trackW * initValue, trackH, 0x18a0d0, 0.8)
        .setOrigin(0, 0.5)
        .setDepth(this.uiDepth + 103);
      const handle = this.add.circle(trackX + trackW * initValue, y, 10, 0x28d5ff, 1)
        .setDepth(this.uiDepth + 104)
        .setInteractive({ useHandCursor: true, draggable: true });

      handle.on('drag', (_p, dragX) => {
        const clamped = Phaser.Math.Clamp(dragX, trackX, trackX + trackW);
        handle.x = clamped;
        const v = (clamped - trackX) / trackW;
        fill.width = trackW * v;
        onChange(v);
      });

      track.setInteractive({ useHandCursor: true }).on('pointerdown', (pointer) => {
        const local = Phaser.Math.Clamp(pointer.x - trackX, 0, trackW);
        const v = local / trackW;
        fill.width = trackW * v;
        handle.x = trackX + trackW * v;
        SoundManager.playClick();
        onChange(v);
      });

      return [label, track, fill, handle];
    };

    const sbgm = makeSlider('BGM 音量：', cy - 10, SoundManager.getBGMVolume(), v => SoundManager.setBGMVolume(v));
    const ssfx = makeSlider('SFX 音量：', cy + 50, SoundManager.getSFXVolume(), v => {
      SoundManager.setSFXVolume(v);
      SoundManager.playClick();
    });



    this._settingsPanelNodes = [
      overlay, panel, title, btnClose,
      muteLabel, muteBtn,
      ...sbgm, ...ssfx
    ];
  }

  /* ---------------- 导入图片 ---------------- */
  importImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);

    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) return;
      const maxFileMB = 10;
      if (file.size > maxFileMB * 1024 * 1024) {
        this.showToast(`文件过大 > ${maxFileMB}MB`);
        return;
      }
      try {
        const processed = await this.readAndProcessImage(file, {
          maxDim: 1024,
          mime: 'image/jpeg',
          quality: 0.88
        });
        if (!processed?.dataUrl) {
          this.showToast('图片处理失败');
          return;
        }
        const base = file.name.replace(/\.[^.]+$/, '') || '导入图片';
        const entry = {
          id: `${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
          name: base,
          dataUrl: processed.dataUrl
        };
        this.customEntries.push(entry);
        const ok = this.saveCustomEntries(this.customEntries);
        if (!ok) {
          this.showToast('保存失败：容量或权限');
          this.customEntries.pop();
          return;
        }
        await this.ensureSingleCustomTextureLoaded(entry);
        this.redrawThumbnails();
        this.showToast('导入成功！');
      } catch {
        this.showToast('导入失败');
      }
    });

    input.click();
  }

  /* ---------------- 纹理加载 ---------------- */
  addBase64TexturePromise(key, dataUrl) {
    return new Promise((resolve, reject) => {
      if (this.textures.exists(key)) {
        const tex = this.textures.get(key);
        const img = tex.getSourceImage();
        if (img && img.width > 0) return resolve();
      }
      const handler = (k) => {
        if (k === key) {
          this.textures.off(Phaser.Textures.Events.ADD, handler);
          resolve();
        }
      };
      this.textures.on(Phaser.Textures.Events.ADD, handler);
      try {
        this.textures.addBase64(key, dataUrl);
      } catch (e) {
        this.textures.off(Phaser.Textures.Events.ADD, handler);
        reject(e);
      }
    });
  }
  async ensureAllCustomTexturesLoaded() {
    const tasks = [];
    for (const e of this.customEntries) {
      tasks.push(this.addBase64TexturePromise(`custom-${e.id}`, e.dataUrl));
    }
    try { await Promise.all(tasks); } catch {}
  }
  ensureSingleCustomTextureLoaded(entry) {
    return this.addBase64TexturePromise(`custom-${entry.id}`, entry.dataUrl);
  }

  /* ---------------- 模式切换/难度/缩略图 等 ---------------- */
  drawModeToggle() {
    const H = this.cameras.main.height;
    const baseY = H - 160;
    // 形状模式文本：添加半透明背景隔离层+内边距+提升层级，彻底避免被背景/下方UI遮挡
this.add.text(80, baseY, '形状模式', {
  fontSize: '17px',
  fontStyle: 'bold',
  color: '#ffffff',
  // 半透黑背景：隔绝下方难度区域/背景图，文字更清晰
  backgroundColor: 'rgba(120, 167, 183, 0.6)',
  // 内边距：避免文字贴紧背景边缘，同时扩大点击交互区域（若后续需交互）
  padding: { left: 10, right: 10, top: 3, bottom: 3 },
  // 阴影保留：增强文字立体感，进一步区分于背景
  shadow: { offsetX: 1, offsetY: 1, color: '#00000080', blur: 2 },
  // 提升层级：确保文本在下方难度面板/缩略图之上，避免被覆盖
  depth: this.uiDepth - 10
}).setOrigin(0, 0.5);
    const toggle = this.add.text(180, baseY, '', {
  fontSize: '18px',
  fontStyle: 'bold',
  color: this.buttonStyles.modeToggle.normal.color,
  backgroundColor: this.buttonStyles.modeToggle.normal.backgroundColor,
  padding: { left: 14, right: 14, top: 6, bottom: 6 }
}).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

// 添加悬停效果
this.setupButtonInteractivity(toggle, 'modeToggle');
    
     const refresh = () => {
  const q = this.pieceMode === 'QUAD';
  toggle.setText(`随机四边块: ${q ? '开' : '关'}`);
  toggle.setStyle({
    color: q ? '#00ffff' : '#ff6666', // 开为蓝色，关为红色
    backgroundColor: '#6fbbfeb9', // 统一背景色，与参考代码保持一致
    fontStyle: 'bold',
    padding: { left: 14, right: 14, top: 6, bottom: 6 },
    // 拆分边框属性，与参考代码的样式设置方式保持一致
    borderBottomWidth: 2,
    borderBottomStyle: 'solid',
    borderBottomColor: '#000000' // 底部黑色边框
  });
};
    toggle.on('pointerdown', () => {
      SoundManager.playClick();
      this.pieceMode = (this.pieceMode === 'RECT') ? 'QUAD' : 'RECT';
      refresh();
      this.showToast(`已切换: ${this.pieceMode === 'QUAD' ? '随机四边形' : '矩形'}`);
    });
    refresh();

    // 添加初始旋转开关选项在随机四边块按钮旁边
    // 存储初始旋转设置到本地存储
    const getRotateInit = () => {
      const saved = localStorage.getItem('jigsaw_rotate_init');
      return saved === null ? true : saved === 'true';
    };
    const setRotateInit = (value) => {
      localStorage.setItem('jigsaw_rotate_init', value.toString());
    };
    
    const rotateInitValue = getRotateInit();
    const rotateInitBtn = this.add.text(180, baseY + 40, rotateInitValue ? '初始旋转: 开' : '初始旋转: 关', {
  fontSize: '18px',
  fontStyle: 'bold',
  color: rotateInitValue ? this.buttonStyles.modeToggle.normal.color : '#ff6666',
  backgroundColor: this.buttonStyles.modeToggle.normal.backgroundColor,
  padding: { left: 14, right: 14, top: 6, bottom: 6 }
}).setOrigin(0, 0.5).setDepth(this.uiDepth - 10).setInteractive({ useHandCursor: true });

// 添加悬停效果
rotateInitBtn.on('pointerover', () => {
  rotateInitBtn.setStyle({
    color: rotateInitValue ? '#00ffff' : '#ff8888',
    backgroundColor: this.buttonStyles.modeToggle.hover.backgroundColor,
    fontStyle: 'bold',
    padding: { left: 14, right: 14, top: 6, bottom: 6 }
  });
  rotateInitBtn.setScale(1.05);
});

rotateInitBtn.on('pointerout', () => {
  rotateInitBtn.setStyle({
    color: rotateInitValue ? '#ffffffff' : '#ff6666',
    backgroundColor: this.buttonStyles.modeToggle.normal.backgroundColor,
    fontStyle: 'bold',
    padding: { left: 14, right: 14, top: 6, bottom: 6 }
  });
  rotateInitBtn.setScale(1);
});
    rotateInitBtn.on('pointerdown', () => {
      SoundManager.playClick();
      const newValue = !getRotateInit();
      setRotateInit(newValue);
      rotateInitBtn.setText(newValue ? '初始旋转: 开' : '初始旋转: 关');
      rotateInitBtn.setStyle({
        color: newValue ? '#00ffff' : '#ff6666',
        backgroundColor: '#6fbbfeb9',
        fontStyle: 'bold',
        padding: { left: 14, right: 14, top: 6, bottom: 6 }
      });
      this.showToast(`已切换: 初始旋转${newValue ? '开启' : '关闭'}`);
    });
  }

  drawDifficultyArea() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const cx = W / 2;
    const g = this.add.graphics();
    g.fillStyle(0x10cacace, 0.7);
    g.fillRoundedRect(cx - (W - 100) / 2, H - 140 - 120 / 2, W - 100, 120, 15);
    g.lineStyle(2, 0x2e3a44);
    g.strokeRoundedRect(cx - (W - 100) / 2, H - 140 - 120 / 2, W - 100, 120, 15);

    const mk = (x, label, key, preset) => {
  const isCustom = key === 'CUSTOM';
  const normalStyle = isCustom ? 
    this.buttonStyles.customDiff.normal : 
    this.buttonStyles.difficulty.normal;
    
  const t = this.add.text(x, H - 166, label, {
    fontSize: '20px',
    fontStyle: 'bold',
    color: normalStyle.color,
    backgroundColor: normalStyle.backgroundColor,
    padding: { left: 16, right: 16, top: 8, bottom: 8 }
  }).setOrigin(0.5).setInteractive({ useHandCursor: true });
  
  // 添加悬停效果
  t.on('pointerover', () => {
    const hoverStyle = isCustom ? 
      this.buttonStyles.customDiff.hover : 
      this.buttonStyles.difficulty.hover;
    t.setStyle(hoverStyle);
    t.setScale(1.05);
  });
  
  t.on('pointerout', () => {
    this.updateDifficultyButton(t, this.selectedDiffKey === key, isCustom);
    t.setScale(1);
  });
  
  t._diffKey = key;
  t._preset = preset;
  t.on('pointerdown', () => {
    SoundManager.playClick();
    if (preset) this.setDifficulty(key, preset.rows, preset.cols);
    else {
      const r = Number.isInteger(this.selectedRows) ? this.selectedRows : 3;
      const c = Number.isInteger(this.selectedCols) ? this.selectedCols : 3;
      this.setDifficulty('CUSTOM', r, c);
    }
  });
  
  this.diffButtons[key] = t;
};
    const gap = 160;
    mk(cx - gap, '简单 3x3', 'EASY', { rows: 3, cols: 3 });
mk(cx, '中等 4x4', 'MEDIUM', { rows: 4, cols: 4 });
mk(cx + gap, '困难 5x5', 'HARD', { rows: 5, cols: 5 });
mk(cx + gap * 2, '自定义', 'CUSTOM', null);
    this.createCustomStepper(cx + gap * 2, H - 120);
  }

  createCustomStepper(centerX, y) {
    if (this.customUI) Object.values(this.customUI).forEach(n => n.destroy());
    
    const makeBtn = (x, txt) => {
      const t = this.add.text(x, y + 10, txt, {
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: '#6fbbfeb9',
        padding: { left: 10, right: 10, top: 4, bottom: 4 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      t.on('pointerover', () => {
    t.setStyle({
      color: '#00ffff',
      backgroundColor: '#319fffb9'
    });
    t.setScale(1.1);
  });
  
  t.on('pointerout', () => {
    t.setStyle({
      color: '#ffffff',
      backgroundColor: '#6fbbfeb9'
    });
    t.setScale(1);
  });
      t.on('pointerdown', () => SoundManager.playClick());
      return t;
    };
    
    const label = this.add.text(centerX - 180, y + 10, '自定义 行 x 列', {
  fontSize: '17px',
  fontStyle: 'bold',
  color: '#ffffff',
  // 半透黑背景隔绝下方元素，避免文字与背景融合
  backgroundColor: '#6fbbfe00',
  // 内边距防止文字贴边，同时增加视觉隔离空间
  padding: { left: 8, right: 8, top: 3, bottom: 3 },
  // 保留阴影增强立体感
  shadow: { offsetX: 1, offsetY: 1, color: '#00000080', blur: 2 },
  // 提升层级确保在周围按钮/背景之上
  depth: this.uiDepth - 5
}).setOrigin(1, 0.5);
    
    const rowsMinus = makeBtn(centerX - 160, '−');
    const rowsText = this.add.text(centerX - 120, y + 10, '3', {
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ffffff',
      shadow: { offsetX: 1, offsetY: 1, color: '#00000080', blur: 2 }
    }).setOrigin(0.5);
    const rowsPlus = makeBtn(centerX - 80, '+');
    
    const cross = this.add.text(centerX - 40, y + 10, 'x', {
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffffff',
      shadow: { offsetX: 1, offsetY: 1, color: '#00000080', blur: 2 }
    }).setOrigin(0.5);
    
    const colsMinus = makeBtn(centerX, '−');
    const colsText = this.add.text(centerX + 40, y + 10, '3', {
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ffffff',
      shadow: { offsetX: 1, offsetY: 1, color: '#00000080', blur: 2 }
    }).setOrigin(0.5);
    const colsPlus = makeBtn(centerX + 80, '+');

    const clamp = (n) => Phaser.Math.Clamp(n | 0, 2, 30);
    const update = () => {
      rowsText.setText(String(this.selectedRows ?? 3));
      colsText.setText(String(this.selectedCols ?? 3));
      const b = this.diffButtons['CUSTOM'];
      if (b) b.setText(`自定义 ${this.selectedRows ?? 3}x${this.selectedCols ?? 3}`);
    };
    const bump = (type, d) => {
      const r = this.selectedRows ?? 3;
      const c = this.selectedCols ?? 3;
      if (type === 'r') this.selectedRows = clamp(r + d);
      else this.selectedCols = clamp(c + d);
      this.applyDiffHighlight('CUSTOM');
      update();
    };
    rowsMinus.on('pointerdown', () => bump('r', -1));
    rowsPlus.on('pointerdown', () => bump('r', +1));
    colsMinus.on('pointerdown', () => bump('c', -1));
    colsPlus.on('pointerdown', () => bump('c', +1));
    
    this.customUI = { label, rowsMinus, rowsText, rowsPlus, cross, colsMinus, colsText, colsPlus };
    update();
  }

  setDifficulty(key, rows, cols) {
    this.selectedRows = rows | 0;
    this.selectedCols = cols | 0;
    this.applyDiffHighlight(key);
    if (key === 'CUSTOM' && this.diffButtons['CUSTOM']) {
      this.diffButtons['CUSTOM'].setText(`自定义 ${this.selectedRows}x${this.selectedCols}`);
    }
  }

  applyDiffHighlight(key) {
  Object.values(this.diffButtons).forEach(btn => {
    if (!btn) return;
    const isCustom = btn._diffKey === 'CUSTOM';
    this.updateDifficultyButton(btn, false, isCustom);
  });
  
  const btn = this.diffButtons[key];
  if (btn) {
    const isCustom = key === 'CUSTOM';
    this.updateDifficultyButton(btn, true, isCustom);
  }
  this.selectedDiffKey = key;
}

  redrawThumbnails() {
    this.thumbNodes.forEach(n => n.destroy());
    this.thumbNodes = [];
    const W = this.cameras.main.width;
    // 自带图片缩略图起始Y=170（与“自带图片”标签间距30px，无遮挡）
    const builtinY = 190;
    // 自定义图片缩略图起始Y=390（与“已导入图片”标签间距65px，与加载提示间距25px，无遮挡）
    const customY = 375;

    const drawGrid = (items, startY, type) => {
      const gapX = 20;
      const thumbW = 120, thumbH = 80;
      let x = 80, y = startY;
      items.forEach(it => {
        const frame = this.add.rectangle(x + thumbW / 2, y + thumbH / 2, thumbW + 6, thumbH + 6, 0x000000, 0.25)
          .setStrokeStyle(2, type === 'builtin' ? 0x5bb8ff : 0xc18bff, 0.9)
          .setInteractive({ useHandCursor: true });
        const img = this.add.image(x + thumbW / 2, y + thumbH / 2, it.key)
          .setDisplaySize(thumbW, thumbH)
          .setInteractive({ useHandCursor: true });
        const name = this.add.text(x + thumbW / 2, y + thumbH + 16, it.name,
          {
            fontSize: '14px',
            fontStyle: 'bold',
            color: '#dddddd',
            shadow: { offsetX: 1, offsetY: 1, color: '#00000090', blur: 2 }
          }).setOrigin(0.5);

       const select = () => {
  // 存储选中的图片信息
  this.selectedImage = { 
    key: it.key, 
    name: it.name, 
    type 
  };

  // 重置所有缩略图的边框样式
  if (this.thumbNodes && this.thumbNodes.length) {
    this.thumbNodes.forEach(node => {
      if (node._isFrame) {
        node.setStrokeStyle(2, node._borderColor, 0.5);
      }
    });
  }

  // 设置当前选中项的边框样式（高亮）
  if (frame) {
    frame.setStrokeStyle(3, frame._borderColor, 1.0);
  }

  // 显示提示信息
  this.showToast(`已选择图片：${it.name || '未知图片'}`);
  
  // 播放点击音效
  if (SoundManager && typeof SoundManager.playClick === 'function') {
    SoundManager.playClick();
  }
};

        frame._isFrame = true;
        frame._borderColor = type === 'builtin' ? 0x5bb8ff : 0xc18bff;
        frame.on('pointerdown', select);
        img.on('pointerdown', select);
        name.setInteractive({ useHandCursor: true }).on('pointerdown', select);

        this.thumbNodes.push(frame, img, name);

        if (type === 'custom') {
          const delBtn = this.add.text(x + thumbW - 4, y + 4, '×', {
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#ff6666',
            backgroundColor: '#00000090',
            padding: { left: 4, right: 4, top: 2, bottom: 2 }
          }).setOrigin(1, 0).setInteractive({ useHandCursor: true })
            .on('pointerdown', (p, lx, ly, ev) => {
              ev?.stopPropagation?.();
              SoundManager.playClick();
              this.confirmDeleteCustom(it.id, it.name);
            });
          this.thumbNodes.push(delBtn);
        }

        x += thumbW + gapX;
        if (x + thumbW + gapX > W - 60) {
          x = 80;
          y += thumbH + 48;
        }
      });
    };

    drawGrid(this.BUILTINS.map(b => ({ key: b.key, name: b.name })), builtinY, 'builtin');
    const customs = this.customEntries.map(e => ({ key: `custom-${e.id}`, name: e.name, id: e.id }));
    drawGrid(customs, customY, 'custom');
  }

  confirmDeleteCustom(id, name) {
    const ok = window.confirm(`确认删除自定义图片：${name}？此操作不可恢复。`);
    if (!ok) return;
    this.deleteCustomEntry(id, name);
  }
  deleteCustomEntry(id, name) {
    const idx = this.customEntries.findIndex(e => e.id === id);
    if (idx < 0) return;
    const entry = this.customEntries[idx];
    this.customEntries.splice(idx, 1);
    this.saveCustomEntries(this.customEntries);
    const key = `custom-${entry.id}`;
    if (this.textures.exists(key)) this.textures.remove(key);
    if (this.selectedImage && this.selectedImage.key === key) {
      this.selectedImage = null;
      this.showToast('已删除该图片，选择已清空');
    } else {
      this.showToast(`已删除：${name}`);
    }
    this.redrawThumbnails();
  }

  readAndProcessImage(file, { maxDim = 1024, mime = 'image/jpeg', quality = 0.9 } = {}) {
    return this.readFileAsDataURL(file).then(dataUrl => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth, h = img.naturalHeight;
        if (!(w > 0 && h > 0)) return resolve({ dataUrl });
        const maxSide = Math.max(w, h);
        if (maxSide <= maxDim) return resolve({ dataUrl });
        const scale = maxDim / maxSide;
        const nw = Math.round(w * scale);
        const nh = Math.round(h * scale);
        const canvas = document.createElement('canvas');
        canvas.width = nw; canvas.height = nh;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, nw, nh);
        let compressed;
        try {
          compressed = canvas.toDataURL(mime, quality);
          if (!compressed) compressed = dataUrl;
        } catch { compressed = dataUrl; }
        resolve({ dataUrl: compressed });
      };
      img.onerror = () => resolve({ dataUrl });
      img.src = dataUrl;
    }));
  }
  readFileAsDataURL(file) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = rej;
      fr.readAsDataURL(file);
    });
  }

  tryStartGame() {
    if (!this.selectedImage) {
      this.showToast('请先选择图片');
      return;
    }
    const rows = this.selectedRows | 0;
    const cols = this.selectedCols | 0;
    if (rows < 2 || cols < 2) {
      this.showToast('请先选择难度（行列数）');
      return;
    }
    // 读取初始旋转设置
    const getRotateInit = () => {
      const saved = localStorage.getItem('jigsaw_rotate_init');
      return saved === null ? true : saved === 'true';
    };
    
    this.scene.start('Jigsaw', {
      rows, cols,
      imageKey: this.selectedImage.key,
      imageName: this.selectedImage.name,
      pieceMode: this.pieceMode,
      rotateInitially: getRotateInit()
    });
  }

  showToast(text, duration = 1400) {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const cx = W / 2, cy = H - 80;
    const bg = this.add.rectangle(cx, cy, 520, 42, 0x000000, 0.7)
      .setDepth(this.uiDepth).setScale(0.85);
    const label = this.add.text(cx, cy, text, {
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffffff',
      shadow: { offsetX: 1, offsetY: 1, color: '#00000080', blur: 2 }
    }).setOrigin(0.5).setDepth(this.uiDepth + 1).setAlpha(0);
    this.tweens.add({ targets: bg, scale: 1, duration: 280, ease: 'Back.Out' });
    this.tweens.add({ targets: label, alpha: 1, duration: 320, ease: 'Power2' });
    this.time.delayedCall(duration - 300, () => {
      this.tweens.add({
        targets: [bg, label],
        alpha: 0, duration: 300,
        onComplete: () => { bg.destroy(); label.destroy(); }
      });
    });
  }

  loadCustomEntries() {
    try {
      const raw = localStorage.getItem(this.CUSTOM_STORE_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }
  saveCustomEntries(arr) {
    try {
      localStorage.setItem(this.CUSTOM_STORE_KEY, JSON.stringify(arr));
      return true;
    } catch { return false; }
  }
}