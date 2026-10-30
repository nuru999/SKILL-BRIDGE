const router = require('express').Router();
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const TutorProfile = require('../models/TutorProfile');
const { protect, requireRole } = require('../middleware/auth');

router.post('/', protect, requireRole('student'), async (req, res) => {
  const { bookingId, rating, comment } = req.body;
  const booking = await Booking.findById(bookingId);
  if (!booking || String(booking.student) !== String(req.user._id)) return res.status(404).json({ message: 'Booking not found' });
  if (booking.status !== 'completed') return res.status(400).json({ message: 'You can review only after the session is completed' });
  if (await Review.findOne({ booking: booking._id })) return res.status(400).json({ message: 'You already reviewed this session' });

  const review = await Review.create({ booking: booking._id, student: req.user._id, tutor: booking.tutor, rating, comment });

  const [stats] = await Review.aggregate([
    { $match: { tutor: booking.tutor } },
    { $group: { _id: '$tutor', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await TutorProfile.updateOne({ user: booking.tutor }, { avgRating: Math.round(stats.avg * 10) / 10, reviewCount: stats.count });
  res.status(201).json(review);
});

// Reviews for a tutor profile
router.get('/tutor/:profileId', async (req, res) => {
  const profile = await TutorProfile.findById(req.params.profileId);
  if (!profile) return res.status(404).json({ message: 'Tutor not found' });
  res.json(await Review.find({ tutor: profile.user }).populate('student', 'name').sort({ createdAt: -1 }));
});

module.exports = router;
