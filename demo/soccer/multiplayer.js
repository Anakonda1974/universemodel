export function initMultiplayer(localPlayer, remotePlayer, ball, url = 'ws://localhost:8080') {
  let socket;
  try {
    socket = new WebSocket(url);
  } catch (e) {
    console.warn('Multiplayer unavailable:', e);
    return null;
  }

  socket.addEventListener('message', (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.t === 'state') {
        remotePlayer.position.x = data.x;
        remotePlayer.position.y = data.y;
      } else if (data.t === 'kick') {
        const dir = { x: data.dx, y: data.dy };
        if (ball.kick) {
          ball.kick(dir, data.p);
        }
      }
    } catch {}
  });

  function sendState() {
    if (socket.readyState === WebSocket.OPEN) {
      const msg = {
        t: 'state',
        x: localPlayer.position.x,
        y: localPlayer.position.y,
      };
      socket.send(JSON.stringify(msg));
    }
  }

  function sendKick(dx, dy, power = 5) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ t: 'kick', dx, dy, p: power }));
    }
  }

  return { socket, sendState, sendKick };
}
