import { SoundManager } from '../sound/SoundManager.js';
import { ChallengeProgressStore } from '../stores/ChallengeProgressStore.js';

// 统一样式配置：确保文字美观性、一致性，提升视觉层次
const STYLE_CONFIG = {
  // 基础字体：适配中英文，跨设备显示更协调
  baseFont: "'PingFang SC', 'Microsoft YaHei', 'Segoe UI', Arial, sans-serif",
  // 文字阴影：增强立体感，避免与深色背景融合
  textShadow: { offsetX: 1.5, offsetY: 1.5, color: '#00000090', blur: 3, fill: true },
  titleShadow: { offsetX: 2.5, offsetY: 2.5, color: '#000000a0', blur: 5, fill: true },
  // 颜色体系：区分功能模块，提升辨识度
  color: {
    title: '#ffffff',          // 主标题色
    btnNormal: '#ffffff',      // 按钮常态文字色
    btnHover: '#3ad1ff',       // 按钮悬浮文字色
    btnExitNormal: '#ff8080',  // 退出按钮常态文字色
    btnExitHover: '#ff4d4d',   // 退出按钮悬浮文字色
    copyright: '#a0b0c0',      // 版权信息色
    toastText: '#ffffff'       // Toast提示文字色
  },
  // 按钮样式：统一尺寸、圆角、渐变，增强质感
  button: {
    width: 280,    // 按钮宽度（比原260稍宽，更舒展）
    height: 64,    // 按钮高度（比原60稍高，更易点击）
    radius: 18,    // 圆角（比原15稍大，更柔和）
    bgGradient: {  // 按钮背景渐变（从深到浅，增强层次感）
      normal: [0x2aadff, 0x1e3642],
      hover: [0x2aadff, 0x284858]
     // #067bc4ff
    },
    border: 0x00000033,  // 按钮边框（半透明黑，更精致）
    borderWidth: 2
  },
  // 标题动画配置：更细腻的过渡效果
  titleAnim: {
    scaleFrom: 1,
    scaleTo: 1.08,
    duration: 1800,
    ease: 'Sine.InOut'
  },
  // 装饰线样式：提升标题下方分隔效果
  decorLine: {
    width: 320,    // 比原320稍宽，更协调
    height: 4,
    color: 0x3ad1ff,
    alpha: 0.8     // 轻微透明，不刺眼
  }
};

export class MainMenu extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenu' });
    this.uiDepth = 2000;       // 基础UI层级
    this.highestDepth = 3000;  // 最高层级（用于Toast，避免遮挡）
    this.currentToast = null;  // 当前显示的提示信息
  }

  create() {
    SoundManager.init(this);
    SoundManager.playBGM('bgm_menu');

    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const centerX = W / 2;      // 屏幕水平中心（统一复用）
    const centerY = H / 2;      // 屏幕垂直中心

    // 1. 背景层（优化渐变方向，提升质感）
    this.drawBackground(W, H);

    // 2. 主标题（美化+细腻动画，确保居中不遮挡）
    this.createTitle(centerX, H * 0.18);  // 标题位置：屏幕上18%处，适配不同高度

    // 3. 标题下方装饰线（增强视觉分隔）
    this.createDecorLine(centerX, H * 0.25);

    // 4. 功能按钮组（居中排列，适配不同屏幕高度）
    const btnStartY = H * 0.42;    // 第一个按钮起始位置：屏幕中42%处
    const btnGap = 85;             // 按钮垂直间距（比原80稍大，避免拥挤）
    this.createButtons(centerX, btnStartY, btnGap);

    // 5. 版权信息（优化样式，确保底部居中）
    this.createCopyright(centerX, H * 0.92);  // 版权位置：屏幕下8%处
  }

  /**
   * 绘制背景（图片优先，无图片则用顶部到底部的渐变）
   */
  drawBackground(W, H) {
    if (this.textures.exists('background')) {
      // 背景图片：拉伸适配屏幕，轻微透明避免掩盖前景
      this.add.image(W / 2, H / 2, 'background')
        .setDisplaySize(W, H)
        .setAlpha(0.65)
        .setDepth(this.uiDepth - 10);  // 背景层级最低
    } else {
      // 渐变背景：顶部浅蓝灰→底部深蓝黑，更有层次感
      const bg = this.add.graphics().setDepth(this.uiDepth - 10);
      bg.fillGradientStyle(
        0x1f3a4b, 0x1f3a4b,  // 顶部左右颜色
        0x0e141b, 0x0e141b,  // 底部左右颜色
        1                     // 透明度
      );
      bg.fillRect(0, 0, W, H);
    }
  }

  /**
   * 创建主标题（带阴影+细腻缩放动画）
   */
  createTitle(centerX, y) {
    const title = this.add.text(centerX, y, '拼图游戏', {
      fontSize: '52px',          // 比原48稍大，更醒目
      color: STYLE_CONFIG.color.title,
      fontStyle: 'bold',
      fontFamily: STYLE_CONFIG.baseFont,
      shadow: STYLE_CONFIG.titleShadow
    }).setOrigin(0.5).setDepth(this.uiDepth + 5);  // 标题层级高于背景

    // 优化标题动画：缩放+轻微淡入，过渡更自然
    this.tweens.add({
      targets: title,
      scaleX: [STYLE_CONFIG.titleAnim.scaleFrom, STYLE_CONFIG.titleAnim.scaleTo],
      scaleY: [STYLE_CONFIG.titleAnim.scaleFrom, STYLE_CONFIG.titleAnim.scaleTo],
      alpha: [0.8, 1],           // 从轻微透明到不透明
      duration: STYLE_CONFIG.titleAnim.duration,
      yoyo: true,
      repeat: -1,
      ease: STYLE_CONFIG.titleAnim.ease
    });
  }

  /**
   * 创建标题下方装饰线
   */
  createDecorLine(centerX, y) {
    this.add.rectangle(centerX, y,
      STYLE_CONFIG.decorLine.width,
      STYLE_CONFIG.decorLine.height,
      STYLE_CONFIG.decorLine.color
    )
      .setAlpha(STYLE_CONFIG.decorLine.alpha)
      .setOrigin(0.5)
      .setDepth(this.uiDepth + 4);  // 装饰线层级低于标题，高于背景
  }

  /**
   * 检查是否完成所有闯关模式关卡
   */
  hasCompletedAllChallenges() {
    const progress = ChallengeProgressStore.load();
    return progress.completed.length >= 3; // 假设总共有3个关卡
  }

  /**
   * 创建功能按钮组（统一样式，交互反馈更细腻）
   */
  createButtons(centerX, startY, gap) {
    const hasCompletedAll = this.hasCompletedAllChallenges();
    
    // 按钮配置：label-文字，onClick-回调，isExit-是否为退出按钮
    const btnConfigs = [
      {
        label: hasCompletedAll ? '开始游戏' : '请先完成闯关模式', 
        onClick: () => {
          if (hasCompletedAll) {
            this.scene.start('Select');
          } else {
            this.showToast('请先完成所有闯关模式关卡');
          }
        }
      },
      { label: '闯关模式', onClick: () => this.scene.start('ChallengeMenu') },
      { label: '排行榜查看', onClick: () => this.scene.start('Leaderboard') },
      { label: '退出游戏', onClick: this.handleExit.bind(this), isExit: true }
    ];

    // 生成每个按钮
    btnConfigs.forEach((config, index) => {
      const btnY = startY + index * gap;
      const button = this.makeButton(centerX, btnY, config);
      
      // 如果未完成所有关卡，'开始游戏'按钮文字设置为灰色
      if (index === 0 && !hasCompletedAll) {
        const btnText = button.list[2]; // 文字是容器中的第三个元素
        btnText.setColor('#888888');
      }
    });
  }

  /**
   * 显示提示信息
   */
  showToast(message) {
    // 清除已有的toast
    if (this.currentToast) {
      this.currentToast.destroy();
    }
    
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    
    // 创建toast背景
    const toastBg = this.add.graphics().setDepth(this.highestDepth);
    toastBg.fillStyle(0x000000, 0.7);
    toastBg.fillRoundedRect(W * 0.3, H * 0.4, W * 0.4, 60, 30);
    
    // 创建toast文字
    const toastText = this.add.text(W * 0.5, H * 0.43, message, {
      fontSize: '18px',
      color: STYLE_CONFIG.color.toastText,
      fontFamily: STYLE_CONFIG.baseFont,
      shadow: STYLE_CONFIG.textShadow
    }).setOrigin(0.5).setDepth(this.highestDepth + 1);
    
    // 将toast元素组合在一起
    const toastContainer = this.add.container(0, 0).setDepth(this.highestDepth);
    toastContainer.add([toastBg, toastText]);
    
    // 记录当前toast
    this.currentToast = toastContainer;
    
    // 2秒后自动消失
    this.time.delayedCall(2000, () => {
      if (this.currentToast) {
        this.currentToast.destroy();
        this.currentToast = null;
      }
    });
  }

  /**
   * 生成单个美化按钮（渐变背景+文字阴影+细腻交互）
   */
  makeButton(x, y, config) {
    const { width, height, radius, bgGradient, border, borderWidth } = STYLE_CONFIG.button;
    const isExit = config.isExit || false;

    // 1. 按钮容器（整合背景、hover层、文字，确保整体居中）
    const btnContainer = this.add.container(x, y).setDepth(this.uiDepth + 3);

    // 2. 按钮常态背景（渐变）
    const normalBg = this.add.graphics();
    normalBg.fillGradientStyle(
      ...(isExit ? [0x4f2727, 0x421e1e] : bgGradient.normal),  // 退出按钮用红色系渐变
      1
    );
    normalBg.fillRoundedRect(-width / 2, -height / 2, width, height, radius);
    // 按钮边框
    normalBg.lineStyle(borderWidth, border, 1);
    normalBg.strokeRoundedRect(-width / 2, -height / 2, width, height, radius);

    // 3. 按钮hover层（渐变+半透明，初始隐藏）
    const hoverBg = this.add.graphics();
    hoverBg.fillGradientStyle(
      ...(isExit ? [0x682828, 0x582222] : bgGradient.hover),  // 退出按钮hover渐变
      1
    );
    hoverBg.fillRoundedRect(-width / 2, -height / 2, width, height, radius);
    hoverBg.setVisible(false);

    // 4. 按钮文字（居中+阴影，适配按钮状态）
    const btnText = this.add.text(0, 0, config.label, {
      fontSize: '26px',          // 比原24稍大，更清晰
      color: isExit ? STYLE_CONFIG.color.btnExitNormal : STYLE_CONFIG.color.btnNormal,
      fontStyle: 'bold',
      fontFamily: STYLE_CONFIG.baseFont,
      shadow: STYLE_CONFIG.textShadow  // 文字阴影增强立体感
    }).setOrigin(0.5);

    // 5. 添加元素到容器
    btnContainer.add([normalBg, hoverBg, btnText]);

    // 6. 交互区域（与按钮大小一致）
    btnContainer.setInteractive(
      new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
      Phaser.Geom.Rectangle.Contains
    );

    // 7. 交互反馈（hover/click，过渡更细腻）
    btnContainer.on('pointerover', () => {
      hoverBg.setVisible(true);
      btnText.setColor(isExit ? STYLE_CONFIG.color.btnExitHover : STYLE_CONFIG.color.btnHover);
      // 轻微缩放（比原1.05稍小，更自然）
      this.tweens.add({
        targets: btnContainer,
        scale: 1.04,
        duration: 120,
        ease: 'Back.Out'
      });
    });

    btnContainer.on('pointerout', () => {
      hoverBg.setVisible(false);
      btnText.setColor(isExit ? STYLE_CONFIG.color.btnExitNormal : STYLE_CONFIG.color.btnNormal);
      // 恢复原尺寸
      this.tweens.add({
        targets: btnContainer,
        scale: 1,
        duration: 120,
        ease: 'Back.Out'
      });
    });

    btnContainer.on('pointerdown', () => {
      SoundManager.playClick();
      // 点击按压效果（比原0.94稍大，过渡更柔和）
      this.tweens.add({
        targets: btnContainer,
        scale: 0.96,
        duration: 80,
        yoyo: true,
        onComplete: config.onClick  // 回调在动画结束后执行，体验更流畅
      });
    });

    return btnContainer;
  }

  /**
   * 创建版权信息（优化样式，确保底部居中）
   */
  createCopyright(centerX, y) {
    this.add.text(centerX, y, '', {
      fontSize: '15px',
      color: STYLE_CONFIG.color.copyright,
      fontFamily: STYLE_CONFIG.baseFont,
      shadow: { offsetX: 1, offsetY: 1, color: '#00000060', blur: 2, fill: true }  // 轻微阴影，不突兀
    }).setOrigin(0.5).setDepth(this.uiDepth + 2);  // 版权层级低于按钮，高于背景
  }

  /**
   * 处理退出游戏逻辑
   */
  handleExit() {
    const isConfirm = window.confirm('确认要退出拼图游戏吗？');
    if (isConfirm) {
      window.close();
      // 若无法关闭（如浏览器限制），显示Toast提示
      if (!window.closed) {
        this.showToast('浏览器限制无法自动关闭，请手动关闭窗口', 2500);
      }
    }
  }

  /**
   * 显示美化Toast（动态宽度+淡入淡出，避免文字截断）
   */
  showToast(text, duration = 1800) {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const centerX = W / 2;
    const toastY = H * 0.85;  // Toast位置：屏幕下15%处，避免遮挡按钮

    // 1. 计算Toast背景宽度（根据文字长度自适应）
    const tempText = this.add.text(0, 0, text, {
      fontSize: '19px',
      fontFamily: STYLE_CONFIG.baseFont
    });
    const toastWidth = Math.min(tempText.width + 40, W - 80);  // 左右内边距40，最大不超过屏幕宽-80
    const toastHeight = 52;
    tempText.destroy();  // 销毁临时文本，避免内存占用

    // 2. Toast背景（半透明黑+圆角，层级最高）
    const toastBg = this.add.graphics().setDepth(this.highestDepth);
    toastBg.fillStyle(0x000000, 0.75);
    toastBg.fillRoundedRect(centerX - toastWidth / 2, toastY - toastHeight / 2, toastWidth, toastHeight, 26);

    // 3. Toast文字（居中+阴影，层级高于背景）
    const toastText = this.add.text(centerX, toastY, text, {
      fontSize: '19px',
      color: STYLE_CONFIG.color.toastText,
      fontFamily: STYLE_CONFIG.baseFont,
      shadow: STYLE_CONFIG.textShadow,
      align: 'center'  // 文字居中，避免长文本偏移
    }).setOrigin(0.5).setDepth(this.highestDepth + 1);

    // 4. 淡入动画（从透明到不透明，过渡自然）
    this.tweens.add({
      targets: [toastBg, toastText],
      alpha: [0, 1],
      duration: 200,
      ease: 'Power2'
    });

    // 5. 自动销毁（先淡入，后延迟，再淡出）
    this.time.delayedCall(duration - 300, () => {
      this.tweens.add({
        targets: [toastBg, toastText],
        alpha: 0,
        duration: 300,
        ease: 'Power2',
        onComplete: () => {
          toastBg.destroy();
          toastText.destroy();
        }
      });
    });
  }
}