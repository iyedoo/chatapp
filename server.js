// server.js
const express = require('express');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');

// Initialize app and server
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Store users and their rooms
const users = {};
const rooms = {
  'general': { users: [], messages: [] },
  'tech': { users: [], messages: [] },
  'random': { users: [], messages: [] }
};

// Socket connection handling
io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);

  // Handle user joining
  socket.on('join', ({ username, room }) => {
    // Remove user from previous room if exists
    if (users[socket.id]) {
      const previousRoom = users[socket.id].room;
      rooms[previousRoom].users = rooms[previousRoom].users.filter(
        id => id !== socket.id
      );
      socket.leave(previousRoom);
    }

    // Add user to new room
    users[socket.id] = { username, room };
    rooms[room].users.push(socket.id);
    socket.join(room);

    // Send welcome message to user
    socket.emit('message', {
      username: 'System',
      text: `Welcome to the ${room} room, ${username}!`,
      time: new Date().toLocaleTimeString()
    });

    // Send notification to other users in the room
    socket.to(room).emit('message', {
      username: 'System',
      text: `${username} has joined the room`,
      time: new Date().toLocaleTimeString()
    });

    // Send room info to all users in the room
    io.to(room).emit('roomUsers', {
      room,
      users: rooms[room].users.map(id => users[id].username)
    });

    // Send message history to the user
    socket.emit('messageHistory', rooms[room].messages);
  });

  // Handle chat messages
  socket.on('chatMessage', (message) => {
    const user = users[socket.id];
    if (!user) return;

    const formattedMessage = {
      username: user.username,
      text: message,
      time: new Date().toLocaleTimeString()
    };

    // Store message in room history (limit to last 50)
    rooms[user.room].messages.push(formattedMessage);
    if (rooms[user.room].messages.length > 50) {
      rooms[user.room].messages.shift();
    }

    // Send message to all users in the room
    io.to(user.room).emit('message', formattedMessage);
  });

  // Handle typing notification
  socket.on('typing', (isTyping) => {
    const user = users[socket.id];
    if (!user) return;

    socket.to(user.room).emit('userTyping', {
      username: user.username,
      isTyping
    });
  });

  // Handle user disconnection
  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (!user) return;

    // Remove user from room
    rooms[user.room].users = rooms[user.room].users.filter(
      id => id !== socket.id
    );

    // Notify other users
    io.to(user.room).emit('message', {
      username: 'System',
      text: `${user.username} has left the chat`,
      time: new Date().toLocaleTimeString()
    });

    // Update room user list
    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: rooms[user.room].users.map(id => users[id].username)
    });

    delete users[socket.id];
  });
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});