import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const URL = import.meta.env.PROD ? undefined : 'http://localhost:3000';

export default function useSocket() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io(URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('error', (err) => {
      const message = err?.message || JSON.stringify(err);
      alert('Ошибка сервера:\n' + message);
    });
    socket.on('connect_error', (err) => {
      alert('Не удалось подключиться:\n' + (err?.message || String(err)));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return { socket: socketRef.current, connected };
}
