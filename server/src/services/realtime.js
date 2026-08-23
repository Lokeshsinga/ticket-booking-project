let io;
export const setIo = (value) => { io = value; };
export const emitSeats = (showId, seats) => io?.to(`show:${showId}`).emit('seats:updated', { showId: String(showId), seats: seats.map(({seatId,row,number,category,price,status,holdExpiresAt})=>({seatId,row,number,category,price,status,holdExpiresAt})) });
