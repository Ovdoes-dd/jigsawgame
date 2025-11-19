export const LeaderboardStore = {
  STORE_KEY: 'puzzle_leaderboard_v1',
  EXPORT_VERSION: 1,

  load() {
    try {
      const raw = localStorage.getItem(this.STORE_KEY);
      if (!raw) return { EASY: [], MEDIUM: [], HARD: [], CUSTOM: [] };
      const data = JSON.parse(raw);
      return {
        EASY: Array.isArray(data.EASY) ? data.EASY : [],
        MEDIUM: Array.isArray(data.MEDIUM) ? data.MEDIUM : [],
        HARD: Array.isArray(data.HARD) ? data.HARD : [],
        CUSTOM: Array.isArray(data.CUSTOM) ? data.CUSTOM : []
      };
    } catch {
      return { EASY: [], MEDIUM: [], HARD: [], CUSTOM: [] };
    }
  },

  save(data) {
    try {
      localStorage.setItem(this.STORE_KEY, JSON.stringify(data));
    } catch {}
  },

  categoryOf(rows, cols) {
    if (rows === 3 && cols === 3) return 'EASY';
    if (rows === 4 && cols === 4) return 'MEDIUM';
    if (rows === 5 && cols === 5) return 'HARD';
    return 'CUSTOM';
  },

  uniqueByTime(list) {
    const seen = new Set();
    const out = [];
    for (const e of list) {
      const t = e.time;
      if (seen.has(t)) continue;
      seen.add(t);
      out.push(e);
    }
    return out;
  },

  addRecord({ rows, cols, imageKey, imageName, seconds }) {
    const all = this.load();
    const cat = this.categoryOf(rows, cols);
    const entry = {
      time: Number(seconds) || 0,
      imageKey: String(imageKey || ''),
      imageName: String(imageName || ''),
      rows,
      cols,
      dateISO: new Date().toISOString()
    };
    all[cat].push(entry);
    all[cat].sort((a, b) => a.time - b.time);
    all[cat] = this.uniqueByTime(all[cat]).slice(0, 3);
    this.save(all);
    return { category: cat, top: all[cat] };
  },

  getAll() {
    return this.load();
  },

  exportDataObject() {
    const data = this.load();
    return {
      version: this.EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      categories: data
    };
  },

  exportJSON(pretty = true) {
    try {
      const obj = this.exportDataObject();
      return JSON.stringify(obj, null, pretty ? 2 : 0);
    } catch {
      return '';
    }
  },

  importJSON(jsonString, { strategy = 'merge' } = {}) {
    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      return { ok: false, error: 'JSON 解析失败' };
    }
    return this.importDataObject(parsed, { strategy });
  },

  importDataObject(obj, { strategy = 'merge' } = {}) {
    if (!obj || typeof obj !== 'object') {
      return { ok: false, error: '数据格式错误' };
    }
    if (!obj.categories || typeof obj.categories !== 'object') {
      return { ok: false, error: '缺少 categories 字段' };
    }

    const validCats = ['EASY', 'MEDIUM', 'HARD', 'CUSTOM'];
    const sanitizeList = (arr) => {
      if (!Array.isArray(arr)) return [];
      return arr
        .map(e => {
          if (!e) return null;
          const rows = e.rows | 0;
          const cols = e.cols | 0;
          const time = Number(e.time);
          if (!(time >= 0) || rows < 2 || cols < 2) return null;
          return {
            time,
            imageKey: String(e.imageKey || ''),
            imageName: String(e.imageName || ''),
            rows,
            cols,
            dateISO: typeof e.dateISO === 'string' ? e.dateISO : new Date().toISOString()
          };
        })
        .filter(Boolean);
    };

    const incoming = {};
    validCats.forEach(c => {
      incoming[c] = sanitizeList(obj.categories[c]);
    });

    if (strategy === 'replace') {
      validCats.forEach(c => {
        incoming[c].sort((a, b) => a.time - b.time);
        incoming[c] = this.uniqueByTime(incoming[c]).slice(0, 3);
      });
      this.save(incoming);
      return { ok: true, strategy, merged: false };
    }

    const current = this.load();
    validCats.forEach(c => {
      const merged = [...current[c], ...incoming[c]];
      merged.sort((a, b) => a.time - b.time);
      current[c] = this.uniqueByTime(merged).slice(0, 3);
    });
    this.save(current);
    return { ok: true, strategy, merged: true };
  }
};