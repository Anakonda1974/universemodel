const messages = [];
const maxMessages = 5;

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

export function logComment(text) {
  messages.push(text);
  if (messages.length > maxMessages) messages.shift();
  const div = document.getElementById('commentary');
  if (div) {
    div.innerHTML = messages.map(m => `<div>${escapeHtml(m)}</div>`).join('');
  }
}

export function clearComments() {
  messages.length = 0;
  const div = document.getElementById('commentary');
  if (div) div.innerHTML = '';
}
