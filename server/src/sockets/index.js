export function configureSockets(io){io.on('connection',socket=>{socket.on('show:join',showId=>socket.join(`show:${showId}`));socket.on('show:leave',showId=>socket.leave(`show:${showId}`));});}
