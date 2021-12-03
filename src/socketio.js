import server, { app } from './app';
import { Server } from 'socket.io';
import { log } from './utils/log';
import MantisService from './api/services/reconciliation/mantis.service';


const io = new Server(server, { cors: { origin: '*' } });
app.set('io', io);

io.on('connection', (socket) => {
  log('socketio', `Client ${socket.id} connected`);

  socket.on('disconnect', () => {
    log('socketio', `Client ${socket.id} disconnected`);
  });
});

// check if there pending tables when server restarts
MantisService.checkPendingTable(io);

export default io;
