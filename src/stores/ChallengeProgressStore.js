const KEY = 'puzzle_challenge_progress_v1';
const MAX_LEVEL = 3;

export const ChallengeProgressStore = {
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { unlocked: 1, completed: [] };
      const obj = JSON.parse(raw);
      const unlocked = Math.min(MAX_LEVEL, Math.max(1, obj.unlocked || 1));
      const completed = Array.isArray(obj.completed)
        ? [...new Set(obj.completed.filter(n => n >= 1 && n <= MAX_LEVEL))].sort((a, b) => a - b)
        : [];
      return { unlocked, completed };
    } catch {
      return { unlocked: 1, completed: [] };
    }
  },
  save(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
  },
  markCompleted(level) {
    const data = this.load();
    if (!data.completed.includes(level)) data.completed.push(level);
    if (data.unlocked < level + 1) data.unlocked = Math.min(MAX_LEVEL, level + 1);
    this.save(data);
  },
  unlockAll() {
    const data = this.load();
    data.unlocked = MAX_LEVEL;
    data.completed = [];
    for (let i = 1; i <= MAX_LEVEL; i++) data.completed.push(i);
    this.save(data);
  },
  isLevelUnlocked(level) {
    return level <= this.load().unlocked;
  },
  isLevelCompleted(level) {
    return this.load().completed.includes(level);
  },
  nextLevelLabel() {
    const data = this.load();
    if (data.completed.length >= MAX_LEVEL) {
      return '闯关完成 Ciallo～ (∠・ω< )⌒★';
    }
    const mapping = { 1: '第一关', 2: '第二关', 3: '第三关' };
    return '下一关是：' + mapping[data.unlocked];
  }
};