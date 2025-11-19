import { SoundManager } from '../sound/SoundManager.js';
import { ChallengeProgressStore } from '../stores/ChallengeProgressStore.js';

// 统一样式配置：避免重复代码，确保视觉一致性
const STYLE_CONFIG = {
  // 基础字体（适配中英文，提升跨设备显示效果）
  baseFont: "'PingFang SC', 'Microsoft YaHei', Arial, sans-serif",
  // 标题文字阴影（增强立体感，避免文字与背景融合）
  titleShadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 4, fill: true },
  // 状态文字颜色（区分关卡状态，提升辨识度）
  statusColor: {
    completed: '#8effa8',    // 已通关：亮绿色
    unlocked: '#ffea7f',    // 可挑战：暖黄色
    locked: '#888888'       // 未解锁：浅灰色
  },
  // 按钮交互色（hover反馈，提升操作感）
  btnColor: {
    normal: '#00ffff',      // 正常：青色
    hover: '#80ffff',       // 悬浮：浅青色
    cancel: '#ff8080',      // 取消：浅红色
    cancelHover: '#ffb3b3'  // 取消悬浮：更浅红
  }
};

export class ChallengeMenu extends Phaser.Scene {
  constructor() {
    super('ChallengeMenu');
    this.uiDepth = 5000;
    this.levels = [
      { level: 1, rows: 3, cols: 3, timeLimit: 40, imageKey: 'challenge_level1', title: '第一关' },
      { level: 2, rows: 4, cols: 4, timeLimit: 90, imageKey: 'challenge_level2', title: '第二关' },
      { level: 3, rows: 4, cols: 4, timeLimit: 130, imageKey: 'challenge_level3', title: '第三关' }
    ];
  }

  preload() {
  // 预加载背景图片
  this.load.image('challenge_bg', './assets/1.jpg');
}
  create() {
    SoundManager.init(this);
    SoundManager.playBGM('bgm_menu');

    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const cx = W / 2; // 屏幕水平中心

    this.add.image(cx, H / 2, 'challenge_bg')
    .setDisplaySize(W, H)
    .setAlpha(0.7)  // 设置半透明效果，避免影响文字可读性
    .setDepth(this.uiDepth - 20); // 确保背景在UI元素之下

    // 1. 背景层（兜底，避免透明区域）
    const bgc = this.add.graphics().setDepth(this.uiDepth - 10);
  bgc.fillStyle(0x0f141b, 0.6); // 降低不透明度，让背景图片能透出来
  bgc.fillRect(0, 0, W, H);

    // 2. 主标题（居中显示，增强视觉焦点）
    this.add.text(cx, 70, '闯关模式', {
      fontSize: '46px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: STYLE_CONFIG.baseFont,
      shadow: STYLE_CONFIG.titleShadow
    }).setOrigin(0.5).setDepth(this.uiDepth);

    // 3. 返回主菜单按钮（左上位置，带交互反馈）
    const backBtn = this.add.text(40, 40, '返回主菜单', {
      fontSize: '20px',
      color: STYLE_CONFIG.btnColor.normal,
      fontFamily: STYLE_CONFIG.baseFont
    })
      .setOrigin(0, 0.5) // 左对齐+垂直居中，避免文字偏移
      .setInteractive({ useHandCursor: true })
      .setDepth(this.uiDepth);

    // 返回按钮交互效果
    backBtn.on('pointerover', () => backBtn.setColor(STYLE_CONFIG.btnColor.hover));
    backBtn.on('pointerout', () => backBtn.setColor(STYLE_CONFIG.btnColor.normal));
    backBtn.on('pointerdown', () => {
      SoundManager.playClick();
      this.scene.start('MainMenu');
    });

    // 4. 进度提示（底部居中，避免与特权码按钮重叠）
    this.progressLabel = this.add.text(cx, H - 90, ChallengeProgressStore.nextLevelLabel(), {
      fontSize: '22px',
      color: '#ffd700',
      fontFamily: STYLE_CONFIG.baseFont,
      shadow: { offsetX: 1, offsetY: 1, color: '#000', blur: 2, fill: true }
    }).setOrigin(0.5).setDepth(this.uiDepth);

    // 5. 关卡列表（核心内容，响应式宽度）
    this.drawLevels(W, H);

    // 6. 特权码按钮（右下位置，带背景框增强辨识度）
    const privBtn = this.add.text(W - 110, H - 50, '特权码', {
      fontSize: '20px',
      color: STYLE_CONFIG.btnColor.normal,
      backgroundColor: '#222222',
      padding: { left: 12, right: 12, top: 8, bottom: 8 },
      borderRadius: 4, // 圆角优化
      fontFamily: STYLE_CONFIG.baseFont
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(this.uiDepth);

    // 特权码按钮交互效果
    privBtn.on('pointerover', () => {
      privBtn.setColor(STYLE_CONFIG.btnColor.hover);
      privBtn.setBackgroundColor('#333333');
    });
    privBtn.on('pointerout', () => {
      privBtn.setColor(STYLE_CONFIG.btnColor.normal);
      privBtn.setBackgroundColor('#222222');
    });
    privBtn.on('pointerdown', () => {
      SoundManager.playClick();
      this.openPrivilegeModal(W, H, cx);
    });

    // 场景销毁时清理资源
    this.events.once('shutdown', () => this.cleanupInput());
    this.events.once('destroy', () => this.cleanupInput());
  }

  /**
   * 绘制关卡列表（响应式布局，文字居中不溢出）
   * @param {number} W - 屏幕宽度
   * @param {number} H - 屏幕高度
   */
  drawLevels(W, H) {
    const data = ChallengeProgressStore.load();
    const startY = 160; // 关卡列表起始Y坐标
    const gapY = 150;   // 关卡面板垂直间距（增大避免拥挤）
    // 响应式面板宽度：最大760px，最小占屏幕80%（适配小屏）
    const panelW = Math.min(W * 0.8, 760);
    const panelH = 120; // 面板高度（增大容纳文字）

    this.levels.forEach((info, idx) => {
      const y = startY + idx * gapY;
      const x = (W - panelW) / 2; // 面板水平居中
      const isUnlocked = info.level <= data.unlocked;
      const isCompleted = data.completed.includes(info.level);

      // 1. 关卡面板背景（区分状态色）
      const panel = this.add.graphics().setDepth(this.uiDepth);
      const bgColor = isUnlocked 
        ? (isCompleted ? 0x153520 : 0x122033) // 已通关绿 / 可挑战蓝
        : 0x1b1b1b; // 未解锁灰
      panel.fillStyle(bgColor, 0.95);
      panel.fillRoundedRect(x, y, panelW, panelH, 18); // 圆角增大，更美观
      // 面板边框（区分状态）
      panel.lineStyle(2, isUnlocked ? 0x3a6ea5 : 0x333333, 1);
      panel.strokeRoundedRect(x, y, panelW, panelH, 18);

      // 2. 关卡标题（垂直居中，左对齐）
      const titleText = this.add.text(x + 30, y + panelH / 2, info.title, {
        fontSize: '26px',
        color: isUnlocked 
          ? (isCompleted ? STYLE_CONFIG.statusColor.completed : STYLE_CONFIG.statusColor.unlocked)
          : STYLE_CONFIG.statusColor.locked,
        fontStyle: 'bold',
        fontFamily: STYLE_CONFIG.baseFont
      })
        .setOrigin(0, 0.5) // 左对齐+垂直居中，避免文字偏移
        .setDepth(this.uiDepth + 1); // 文字层级高于面板

      // 3. 关卡状态（标题下方，垂直对齐）
      const statusText = this.add.text(x + 30, y + panelH / 2 + 30, 
        isCompleted ? '状态：已通关' : isUnlocked ? '状态：可挑战' : '状态：未解锁', {
        fontSize: '19px',
        color: isUnlocked 
          ? (isCompleted ? STYLE_CONFIG.statusColor.completed : STYLE_CONFIG.statusColor.unlocked)
          : STYLE_CONFIG.statusColor.locked,
        fontFamily: STYLE_CONFIG.baseFont
      })
        .setOrigin(0, 0.5)
        .setDepth(this.uiDepth + 1);

      // 4. 关卡预览图（右侧居中，避免遮挡文字）
      const imgKey = this.textures.exists(info.imageKey) ? info.imageKey : 'background';
      this.add.image(x + panelW - 130, y + panelH / 2, imgKey)
        .setDisplaySize(160, 96) // 图片尺寸优化，适配面板
        .setAlpha(isUnlocked ? 1 : 0.35) // 未解锁图片半透明
        .setDepth(this.uiDepth + 1);

      // 5. 点击区域（覆盖整个面板，带交互反馈）
      const hitArea = this.add.rectangle(x, y, panelW, panelH, 0x000000, 0)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: isUnlocked }) // 未解锁无手型
        .setDepth(this.uiDepth);

      // 点击区域交互效果（仅解锁关卡生效）
      if (isUnlocked) {
        hitArea.on('pointerover', () => {
          panel.setAlpha(0.9);
          titleText.setScale(1.03);
          statusText.setScale(1.03);
        });
        hitArea.on('pointerout', () => {
          panel.setAlpha(1);
          titleText.setScale(1);
          statusText.setScale(1);
        });
      }

      // 点击事件（未解锁提示，解锁则进入关卡）
      hitArea.on('pointerdown', () => {
        if (!isUnlocked) {
          this.showToast('请先通关前一关');
          return;
        }
        SoundManager.playClick();
        this.startLevel(info);
      });
    });
  }

  /**
   * 启动关卡（参数透传）
   * @param {object} info - 关卡信息
   */
  startLevel(info) {
    // 根据关卡级别设置旋转参数：第一关禁用旋转，第二关启用旋转
    const rotateInitially = info.level > 1;
    // 根据关卡级别设置拼图模式：第三关为四边形，其他关卡为矩形
    const pieceMode = info.level === 3 ? 'QUAD' : 'RECT';
    
    this.scene.start('Jigsaw', {
      rows: info.rows,
      cols: info.cols,
      imageKey: this.textures.exists(info.imageKey) ? info.imageKey : 'phoro',
      imageName: `关卡${info.level}`,
      pieceMode: pieceMode,
      rotateInitially: rotateInitially,
      challengeMode: true,
      challengeLevel: info.level,
      timeLimit: info.timeLimit
    });
  }

  /**
   * 打开特权码弹窗（居中布局，文字不遮挡）
   * @param {number} W - 屏幕宽度
   * @param {number} H - 屏幕高度
   * @param {number} cx - 屏幕水平中心
   */
  openPrivilegeModal(W, H, cx) {
    this.closePrivilegeModal(); // 先关闭已有弹窗，避免重叠

    const cy = H / 2; // 屏幕垂直中心
    const modalW = 480; // 弹窗宽度
    const modalH = 280; // 弹窗高度（增大容纳文字）

    // 1. 弹窗背景遮罩（半透明，阻止下层交互）
    const maskBg = this.add.rectangle(cx, cy, W, H, 0x000000, 0.6)
      .setDepth(this.uiDepth)
      .setInteractive();

    // 2. 弹窗面板（白色边框，深色背景）
    const modalPanel = this.add.rectangle(cx, cy, modalW, modalH, 0x101820, 0.98)
      .setStrokeStyle(2, 0x3a6ea5, 1) // 边框色与关卡面板呼应
      .setDepth(this.uiDepth + 1);

    // 3. 弹窗标题（顶部居中）
    const modalTitle = this.add.text(cx, cy - modalH / 2 + 40, '输入特权码', {
      fontSize: '28px',
      color: '#ffd700',
      fontStyle: 'bold',
      fontFamily: STYLE_CONFIG.baseFont,
      shadow: { offsetX: 1, offsetY: 1, color: '#000', blur: 2, fill: true }
    })
      .setOrigin(0.5)
      .setDepth(this.uiDepth + 2);

    // 4. 提示文字（输入框上方）
    const hintText = this.add.text(cx, cy - 30, '输入有效特权码可解锁额外内容', {
      fontSize: '18px',
      color: '#aaaaaa',
      fontFamily: STYLE_CONFIG.baseFont
    })
      .setOrigin(0.5)
      .setDepth(this.uiDepth + 2);

    // 5. 输入框（居中显示，适配canvas坐标）
    const gameContainer = document.getElementById('game-container') || document.body;
    const canvas = gameContainer.querySelector('canvas');
    const inputEl = document.createElement('input');

    // 输入框样式（与游戏风格统一）
    Object.assign(inputEl.style, {
      position: 'absolute',
      zIndex: this.uiDepth + 5, // 确保输入框在最上层
      padding: '12px 16px',
      fontSize: '18px',
      width: '280px',
      textAlign: 'center',
      border: `2px solid #3a6ea5`,
      borderRadius: 8,
      backgroundColor: '#0e141b',
      color: '#ffffff',
      outline: 'none',
      boxShadow: '0 0 10px rgba(19, 38, 53, 0.8)',
      fontFamily: STYLE_CONFIG.baseFont
    });

    inputEl.type = 'text';
    inputEl.placeholder = '请输入特权码...';
    inputEl.maxLength = 16;

    // 输入框聚焦效果
    inputEl.addEventListener('focus', () => {
      inputEl.style.borderColor = STYLE_CONFIG.btnColor.hover;
      inputEl.style.boxShadow = '0 0 12px rgba(0, 255, 255, 0.4)';
    });
    inputEl.addEventListener('blur', () => {
      inputEl.style.borderColor = '#3a6ea5';
      inputEl.style.boxShadow = '0 0 10px rgba(19, 38, 53, 0.8)';
    });

    // 计算输入框位置（基于canvas坐标，确保居中）
    const placeInput = () => {
      const canvasRect = canvas.getBoundingClientRect();
      const scaleX = canvasRect.width / this.scale.gameSize.width;
      const scaleY = canvasRect.height / this.scale.gameSize.height;

      // 输入框垂直位置：弹窗中心稍下
      const inputGameY = cy + 10;
      // 屏幕坐标换算（含滚动偏移）
      const screenX = canvasRect.left + window.scrollX + cx * scaleX;
      const screenY = canvasRect.top + window.scrollY + inputGameY * scaleY;

      // 输入框水平居中（基于自身宽度）
      const inputHalfW = parseInt(inputEl.style.width) / 2;
      const inputHalfH = inputEl.offsetHeight / 2 || 24;

      inputEl.style.left = `${screenX - inputHalfW}px`;
      inputEl.style.top = `${screenY - inputHalfH}px`;
    };

    // 添加输入框并调整位置
    gameContainer.appendChild(inputEl);
    placeInput();
    requestAnimationFrame(placeInput); // 确保DOM渲染后再调整
    window.addEventListener('resize', placeInput); // 窗口缩放时重新定位
    inputEl.focus(); // 自动聚焦

    // 6. 弹窗按钮（确定/取消，居中排列）
    const btnConfig = [
      {
        label: '确定',
        color: STYLE_CONFIG.btnColor.normal,
        hoverColor: STYLE_CONFIG.btnColor.hover,
        action: () => {
          const code = inputEl.value.trim();
          if (code === '123') {
            ChallengeProgressStore.unlockAll();
            this.showToast('已解锁全部关卡！');
            this.progressLabel.setText('闯关完成 Ciallo～ (∠・ω< )⌒★');
            this.time.delayedCall(350, () => this.scene.restart());
          } else {
            this.showToast('特权码无效，请重新输入');
          }
          this.closePrivilegeModal();
        }
      },
      {
        label: '取消',
        color: STYLE_CONFIG.btnColor.cancel,
        hoverColor: STYLE_CONFIG.btnColor.cancelHover,
        action: () => this.closePrivilegeModal()
      }
    ];

    const btnY = cy + modalH / 2 - 55; // 按钮垂直位置（底部偏上）
    const btnNodes = btnConfig.map((btn, idx) => {
      const btnX = cx - 130 + idx * 260; // 按钮水平间距（260px）
      const btnText = this.add.text(btnX, btnY, btn.label, {
        fontSize: '22px',
        color: btn.color,
        backgroundColor: '#222222',
        padding: { left: 28, right: 28, top: 10, bottom: 10 },
        borderRadius: 6,
        fontFamily: STYLE_CONFIG.baseFont
      })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .setDepth(this.uiDepth + 2);

      // 按钮交互效果
      btnText.on('pointerover', () => {
        btnText.setColor(btn.hoverColor);
        btnText.setBackgroundColor('#333333');
        btnText.setScale(1.05);
      });
      btnText.on('pointerout', () => {
        btnText.setColor(btn.color);
        btnText.setBackgroundColor('#222222');
        btnText.setScale(1);
      });
      btnText.on('pointerdown', () => {
        SoundManager.playClick();
        btn.action();
      });

      return btnText;
    });

    // 存储弹窗元素，用于后续关闭
    this._privilegeElements = [maskBg, modalPanel, modalTitle, hintText, ...btnNodes];
    this._privilegeInput = inputEl;
    this._privilegeResizeHandler = placeInput;
  }

  /**
   * 关闭特权码弹窗（清理DOM和事件）
   */
  closePrivilegeModal() {
    // 清理弹窗元素
    if (this._privilegeElements) {
      this._privilegeElements.forEach(el => el.destroy());
      this._privilegeElements = null;
    }

    // 清理输入框和 resize 事件
    this.cleanupInput();
  }

  /**
   * 清理输入框资源（避免内存泄漏）
   */
  cleanupInput() {
    if (this._privilegeInput) {
      this._privilegeInput.remove();
      this._privilegeInput = null;
    }
    if (this._privilegeResizeHandler) {
      window.removeEventListener('resize', this._privilegeResizeHandler);
      this._privilegeResizeHandler = null;
    }
  }

  /**
   * 显示提示Toast（居中底部，文字不截断）
   * @param {string} text - 提示内容
   * @param {number} duration - 显示时长（默认1600ms）
   */
  showToast(text, duration = 1600) {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const cx = W / 2;
    const toastY = H - 80; // 底部位置（避免遮挡进度条）

    // 1. Toast背景（动态宽度，包裹文字）
    const toastBg = this.add.graphics().setDepth(this.uiDepth + 10);
    // 临时文本：计算文字宽度
    const tempText = this.add.text(0, 0, text, {
      fontSize: '19px',
      fontFamily: STYLE_CONFIG.baseFont
    });
    const textW = tempText.width + 40; // 左右内边距（40px）
    const textH = 56; // 固定高度（确保垂直居中）
    tempText.destroy(); // 销毁临时文本

    // 绘制圆角背景
    toastBg.fillStyle(0x000000, 0.75);
    toastBg.fillRoundedRect(cx - textW / 2, toastY - textH / 2, textW, textH, 28);

    // 2. Toast文字（居中显示，带阴影）
    const toastText = this.add.text(cx, toastY, text, {
      fontSize: '19px',
      color: '#ffffff',
      fontFamily: STYLE_CONFIG.baseFont,
      shadow: { offsetX: 1, offsetY: 1, color: '#000', blur: 2, fill: true }
    })
      .setOrigin(0.5)
      .setDepth(this.uiDepth + 11);

    // 3. 自动销毁（淡出动画，提升体验）
    this.tweens.add({
      targets: [toastBg, toastText],
      alpha: 0,
      delay: duration - 300,
      duration: 300,
      onComplete: () => {
        toastBg.destroy();
        toastText.destroy();
      }
    });
  }
}