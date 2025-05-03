const express = require('express');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static(path.join(__dirname, 'public')));

const users = {};
const rooms = {
  'general': { users: [], messages: [] },
  'tech': { users: [], messages: [] },
  'random': { users: [], messages: [] }
};

io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);

  socket.on('join', ({ username, room }) => {
    if (users[socket.id]) {
      const previousRoom = users[socket.id].room;
      rooms[previousRoom].users = rooms[previousRoom].users.filter(
        id => id !== socket.id
      );
      socket.leave(previousRoom);
    }

    users[socket.id] = { username, room };
    rooms[room].users.push(socket.id);
    socket.join(room);

    socket.emit('message', {
      username: 'System',
      text: `Welcome to the ${room} room, ${username}!`,
      time: new Date().toLocaleTimeString()
    });

    socket.to(room).emit('message', {
      username: 'System',
      text: `${username} has joined the room`,
      time: new Date().toLocaleTimeString()
    });

    io.to(room).emit('roomUsers', {
      room,
      users: rooms[room].users.map(id => users[id].username)
    });

    socket.emit('messageHistory', rooms[room].messages);
  });

  socket.on('chatMessage', (message) => {
    const user = users[socket.id];
    if (!user) return;

    const formattedMessage = {
      username: user.username,
      text: message,
      time: new Date().toLocaleTimeString()
    };

    rooms[user.room].messages.push(formattedMessage);
    if (rooms[user.room].messages.length > 50) {
      rooms[user.room].messages.shift();
    }

    io.to(user.room).emit('message', formattedMessage);
  });

  socket.on('typing', (isTyping) => {
    const user = users[socket.id];
    if (!user) return;

    socket.to(user.room).emit('userTyping', {
      username: user.username,
      isTyping
    });
  });

  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (!user) return;

    rooms[user.room].users = rooms[user.room].users.filter(
      id => id !== socket.id
    );

    io.to(user.room).emit('message', {
      username: 'System',
      text: `${user.username} has left the chat`,
      time: new Date().toLocaleTimeString()
    });

    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: rooms[user.room].users.map(id => users[id].username)
    });

    delete users[socket.id];
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
