import { LeaderboardStore } from '../stores/LeaderboardStore.js';
import { generatePieces } from '../utils/PieceShapeFactory.js';
import { SoundManager } from '../sound/SoundManager.js';
import { ChallengeProgressStore } from '../stores/ChallengeProgressStore.js';

// 统一样式配置：确保文字美观性、一致性，避免重复代码
const STYLE_CONFIG = {
  // 基础字体：适配中英文，提升跨设备显示效果
  baseFont: "'PingFang SC', 'Microsoft YaHei', Arial, sans-serif",
  // 文字阴影：增强立体感，避免与深色背景融合
  textShadow: { offsetX: 1, offsetY: 1, color: '#00000080', blur: 2, fill: true },
  titleShadow: { offsetX: 2, offsetY: 2, color: '#00000090', blur: 4, fill: true },
  // 颜色体系：区分功能模块，提升视觉辨识度
  color: {
    // 文本颜色（需要字符串格式）
    textNormal: '#ffffff', // 普通文字色（白色）
    textSecondary: '#d7dc6eff', // 次要文字色
    // 边框/图形颜色（需要数值格式）
    borderNormal: 0xffffff, // 未拖拽时白色边框
    borderDragActive: 0x7cc7ff, // 拖拽时浅蓝色边框
    // 其他颜色（根据使用场景选择格式）
    primary: '#7cc7ff',    // 主色调（顶部文本、普通提示）
    accent: '#ffd700',     // 强调色（标题、关键按钮）
    success: '#66ff66',    // 成功色
    danger: '#ff6666',     // 危险色
    buttonNormal: '#ffffffff',// 按钮常态色
    buttonHover: '#ffffffff',// 按钮悬浮色
    buttonCancel: '#ff8080'// 取消按钮色
  },
  // 按钮样式：统一尺寸、内边距
  button: {
    fontSize: '16px',
    padding: { left: 12, right: 12, top: 5, bottom: 5 },
    bgNormal: '#6fbbfeb9',
    bgHover: '#2e87d5b9',
    borderRadius: 4
  },
  // 弹窗样式：统一面板、文字比例
  modal: {
    titleSize: '26px',
    msgSize: '20px',
    padding: 30,
    bgColor: 0x101010,
    borderColor: 0x3a6ea5,
    borderWidth: 2
  },
  // 倒计时警告阈值（秒）
  countdownWarnThreshold: 5
};

export class Jigsaw extends Phaser.Scene {
  constructor() {
    super('Jigsaw');
    this.uiDepth = 10000; // 统一UI层级基准，确保文字不被底层元素遮挡
  }

  init(data) {
    const toInt = (v, d) => {
      const n = parseInt(v ?? '', 10);
      return Number.isFinite(n) ? n : d;
    };
    this.rows = Math.max(2, toInt(data?.rows, 3));
    this.cols = Math.max(2, toInt(data?.cols, 3));
    this.imageKey = data?.imageKey ?? 'phoro';
    this.imageName = data?.imageName ?? this.imageKey;
    this.pieceMode = data?.pieceMode === 'QUAD' ? 'QUAD' : 'RECT';
    // 接收初始旋转设置参数
    this.rotateInitially = data?.rotateInitially ?? true;

    // 闯关模式参数（新增核心配置）
    this.challengeMode = !!data?.challengeMode;
    this.challengeLevel = data?.challengeLevel || null;
    this.timeLimit = this.challengeMode ? (data?.timeLimit || 30) : null;
    this.timer = this.challengeMode ? this.timeLimit : 0;
    this.timerRunning = true;
    this._challengeFailed = false;
    this._challengeWinHandled = false;

    // 拼图基础配置
    this.shapeSeed = data?.restoreData?.scene?.shapeSeed ?? (Date.now() ^ (Math.random() * 1e9)) | 0;
    if (data.restoreData) this._restoreData = data.restoreData;

    this.depthConfig = { solved: 200, unsolvedBase: 400, dragTopStart: 1800 };
    this._zCounter = this.depthConfig.dragTopStart;

    this._savedTextureKeys = [];
    this.groups = new Map();
    this.pieceToGroup = new Map();
    this.nextGroupId = 1;

    this.currentDragGroup = null;
    this.dragAnchor = null;
    this.gridMap = new Map();

    // 弹窗容器（统一管理，避免重叠）
    this.previewOverlay = null;
    this.restartOverlay = null;
    this.winOverlay = null;
    this.failOverlay = null;

    this._hoverPiece = null;
    this._rotateGuard = false;

    // 场景销毁时清理资源
    this.events.once('shutdown', () => {
      SoundManager.resetForSceneChange({ stopBGM: true });
      this.cleanupTextures();
    });
    this.events.once('destroy', () => {
      SoundManager.resetForSceneChange({ stopBGM: true });
      this.cleanupTextures();
    });
  }

  preload() {
    // 预加载缺失的基础图片资源
    if (!this.textures.exists(this.imageKey) && this.imageKey === 'phoro') {
      this.load.image('phoro', 'assets/phoro.jpg');
    }

    // 预加载音频资源（避免播放时卡顿）
    const audios = [
      { key: 'bgm_jigsaw', urls: ['assets/audio/bgm_jigsaw.mp3'] },
      { key: 'click', urls: ['assets/audio/click.wav'] },
      { key: 'piece_pick', urls: ['assets/audio/piece_pick.wav'] },
      { key: 'piece_drop', urls: ['assets/audio/piece_drop.wav'] },
      { key: 'piece_merge', urls: ['assets/audio/piece_merge.wav'] },
      { key: 'piece_rotate', urls: ['assets/audio/piece_rotate.wav'] },
      { key: 'win', urls: ['assets/audio/win.wav'] }
    ];
    audios.forEach(a => { if (!this.sound.get(a.key)) this.load.audio(a.key, a.urls); });
  }

  create() {
    SoundManager.init(this);
    SoundManager.resetForSceneChange({ stopBGM: true });
    SoundManager.playBGM('bgm_jigsaw');

    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const centerX = W / 2; // 屏幕水平中心（统一复用）

    // 0. 添加浅灰色透明背景（放在最底层，在所有游戏元素之下）
  this.add.rectangle(centerX, H / 2, W, H, 0xd0d0d0, 0.7)  // 浅灰色(#d0d0d0) 30%透明度
    .setDepth(-10); // 设置为负值，确保在所有游戏元素之下

    // 1. 基础尺寸计算（拼图容器大小）
    const MAX_FRAME_W = 680;
    const MAX_FRAME_H = 460;
    const img = this.textures.get(this.imageKey).getSourceImage();
    const scale = Math.min(MAX_FRAME_W / img.width, MAX_FRAME_H / img.height);
    this.puzzleW = Math.round(img.width * scale);
    this.puzzleH = Math.round(img.height * scale);

    // 2. 顶部UI区域（文字居中，避免重叠）
    const topUIPosY = 18; // 顶部UI基准Y坐标
    const topUISpacing = 28; // 顶部文字垂直间距

    // 2.1 图片名称（左上，垂直居中）
    this.add.text(24, topUIPosY, `图片: ${this.imageName}`, {
      fontSize: '20px',
      color: STYLE_CONFIG.color.primary,
      fontFamily: STYLE_CONFIG.baseFont,
      shadow: STYLE_CONFIG.textShadow
    }).setOrigin(0, 0.5); // 左对齐+垂直居中，避免文字偏移

    // 2.2 计时文本（左上，图片名称下方）
    const timerLabel = this.challengeMode ? '剩余' : '用时';
    this.timerText = this.add.text(24, topUIPosY + topUISpacing, `${timerLabel}: ${this.timer.toFixed(2)} 秒`, {
      fontSize: '22px',
      color: STYLE_CONFIG.color.textNormal,
      fontFamily: STYLE_CONFIG.baseFont,
      shadow: STYLE_CONFIG.textShadow,
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    // 2.3 右侧功能按钮组（统一样式，避免文字遮挡）
    const rightBtnBaseX = W - 470; // 右侧按钮基准X坐标
    const rightBtnSpacing = 120; // 右侧按钮水平间距
    const btnStyle = {
      fontSize: STYLE_CONFIG.button.fontSize,
      color: STYLE_CONFIG.color.buttonNormal,
      backgroundColor: STYLE_CONFIG.button.bgNormal,
      padding: STYLE_CONFIG.button.padding,
      borderRadius: STYLE_CONFIG.button.borderRadius,
      fontFamily: STYLE_CONFIG.baseFont
    };

    // 预览按钮
    const previewBtn = this.createStyledButton(
      rightBtnBaseX, topUIPosY, '预览原图 (P)', btnStyle,
      () => { SoundManager.playClick(); this.togglePreviewOverlay(); }
    );

    // 重新开始按钮
    const restartBtn = this.createStyledButton(
      rightBtnBaseX + rightBtnSpacing, topUIPosY, '重新开始 (R)', btnStyle,
      () => { SoundManager.playClick(); this.showRestartOverlay(); }
    );

    // 模式提示（重新开始按钮右侧）
    this.add.text(rightBtnBaseX + rightBtnSpacing * 2, topUIPosY, 
      this.pieceMode === 'QUAD' ? '模式: 四边形' : '模式: 矩形', {
        ...btnStyle,
        color: STYLE_CONFIG.color.textSecondary // 次要文字用浅色调
      }).setOrigin(0, 0.5);

    // 返回菜单按钮（最右侧，垂直居中）
    const menuBtnLabel = this.challengeMode ? '关卡选择' : '主菜单';
    const menuBtn = this.createStyledButton(
      W - 110, topUIPosY, menuBtnLabel, btnStyle,
      () => {
        SoundManager.playClick();
        this.scene.start(this.challengeMode ? 'ChallengeMenu' : 'Select');
      }
    );

    // 操作提示（右侧按钮下方，文字居中）
    this.add.text(W - 300, topUIPosY + topUISpacing, '提示: 空格旋转（组）', {
      fontSize: '16px',
      color: STYLE_CONFIG.color.textSecondary,
      fontFamily: STYLE_CONFIG.baseFont,
      shadow: STYLE_CONFIG.textShadow
    }).setOrigin(0, 0.5);

    // 2.4 导出按钮（仅普通模式显示，避免闯关模式作弊）
    if (!this.challengeMode) {
      this.createStyledButton(24, topUIPosY + topUISpacing * 2, '导出进度', {
        ...btnStyle,
        fontSize: '18px' // 稍大字体，突出功能
      }, () => {
        SoundManager.playClick();
        this.handleExportProgress();
      }).setOrigin(0, 0.5);
    }

    // 3. 键盘快捷键（保持原功能）
    this.input.keyboard.on('keydown-P', () => this.togglePreviewOverlay());
    this.input.keyboard.on('keydown-R', () => this.showRestartOverlay());
    this.input.keyboard.on('keydown-ESC', () => {
      this.scene.start(this.challengeMode ? 'ChallengeMenu' : 'Select');
    });

    // 4. 生成拼图（核心逻辑，保持原功能）
    this.generatePuzzle();

    // 5. 拼图交互事件（保持原逻辑，优化文字反馈）
    this.initPuzzleInteractions();
  }

  /**
   * 创建带交互效果的Styled按钮（文字居中，hover反馈）
   * @param {number} x - 按钮X坐标
   * @param {number} y - 按钮Y坐标
   * @param {string} text - 按钮文字
   * @param {object} style - 按钮样式
   * @param {Function} onClick - 点击回调
   * @returns {Phaser.GameObjects.Text} 按钮文本对象
   */
  createStyledButton(x, y, text, style, onClick) {
    const btn = this.add.text(x, y, text, style)
      .setOrigin(0, 0.5) // 左对齐+垂直居中
      .setInteractive({ useHandCursor: true })
      .setDepth(this.uiDepth);

    // 按钮hover交互效果
    btn.on('pointerover', () => {
      btn.setColor(STYLE_CONFIG.color.buttonHover);
      btn.setBackgroundColor(STYLE_CONFIG.button.bgHover);
      btn.setScale(1.05); // 轻微缩放，增强交互感
    });
    btn.on('pointerout', () => {
      btn.setColor(style.color || STYLE_CONFIG.color.buttonNormal);
      btn.setBackgroundColor(STYLE_CONFIG.button.bgNormal);
      btn.setScale(1);
    });
    btn.on('pointerdown', onClick);

    return btn;
  }

  /**
   * 生成拼图（保持原逻辑，优化文字相关的视觉反馈）
   */
  generatePuzzle() {
    const restoring = !!this._restoreData;
    const { piecesMeta, cellW, cellH } = generatePieces({
      scene: this,
      imageKey: this.imageKey,
      rows: this.rows,
      cols: this.cols,
      puzzleW: this.puzzleW,
      puzzleH: this.puzzleH,
      mode: this.pieceMode,
      quadJitterRatio: 0.28,
      minCellPortion: 0.15,
      seed: this.shapeSeed
    });
    this.cellW = cellW;
    this.cellH = cellH;
    piecesMeta.forEach(m => this._savedTextureKeys.push(m.key));

    // 拼图顺序（打乱/恢复）
    let orderMeta = restoring ? piecesMeta : [...piecesMeta].sort(() => Math.random() - 0.5);

    // 初始化拼图元素
    this.pieces = [];
    this.gridMap.clear();
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const topUI = 70;
    const pad = 8;
    const margin = 6;
    const maxTry = 200;
    const occupiedAreas = [];

    // 随机位置生成（避免拼图重叠）
    const getRandomPos = (w, h) => {
      const minX = pad;
      const maxX = W - pad - w;
      const minY = topUI;
      const maxY = H - pad - h;
      return { x: Phaser.Math.FloatBetween(minX, maxX), y: Phaser.Math.FloatBetween(minY, maxY) };
    };

    // 检查拼图位置是否重叠
    const isNoOverlap = (rect) =>
      occupiedAreas.every(r => rect.x2 < r.x1 || rect.x1 > r.x2 || rect.y2 < r.y1 || rect.y1 > r.y2);

    // 创建拼图元素
    orderMeta.forEach((meta, idx) => {
      let centerX, centerY;

      // 恢复模式：拼图居中；正常模式：随机分布
      if (restoring) {
        centerX = W / 2;
        centerY = H / 2;
      } else {
        let pos = null;
        // 尝试生成不重叠的位置
        for (let t = 0; t < maxTry; t++) {
          const { x, y } = getRandomPos(meta.w, meta.h);
          const rect = { 
            x1: x - margin, 
            y1: y - margin, 
            x2: x + meta.w + margin, 
            y2: y + meta.h + margin 
          };
          if (isNoOverlap(rect)) {
            pos = { x, y, rect };
            break;
          }
        }
        // 兜底：即使重叠也显示（避免死循环）
        if (!pos) {
          const { x, y } = getRandomPos(meta.w, meta.h);
          pos = { x, y, rect: { x1: x, y1: y, x2: x + meta.w, y2: y + meta.h } };
        }
        occupiedAreas.push(pos.rect);
        centerX = pos.x + meta.w / 2;
        centerY = pos.y + meta.h / 2;
      }

      // 创建拼图容器（文字边框居中）
      const piece = this.add.container(centerX, centerY).setDepth(this.depthConfig.unsolvedBase + idx);
      const imgObj = this.add.image(0, 0, meta.key).setOrigin(0.5); // 图片居中
      piece.add(imgObj);

      // 拼图边框（文字样式统一）
      const border = this.add.graphics();
      piece.add(border);
      border._pointsCentered = meta.polyPoints.map(p => ({ x: p.x - meta.w / 2, y: p.y - meta.h / 2 }));
      border._draw = (colorName = 'normal', lw = 1, alpha = 0.6) => {
        border.clear();
        const color = typeof colorName === 'string' ? this.getBorderColor(colorName) : colorName;
        border.lineStyle(lw, color, alpha);
        const pts = border._pointsCentered;
        border.beginPath();
        border.moveTo(pts[0].x, pts[0].y);
        pts.slice(1).forEach(p => border.lineTo(p.x, p.y));
        border.closePath();
        border.strokePath();
      };
      border._draw(); // 初始边框样式

      // 拼图交互区域（多边形碰撞）
      const poly = new Phaser.Geom.Polygon(border._pointsCentered.flatMap(p => [p.x, p.y]));
      piece.setSize(meta.w, meta.h);
      piece.setInteractive(poly, (polygon, localX, localY, go) => {
        const dx = localX - meta.w / 2;
        const dy = localY - meta.h / 2;
        const rot = go.rotation;
        const cosR = Math.cos(-rot), sinR = Math.sin(-rot);
        const rx = dx * cosR - dy * sinR;
        const ry = dx * sinR + dy * cosR;
        return Phaser.Geom.Polygon.Contains(polygon, rx, ry);
      });
      this.input.setDraggable(piece, true);

      // 拼图数据（用于后续逻辑）
      const pieceId = `${meta.gx}_${meta.gy}`;
      piece.setData({
        pieceId,
        gx: meta.gx,
        gy: meta.gy,
        w: meta.w,
        h: meta.h,
        anchorXCenter: meta.anchorX + meta.w / 2,
        anchorYCenter: meta.anchorY + meta.h / 2,
        solved: false,
        border,
        aabbByRot: this.calcPieceAABBByRot(border._pointsCentered), // 预计算旋转后的AABB
        rot: 0
      });

      this.gridMap.set(this.gridKey(meta.gx, meta.gy), piece);
      this.pieces.push(piece);
    });

    // 正常模式：根据rotateInitially参数决定是否随机旋转拼图
    if (!restoring && this.rotateInitially) {
      this.pieces.forEach(p => {
        const rSteps = Phaser.Math.Between(0, 3);
        if (rSteps) {
          p.setData('rot', rSteps);
          this.applyPieceRotation(p);
        }
      });
    }

    // 创建拼图组（初始每个拼图一个组）
    this.pieces.forEach(p => this.createGroup([p]));
  }

  /**
   * 初始化拼图交互事件（拖拽、旋转、合并）
   */
  initPuzzleInteractions() {
    // 鼠标悬停：标记当前悬停的拼图
    this.input.on('gameobjectover', (_ptr, go) => { this._hoverPiece = go; });
    this.input.on('gameobjectout', (_ptr, go) => { if (this._hoverPiece === go) this._hoverPiece = null; });

    // 空格旋转：旋转当前悬停的拼图组
    // 第一关（challengeLevel === 1）时禁用旋转功能
    if (!(this.challengeMode && this.challengeLevel === 1)) {
      this.input.keyboard.on('keydown-SPACE', () => {
        if (this._rotateGuard || !this._hoverPiece) return;
        const group = this.pieceToGroup.get(this._hoverPiece);
        if (!group) return;

        this._rotateGuard = true;
        const newRot = (group.rotSteps + 1) % 4;
        SoundManager.playSFX('piece_rotate');
        this.rotateGroup(group, newRot);

        // 旋转后检查是否完成拼图
        if (this.isAllConnected() && this.allRotationCorrect()) {
          this.lockAllAndWin();
        }
        this.time.delayedCall(0, () => { this._rotateGuard = false; });
      });
    }

    // 拖拽开始：提升当前组层级，高亮边框
    this.input.on('dragstart', (_p, go) => {
      const group = this.pieceToGroup.get(go);
      this.currentDragGroup = group;
      this.dragAnchor = go;
      SoundManager.playSFX('piece_pick');

      // 提升层级，避免被其他拼图遮挡
      let baseDepth = this._zCounter;
      group.members.forEach(m => {
        m.setDepth(baseDepth++);
        this.drawBorderColor(m, 'dragActive', 2, 0.9); // 拖拽时浅蓝色边框
      });
      this._zCounter = baseDepth;
      this.enterFocus([...group.members]);
    });

    // 拖拽中：约束移动范围，更新重叠对比
    this.input.on('drag', (_p, go, dragX, dragY) => {
      const group = this.currentDragGroup;
      if (!group) return;

      // 计算拖拽偏移量
      const dx = dragX - go.x;
      const dy = dragY - go.y;
      const W = this.cameras.main.width;
      const H = this.cameras.main.height;
      const [constrainedDx, constrainedDy] = this.constrainGroupMove(group, dx, dy, W, H, 70, 8);

      // 应用约束后的移动
      group.members.forEach(m => {
        if (!m.getData('solved')) {
          m.x += constrainedDx;
          m.y += constrainedDy;
        }
      });

      // 更新重叠拼图的透明度和边框（增强视觉反馈）
      this.updateOverlapContrast([...group.members]);
    });

    // 拖拽结束：尝试合并拼图，恢复样式
    this.input.on('dragend', () => {
      const group = this.currentDragGroup;
      if (!group) return;

      // 恢复边框样式
      group.members.forEach(m => {
        this.drawBorderColor(m, 'normal', 1, 0.6);
      });

      // 尝试合并相邻拼图
      const mergeResult = this.tryMagnetJoin(group);
      if (mergeResult.merged) {
        SoundManager.playSFX('piece_merge', { maxDurationMs: 2000 });
      } else {
        SoundManager.playSFX('piece_drop');
      }

      // 退出聚焦状态
      this.exitFocus();

      // 检查是否完成拼图
      if (this.isAllConnected() && this.allRotationCorrect()) {
        this.lockAllAndWin();
      }

      this.currentDragGroup = null;
      this.dragAnchor = null;
    });

    // 恢复存档（如果有）
    if (this._restoreData) {
      try {
        this.restorePuzzleState(this._restoreData);
      } catch (e) {
        console.warn('[restorePuzzleState] 存档恢复失败：', e);
        this.showToast('存档恢复失败（形状或索引不匹配）');
      }
      delete this._restoreData;
    }
  }

  /**
   * 更新计时（闯关模式倒计时警告，普通模式正计时）
   */
  update(_t, delta) {
    if (!this.timerRunning) return;

    if (this.challengeMode) {
      // 闯关模式：倒计时，小于警告阈值时变红色
      this.timer = Math.max(0, this.timer - delta / 1000);
      const timerColor = this.timer <= STYLE_CONFIG.countdownWarnThreshold 
        ? STYLE_CONFIG.color.danger 
        : STYLE_CONFIG.color.textNormal;
      
      this.timerText.setText(`剩余: ${this.timer.toFixed(2)} 秒`);
      this.timerText.setColor(timerColor);

      // 超时失败
      if (this.timer <= 0 && !this._challengeFailed && !this._challengeWinHandled) {
        this._challengeFailed = true;
        this.timerRunning = false;
        this.handleChallengeFail();
      }
    } else {
      // 普通模式：正计时，文字颜色不变
      this.timer += delta / 1000;
      this.timerText.setText(`用时: ${this.timer.toFixed(2)} 秒`);
    }
  }

  /* ---------------- 导出 / 导入（保持原功能，优化文字提示） ---------------- */
  handleExportProgress() {
    if (this.challengeMode) return; // 闯关模式禁用导出

    try {
      const progressData = this.encodeGameProgress();
      //  Electron环境：调用原生保存
      if (window.electronAPI?.saveFile) {
        window.electronAPI.saveFile({
          defaultName: 'puzzle_progress.json',
          content: JSON.stringify(progressData, null, 2)
        });
      } else {
        // 浏览器环境：下载文件
        const blob = new Blob([JSON.stringify(progressData, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'puzzle_progress.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      this.showToast('导出成功！');
    } catch (error) {
      console.error('[handleExportProgress] 导出失败：', error);
      this.showToast('导出失败，请重试');
    }
  }

  encodeGameProgress() {
    // 编码拼图进度（保持原逻辑）
    const groupEntries = Array.from(this.groups.entries()).map(([id, g]) => 
      [id, Array.from(g.members).map(p => p.getData('pieceId'))]
    );

    const piecesData = this.pieces.map(p => ({
      id: p.getData('pieceId'),
      gx: p.getData('gx'),
      gy: p.getData('gy'),
      x: p.x,
      y: p.y,
      rot: p.getData('rot'),
      groupId: this.pieceToGroup.get(p)?.id ?? null
    }));

    return {
      version: 2,
      scene: {
        rows: this.rows,
        cols: this.cols,
        imageKey: this.imageKey,
        imageName: this.imageName,
        pieceMode: this.pieceMode,
        timer: this.challengeMode ? (this.timeLimit - this.timer) : this.timer,
        shapeSeed: this.shapeSeed
      },
      pieces: piecesData,
      groups: Object.fromEntries(groupEntries)
    };
  }

  restorePuzzleState(saveData) {
    // 恢复拼图状态（保持原逻辑，优化文字提示）
    const isV2 = saveData.version >= 2;
    const pieceMapById = new Map(this.pieces.map(p => [p.getData('pieceId'), p]));

    // 恢复拼图位置和旋转
    if (isV2 && Array.isArray(saveData.pieces)) {
      saveData.pieces.forEach(st => {
        const pid = st.id || `${st.gx}_${st.gy}`;
        const piece = pieceMapById.get(pid);
        if (piece) {
          piece.x = st.x;
          piece.y = st.y;
          piece.setData('rot', st.rot || 0);
          this.applyPieceRotation(piece);
        }
      });
    } else if (!isV2 && Array.isArray(saveData.pieces)) {
      // 兼容旧版本存档
      saveData.pieces.forEach((st, idx) => {
        const piece = this.pieces[idx];
        if (piece) {
          piece.x = st.x;
          piece.y = st.y;
          piece.setData('rot', st.rot || 0);
          this.applyPieceRotation(piece);
        }
      });
    }

    // 恢复拼图组
    this.groups.clear();
    this.pieceToGroup.clear();

    if (saveData.groups && typeof saveData.groups === 'object') {
      Object.entries(saveData.groups).forEach(([gidStr, pieceIds]) => {
        const gid = Number(gidStr);
        const members = new Set();

        if (isV2 && Array.isArray(pieceIds)) {
          pieceIds.forEach(pid => {
            const p = pieceMapById.get(pid);
            if (p) members.add(p);
          });
        } else if (!isV2 && Array.isArray(pieceIds)) {
          pieceIds.forEach(idx => {
            const p = this.pieces[idx];
            if (p) members.add(p);
          });
        }

        if (members.size === 0) return;
        const group = { 
          id: gid, 
          members, 
          rotSteps: Array.from(members)[0].getData('rot') || 0 
        };
        this.groups.set(gid, group);
        members.forEach(p => this.pieceToGroup.set(p, group));
      });
    } else {
      // 无组数据：每个拼图单独成组
      this.pieces.forEach(p => this.createGroup([p]));
    }

    // 恢复计时
    if (!this.challengeMode) {
      this.timer = saveData.scene?.timer || 0;
      this.timerText.setText(`用时: ${this.timer.toFixed(2)} 秒`);
    } else {
      this.timer = this.timeLimit; // 闯关模式恢复时重置倒计时
    }
    this.timerRunning = true;
  }

  loadProgressFromData(data) {
    if (!data || !data.scene || !Array.isArray(data.pieces)) {
      throw new Error('存档无效：缺少必要字段');
    }
    this.scene.restart({ ...data.scene, restoreData: data });
  }

  /* ---------------- 组 / 旋转 / 磁吸（保持原功能，优化文字相关视觉） ---------------- */
  gridKey(gx, gy) { return `${gx},${gy}`; }

  createGroup(members) {
    const id = this.nextGroupId++;
    const group = {
      id,
      members: new Set(members),
      rotSteps: (members[0]?.getData('rot') || 0)
    };
    this.groups.set(id, group);
    members.forEach(p => this.pieceToGroup.set(p, group));
    return group;
  }

  mergeGroups(groupA, groupB) {
    if (!groupA || !groupB || groupA.id === groupB.id) return groupA || groupB;

    // 合并B到A
    groupB.members.forEach(p => {
      groupA.members.add(p);
      this.pieceToGroup.set(p, groupA);
    });
    this.groups.delete(groupB.id);
    return groupA;
  }

  rotateGroup(group, newRotSteps) {
    if (!group) return;
    const deltaRot = (newRotSteps - group.rotSteps + 4) % 4;
    if (deltaRot === 0) return;

    // 计算组中心（旋转轴心）
    const center = Array.from(group.members).reduce((acc, p) => {
      acc.x += p.x;
      acc.y += p.y;
      return acc;
    }, { x: 0, y: 0 });
    center.x /= group.members.size;
    center.y /= group.members.size;

    // 应用旋转
    const rad = deltaRot * Math.PI / 2;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    group.members.forEach(p => {
      const dx = p.x - center.x;
      const dy = p.y - center.y;
      // 旋转公式
      p.x = center.x + dx * cos - dy * sin;
      p.y = center.y + dx * sin + dy * cos;
      // 更新旋转数据
      p.setData('rot', (p.getData('rot') + deltaRot) % 4);
      this.applyPieceRotation(p);
    });

    group.rotSteps = newRotSteps;
  }

  applyPieceRotation(piece) {
    // 应用拼图旋转（保持原逻辑）
    piece.setRotation((piece.getData('rot') || 0) * Math.PI / 2);
  }

  calcPieceAABBByRot(points) {
    // 预计算拼图4个旋转状态的AABB（轴对齐包围盒）
    const aabbList = [];
    for (let rotStep = 0; rotStep < 4; rotStep++) {
      const rad = rotStep * Math.PI / 2;
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;

      points.forEach(pt => {
        const rx = pt.x * Math.cos(rad) - pt.y * Math.sin(rad);
        const ry = pt.x * Math.sin(rad) + pt.y * Math.cos(rad);
        minX = Math.min(minX, rx);
        maxX = Math.max(maxX, rx);
        minY = Math.min(minY, ry);
        maxY = Math.max(maxY, ry);
      });

      aabbList.push({ minX, maxX, minY, maxY });
    }
    return aabbList;
  }

  constrainGroupMove(group, dx, dy, W, H, topUI, pad) {
    // 约束组移动范围（避免超出屏幕）
    let minDx = -Infinity, maxDx = Infinity;
    let minDy = -Infinity, maxDy = Infinity;

    group.members.forEach(p => {
      const rot = p.getData('rot') || 0;
      const aabb = p.getData('aabbByRot')[rot];
      const x = p.x;
      const y = p.y;

      // 计算X轴约束
      const leftBound = pad - aabb.minX;
      const rightBound = W - pad - aabb.maxX;
      minDx = Math.max(minDx, leftBound - x);
      maxDx = Math.min(maxDx, rightBound - x);

      // 计算Y轴约束
      const topBound = topUI - aabb.minY;
      const bottomBound = H - pad - aabb.maxY;
      minDy = Math.max(minDy, topBound - y);
      maxDy = Math.min(maxDy, bottomBound - y);
    });

    // 应用约束
    return [
      Phaser.Math.Clamp(dx, minDx, maxDx),
      Phaser.Math.Clamp(dy, minDy, maxDy)
    ];
  }

  // ... 辅助方法：获取正确格式的边框颜色
  getBorderColor(colorName) {
    // 确保边框颜色始终使用数值格式
    const colorMap = {
      normal: 0xffffff, // 未拖拽时白色边框
      dragActive: 0x7cc7ff, // 拖拽时浅蓝色边框
      success: 0x66ff66, // 成功色
      danger: 0xff6666 // 危险色
    };
    return colorMap[colorName] || 0xffffff;
  }

  drawBorderColor(piece, colorName, lineWidth = 1, alpha = 0.6) {
    // 绘制拼图边框（确保使用正确的颜色格式）
    const border = piece.getData('border');
    if (border?._draw) {
      const color = typeof colorName === 'string' ? this.getBorderColor(colorName) : colorName;
      border._draw(color, lineWidth, alpha);
    }
  }

  sameRotation(pieceA, pieceB) {
    // 检查两个拼图旋转状态是否一致
    return (pieceA.getData('rot') || 0) === (pieceB.getData('rot') || 0);
  }

  allRotationCorrect() {
    // 检查所有拼图是否旋转正确（0度）
    return this.pieces.every(p => (p.getData('rot') || 0) === 0);
  }

  computeBaseCenterOffset(pieceA, pieceB) {
    // 计算两个拼图的基准中心偏移
    const aAnchorX = pieceA.getData('anchorXCenter');
    const aAnchorY = pieceA.getData('anchorYCenter');
    const bAnchorX = pieceB.getData('anchorXCenter');
    const bAnchorY = pieceB.getData('anchorYCenter');

    if (aAnchorX == null || aAnchorY == null || bAnchorX == null || bAnchorY == null) {
      return [null, null];
    }
    return [bAnchorX - aAnchorX, bAnchorY - aAnchorY];
  }

  tryMagnetJoin(group) {
    // 尝试磁吸合并相邻拼图（保持原逻辑）
    if (!group) return { merged: false };
    const baseSize = Math.min(this.cellW, this.cellH);
    const MAG_PARALLEL = baseSize * 0.18; // 平行方向磁吸阈值
    const MAG_PERP = baseSize * 0.14;     // 垂直方向磁吸阈值
    let isMerged = false;
    let isChanged = true;

    while (isChanged) {
      isChanged = false;
      // 遍历组内所有拼图，检查相邻拼图
      for (const piece of group.members) {
        const gx = piece.getData('gx');
        const gy = piece.getData('gy');
        // 获取上下左右相邻的拼图
        const neighbors = [
          this.gridMap.get(this.gridKey(gx - 1, gy)),
          this.gridMap.get(this.gridKey(gx + 1, gy)),
          this.gridMap.get(this.gridKey(gx, gy - 1)),
          this.gridMap.get(this.gridKey(gx, gy + 1))
        ].filter(Boolean);

        for (const neighbor of neighbors) {
          const neighborGroup = this.pieceToGroup.get(neighbor);
          // 跳过自身组或旋转不一致的拼图
          if (!neighborGroup || neighborGroup.id === group.id || !this.sameRotation(piece, neighbor)) {
            continue;
          }

          // 计算预期偏移和实际偏移
          const [baseDx, baseDy] = this.computeBaseCenterOffset(piece, neighbor);
          if (baseDx == null) continue;

          const rotStep = piece.getData('rot') || 0;
          const rad = rotStep * Math.PI / 2;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);
          // 旋转后的预期偏移
          const expectedDx = baseDx * cos - baseDy * sin;
          const expectedDy = baseDx * sin + baseDy * cos;
          // 实际偏移
          const actualDx = neighbor.x - piece.x;
          const actualDy = neighbor.y - piece.y;

          // 检查是否在磁吸范围内
          const isCloseX = Math.abs(actualDx - expectedDx) <= (Math.abs(expectedDx) < 1e-6 ? MAG_PERP : MAG_PARALLEL);
          const isCloseY = Math.abs(actualDy - expectedDy) <= (Math.abs(expectedDy) < 1e-6 ? MAG_PERP : MAG_PARALLEL);

          if (isCloseX && isCloseY) {
            // 计算需要移动的偏移量
            const shiftX = expectedDx - actualDx;
            const shiftY = expectedDy - actualDy;
            // 移动相邻组的所有拼图
            neighborGroup.members.forEach(m => {
              m.x += shiftX;
              m.y += shiftY;
            });

            // 合并两组
            group = this.mergeGroups(group, neighborGroup);
            isMerged = true;
            isChanged = true;
            break; // 跳出循环，重新检查合并后的组
          }
        }
        if (isChanged) break;
      }
    }

    return { merged: isMerged };
  }

  isAllConnected() {
    // 检查所有拼图是否连接成一个组
    return this.groups.size === 1 && Array.from(this.groups.values())[0].members.size === this.pieces.length;
  }

  lockAllAndWin() {
    // 锁定所有拼图，标记完成（文字边框变成功色）
    this.pieces.forEach(p => {
      p.setData('solved', true);
      p.setDepth(this.depthConfig.solved);
      this.drawBorderColor(p, STYLE_CONFIG.color.success, 1, 0.95); // 成功色边框
    });

    this.currentDragGroup = null;
    this.dragAnchor = null;
    SoundManager.playSFX('win', { exclusive: true });
    this.winGame();
  }

  /* ---------------- 闯关失败处理（优化文字弹窗） ---------------- */
  handleChallengeFail() {
    if (!this.challengeMode || this.failOverlay) return;

    // 失败弹窗：文字居中，样式统一
    this.failOverlay = this.createModal({
      title: '闯关失败',
      message: '时间已用尽！请重试当前关卡',
      buttons: [{
        label: '返回关卡选择',
        onClick: () => {
          SoundManager.playClick();
          this.closeModal(this.failOverlay);
          this.scene.start('ChallengeMenu');
        },
        color: STYLE_CONFIG.color.buttonCancel
      }]
    });
  }

  /* ---------------- UI / 提示（优化文字居中、美观性） ---------------- */
  enterFocus(focusedPieces) {
    // 聚焦状态：非聚焦拼图半透明
    const focusedSet = new Set(focusedPieces);
    this.pieces.forEach(p => {
      this.setPieceAlpha(p, focusedSet.has(p) ? 1 : 0.6);
    });
  }

  exitFocus() {
    // 退出聚焦：恢复拼图透明度和边框
    this.pieces.forEach(p => {
      this.setPieceAlpha(p, 1);
      if (p.getData('solved')) {
        this.drawBorderColor(p, 'success', 1, 0.95);
      } else {
        this.drawBorderColor(p, 'normal', 1, 0.6);
      }
    });
  }

  setPieceAlpha(piece, alpha) {
    // 设置拼图透明度（包括图片和边框）
    piece.list.forEach(child => child.setAlpha(alpha));
  }

  updateOverlapContrast(focusedPieces) {
    // 更新重叠拼图的视觉对比（重叠部分变红色边框）
    const focusedSet = new Set(focusedPieces);
    const focusedBounds = focusedPieces.map(p => p.getBounds());

    this.pieces.forEach(p => {
      if (focusedSet.has(p)) return;

      const pieceBounds = p.getBounds();
      // 检查是否与聚焦拼图重叠
      const isOverlapping = focusedBounds.some(fb => 
        Phaser.Geom.Intersects.RectangleToRectangle(fb, pieceBounds)
      );

      if (p.getData('solved')) {
        // 已完成拼图：保持成功色
        this.setPieceAlpha(p, 1);
        this.drawBorderColor(p, 'success', 1, 0.95);
      } else if (isOverlapping) {
        // 重叠拼图：红色边框+低透明度
        this.setPieceAlpha(p, 0.45);
        this.drawBorderColor(p, 'danger', 1, 0.9);
      } else {
        // 非重叠拼图：正常样式
        this.setPieceAlpha(p, 0.6);
        this.drawBorderColor(p, 'normal', 1, 0.6);
      }
    });
  }

  togglePreviewOverlay() {
    // 切换原图预览弹窗（文字居中，图片居中）
    if (this.previewOverlay) {
      this.closeModal(this.previewOverlay);
      this.previewOverlay = null;
      return;
    }

    // 计算预览图缩放（适配弹窗）
    const img = this.textures.get(this.imageKey).getSourceImage();
    const previewScale = Math.min(this.puzzleW / img.width, this.puzzleH / img.height);

    // 创建预览弹窗
    this.previewOverlay = this.createModal({
      title: '',
      message: '',
      customContent: (cx, cy) => {
        // 预览图居中显示
        const previewImg = this.add.image(cx, cy - 10, this.imageKey)
          .setOrigin(0.5)
          .setScale(previewScale)
          .setDepth(this.uiDepth + 3);
        return [previewImg];
      },
      buttons: [{
        label: '关闭',
        onClick: () => {
          SoundManager.playClick();
          this.closeModal(this.previewOverlay);
          this.previewOverlay = null;
        }
      }],
      panelSize: { w: this.puzzleW + 40, h: this.puzzleH + 80 } // 弹窗大小适配图片
    });
  }

  showRestartOverlay() {
    // 重新开始弹窗（文字居中，按钮布局合理）
    if (this.restartOverlay) {
      this.closeModal(this.restartOverlay);
      this.restartOverlay = null;
    }

    const buttons = [
      {
        label: '同设置重开',
        onClick: () => {
          SoundManager.playClick();
          this.closeModal(this.restartOverlay);
          this.scene.restart({
            rows: this.rows,
            cols: this.cols,
            imageKey: this.imageKey,
            imageName: this.imageName,
            pieceMode: this.pieceMode,
            challengeMode: this.challengeMode,
            challengeLevel: this.challengeLevel,
            timeLimit: this.timeLimit
          });
        }
      },
      {
        label: this.challengeMode ? '返回关卡' : '返回选择',
        onClick: () => {
          SoundManager.playClick();
          this.closeModal(this.restartOverlay);
          this.scene.start(this.challengeMode ? 'ChallengeMenu' : 'Select');
        },
        color: STYLE_CONFIG.color.buttonCancel
      },
      {
        label: '取消',
        onClick: () => {
          SoundManager.playClick();
          this.closeModal(this.restartOverlay);
        }
      }
    ];

    this.restartOverlay = this.createModal({
      title: '重新开始',
      message: '请选择重开方式，当前进度将被重置',
      buttons
    });
  }

  winGame() {
    // 胜利处理（区分闯关模式和普通模式，文字居中）
    this.timerRunning = false;

    // 闯关模式胜利
    if (this.challengeMode) {
      if (this._challengeWinHandled) return;
      this._challengeWinHandled = true;

      // 记录闯关进度
      if (this.challengeLevel != null) {
        ChallengeProgressStore.markCompleted(this.challengeLevel);
      }

      const isLastLevel = this.challengeLevel >= 3;
      const winMessage = `剩余时间：${this.timer.toFixed(2)} 秒`;
      const buttons = [];

      // 返回关卡选择按钮
      buttons.push({
        label: '返回关卡选择',
        onClick: () => {
          SoundManager.playClick();
          this.closeModal(this.winOverlay);
          this.scene.start('ChallengeMenu');
        }
      });

      // 非最后一关：显示下一关按钮
      if (!isLastLevel) {
        buttons.push({
          label: '下一关',
          onClick: () => {
            SoundManager.playClick();
            this.closeModal(this.winOverlay);
            const nextLevel = this.challengeLevel + 1;
            // 下一关参数配置
            const nextLevelConfig = {
              2: { rows: 4, cols: 4, timeLimit: 60, imageKey: 'challenge_level2', imageName: '关卡2' },
              3: { rows: 5, cols: 5, timeLimit: 90, imageKey: 'challenge_level3', imageName: '关卡3' }
            }[nextLevel];

            // 根据关卡级别设置拼图模式：第三关为四边形，其他关卡为矩形
            const pieceMode = nextLevel === 3 ? 'QUAD' : 'RECT';
            
            this.scene.start('Jigsaw', {
              rows: nextLevelConfig.rows,
              cols: nextLevelConfig.cols,
              imageKey: this.textures.exists(nextLevelConfig.imageKey) ? nextLevelConfig.imageKey : 'phoro',
              imageName: nextLevelConfig.imageName,
              pieceMode: pieceMode,
              challengeMode: true,
              challengeLevel: nextLevel,
              timeLimit: nextLevelConfig.timeLimit
            });
          }
        });
      } else {
        // 最后一关：显示完成按钮
        buttons.push({
          label: '完成并返回',
          onClick: () => {
            SoundManager.playClick();
            this.closeModal(this.winOverlay);
            this.scene.start('ChallengeMenu');
          }
        });
      }

      // 创建胜利弹窗
      this.winOverlay = this.createModal({
        title: isLastLevel ? '全部关卡完成！' : '关卡完成！',
        message: winMessage,
        buttons
      });
      return;
    }

    // 普通模式胜利：记录排行榜
    try {
      LeaderboardStore.addRecord?.({
        rows: this.rows,
        cols: this.cols,
        imageKey: this.imageKey,
        imageName: this.imageName,
        seconds: this.timer
      });
    } catch (error) {
      console.error('[winGame] 记录排行榜失败：', error);
    }

    // 普通模式胜利弹窗
    this.winOverlay = this.createModal({
      title: '拼图完成！',
      message: `总用时：${this.timer.toFixed(2)} 秒`,
      buttons: [
        {
          label: '再来一局',
          onClick: () => {
            SoundManager.playClick();
            this.closeModal(this.winOverlay);
            this.scene.restart({
              rows: this.rows,
              cols: this.cols,
              imageKey: this.imageKey,
              imageName: this.imageName,
              pieceMode: this.pieceMode
            });
          }
        },
        {
          label: '返回选择',
          onClick: () => {
            SoundManager.playClick();
            this.closeModal(this.winOverlay);
            this.scene.start('Select');
          },
          color: STYLE_CONFIG.color.buttonCancel
        }
      ]
    });
  }

  /**
   * 创建统一风格的弹窗（文字居中，避免遮挡）
   * @param {object} options - 弹窗配置
   * @returns {Phaser.GameObjects.GameObject[]} 弹窗元素列表
   */
  createModal({ title, message, buttons = [], customContent, panelSize = {} }) {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const cx = W / 2; // 弹窗中心X
    const cy = H / 2; // 弹窗中心Y
    const panelW = panelSize.w ?? 560; // 弹窗宽度（默认560）
    const panelH = panelSize.h ?? 300; // 弹窗高度（默认300）
    const modalElements = [];

    // 1. 弹窗遮罩（半透明黑色，阻止底层交互）
    const mask = this.add.rectangle(cx, cy, W, H, 0x000000, 0.6)
      .setInteractive()
      .setDepth(this.uiDepth);
    modalElements.push(mask);

    // 2. 弹窗面板（深色背景，白色边框）
    const panel = this.add.rectangle(cx, cy, panelW, panelH, STYLE_CONFIG.modal.bgColor, 0.98)
      .setStrokeStyle(STYLE_CONFIG.modal.borderWidth, STYLE_CONFIG.modal.borderColor, 1)
      .setDepth(this.uiDepth + 1);
    modalElements.push(panel);

    // 3. 弹窗标题（顶部居中，强调色）
    const titleText = this.add.text(cx, cy - panelH / 2 + STYLE_CONFIG.modal.padding, title || '', {
      fontSize: STYLE_CONFIG.modal.titleSize,
      color: STYLE_CONFIG.color.accent,
      fontStyle: 'bold',
      fontFamily: STYLE_CONFIG.baseFont,
      shadow: STYLE_CONFIG.titleShadow
    }).setOrigin(0.5).setDepth(this.uiDepth + 2);
    modalElements.push(titleText);

    // 4. 弹窗消息（居中显示，自动换行）
    if (message) {
      const msgText = this.add.text(cx, cy, message, {
        fontSize: STYLE_CONFIG.modal.msgSize,
        color: STYLE_CONFIG.color.textNormal,
        fontFamily: STYLE_CONFIG.baseFont,
        shadow: STYLE_CONFIG.textShadow,
        align: 'center', // 文字居中对齐
        wordWrap: { width: panelW - STYLE_CONFIG.modal.padding * 2 } // 自动换行
      }).setOrigin(0.5).setDepth(this.uiDepth + 2);
      modalElements.push(msgText);
    }

    // 5. 自定义内容（如预览图）
    if (customContent && typeof customContent === 'function') {
      const customElements = customContent(cx, cy);
      if (Array.isArray(customElements)) {
        modalElements.push(...customElements);
      }
    }

    // 6. 弹窗按钮（居中排列，避免文字重叠）
    const btnCount = buttons.length;
    const btnSpacing = 20; // 按钮水平间距
    const btnMaxWidth = (panelW - STYLE_CONFIG.modal.padding * 2 - (btnCount - 1) * btnSpacing) / btnCount;
    const btnY = cy + panelH / 2 - STYLE_CONFIG.modal.padding; // 按钮Y坐标（底部偏上）

    buttons.forEach((btn, idx) => {
      // 计算按钮X坐标（水平居中排列）
      const btnX = cx - (panelW - STYLE_CONFIG.modal.padding * 2 - btnMaxWidth) / 2 + idx * (btnMaxWidth + btnSpacing);
      
      const btnText = this.add.text(btnX, btnY, btn.label, {
        fontSize: STYLE_CONFIG.button.fontSize,
        color: btn.color || STYLE_CONFIG.color.buttonNormal,
        backgroundColor: STYLE_CONFIG.button.bgNormal,
        padding: STYLE_CONFIG.button.padding,
        borderRadius: STYLE_CONFIG.button.borderRadius,
        fontFamily: STYLE_CONFIG.baseFont,
        align: 'center' // 按钮文字居中
      }).setOrigin(0, 0.5) // 左对齐+垂直居中
        .setDepth(this.uiDepth + 2)
        .setInteractive({ useHandCursor: true })
        .setWordWrapWidth(btnMaxWidth - STYLE_CONFIG.button.padding.left - STYLE_CONFIG.button.padding.right);

      // 按钮hover效果
      btnText.on('pointerover', () => {
        btnText.setColor(btn.hoverColor || STYLE_CONFIG.color.buttonHover);
        btnText.setBackgroundColor(STYLE_CONFIG.button.bgHover);
        btnText.setScale(1.05);
      });
      btnText.on('pointerout', () => {
        btnText.setColor(btn.color || STYLE_CONFIG.color.buttonNormal);
        btnText.setBackgroundColor(STYLE_CONFIG.button.bgNormal);
        btnText.setScale(1);
      });
      btnText.on('pointerdown', () => btn.onClick?.());

      modalElements.push(btnText);
    });

    return modalElements;
  }

  /**
   * 关闭弹窗（销毁所有弹窗元素）
   */
  closeModal(modalElements) {
    if (!modalElements || !Array.isArray(modalElements)) return;
    modalElements.forEach(el => el?.destroy?.());
  }

  /**
   * 显示Toast提示（文字居中，动态宽度，避免遮挡）
   */
  showToast(text, duration = 1400) {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const cx = W / 2;
    const toastY = H - 60; // 底部居中位置（避免遮挡底部UI）

    // 临时文本：计算文字宽度，确保背景自适应
    const tempText = this.add.text(0, 0, text, {
      fontSize: '18px',
      fontFamily: STYLE_CONFIG.baseFont
    });
    const textWidth = tempText.width + 40; // 左右内边距各20px
    const textHeight = 42;
    tempText.destroy();

    // 1. Toast背景（动态宽度，圆角）
    const toastBg = this.add.rectangle(cx, toastY, textWidth, textHeight, 0x000000, 0.7)
      .setDepth(this.uiDepth)
      .setScale(0.85); // 初始缩放（动画用）

    // 2. Toast文字（居中显示）
    const toastText = this.add.text(cx, toastY, text, {
      fontSize: '18px',
      color: STYLE_CONFIG.color.textNormal,
      fontFamily: STYLE_CONFIG.baseFont,
      shadow: STYLE_CONFIG.textShadow
    }).setOrigin(0.5)
      .setDepth(this.uiDepth + 1)
      .setAlpha(0); // 初始透明（动画用）

    // 显示动画：缩放+淡入
    this.tweens.add({ targets: toastBg, scale: 1, duration: 280, ease: 'Back.Out' });
    this.tweens.add({ targets: toastText, alpha: 1, duration: 320, ease: 'Power2' });

    // 自动销毁：淡出动画
    this.time.delayedCall(duration - 300, () => {
      this.tweens.add({
        targets: [toastBg, toastText],
        alpha: 0,
        duration: 280,
        onComplete: () => {
          toastBg.destroy();
          toastText.destroy();
        }
      });
    });
  }

  /**
   * 清理临时纹理资源（避免内存泄漏）
   */
  cleanupTextures() {
    if (this._savedTextureKeys && this._savedTextureKeys.length) {
      this._savedTextureKeys.forEach(key => {
        if (this.textures.exists(key)) {
          this.textures.remove(key);
        }
      });
      this._savedTextureKeys = [];
    }
  }
}