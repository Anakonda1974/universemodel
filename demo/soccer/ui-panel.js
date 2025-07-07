import { messages } from './commentary.js';
import { FIELD_BOUNDS } from './ball.js';

export function initControlPanel({ teams, ball, coach, formations }) {
  const panel = document.createElement('div');
  panel.id = 'controlPanel';
  panel.style.position = 'fixed';
  panel.style.top = '0';
  panel.style.right = '0';
  panel.style.width = '300px';
  panel.style.height = '100%';
  panel.style.background = '#333';
  panel.style.color = '#fff';
  panel.style.fontFamily = 'Arial, sans-serif';
  panel.style.fontSize = '14px';
  panel.style.overflowY = 'auto';
  panel.style.transform = 'translateX(100%)';
  panel.style.transition = 'transform 0.3s';
  panel.innerHTML = `<button id="cp-toggle" style="position:absolute;left:-30px;top:10px">\u2261</button>
  <div id="cp-content" style="padding:8px"></div>`;
  document.body.appendChild(panel);

  const toggle = panel.querySelector('#cp-toggle');
  toggle.onclick = () => {
    panel.style.transform = panel.style.transform === 'translateX(0%)'
      ? 'translateX(100%)' : 'translateX(0%)';
  };

  const content = panel.querySelector('#cp-content');

  /* ------ Input Mapping ------ */
  const inputSection = document.createElement('details');
  inputSection.open = true;
  inputSection.innerHTML = `<summary>Input Mapping</summary>
    <table id="cp-input-table"></table>`;
  content.appendChild(inputSection);

  function getKeyLabel(v) {
    return Array.isArray(v) ? v.join(' / ') : v;
  }
  function listenForKey(cell, action) {
    cell.textContent = 'press key';
    function handler(e) {
      e.preventDefault();
      const code = e.code;
      if (Array.isArray(window.keyBindings[action])) {
        window.keyBindings[action] = [code];
      } else {
        window.keyBindings[action] = code;
      }
      document.removeEventListener('keydown', handler);
      updateInputTable();
    }
    document.addEventListener('keydown', handler);
  }
  function updateInputTable() {
    const table = inputSection.querySelector('#cp-input-table');
    table.innerHTML = '';
    const actions = [
      ['moveUp', 'Move Up'],
      ['moveDown', 'Move Down'],
      ['moveLeft', 'Move Left'],
      ['moveRight', 'Move Right'],
      ['pass', 'Pass'],
      ['shoot', 'Shot'],
      ['tackle', 'Tackle'],
      ['switch', 'Switch'],
      ['togglePress', 'Toggle Press'],
      ['reset', 'Reset'],
    ];
    actions.forEach(([key, label]) => {
      const row = document.createElement('tr');
      const name = document.createElement('td');
      name.textContent = label;
      const val = document.createElement('td');
      val.textContent = getKeyLabel(window.keyBindings[key]);
      val.style.cursor = 'pointer';
      val.onclick = () => listenForKey(val, key);
      row.appendChild(name);
      row.appendChild(val);
      table.appendChild(row);
    });
  }
  updateInputTable();

  /* ------ Player Stats ------ */
  const statsSection = document.createElement('details');
  statsSection.innerHTML = `<summary>Player Stats</summary>
  <div>Team: <select id="cp-team"><option value="home">Home</option><option value="away">Away</option></select>
  Position: <select id="cp-pos"><option value="">All</option></select></div>
  <table id="cp-stats"></table>`;
  content.appendChild(statsSection);

  const positions = new Set();
  [...teams.home, ...teams.away].forEach(p => positions.add(p.position));
  positions.forEach(pos => {
    const opt = document.createElement('option');
    opt.value = pos;
    opt.textContent = pos;
    statsSection.querySelector('#cp-pos').appendChild(opt);
  });

  function updateStats() {
    const teamId = statsSection.querySelector('#cp-team').value;
    const pos = statsSection.querySelector('#cp-pos').value;
    const table = statsSection.querySelector('#cp-stats');
    const players = teamId === 'home' ? teams.home : teams.away;
    table.innerHTML = '<tr><th>Role</th><th>Speed</th><th>Technique</th><th>Vision</th></tr>';
    players.filter(p => !pos || p.position === pos).forEach(p => {
      const row = document.createElement('tr');
      row.innerHTML = `<td>${p.position}</td><td>${p.base.speed.toFixed(2)}</td><td>${p.base.technique.toFixed(2)}</td><td>${p.base.vision.toFixed(2)}</td>`;
      table.appendChild(row);
    });
  }
  statsSection.querySelector('#cp-team').onchange = updateStats;
  statsSection.querySelector('#cp-pos').onchange = updateStats;
  updateStats();

  /* ------ Formation ------ */
  const formationSection = document.createElement('details');
  formationSection.innerHTML = `<summary>Formation</summary>
    <select id="cp-form"></select> <button id="cp-apply-form">Apply</button>`;
  content.appendChild(formationSection);
  const formSelect = formationSection.querySelector('#cp-form');
  formations.forEach((f, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = f.name;
    formSelect.appendChild(opt);
  });
  formationSection.querySelector('#cp-apply-form').onclick = () => {
    if (window.setFormation) window.setFormation(+formSelect.value);
  };

  /* ------ Pitch Info ------ */
  const pitchSection = document.createElement('details');
  pitchSection.innerHTML = `<summary>Pitch Info</summary><div id="cp-pitch"></div>`;
  content.appendChild(pitchSection);
  function updatePitch() {
    const div = pitchSection.querySelector('#cp-pitch');
    const w = FIELD_BOUNDS.maxX - FIELD_BOUNDS.minX;
    const h = FIELD_BOUNDS.maxY - FIELD_BOUNDS.minY;
    div.textContent = `Size: ${w} x ${h} | Weather: ${window.weather?.type}`;
  }
  updatePitch();

  /* ------ Enhanced Debug Controls ------ */
  const debugSection = document.createElement('details');
  debugSection.open = true;
  debugSection.innerHTML = `<summary>🔧 Debug Options</summary>
    <div style="margin: 10px 0;">
      <label style="display: block; margin: 8px 0; cursor: pointer;">
        <input id="cp-zones" type="checkbox" style="margin-right: 8px;">
        <span style="font-weight: bold;">Player Zones</span>
        <div style="font-size: 11px; color: #aaa; margin-left: 20px;">Show tactical positioning zones (selected player only)</div>
      </label>
      <label style="display: block; margin: 8px 0; cursor: pointer;">
        <input id="cp-fov" type="checkbox" style="margin-right: 8px;">
        <span style="font-weight: bold;">Field of View</span>
        <div style="font-size: 11px; color: #aaa; margin-left: 20px;">Show player perception cones (selected player only)</div>
      </label>
      <label style="display: block; margin: 8px 0; cursor: pointer;">
        <input id="cp-ballvec" type="checkbox" style="margin-right: 8px;">
        <span style="font-weight: bold;">Ball Physics</span>
        <div style="font-size: 11px; color: #aaa; margin-left: 20px;">Show ball trajectory and vectors</div>
      </label>
      <label style="display: block; margin: 8px 0; cursor: pointer;">
        <input id="cp-formation" type="checkbox" style="margin-right: 8px;">
        <span style="font-weight: bold;">Formation Debug</span>
        <div style="font-size: 11px; color: #aaa; margin-left: 20px;">Show formation positioning guides (selected player only)</div>
      </label>
      <label style="display: block; margin: 8px 0; cursor: pointer;">
        <input id="cp-targets" type="checkbox" style="margin-right: 8px;">
        <span style="font-weight: bold;">Player Targets</span>
        <div style="font-size: 11px; color: #aaa; margin-left: 20px;">Show movement target indicators (selected player only)</div>
      </label>
    </div>`;
  content.appendChild(debugSection);
  const dbg = window.debugOptions;
  debugSection.querySelector('#cp-zones').checked = dbg.showZones;
  debugSection.querySelector('#cp-fov').checked = dbg.showFOV;
  debugSection.querySelector('#cp-ballvec').checked = dbg.showBall;
  debugSection.querySelector('#cp-formation').checked = dbg.showFormation;
  debugSection.querySelector('#cp-targets').checked = dbg.showTargets;
  debugSection.querySelector('#cp-zones').onchange = e => { dbg.showZones = e.target.checked; };
  debugSection.querySelector('#cp-fov').onchange = e => { dbg.showFOV = e.target.checked; };
  debugSection.querySelector('#cp-ballvec').onchange = e => { dbg.showBall = e.target.checked; };
  debugSection.querySelector('#cp-formation').onchange = e => { dbg.showFormation = e.target.checked; };
  debugSection.querySelector('#cp-targets').onchange = e => { dbg.showTargets = e.target.checked; };

  /* ------ Rendering Options ------ */
  const renderSection = document.createElement('details');
  renderSection.innerHTML = `<summary>Rendering Options</summary>
    <label><input id="cp-dark" type="checkbox"> Dark Mode</label><br>
    <label>Line Alpha <input id="cp-alpha" type="range" min="0" max="1" step="0.1" value="1"></label><br>
    <label>Colour Profile <select id="cp-colors">
      <option value="default">Default</option>
      <option value="classic">Classic</option>
      <option value="highContrast">High Contrast</option>
    </select></label>`;
  content.appendChild(renderSection);
  renderSection.querySelector('#cp-dark').onchange = e => {
    document.documentElement.style.setProperty('--bg-color', e.target.checked ? '#111' : '#222');
  };
  renderSection.querySelector('#cp-alpha').oninput = e => {
    window.renderOptions.lineAlpha = parseFloat(e.target.value);
  };
  renderSection.querySelector('#cp-colors').value = window.renderOptions.colorProfile;
  renderSection.querySelector('#cp-colors').onchange = e => {
    window.renderOptions.colorProfile = e.target.value;
    if (window.applyColorProfile) window.applyColorProfile(e.target.value);
  };
  window.renderOptions = { lineAlpha: 1, colorProfile: 'default' };

  /* ------ Live Data ------ */
  const liveSection = document.createElement('details');
  liveSection.innerHTML = `<summary>Live Data</summary>
    <button id="cp-dl">Download</button>
    <pre id="cp-json" style="white-space:pre-wrap"></pre>`;
  content.appendChild(liveSection);
  function gatherData() {
    return {
      time: window.matchTime,
      ball: { x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy, owner: ball.owner ? ball.owner.role : null },
      home: teams.home.map(p => ({ role: p.position, x: p.x, y: p.y })),
      away: teams.away.map(p => ({ role: p.position, x: p.x, y: p.y })),
    };
  }
  function updateLive() {
    liveSection.querySelector('#cp-json').textContent = JSON.stringify(gatherData(), null, 2);
  }
  setInterval(updateLive, 1000);
  liveSection.querySelector('#cp-dl').onclick = () => {
    const data = JSON.stringify(gatherData(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'state.json';
    a.click();
  };
  updateLive();

  /* ------ Log ------ */
  const logSection = document.createElement('details');
  logSection.innerHTML = `<summary>Log / Console</summary><div id="cp-log"></div>`;
  content.appendChild(logSection);
  function updateLog() {
    logSection.querySelector('#cp-log').innerHTML = messages.map(m => `<div>${m}</div>`).join('');
  }
  setInterval(updateLog, 500);
  updateLog();
}
