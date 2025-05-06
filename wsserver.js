const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const os = require('os');
const path = require('path');
const multer = require('multer');
const fs = require('fs').promises;

// Cleanup configuration
const CLEANUP_INTERVAL = 1 * 60 * 60 * 1000; // Run cleanup every hour
const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Function to cleanup old files
async function cleanupOldFiles() {
    const uploadsDir = path.join(__dirname, 'uploads');
    try {
        const files = await fs.readdir(uploadsDir);
        const now = Date.now();

        for (const file of files) {
            const filePath = path.join(uploadsDir, file);
            const stats = await fs.stat(filePath);
            const fileAge = now - stats.mtimeMs;

            if (fileAge > MAX_AGE) {
                await fs.unlink(filePath);
                console.log(`Deleted old file: ${file}`);
            }
        }
    } catch (error) {
        console.error('Error during file cleanup:', error);
    }
}

// Run cleanup on server start and then every hour
cleanupOldFiles();
setInterval(cleanupOldFiles, CLEANUP_INTERVAL);

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + Math.random().toString(36).substring(2, 15) + path.extname(file.originalname))
    }
});

const upload = multer({ storage: storage });

// Get all network interfaces
function getServerAddresses() {
    const interfaces = os.networkInterfaces();
    const addresses = {
        ipv4: [],
        ipv6: []
    };

    Object.values(interfaces).forEach(iface => {
        iface.forEach(addr => {
            if (addr.family === 'IPv4' && !addr.internal) {
                addresses.ipv4.push(addr.address);
            } else if (addr.family === 'IPv6' && !addr.internal) {
                addresses.ipv6.push(addr.address);
            }
        });
    });

    return addresses;
}

const serverAddresses = getServerAddresses();
const PORT = 8080;

// Serve static files
app.use(express.static(__dirname));
app.use('/uploads', express.static('uploads')); // Serve uploaded files

// Middleware for file uploads
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    // Create URL for the uploaded file
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    
    // Send file information back to client
    res.json({
        name: req.file.originalname,
        url: fileUrl,
        type: req.file.mimetype,
        size: req.file.size
    });
});

// User data storage configuration
const USER_DATA_FILE = path.join(__dirname, 'data', 'users.json');
const MESSAGES_FILE = path.join(__dirname, 'data', 'messages.json');
const USER_DATA_DIR = path.join(__dirname, 'data');

// Initialize storage
async function initializeStorage() {
    try {
        // Create data directory if it doesn't exist
        await fs.mkdir(USER_DATA_DIR, { recursive: true });
        
        // Initialize users.json if needed
        try {
            await fs.access(USER_DATA_FILE);
        } catch {
            await fs.writeFile(USER_DATA_FILE, JSON.stringify({ users: {} }));
        }

        // Initialize messages.json if needed
        try {
            await fs.access(MESSAGES_FILE);
        } catch {
            await fs.writeFile(MESSAGES_FILE, JSON.stringify({ messages: [] }));
        }
    } catch (error) {
        console.error('Error initializing storage:', error);
    }
}

// Load user data
async function loadUserData() {
    try {
        const data = await fs.readFile(USER_DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading user data:', error);
        return { users: {} };
    }
}

// Save user data
async function saveUserData(userData) {
    try {
        await fs.writeFile(USER_DATA_FILE, JSON.stringify(userData, null, 2));
    } catch (error) {
        console.error('Error saving user data:', error);
    }
}

// Load messages
async function loadMessages() {
    try {
        const data = await fs.readFile(MESSAGES_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading messages:', error);
        return { messages: [] };
    }
}

// Save messages
async function saveMessage(messageData) {
    try {
        const data = await loadMessages();
        data.messages.push(messageData);
        await fs.writeFile(MESSAGES_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving message:', error);
    }
}

// Get user's message history
async function getUserMessages(username) {
    try {
        const data = await loadMessages();
        return data.messages; // Return all messages instead of filtering
    } catch (error) {
        console.error('Error getting user messages:', error);
        return [];
    }
}

// Initialize storage on server start
initializeStorage();

// Store active users
const users = new Map(); // socket.id -> username
const activeUsers = new Set(); // Set of usernames

// Socket.IO connection handling
io.on('connection', (socket) => {
    // Send server addresses to new client
    socket.emit('serverInfo', serverAddresses);
    
    // Handle user registration/login
    socket.on('register', async ({ username, password }, callback) => {
        // Clean and validate username
        username = username.trim();
        
        // Check if username is empty
        if (!username || !password) {
            if (typeof callback === 'function') {
                callback({ success: false, message: 'Username and password are required' });
            }
            return;
        }
        
        // Check if username is too long
        if (username.length > 20) {
            if (typeof callback === 'function') {
                callback({ success: false, message: 'Username is too long (max 20 characters)' });
            }
            return;
        }
        
        // Check if username contains only allowed characters
        if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
            if (typeof callback === 'function') {
                callback({ success: false, message: 'Username can only contain letters, numbers, underscores, and hyphens' });
            }
            return;
        }

        try {
            // Load current user data
            const userData = await loadUserData();
            
            // Check if user exists
            if (userData.users[username]) {
                // Existing user - verify password
                if (userData.users[username].password !== password) {
                    if (typeof callback === 'function') {
                        callback({ success: false, message: 'Incorrect password' });
                    }
                    return;
                }
                // Update login info
                userData.users[username].lastLogin = Date.now();
                userData.users[username].loginCount++;
            } else {
                // New user - create account
                userData.users[username] = {
                    created: Date.now(),
                    lastLogin: Date.now(),
                    loginCount: 1,
                    password: password,
                    preferences: {}
                };
            }
            
            // Save updated user data
            await saveUserData(userData);
            
            // Register user in active sessions
            users.set(socket.id, username);
            activeUsers.add(username);
            
            // Load and send user's message history
            const messageHistory = await getUserMessages(username);
            socket.emit('message_history', messageHistory);
            
            // Send welcome message
            socket.emit('info', `Welcome ${username}!`);
            
            // Notify other users and log
            console.log(`✨ ${username} has joined the chat`);
            socket.broadcast.emit('info', `${username} has joined the chat`);
            
            // Update user list for everyone
            io.emit('userList', Array.from(activeUsers));
            
            // Send success response
            if (typeof callback === 'function') {
                callback({ success: true });
            }
        } catch (error) {
            console.error('Error in user registration:', error);
            if (typeof callback === 'function') {
                callback({ success: false, message: 'Internal server error' });
            }
        }
    });
    
    // Handle chat messages
    socket.on('chat', async (data) => {
        const sender = users.get(socket.id);
        if (!sender) return;
        
        const messageData = {
            sender: sender,
            message: data.message,
            timestamp: Date.now(),
            type: 'text'
        };
        
        // Save message to storage
        await saveMessage(messageData);
        
        // Log message and broadcast to all clients
        console.log(`💬 ${sender}: ${data.message}`);
        io.emit('chat', messageData);
    });

    // Handle typing indicator
    socket.on('typing', (isTyping) => {
        const username = users.get(socket.id);
        if (!username) return;
        
        socket.broadcast.emit('typing', isTyping ? username : null);
    });

    // Handle file messages
    socket.on('file', async (fileInfo) => {
        const sender = users.get(socket.id);
        if (!sender) return;

        const messageData = {
            sender: sender,
            ...fileInfo,
            timestamp: Date.now(),
            type: 'file'
        };

        // Save file message to storage
        await saveMessage(messageData);

        // Broadcast to others
        socket.broadcast.emit('newFile', messageData);
    });

    // Handle video messages with storage
    socket.on('video', async (data, callback) => {
        const sender = users.get(socket.id);
        if (!sender) return;

        const messageData = {
            sender: sender,
            videoPath: `/uploads/${data.filename}`,
            videoName: data.filename,
            fileSize: formatFileSize(data.fileSize),
            timestamp: Date.now(),
            type: 'video'
        };

        // Save video message to storage
        await saveMessage(messageData);

        // Broadcast to others
        socket.broadcast.emit('video', messageData);

        // Acknowledge sender
        socket.emit('video-sent', messageData);

        if (typeof callback === 'function') {
            callback({ success: true });
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        const username = users.get(socket.id);
        if (username) {
            users.delete(socket.id);
            activeUsers.delete(username);
            
            // Notify other users and log
            console.log(`👋 ${username} has left the chat`);
            io.emit('info', `${username} has left the chat`);
            io.emit('userList', Array.from(activeUsers));
        }
    });
});

// Helper function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Start the server
http.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('Available IP addresses:');
    serverAddresses.ipv4.forEach(ip => console.log(`  http://${ip}:${PORT}`));
    serverAddresses.ipv6.forEach(ip => console.log(`  http://[${ip}]:${PORT}`));
});