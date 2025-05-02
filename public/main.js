// public/js/main.js
const socket = io();

// DOM elements
const loginModal = document.getElementById('login-modal');
const chatContainer = document.getElementById('chat-container');
const joinForm = document.getElementById('join-form');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const chatMessages = document.getElementById('chat-messages');
const roomName = document.getElementById('room-name');
const usersList = document.getElementById('users-list');
const onlineCount = document.getElementById('online-count');
const roomButtons = document.querySelectorAll('.room-btn');
const typingIndicator = document.getElementById('typing-indicator');
const typingText = document.getElementById('typing-text');

// User data
let currentUser = null;
let currentRoom = null;
let typingTimeout = null;

// Hide chat interface initially
chatContainer.style.display = 'none';

// Join form submission
joinForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const username = document.getElementById('username').value.trim();
  const room = document.getElementById('room').value;
  
  if (!username) return;
  
  // Set current user and room
  currentUser = username;
  currentRoom = room;
  
  // Join room
  socket.emit('join', { username, room });
  
  // Show chat interface and hide login modal
  loginModal.style.display = 'none';
  chatContainer.style.display = 'flex';
  
  // Update room name
  roomName.textContent = formatRoomName(room);
  
  // Set active room button
  setActiveRoomButton(room);
  
  // Focus on message input
  messageInput.focus();
});

// Message form submission
messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const message = messageInput.value.trim();
  
  if (!message) return;
  
  // Send message to server
  socket.emit('chatMessage', message);
  
  // Clear input
  messageInput.value = '';
  
  // Stop typing indicator
  socket.emit('typing', false);
  
  // Focus on input
  messageInput.focus();
});

// Handle typing indicator
messageInput.addEventListener('input', () => {
  clearTimeout(typingTimeout);
  
  // User is typing
  socket.emit('typing', true);
  
  // Set timeout to stop showing typing after user stops
  typingTimeout = setTimeout(() => {
    socket.emit('typing', false);
  }, 1000);
});

// Handle typing indicator events
socket.on('userTyping', ({ username, isTyping }) => {
  if (isTyping) {
    typingText.textContent = `${username} is typing`;
    typingIndicator.classList.add('active');
  } else {
    typingIndicator.classList.remove('active');
  }
});

// Room change buttons
roomButtons.forEach(button => {
  button.addEventListener('click', () => {
    const newRoom = button.getAttribute('data-room');
    
    if (newRoom === currentRoom) return;
    
    // Join new room
    socket.emit('join', { username: currentUser, room: newRoom });
    
    // Update current room
    currentRoom = newRoom;
    
    // Update room name
    roomName.textContent = formatRoomName(newRoom);
    
    // Set active room button
    setActiveRoomButton(newRoom);
    
    // Clear messages
    chatMessages.innerHTML = '';
  });
});

// Receive message from server
socket.on('message', (message) => {
  displayMessage(message);
  
  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

// Get message history
socket.on('messageHistory', (messages) => {
  // Clear messages
  chatMessages.innerHTML = '';
  
  // Display each message
  messages.forEach(displayMessage);
  
  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

// Get room users
socket.on('roomUsers', ({ room, users }) => {
  // Update user list
  usersList.innerHTML = '';
  users.forEach(user => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="user-status"></div>
      ${user === currentUser ? `${user} (You)` : user}
    `;
    usersList.appendChild(li);
  });
  
  // Update online count
  onlineCount.textContent = users.length;
});

// Display message in DOM
function displayMessage(message) {
  const div = document.createElement('div');
  
  if (message.username === 'System') {
    div.classList.add('message', 'system');
    div.innerHTML = `${message.text}`;
  } else {
    div.classList.add(
      'message',
      message.username === currentUser ? 'sent' : 'received'
    );
    div.innerHTML = `
      <div class="message-info">
        <span class="username">${message.username === currentUser ? 'You' : message.username}</span>
        <span class="time">${message.time}</span>
      </div>
      <div class="message-text">${message.text}</div>
    `;
  }
  
  chatMessages.appendChild(div);
}

// Format room name (capitalize first letter)
function formatRoomName(room) {
  return room.charAt(0).toUpperCase() + room.slice(1);
}

// Set active room button
function setActiveRoomButton(room) {
  roomButtons.forEach(button => {
    if (button.getAttribute('data-room') === room) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
}