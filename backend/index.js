const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

app.use(cors());
app.use(express.json());

// In-memory user store (for demo; use a DB in production)
const users = [];

// Register endpoint
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(409).json({ error: 'User already exists.' });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  users.push({ email, password: hashedPassword });
  res.json({ message: 'User registered successfully.' });
});

// Login endpoint
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

app.get('/message', (req, res) => {
  res.json({ message: 'Hello from your backend API!' });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
}); 