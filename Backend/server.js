const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'your-very-secure-secret'; 

app.use(cors({
  origin: ['http://127.0.0.1:5500', 'http://localhost:5500','http://127.0.0.1:5501', 
    'http://localhost:5501'] 
}));

app.use(express.json());

let users = [
  { id: 1, firstName: 'Admin', lastName: 'Account', email: 'admin@example.com', password: '$2a$10$...', role: 'admin', verified: true },
  { id: 2, firstName: 'Vaugn', lastName: 'Garcia', email: 'vaugn@example.com', password: '$2a$10$...', role: 'user', verified: true }
];

if (users[0].password.includes('...')) {
  users[0].password = bcrypt.hashSync('admin123', 10);
  users[1].password = bcrypt.hashSync('vaugn123', 10);
}

app.post('/api/register', async (req, res) => {
  const { firstName, lastName, email, password, role = 'user' } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const existing = users.find(u => u.email === email);
  if (existing) {
    return res.status(409).json({ error: 'User already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: users.length + 1,
    firstName,
    lastName,
    email,
    password: hashedPassword,
    role,
    verified: true
  };

  users.push(newUser);
  res.status(201).json({ message: 'User registered', email, role });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body; 

  const user = users.find(u => u.email === email);
  if (!user || !await bcrypt.compare(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    SECRET_KEY,
    { expiresIn: '1h' }
  );

  res.json({ token, user: { firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role } });
});

app.get('/api/users', (req, res) => {
    const debugUsers = users.map(u => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        password: u.password,
        role: u.role,
        verified: u.verified
    }));
    res.json(debugUsers);
});

app.post('/api/users', async (req, res) => {
    const { firstName, lastName, email, password, role, verified } = req.body;
    if (users.find(u => u.email === email)) return res.status(409).json({ error: 'User with this email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
        id: users.length + 1,
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role,
        verified
    };
    users.push(newUser);
    res.status(201).json({ message: 'Account created successfully' });
});

app.put('/api/users/:email', async (req, res) => {
    const { firstName, lastName, email, role, verified, password } = req.body;
    const userIndex = users.findIndex(u => u.email === req.params.email);

    if (userIndex === -1) return res.status(404).json({ error: 'User not found' });

    if (firstName !== undefined) users[userIndex].firstName = firstName;
    if (lastName !== undefined) users[userIndex].lastName = lastName;
    if (email !== undefined) users[userIndex].email = email;
    if (role !== undefined) users[userIndex].role = role;
    if (verified !== undefined) users[userIndex].verified = verified;

    if (password && password.trim() !== '') {
        users[userIndex].password = await bcrypt.hash(password, 10);
    }
    res.json({ message: 'Account updated successfully' });
});

app.delete('/api/users/:email', (req, res) => {
    users = users.filter(u => u.email !== req.params.email);
    res.json({ message: 'Account deleted successfully' });
});

app.get('/api/profile', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

app.get('/api/admin/dashboard', authenticateToken, authorizeRole('admin'), (req, res) => {
  res.json({ message: 'Welcome to admin dashboard!', data: 'Secret admin info' });
});

app.get('/api/content/guest', (req, res) => {
  res.json({ message: 'Public content for all visitors' });
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; 

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

function authorizeRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: 'Access denied: insufficient permissions' });
    }
    next();
  };
}

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});