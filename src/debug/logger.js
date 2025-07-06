export function logDebug(message) {
  const div = document.getElementById('game-debug-console');
  if (!div) return;
  const time = new Date().toISOString().slice(11, 19);
  div.innerHTML += `[${time}] ${message}<br>`;
  div.scrollTop = div.scrollHeight;
}
