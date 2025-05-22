Let's break down this Node.js chat application server code line by line.

This server uses several Node.js modules to handle various functionalities like web server creation, real-time communication, file uploads, and file system operations.

### Section 1: Setting up the Core Server and Modules

```javascript
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const os = require('os');
```

* `const express = require('express');`: This line imports the `express` module[cite: 1]. Express is a popular web framework for Node.js that simplifies building web applications and APIs.
* `const app = express();`: This initializes an Express application[cite: 1]. The `app` object will be used to configure routes, middleware, and other server-side logic.
* `const http = require('http').createServer(app);`: This line creates an HTTP server using Node.js's built-in `http` module[cite: 1]. It passes the `express` app (`app`) to this server, meaning that Express will handle incoming HTTP requests.
* `const io = require('socket.io')(http);`: This is the core of the real-time communication[cite: 1]. It initializes `socket.io` and attaches it to the `http` server. Socket.IO is a library that enables real-time, bidirectional, and event-based communication between web clients and servers.
* `const os = require('os');`: This imports the `os` module, which provides operating system-related utility methods[cite: 1]. It will be used later to get network interface information.

<!-- end list -->

```javascript
const path = require('path');
const multer = require('multer');
const fs = require('fs').promises;
```

* `const path = require('path');`: This line imports the `path` module[cite: 2]. The `path` module provides utilities for working with file and directory paths.
* `const multer = require('multer');`: This imports the `multer` module[cite: 2]. Multer is a middleware for Express.js that handles `multipart/form-data`, primarily used for uploading files.
* `const fs = require('fs').promises;`: This imports the `fs` (file system) module[cite: 2]. By adding `.promises`, we are using the promise-based version of the file system methods, which makes asynchronous operations easier to handle with `async/await`.

### Section 2: File Cleanup Configuration and Function

```javascript
// Cleanup configuration
const CLEANUP_INTERVAL = 1 * 60 * 60 * 1000;
// Run cleanup every hour
const MAX_AGE = 24 * 60 * 60 * 1000;
// 24 hours in milliseconds
```

* `const CLEANUP_INTERVAL = 1 * 60 * 60 * 1000;`: This defines a constant for the cleanup interval[cite: 3]. It's set to 1 hour (1 minute \* 60 seconds \* 60 minutes \* 1000 milliseconds)[cite: 3]. This means a cleanup function will run every hour[cite: 4].
* `const MAX_AGE = 24 * 60 * 60 * 1000;`: This constant defines the maximum age for files before they are deleted[cite: 4]. It's set to 24 hours in milliseconds[cite: 5].

<!-- end list -->

```javascript
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
```

* `async function cleanupOldFiles() { ... }`: This defines an asynchronous function named `cleanupOldFiles`. It's `async` because it uses `await` for file system operations.
* `const uploadsDir = path.join(__dirname, 'uploads');`: This line constructs the absolute path to the `uploads` directory[cite: 5]. `__dirname` is a global Node.js variable that holds the directory name of the current module.
* `try { ... } catch (error) { ... }`: This is a `try-catch` block for error handling. Any errors during the file cleanup process will be caught and logged[cite: 6, 11].
* `const files = await fs.readdir(uploadsDir);`: This line asynchronously reads the contents of the `uploads` directory and returns an array of filenames[cite: 6].
* `const now = Date.now();`: This gets the current timestamp in milliseconds[cite: 6].
* `for (const file of files) { ... }`: This loop iterates over each file found in the `uploads` directory[cite: 7].
* `const filePath = path.join(uploadsDir, file);`: This constructs the full path to the current file[cite: 7].
* `const stats = await fs.stat(filePath);`: This asynchronously gets statistics about the file (like creation time, modification time, size, etc.)[cite: 8].
* `const fileAge = now - stats.mtimeMs;`: This calculates the age of the file by subtracting its last modification time (`stats.mtimeMs`) from the current time[cite: 8].
* `if (fileAge > MAX_AGE) { ... }`: This condition checks if the file's age is greater than `MAX_AGE` (24 hours)[cite: 9].
* `await fs.unlink(filePath);`: If the file is older than `MAX_AGE`, this line asynchronously deletes the file[cite: 9].
* `console.log(`Deleted old file: ${file}`);`: A message is logged to the console indicating which file was deleted[cite: 10].
* `console.error('Error during file cleanup:', error);`: If an error occurs during cleanup, it's logged to the console[cite: 11].

<!-- end list -->

```javascript
// Run cleanup on server start and then every hour
cleanupOldFiles();
setInterval(cleanupOldFiles, CLEANUP_INTERVAL);
```

* `cleanupOldFiles();`: This line immediately calls the `cleanupOldFiles` function when the server starts.
* `setInterval(cleanupOldFiles, CLEANUP_INTERVAL);`: This sets up a timer that will call `cleanupOldFiles` repeatedly at the `CLEANUP_INTERVAL` (every hour)[cite: 11].

### Section 3: Multer Configuration for File Uploads

```javascript
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
```

* `const storage = multer.diskStorage({ ... });`: This configures how Multer should store uploaded files[cite: 12]. `diskStorage` specifies that files should be saved to the disk.
* `destination: function (req, file, cb) { cb(null, 'uploads/') }`: This function determines the directory where the uploaded files will be stored[cite: 12]. `cb(null, 'uploads/')` means the files will be saved in a folder named `uploads`. `null` indicates no error.
* `filename: function (req, file, cb) { ... }`: This function determines the name of the file within the `destination`[cite: 12].
* `Date.now()`: Gets the current timestamp, ensuring a unique prefix.
* `Math.random().toString(36).substring(2, 15)`: Generates a random alphanumeric string for further uniqueness.
* `path.extname(file.originalname)`: Appends the original file extension (e.g., `.jpg`, `.pdf`) to the new filename[cite: 12].
* `const upload = multer({ storage: storage });`: This creates a Multer instance using the defined `storage` configuration[cite: 13]. This `upload` object will be used as middleware in Express routes to handle file uploads.

### Section 4: Server Address Retrieval

```javascript
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
```

* `function getServerAddresses() { ... }`: This function retrieves the server's network addresses (IPv4 and IPv6).
* `const interfaces = os.networkInterfaces();`: This uses the `os` module to get information about all network interfaces on the system[cite: 13].
* `const addresses = { ipv4: [], ipv6: [] };`: Initializes an object to store IPv4 and IPv6 addresses[cite: 14].
* `Object.values(interfaces).forEach(iface => { ... });`: This iterates through each network interface[cite: 15].
* `iface.forEach(addr => { ... });`: This iterates through each address associated with a particular interface[cite: 15].
* `if (addr.family === 'IPv4' && !addr.internal) { ... }`: Checks if the address is an IPv4 address and not an internal (loopback) address[cite: 15]. If so, it's added to the `ipv4` array.
* `else if (addr.family === 'IPv6' && !addr.internal) { ... }`: Checks if the address is an IPv6 address and not an internal address[cite: 15]. If so, it's added to the `ipv6` array.
* `return addresses;`: Returns the object containing all discovered IPv4 and IPv6 addresses[cite: 15].
* `const serverAddresses = getServerAddresses();`: Calls the function to get the server's network addresses and stores them.
* `const PORT = 8080;`: Defines the port number on which the server will listen[cite: 16].

### Section 5: Express Middleware and Routes

```javascript
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
```

* `app.use(express.static(__dirname));`: This line serves static files from the root directory of your application[cite: 17]. For example, if you have an `index.html` file in the same directory as your server.js, it will be accessible at `http://localhost:8080/index.html`.
* `app.use('/uploads', express.static('uploads'));`: This serves files from the `uploads` directory under the `/uploads` URL path[cite: 17]. This means if a file is uploaded as `12345-abc.png` in the `uploads` directory, it can be accessed at `http://localhost:8080/uploads/12345-abc.png`.
* `app.post('/upload', upload.single('file'), (req, res) => { ... });`: This defines an Express route that handles `POST` requests to the `/upload` endpoint[cite: 17].
* `upload.single('file')`: This is the Multer middleware. It processes a single file upload, where the name of the file input field in the HTML form is `'file'`[cite: 17]. The uploaded file information will be available in `req.file`.
* `if (!req.file) { return res.status(400).json({ error: 'No file uploaded' }); }`: If no file is uploaded (e.g., the client didn't send a file), it sends a 400 Bad Request status with an error message[cite: 17].
* ` const fileUrl =  `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;`: This constructs the full URL where the uploaded file can be accessed[cite: 17].
* `req.protocol`: Gets the protocol (e.g., `http` or `https`).
* `req.get('host')`: Gets the host (e.g., `localhost:8080` or an IP address).
* `/uploads/${req.file.filename}`: Appends the path to the uploaded file.
* `res.json({ ... });`: Sends a JSON response back to the client with details about the uploaded file, including its original name, the generated URL, MIME type, and size[cite: 17, 18].

### Section 6: User and Message Data Storage Configuration

```javascript
// User data storage configuration
const USER_DATA_FILE = path.join(__dirname, 'data', 'users.json');
const MESSAGES_FILE = path.join(__dirname, 'data', 'messages.json');
const USER_DATA_DIR = path.join(__dirname, 'data');
```

* `const USER_DATA_FILE = path.join(__dirname, 'data', 'users.json');`: Defines the full path to the `users.json` file, which will store user data[cite: 19]. It's located inside a `data` directory within the application's root.
* `const MESSAGES_FILE = path.join(__dirname, 'data', 'messages.json');`: Defines the full path to the `messages.json` file, which will store chat messages[cite: 19].
* `const USER_DATA_DIR = path.join(__dirname, 'data');`: Defines the full path to the `data` directory itself[cite: 20].

<!-- end list -->

```javascript
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
```

* `async function initializeStorage() { ... }`: An asynchronous function to ensure that the necessary data files and directories exist when the server starts.
* `await fs.mkdir(USER_DATA_DIR, { recursive: true });`: Attempts to create the `data` directory[cite: 20]. `recursive: true` means it will create parent directories if they don't exist.
* `try { await fs.access(USER_DATA_FILE); } catch { await fs.writeFile(USER_DATA_FILE, JSON.stringify({ users: {} })); }`:
* `await fs.access(USER_DATA_FILE);`: Tries to access `users.json`[cite: 21]. If the file exists, this succeeds.
* `catch { await fs.writeFile(USER_DATA_FILE, JSON.stringify({ users: {} })); }`: If `fs.access` fails (meaning the file doesn't exist), it enters the `catch` block[cite: 22]. It then writes an empty JSON object `{ users: {} }` to `users.json`, effectively initializing it[cite: 22].
* The same logic is applied to `MESSAGES_FILE` to initialize it with `{ messages: [] }` if it doesn't exist[cite: 23, 24, 25].
* `console.error('Error initializing storage:', error);`: Logs any errors that occur during storage initialization[cite: 26].

### Section 7: User Data and Message Handling Functions

```javascript
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
```

These functions are wrappers around file system operations for managing `users.json` and `messages.json`.

* **`loadUserData()`**:
* Reads the `users.json` file[cite: 27].
* Parses the JSON string into a JavaScript object[cite: 27].
* Returns the parsed data[cite: 27].
* If there's an error (e.g., file not found or corrupted JSON), it logs the error and returns an empty user object `{ users: {} }`[cite: 28].
* **`saveUserData(userData)`**:
* Takes `userData` object as an argument.
* Converts the `userData` object back into a JSON string using `JSON.stringify(userData, null, 2)` (the `null, 2` part is for pretty-printing the JSON with 2-space indentation)[cite: 29].
* Asynchronously writes the JSON string to `users.json`[cite: 29].
* Logs any errors during saving[cite: 30].
* **`loadMessages()`**:
* Similar to `loadUserData`, but for `messages.json`[cite: 31].
* Returns the parsed messages data or an empty array `{ messages: [] }` on error[cite: 32].
* **`saveMessage(messageData)`**:
* Loads existing messages using `loadMessages()`[cite: 33].
* Pushes the new `messageData` into the `messages` array[cite: 33].
* Saves the updated messages array back to `messages.json`[cite: 33].
* Logs any errors during saving[cite: 34].
* **`getUserMessages(username)`**:
* Loads all messages from `messages.json`[cite: 35].
* **Note**: The comment `// Return all messages instead of filtering` indicates that currently, it returns *all* messages, not just messages specific to the `username` argument[cite: 35]. This might be a design choice or an area for future improvement.
* Returns an empty array on error[cite: 36].
* `initializeStorage();`: This line ensures that the `data` directory and `users.json`/`messages.json` files are created or initialized when the server starts.

### Section 8: Active User Management

```javascript
// Store active users
const users = new Map();
// socket.id -> username
const activeUsers = new Set(); // Set of usernames
```

* `const users = new Map();`: This `Map` will store a mapping between a Socket.IO client's `socket.id` (a unique identifier for each connected client) and their registered `username`[cite: 37].
* `const activeUsers = new Set();`: This `Set` will store a collection of currently active (logged-in) usernames[cite: 37]. A `Set` is used because it only stores unique values, which is good for a list of active users.

### Section 9: Socket.IO Connection Handling

```javascript
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
    ```

    This is the core of Socket.IO event handling.

    * `io.on('connection', (socket) => { ... });`: This event listener fires whenever a new client connects to the Socket.IO server[cite: 37]. The `socket` object represents the individual client connection.
    * `socket.emit('serverInfo', serverAddresses);`: When a client connects, the server immediately sends the `serverAddresses` (IPv4 and IPv6) to that specific client[cite: 37].
    * `socket.on('register', async ({ username, password }, callback) => { ... });`: This listens for a `register` event from the client[cite: 37]. Clients send their `username` and `password`, and a `callback` function is provided for acknowledging the client.
    * `username = username.trim();`: Removes whitespace from the beginning and end of the username[cite: 37].
    * **Input Validation**:
    * `if (!username || !password) { ... }`: Checks if username or password is empty[cite: 38].
    * `if (username.length > 20) { ... }`: Checks if username is too long (max 20 characters)[cite: 39].
    * `if (!/^[a-zA-Z0-9_-]+$/.test(username)) { ... }`: Uses a regular expression to ensure the username only contains letters, numbers, underscores, and hyphens[cite: 40].
    * If any validation fails, it calls the `callback` (if provided) with `success: false` and an appropriate error message[cite: 38, 39, 41].
    * `try { ... } catch (error) { ... }`: Error handling for the registration process.
    * `const userData = await loadUserData();`: Loads the existing user data from `users.json`[cite: 42].
    * `if (userData.users[username]) { ... }`: Checks if the username already exists in the loaded `userData`[cite: 43].
    * **Existing User (Login)**:
    * `if (userData.users[username].password !== password) { ... }`: If the username exists, it verifies the provided password against the stored password[cite: 44]. If incorrect, it sends an error[cite: 45].
    * `userData.users[username].lastLogin = Date.now();`: Updates the `lastLogin` timestamp for the user[cite: 46].
    * `userData.users[username].loginCount++;`: Increments the `loginCount`[cite: 47].
    * **New User (Registration)**:
    * `else { ... }`: If the username doesn't exist, a new user account is created in `userData`[cite: 48].
    * `created`, `lastLogin`, `loginCount`, `password`, and `preferences` fields are initialized[cite: 48].
    * `await saveUserData(userData);`: Saves the updated `userData` back to `users.json`[cite: 49].
    * `users.set(socket.id, username);`: Adds the new connection to the `users` Map (mapping `socket.id` to `username`)[cite: 50].
    * `activeUsers.add(username);`: Adds the username to the `activeUsers` Set[cite: 50].
    * `const messageHistory = await getUserMessages(username);`: Loads message history (currently all messages)[cite: 51].
    * `socket.emit('message_history', messageHistory);`: Sends the loaded message history to the newly registered/logged-in client[cite: 52].
    * ` socket.emit('info',  `Welcome ${username}\!`);`: Sends a welcome message to the specific client[cite: 53].
    * `console.log(`✨ ${username} has joined the chat`);`: Logs a message to the server console[cite: 53].
    * ` socket.broadcast.emit('info',  `${username} has joined the chat`);`: Emits an `info` event to *all other* connected clients (excluding the sender) to announce the new user[cite: 54].
    * `io.emit('userList', Array.from(activeUsers));`: Emits an updated list of active users to *all* connected clients[cite: 55]. `Array.from()` converts the `Set` to an `Array` for sending.
    * `if (typeof callback === 'function') { callback({ success: true }); }`: If a callback was provided by the client, it's called with `success: true` to acknowledge successful registration/login[cite: 56].
    * Error handling for the entire `try` block[cite: 57, 58].

    <!-- end list -->

    ```javascript
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
    ```

    * `socket.on('chat', async (data) => { ... });`: This listens for a `chat` event from a client[cite: 59]. The `data` object is expected to contain the message.
    * `const sender = users.get(socket.id);`: Retrieves the username associated with the current `socket.id` from the `users` Map[cite: 59].
    * `if (!sender) return;`: If no sender is found (e.g., user not registered/logged in), it stops processing.
    * `const messageData = { ... };`: Creates an object containing the sender's username, the message content, a timestamp, and sets the `type` to `'text'`[cite: 60].
    * `await saveMessage(messageData);`: Asynchronously saves the message to `messages.json`[cite: 60].
    * `console.log(`💬 ${sender}: ${data.message}`);`: Logs the message to the server console[cite: 60].
    * `io.emit('chat', messageData);`: Emits the `chat` event with the `messageData` to *all* connected clients, including the sender[cite: 60].

    <!-- end list -->

    ```javascript
    // Handle typing indicator
    socket.on('typing', (isTyping) => {
        const username = users.get(socket.id);
        if (!username) return;

        socket.broadcast.emit('typing', isTyping ? username : null);
    });
    ```

    * `socket.on('typing', (isTyping) => { ... });`: Listens for a `typing` event from a client[cite: 61]. The `isTyping` parameter is a boolean indicating if the user is typing.
    * `const username = users.get(socket.id);`: Gets the username.
    * `socket.broadcast.emit('typing', isTyping ? username : null);`: Emits a `typing` event to *all other* connected clients[cite: 61]. If `isTyping` is true, it sends the `username`; otherwise, it sends `null` (indicating no one is typing or the previous typing indicator should be cleared).

    <!-- end list -->

    ```javascript
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
    ```

    * `socket.on('file', async (fileInfo) => { ... });`: Listens for a `file` event from a client[cite: 62]. This event is likely sent *after* a file has been successfully uploaded via the `/upload` HTTP route. `fileInfo` is expected to contain details about the uploaded file (e.g., name, URL, type, size).
    * `const sender = users.get(socket.id);`: Gets the sender's username.
    * `const messageData = { ...fileInfo, ... };`: Creates a message object by spreading the `fileInfo` and adding `sender`, `timestamp`, and `type: 'file'`[cite: 63].
    * `await saveMessage(messageData);`: Saves this file message to `messages.json`[cite: 63].
    * `socket.broadcast.emit('newFile', messageData);`: Broadcasts a `newFile` event with the `messageData` to all other clients[cite: 63]. The sender doesn't need to receive it again, as they likely already have the file URL.

    <!-- end list -->

    ```javascript
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
    ```

    * `socket.on('video', async (data, callback) => { ... });`: This listens for a `video` event from a client, similar to the `file` event, but specifically for video files[cite: 64].
    * `const messageData = { ... };`: Constructs a message object for the video, including `sender`, `videoPath`, `videoName`, formatted `fileSize`, `timestamp`, and `type: 'video'`[cite: 65].
    * `await saveMessage(messageData);`: Saves the video message to storage[cite: 65].
    * `socket.broadcast.emit('video', messageData);`: Broadcasts the video message to all other clients[cite: 65].
    * `socket.emit('video-sent', messageData);`: Emits a `video-sent` event back to the *sender* to acknowledge that their video message has been processed[cite: 65].
    * `if (typeof callback === 'function') { callback({ success: true }); }`: Calls the client's callback if provided, indicating success[cite: 66].

    <!-- end list -->

    ```javascript
    // Handle disconnection
    socket.on('disconnect', () => {
        const username = users.get(socket.id);
        if (username) {
            users.delete(socket.id);
            activeUsers.delete(username);

            // Notify other users and log
            console.log(`👋 ${username} has left the
            chat`);
            io.emit('info', `${username} has left the chat`);
            io.emit('userList', Array.from(activeUsers));
        }
    });
});
```

* `socket.on('disconnect', () => { ... });`: This event listener fires when a client disconnects from the Socket.IO server[cite: 67].
* `const username = users.get(socket.id);`: Retrieves the username associated with the disconnected `socket.id`.
* `if (username) { ... }`: Ensures a username was actually associated with the disconnected socket.
* `users.delete(socket.id);`: Removes the disconnected client's `socket.id` from the `users` Map[cite: 67].
* `activeUsers.delete(username);`: Removes the username from the `activeUsers` Set[cite: 67].
* `console.log(`👋 ${username} has left the chat`);`: Logs a message to the server console[cite: 68].
* ` io.emit('info',  `${username} has left the chat`);`: Emits an `info` event to *all* clients to announce the user's departure[cite: 68].
* `io.emit('userList', Array.from(activeUsers));`: Emits an updated list of active users to all clients[cite: 68].

### Section 10: Helper Function and Server Start

```javascript
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
    ```

    * `function formatFileSize(bytes) { ... }`: A utility function to format file sizes into human-readable strings (e.g., "1.5 MB", "500 KB").
    * `if (bytes === 0) return '0 B';`: Handles the case of zero bytes[cite: 69].
    * `const k = 1024;`: Defines the base for calculating file sizes (1 KB = 1024 bytes)[cite: 70].
    * `const sizes = ['B', 'KB', 'MB', 'GB'];`: Array of size units[cite: 70].
    * `const i = Math.floor(Math.log(bytes) / Math.log(k));`: Calculates the appropriate index for the `sizes` array (e.g., 0 for bytes, 1 for KB, 2 for MB) using logarithms[cite: 71].
    * `return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];`: Divides the bytes by the appropriate power of `k`, formats it to one decimal place, and appends the unit[cite: 71].
    * `http.listen(PORT, () => { ... });`: This starts the HTTP server and makes it listen for incoming connections on the specified `PORT` (8080)[cite: 72].
    * The callback function is executed once the server starts successfully.
    * `console.log(...)`: It logs messages to the server console indicating that the server is running and lists the available IP addresses (IPv4 and IPv6) where the server can be accessed[cite: 72].

    ### How it Works in Detail (Summary for a Beginner)

    1.  **Server Setup**: The code first sets up a basic web server using `Express.js` to handle regular HTTP requests and `Socket.IO` for real-time communication. It also imports modules for file operations (`fs`, `path`, `multer`) and network information (`os`)[cite: 1, 2, 13].
    2.  **File Management**:
    * It's configured to clean up old uploaded files (older than 24 hours) every hour to prevent the server from filling up with old data[cite: 3, 4, 5, 11].
    * It uses `Multer` to handle file uploads. When a client sends a file, Multer saves it to the `uploads/` directory with a unique filename[cite: 12].
    * The server then provides a URL where these uploaded files can be accessed by other clients[cite: 17].
    3.  **Data Persistence**:
    * User accounts and chat messages are stored in JSON files (`users.json` and `messages.json`) inside a `data/` directory[cite: 19, 20].
    * Functions are defined to load and save this data, ensuring that user information and chat history are preserved even if the server restarts[cite: 27, 29, 31, 33].
    * When the server starts, it initializes these data files if they don't exist[cite: 20].
    4.  **Real-time Communication (Socket.IO)**:
    * When a client connects, the server sends its network addresses[cite: 37].
    * **User Registration/Login**: Clients can `register` with a username and password. The server validates the input, checks if the user exists, verifies passwords, and either creates a new account or logs in an existing user. It then stores the active users in memory[cite: 37, 38, 39, 40, 42, 43, 44, 45, 46, 47, 48, 49, 50].
    * **Message History**: Upon successful login, the server sends the user their message history[cite: 51, 52].
    * **Broadcasting Events**:
    * When a user joins or leaves, the server logs it and broadcasts an "info" message to all other connected clients[cite: 53, 54, 68].
    * It also broadcasts an updated list of active users to everyone[cite: 55, 68].
    * **Chat Messages**: When a client sends a `chat` message, the server saves it to `messages.json` and then broadcasts it to *all* connected clients in real-time[cite: 59, 60].
    * **Typing Indicator**: When a client starts or stops typing, the server broadcasts this status to other clients[cite: 61].
    * **File and Video Sharing**: When a client uploads a file or video (via the HTTP upload endpoint), the server saves the message details (including the URL to the uploaded file) to the message history and then broadcasts it to other clients, so they can see and access the shared content[cite: 62, 63, 64, 65].
    * **Disconnection**: When a client disconnects, the server removes them from the active user list and notifies other clients[cite: 67, 68].
    5.  **Server Start**: Finally, the `http` server starts listening on port 8080. It prints messages to the console indicating that it's running and lists the IP addresses where it can be accessed[cite: 72].

    This setup creates a functional real-time chat application with features like user authentication, persistent chat history, file sharing, and active user management.
