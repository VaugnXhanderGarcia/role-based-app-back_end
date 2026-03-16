const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'your-very-secure-secret';

app.use(cors());
app.use(express.json());

let users = [
    { 
        id: 1, 
        firstName: 'Admin', 
        lastName: 'User', 
        email: 'admin@example.com', 
        password: bcrypt.hashSync('admin123', 10),
        role: 'admin', 
        verified: true 
    }
];

app.post('/api/register', async (req, res) => {
    const { firstName, lastName, email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    if (users.find(u => u.email === email)) return res.status(409).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
        id: users.length + 1,
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role: 'user',
        verified: true
    };
    users.push(newUser);
    res.status(201).json({ message: 'User registered successfully!' });
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);
    
    if (!user || !await bcrypt.compare(password, user.password)) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token, user: { firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role } });
});

app.get('/api/users', (req, res) => {
    const safeUsers = users.map(u => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        role: u.role,
        verified: u.verified
    }));
    res.json(safeUsers);
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

app.listen(PORT, () => {
    console.log(`Backend Server running on http://localhost:${PORT}`);
});