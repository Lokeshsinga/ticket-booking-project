import { io } from 'socket.io-client';

const socketUrl =
  import.meta.env.VITE_SOCKET_URL ||
  'https://ticket-booking-project-t85i.onrender.com';

export const socket = io(socketUrl, {
  autoConnect: false,
  transports: ['websocket', 'polling']
});

export function connectUser(userId) {
  if (!userId) return;

  if (!socket.connected) {
    socket.connect();
  }

  socket.emit('user:join', String(userId));
}

export function disconnectUser(userId) {
  if (socket.connected) {
    if (userId) {
      socket.emit('user:leave', String(userId));
    }

    socket.disconnect();
  }
}