const router = require('express').Router();
const User = require('../models/User');
const TutorProfile = require('../models/TutorProfile');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Payout = require('../models/Payout');
const Setting = require('../models/Setting');
const { protect, requireRole } = require('../middleware/auth');
const { getCommissionRate } = require('../utils/settings');

router.use(protect, requireRole('admin'));

router.get('/stats', async (req, res) => {
  const sum = async (match, field) => {
    const [r] = await Payment.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: '$' + field } } }]);
    return r ? r.total : 0;
  };
  res.json({
    students: await User.countDocuments({ role: 'student' }),
    tutors: await User.countDocuments({ role: 'tutor' }),
    pendingTutors: await TutorProfile.countDocuments({ isVerified: false }),
    bookings: await Booking.countDocuments(),
    completedSessions: await Booking.countDocuments({ status: 'completed' }),
    grossPaid: await sum({ status: { $in: ['held', 'released'] } }, 'amount'),
    heldInEscrow: await sum({ status: 'held' }, 'amount'),
    commissionEarned: await sum({ status: 'released' }, 'commission'),
    pendingPayouts: await Payout.countDocuments({ status: 'pending' }),
    commissionRate: await getCommissionRate(),
  });
});

router.get('/tutors', async (req, res) => {
  res.json(await TutorProfile.find().populate('user', 'name email phone').sort({ isVerified: 1, createdAt: -1 }));
});

router.patch('/tutors/:id/verify', async (req, res) => {
  const profile = await TutorProfile.findByIdAndUpdate(req.params.id, { isVerified: !!req.body.isVerified }, { new: true });
  if (!profile) return res.status(404).json({ message: 'Tutor not found' });
  res.json(profile);
});

router.put('/commission', async (req, res) => {
  const rate = Number(req.body.rate);
  if (isNaN(rate) || rate < 0 || rate > 50) return res.status(400).json({ message: 'Commission must be between 0 and 50 percent' });
  await Setting.findOneAndUpdate({ key: 'commissionRate' }, { value: rate }, { upsert: true });
  res.json({ commissionRate: rate });
});

router.get('/bookings', async (req, res) => {
  res.json(await Booking.find().populate('student', 'name').populate('tutor', 'name').sort({ createdAt: -1 }).limit(100));
});

router.get('/payouts', async (req, res) => {
  res.json(await Payout.find().populate('tutor', 'name phone').sort({ createdAt: -1 }));
});

router.patch('/payouts/:id', async (req, res) => {
  const { status } = req.body; // 'paid' or 'rejected'
  const payout = await Payout.findById(req.params.id);
  if (!payout || payout.status !== 'pending') return res.status(400).json({ message: 'Payout not found or already handled' });
  if (!['paid', 'rejected'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
  if (status === 'rejected') await TutorProfile.updateOne({ user: payout.tutor }, { $inc: { walletBalance: payout.amount } });
  payout.status = status;
  await payout.save();
  res.json(payout);
});

module.exports = router;
