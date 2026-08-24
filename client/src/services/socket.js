import { io } from 'socket.io-client';

const apiUrl =
  import.meta.env.VITE_API_URL ||
  'http://localhost:4000/api';

const socketUrl = apiUrl.replace(/\/api\/?$/, '');

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