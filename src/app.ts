import { storage } from './storage';
import type { FeedingType, DiaperType, PoopColor, PoopTexture } from './types';

type Page = 'dashboard' | 'feeding' | 'diaper' | 'vitamin' | 'sleep' | 'history' | 'import';

let currentPage: Page = 'dashboard';

function $(sel: string) {
  const el = document.querySelector(sel);
  if (!el) throw new Error(`Element not found: ${sel}`);
  return el as HTMLElement;
}

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 16);
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ---- Dashboard ----
function renderDashboard() {
  const data = storage.getAll();
  const today = todayStr();
  const todayFeedings = data.feedings.filter(r => r.time.startsWith(today));
  const todayDiapers = data.diapers.filter(r => r.time.startsWith(today));
  const todaySleeps = data.sleeps.filter(r => r.startTime.startsWith(today));
  const todayVits = data.vitamins.filter(r => r.time.startsWith(today));
  const totalMilk = todayFeedings.reduce((s, r) => s + (r.amount || 0), 0);
  const sleepMin = todaySleeps.reduce((s, r) => s + (r.duration || 0), 0);

  return `
    <div class="page-header">
      <h1>👶 宝宝今日</h1>
      <div class="date">${new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}</div>
    </div>
    <div class="stats-grid">
      <div class="stat-card" onclick="navigate('feeding')">
        <div class="stat-icon">🍼</div>
        <div class="stat-value">${todayFeedings.length}</div>
        <div class="stat-label">喂奶次数</div>
        <div class="stat-sub">${totalMilk} ml</div>
      </div>
      <div class="stat-card" onclick="navigate('diaper')">
        <div class="stat-icon">🧷</div>
        <div class="stat-value">${todayDiapers.length}</div>
        <div class="stat-label">换尿布</div>
        <div class="stat-sub">${todayDiapers.filter(d => d.type === 'poop' || d.type === 'both').length} 次便便</div>
      </div>
      <div class="stat-card" onclick="navigate('sleep')">
        <div class="stat-icon">😴</div>
        <div class="stat-value">${Math.floor(sleepMin / 60)}h ${sleepMin % 60}m</div>
        <div class="stat-label">睡眠</div>
        <div class="stat-sub">${todaySleeps.length} 段</div>
      </div>
      <div class="stat-card" onclick="navigate('vitamin')">
        <div class="stat-icon">💊</div>
        <div class="stat-value">${todayVits.length}</div>
        <div class="stat-label">维 D</div>
        <div class="stat-sub">${todayVits.reduce((s, v) => s + v.dosage, 0)} IU</div>
      </div>
    </div>
    <div class="recent-section">
      <div class="section-title">最近记录</div>
      ${getRecentRecords(data).slice(0, 5).map(r => `
        <div class="record-item">
          <span class="record-icon">${r.icon}</span>
          <span class="record-text">${r.text}</span>
          <span class="record-time">${r.time}</span>
        </div>
      `).join('')}
    </div>
    <div class="nav-bar">
      <button class="nav-btn" onclick="navigate('dashboard')">📊 今日</button>
      <button class="nav-btn" onclick="navigate('feeding')">🍼 喂奶</button>
      <button class="nav-btn" onclick="navigate('diaper')">🧷 尿布</button>
      <button class="nav-btn" onclick="navigate('sleep')">😴 睡眠</button>
      <button class="nav-btn" onclick="navigate('history')">📈 历史</button>
    </div>
  `;
}

function getRecentRecords(data: any): { icon: string; text: string; time: string }[] {
  const records: { icon: string; text: string; time: string; ts: number }[] = [];
  data.feedings.forEach((r: any) => {
    const labels: Record<FeedingType, string> = {
      'breast-direct': '母乳亲喂',
      'breast-pump': '母乳瓶喂',
      'formula': '奶粉'
    };
    records.push({
      icon: '🍼',
      text: `${labels[r.type as FeedingType]}${r.amount ? ` ${r.amount}ml` : r.duration ? ` ${r.duration}分钟` : ''}`,
      time: fmtTime(r.time),
      ts: new Date(r.time).getTime()
    });
  });
  data.diapers.forEach((r: any) => {
    const labels: Record<DiaperType, string> = { pee: '小便', poop: '大便', both: '大小便' };
    records.push({ icon: '🧷', text: `换尿布 - ${labels[r.type as DiaperType]}`, time: fmtTime(r.time), ts: new Date(r.time).getTime() });
  });
  data.sleeps.forEach((r: any) => {
    records.push({ icon: '😴', text: `睡眠 ${r.duration ? Math.floor(r.duration / 60) + 'h' + (r.duration % 60) + 'm' : '开始'}`, time: fmtTime(r.startTime), ts: new Date(r.startTime).getTime() });
  });
  data.vitamins.forEach((r: any) => {
    records.push({ icon: '💊', text: `维 D ${r.dosage}IU`, time: fmtTime(r.time), ts: new Date(r.time).getTime() });
  });
  return records.sort((a, b) => b.ts - a.ts).map(({ icon, text, time }) => ({ icon, text, time }));
}

// ---- Feeding ----
function renderFeeding() {
  return `
    <div class="page-header">
      <h1>🍼 喂奶记录</h1>
    </div>
    <div class="form-section">
      <div class="form-title">添加记录</div>
      <div class="feeding-types">
        <button class="type-btn" onclick="showFeedingForm('breast-direct')">🤱 母乳亲喂</button>
        <button class="type-btn" onclick="showFeedingForm('breast-pump')">🍼 母乳瓶喂</button>
        <button class="type-btn" onclick="showFeedingForm('formula')">🍼 奶粉喂养</button>
      </div>
      <div id="feeding-form" style="display:none" class="record-form">
        <div class="form-group">
          <label>时间</label>
          <input type="datetime-local" id="f-time" value="${fmtDate(new Date())}">
        </div>
        <div id="f-amount-group" class="form-group" style="display:none">
          <label>奶量 (ml)</label>
          <input type="number" id="f-amount" placeholder="如 120" min="1" max="500">
        </div>
        <div id="f-duration-group" class="form-group" style="display:none">
          <label>时长 (分钟)</label>
          <input type="number" id="f-duration" placeholder="如 20" min="1" max="180">
        </div>
        <div class="form-group">
          <label>备注</label>
          <input type="text" id="f-note" placeholder="可选备注">
        </div>
        <button class="submit-btn" onclick="submitFeeding()">保存</button>
      </div>
      <div id="feeding-msg" class="msg-success" style="display:none">✅ 记录已保存</div>
    </div>
    <div class="nav-bar">
      <button class="nav-btn" onclick="navigate('dashboard')">📊 今日</button>
      <button class="nav-btn" onclick="navigate('feeding')">🍼 喂奶</button>
      <button class="nav-btn" onclick="navigate('diaper')">🧷 尿布</button>
      <button class="nav-btn" onclick="navigate('sleep')">😴 睡眠</button>
      <button class="nav-btn" onclick="navigate('history')">📈 历史</button>
    </div>
  `;
}

// ---- Diaper ----
function renderDiaper() {
  return `
    <div class="page-header">
      <h1>🧷 换尿布</h1>
    </div>
    <div class="form-section">
      <div class="form-title">添加记录</div>
      <div class="form-group">
        <label>时间</label>
        <input type="datetime-local" id="d-time" value="${fmtDate(new Date())}">
      </div>
      <div class="form-group">
        <label>类型</label>
        <div class="btn-group">
          <button class="type-btn" onclick="setDiaperType('pee')">💧 小便</button>
          <button class="type-btn" onclick="setDiaperType('poop')">💩 大便</button>
          <button class="type-btn" onclick="setDiaperType('both')">💧💩 都有</button>
        </div>
        <input type="hidden" id="d-type" value="">
      </div>
      <div id="poop-details" style="display:none">
        <div class="form-group">
          <label>大便颜色</label>
          <div class="btn-group">
            <button class="type-btn small" onclick="setPoopColor('yellow')">黄色</button>
            <button class="type-btn small" onclick="setPoopColor('green')">绿色</button>
            <button class="type-btn small" onclick="setPoopColor('brown')">棕色</button>
            <button class="type-btn small" onclick="setPoopColor('black')">黑色</button>
            <button class="type-btn small" onclick="setPoopColor('other')">其他</button>
          </div>
          <input type="hidden" id="d-color" value="">
        </div>
        <div class="form-group">
          <label>质地</label>
          <div class="btn-group">
            <button class="type-btn small" onclick="setPoopTexture('liquid')">稀</button>
            <button class="type-btn small" onclick="setPoopTexture('soft')">软</button>
            <button class="type-btn small" onclick="setPoopTexture('normal')">正常</button>
            <button class="type-btn small" onclick="setPoopTexture('hard')">干</button>
          </div>
          <input type="hidden" id="d-texture" value="">
        </div>
      </div>
      <div class="form-group">
        <label>备注</label>
        <input type="text" id="d-note" placeholder="可选备注">
      </div>
      <button class="submit-btn" onclick="submitDiaper()">保存</button>
      <div id="diaper-msg" class="msg-success" style="display:none">✅ 记录已保存</div>
    </div>
    <div class="nav-bar">
      <button class="nav-btn" onclick="navigate('dashboard')">📊 今日</button>
      <button class="nav-btn" onclick="navigate('feeding')">🍼 喂奶</button>
      <button class="nav-btn" onclick="navigate('diaper')">🧷 尿布</button>
      <button class="nav-btn" onclick="navigate('sleep')">😴 睡眠</button>
      <button class="nav-btn" onclick="navigate('history')">📈 历史</button>
    </div>
  `;
}

// ---- Vitamin D ----
function renderVitamin() {
  return `
    <div class="page-header">
      <h1>💊 维生素 D</h1>
    </div>
    <div class="form-section">
      <div class="form-title">添加记录</div>
      <div class="form-group">
        <label>时间</label>
        <input type="datetime-local" id="v-time" value="${fmtDate(new Date())}">
      </div>
      <div class="form-group">
        <label>剂量 (IU)</label>
        <div class="btn-group">
          <button class="type-btn" onclick="setVitDosage(400)">400 IU</button>
          <button class="type-btn" onclick="setVitDosage(500)">500 IU</button>
          <button class="type-btn" onclick="setVitDosage(600)">600 IU</button>
          <button class="type-btn" onclick="setVitDosage(800)">800 IU</button>
        </div>
        <input type="hidden" id="v-dosage" value="">
      </div>
      <div class="form-group">
        <label>备注</label>
        <input type="text" id="v-note" placeholder="可选备注">
      </div>
      <button class="submit-btn" onclick="submitVitamin()">保存</button>
      <div id="vit-msg" class="msg-success" style="display:none">✅ 记录已保存</div>
    </div>
    <div class="nav-bar">
      <button class="nav-btn" onclick="navigate('dashboard')">📊 今日</button>
      <button class="nav-btn" onclick="navigate('feeding')">🍼 喂奶</button>
      <button class="nav-btn" onclick="navigate('diaper')">🧷 尿布</button>
      <button class="nav-btn" onclick="navigate('sleep')">😴 睡眠</button>
      <button class="nav-btn" onclick="navigate('history')">📈 历史</button>
    </div>
  `;
}

// ---- Sleep ----
function renderSleep() {
  return `
    <div class="page-header">
      <h1>😴 睡眠记录</h1>
    </div>
    <div class="form-section">
      <div class="form-title">添加睡眠</div>
      <div class="form-group">
        <label>开始时间</label>
        <input type="datetime-local" id="s-start" value="${fmtDate(new Date())}">
      </div>
      <div class="form-group">
        <label>时长 (分钟)</label>
        <input type="number" id="s-duration" placeholder="如 90" min="1" max="1440">
      </div>
      <div class="form-group">
        <label>备注</label>
        <input type="text" id="s-note" placeholder="可选备注">
      </div>
      <button class="submit-btn" onclick="submitSleep()">保存</button>
      <div id="sleep-msg" class="msg-success" style="display:none">✅ 记录已保存</div>
    </div>
    <div class="nav-bar">
      <button class="nav-btn" onclick="navigate('dashboard')">📊 今日</button>
      <button class="nav-btn" onclick="navigate('feeding')">🍼 喂奶</button>
      <button class="nav-btn" onclick="navigate('diaper')">🧷 尿布</button>
      <button class="nav-btn" onclick="navigate('sleep')">😴 睡眠</button>
      <button class="nav-btn" onclick="navigate('history')">📈 历史</button>
    </div>
  `;
}

// ---- History ----
function renderHistory() {
  const data = storage.getAll();
  const feedingByDate = groupByDate(data.feedings.map(f => ({ ...f, kind: 'feed' as const })));
  const diaperByDate = groupByDate(data.diapers.map(d => ({ ...d, kind: 'diaper' as const })));
  const sleepByDate = groupByDate(data.sleeps.map(s => ({ ...s, kind: 'sleep' as const })));
  const vitByDate = groupByDate(data.vitamins.map(v => ({ ...v, kind: 'vit' as const })));

  const allDates = [...new Set([...Object.keys(feedingByDate), ...Object.keys(diaperByDate), ...Object.keys(sleepByDate)])].sort().reverse();

  let html = `
    <div class="page-header">
      <h1>📈 历史记录</h1>
    </div>
    <div class="history-chart" id="history-chart"></div>
    <div class="history-list">
  `;

  if (allDates.length === 0) {
    html += '<div class="empty-state">暂无记录，开始记录宝宝的一天吧！</div>';
  } else {
    allDates.slice(0, 14).forEach(date => {
      const fd = feedingByDate[date] || [];
      const dd = diaperByDate[date] || [];
      const sd = sleepByDate[date] || [];
      const vd = vitByDate[date] || [];
      const totalMilk = fd.reduce((s: number, r: any) => s + (r.amount || 0), 0);
      const sleepMin = sd.reduce((s: number, r: any) => s + (r.duration || 0), 0);
      const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' });

      html += `
        <div class="history-day">
          <div class="history-day-header">${dateLabel}</div>
          <div class="history-day-stats">
            <span class="history-stat">🍼 ${fd.length}次 ${totalMilk}ml</span>
            <span class="history-stat">🧷 ${dd.length}次</span>
            <span class="history-stat">😴 ${sd.length}段 ${sleepMin > 0 ? Math.floor(sleepMin/60)+'h'+(sleepMin%60)+'m' : '-'}</span>
            <span class="history-stat">💊 ${vd.length}次</span>
          </div>
        </div>
      `;
    });
  }

  html += `
    </div>
    <div class="import-export-bar">
      <button class="nav-btn" onclick="navigate('import')">📥 导入历史数据</button>
    </div>
    <div class="nav-bar">
      <button class="nav-btn" onclick="navigate('dashboard')">📊 今日</button>
      <button class="nav-btn" onclick="navigate('feeding')">🍼 喂奶</button>
      <button class="nav-btn" onclick="navigate('diaper')">🧷 尿布</button>
      <button class="nav-btn" onclick="navigate('sleep')">😴 睡眠</button>
      <button class="nav-btn" onclick="navigate('history')">📈 历史</button>
    </div>
  `;
  return html;
}

function groupByDate(records: any[]) {
  const grouped: Record<string, any[]> = {};
  records.forEach(r => {
    const d = (r.time || r.startTime).slice(0, 10);
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(r);
  });
  return grouped;
}

// ---- Import ----
function renderImport() {
  return `
    <div class="page-header">
      <h1>📥 导入历史数据</h1>
    </div>
    <div class="form-section">
      <div class="form-title">从剪贴板导入 JSON 数据</div>
      <div class="form-group">
        <label>粘贴 JSON 数据</label>
        <textarea id="import-data" rows="10" placeholder="将之前导出的 JSON 数据粘贴在此"></textarea>
      </div>
      <div class="btn-row">
        <button class="submit-btn" onclick="doImport()">导入数据</button>
        <button class="submit-btn secondary" onclick="doExport()">📤 导出当前数据</button>
      </div>
      <div id="import-msg" class="msg-success" style="display:none">✅ 数据导入成功！</div>
      <div id="import-err" class="msg-error" style="display:none"></div>
    </div>
    <div class="nav-bar">
      <button class="nav-btn" onclick="navigate('dashboard')">📊 今日</button>
      <button class="nav-btn" onclick="navigate('feeding')">🍼 喂奶</button>
      <button class="nav-btn" onclick="navigate('diaper')">🧷 尿布</button>
      <button class="nav-btn" onclick="navigate('sleep')">😴 睡眠</button>
      <button class="nav-btn" onclick="navigate('history')">📈 历史</button>
    </div>
  `;
}

// ---- Router ----
function navigate(page: string) {
  currentPage = page as Page;
  render();
  if (page === 'history') drawChart();
}

function render() {
  let html = '';
  switch (currentPage) {
    case 'dashboard': html = renderDashboard(); break;
    case 'feeding': html = renderFeeding(); break;
    case 'diaper': html = renderDiaper(); break;
    case 'vitamin': html = renderVitamin(); break;
    case 'sleep': html = renderSleep(); break;
    case 'history': html = renderHistory(); break;
    case 'import': html = renderImport(); break;
  }
  $('#app').innerHTML = html;
}

// ---- Chart ----
function drawChart() {
  const data = storage.getAll();
  const days = 7;
  const labels: string[] = [];
  const feedData: number[] = [];
  const diaperData: number[] = [];
  const sleepData: number[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    labels.push(d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }));
    feedData.push(data.feedings.filter(r => r.time.startsWith(dateStr)).reduce((s, r) => s + (r.amount || 0), 0));
    diaperData.push(data.diapers.filter(r => r.time.startsWith(dateStr)).length);
    sleepData.push(Math.round(data.sleeps.filter(r => r.startTime.startsWith(dateStr)).reduce((s, r) => s + (r.duration || 0), 0) / 60));
  }

  const maxMilk = Math.max(...feedData, 100);
  const maxD = Math.max(...diaperData, 5);

  let chartHtml = `<div class="chart-title">近${days}天趋势</div>`;
  chartHtml += `<div class="chart-legend"><span class="legend-item"><span class="dot milk"></span>奶量(ml)</span><span class="legend-item"><span class="dot diaper"></span>尿布(次)</span><span class="legend-item"><span class="dot sleep"></span>睡眠(h)</span></div>`;
  chartHtml += '<div class="bar-chart">';

  for (let i = 0; i < days; i++) {
    const milkH = Math.round((feedData[i] / maxMilk) * 80);
    const diaperH = Math.round((diaperData[i] / maxD) * 80);
    const sleepH = Math.round((sleepData[i] / Math.max(...sleepData, 1)) * 80);
    chartHtml += `
      <div class="bar-group">
        <div class="bars">
          <div class="bar milk" style="height:${milkH}px" title="${feedData[i]}ml"></div>
          <div class="bar diaper" style="height:${diaperH}px" title="${diaperData[i]}次"></div>
          <div class="bar sleep" style="height:${sleepH}px" title="${sleepData[i]}h"></div>
        </div>
        <div class="bar-label">${labels[i]}</div>
      </div>
    `;
  }
  chartHtml += '</div>';
  const chartEl = document.getElementById('history-chart');
  if (chartEl) chartEl.innerHTML = chartHtml;
}

// ---- Form handlers ----
(window as any).navigate = navigate;
(window as any).showFeedingForm = (type: FeedingType) => {
  const form = $('#feeding-form');
  form.style.display = 'block';
  const amountGroup = $('#f-amount-group');
  const durationGroup = $('#f-duration-group');
  amountGroup.style.display = 'none';
  durationGroup.style.display = 'none';
  if (type === 'breast-direct') {
    durationGroup.style.display = 'block';
  } else {
    amountGroup.style.display = 'block';
  }
  (window as any)._feedingType = type;
};

(window as any).setDiaperType = (type: DiaperType) => {
  ($('#d-type') as HTMLInputElement).value = type;
  const details = $('#poop-details') as HTMLElement;
  details.style.display = type === 'poop' || type === 'both' ? 'block' : 'none';
};

(window as any).setPoopColor = (c: PoopColor) => { ($('#d-color') as HTMLInputElement).value = c; };
(window as any).setPoopTexture = (t: PoopTexture) => { ($('#d-texture') as HTMLInputElement).value = t; };
(window as any).setVitDosage = (d: number) => { ($('#v-dosage') as HTMLInputElement).value = d.toString(); };

(window as any).submitFeeding = () => {
  const type: FeedingType = (window as any)._feedingType;
  const time = ($('#f-time') as HTMLInputElement).value;
  const amount = parseInt(($('#f-amount') as HTMLInputElement).value) || undefined;
  const duration = parseInt(($('#f-duration') as HTMLInputElement).value) || undefined;
  const note = ($('#f-note') as HTMLInputElement).value;
  if (!time) { alert('请选择时间'); return; }
  if (type !== 'breast-direct' && !amount) { alert('请输入奶量'); return; }
  if (type === 'breast-direct' && !duration) { alert('请输入时长'); return; }

  storage.addFeeding({ type, time, amount, duration, note });
  const msg = $('#feeding-msg');
  msg.style.display = 'block';
  setTimeout(() => { msg.style.display = 'none'; navigate('dashboard'); }, 1200);
};

(window as any).submitDiaper = () => {
  const time = ($('#d-time') as HTMLInputElement).value;
  const type = ($('#d-type') as HTMLInputElement).value as DiaperType;
  const color = ($('#d-color') as HTMLInputElement).value as PoopColor || undefined;
  const texture = ($('#d-texture') as HTMLInputElement).value as PoopTexture || undefined;
  const note = ($('#d-note') as HTMLInputElement).value;
  if (!time || !type) { alert('请选择时间和类型'); return; }

  storage.addDiaper({ time, type, poopColor: color, poopTexture: texture, note });
  const msg = $('#diaper-msg');
  msg.style.display = 'block';
  setTimeout(() => { msg.style.display = 'none'; navigate('dashboard'); }, 1200);
};

(window as any).submitVitamin = () => {
  const time = ($('#v-time') as HTMLInputElement).value;
  const dosage = parseInt(($('#v-dosage') as HTMLInputElement).value);
  const note = ($('#v-note') as HTMLInputElement).value;
  if (!time || !dosage) { alert('请选择时间和剂量'); return; }

  storage.addVitamin({ time, dosage, note });
  const msg = $('#vit-msg');
  msg.style.display = 'block';
  setTimeout(() => { msg.style.display = 'none'; navigate('dashboard'); }, 1200);
};

(window as any).submitSleep = () => {
  const startTime = ($('#s-start') as HTMLInputElement).value;
  const duration = parseInt(($('#s-duration') as HTMLInputElement).value);
  const note = ($('#s-note') as HTMLInputElement).value;
  if (!startTime || !duration) { alert('请填写开始时间和时长'); return; }

  storage.addSleep({ startTime, duration, note });
  const msg = $('#sleep-msg');
  msg.style.display = 'block';
  setTimeout(() => { msg.style.display = 'none'; navigate('dashboard'); }, 1200);
};

(window as any).doImport = () => {
  const raw = ($('#import-data') as HTMLTextAreaElement).value;
  const errEl = $('#import-err');
  const okEl = $('#import-msg');
  errEl.style.display = 'none';
  try {
    const data = JSON.parse(raw);
    if (!data.feedings || !data.diapers || !data.vitamins || !data.sleeps) throw new Error('Invalid format');
    storage.importData(data);
    okEl.style.display = 'block';
    errEl.style.display = 'none';
  } catch (e: any) {
    errEl.textContent = '❌ 导入失败：' + e.message;
    errEl.style.display = 'block';
  }
};

(window as any).doExport = () => {
  const data = storage.getAll();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `babycare_backup_${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

// Init
render();
