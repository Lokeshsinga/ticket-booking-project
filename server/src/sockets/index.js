export function configureSockets(io) {
  io.on('connection', (socket) => {
    // Join show room
    socket.on('show:join', (showId) => {
      if (!showId) return;

      socket.join(`show:${showId}`);
    });

    // Leave show room
    socket.on('show:leave', (showId) => {
      if (!showId) return;

      socket.leave(`show:${showId}`);
    });

    // Join user-specific room
    socket.on('user:join', (userId) => {
      if (!userId) return;

      socket.join(`user:${String(userId)}`);
    });

    // Leave user-specific room
    socket.on('user:leave', (userId) => {
      if (!userId) return;

      socket.leave(`user:${String(userId)}`);
    });
  });
}