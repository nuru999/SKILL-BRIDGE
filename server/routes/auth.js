const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const TutorProfile = require('../models/TutorProfile');
const { protect } = require('../middleware/auth');

const sign = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, phone: u.phone, role: u.role });

router.post('/register', async (req, res) => {
  const { name, email, password, phone, role } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required' });
  if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
  if (await User.findOne({ email: email.toLowerCase() })) return res.status(400).json({ message: 'Email already registered' });

  const safeRole = role === 'tutor' ? 'tutor' : 'student'; // admins are never self-registered
  const user = await User.create({ name, email, phone, role: safeRole, passwordHash: await bcrypt.hash(password, 10) });
  if (safeRole === 'tutor') await TutorProfile.create({ user: user._id });
  res.status(201).json({ token: sign(user), user: publicUser(user) });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: (email || '').toLowerCase() });
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash)))
    return res.status(401).json({ message: 'Wrong email or password' });
  res.json({ token: sign(user), user: publicUser(user) });
});

router.get('/me', protect, (req, res) => res.json(publicUser(req.user)));

module.exports = router;
