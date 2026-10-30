const router = require('express').Router();
const Payout = require('../models/Payout');
const TutorProfile = require('../models/TutorProfile');
const { protect, requireRole } = require('../middleware/auth');

router.post('/', protect, requireRole('tutor'), async (req, res) => {
  const amount = Number(req.body.amount);
  if (!amount || amount <= 0) return res.status(400).json({ message: 'Enter a valid amount' });
  // Atomic check-and-deduct so a tutor cannot withdraw more than their balance
  const profile = await TutorProfile.findOneAndUpdate(
    { user: req.user._id, walletBalance: { $gte: amount } },
    { $inc: { walletBalance: -amount } },
    { new: true }
  );
  if (!profile) return res.status(400).json({ message: 'Amount is more than your available balance' });
  res.status(201).json(await Payout.create({ tutor: req.user._id, amount }));
});

router.get('/mine', protect, requireRole('tutor'), async (req, res) => {
  res.json(await Payout.find({ tutor: req.user._id }).sort({ createdAt: -1 }));
});

module.exports = router;
