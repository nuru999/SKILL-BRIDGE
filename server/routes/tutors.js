const router = require('express').Router();
const TutorProfile = require('../models/TutorProfile');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const { protect, requireRole } = require('../middleware/auth');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Public search: only verified tutors appear
router.get('/', async (req, res) => {
  const { subject, location, maxPrice, minRating, sort } = req.query;
  const filter = { isVerified: true };
  if (subject) filter.subjects = new RegExp(escapeRegex(subject), 'i');
  if (location) filter.location = new RegExp(escapeRegex(location), 'i');
  if (maxPrice) filter.hourlyRate = { $lte: Number(maxPrice) };
  if (minRating) filter.avgRating = { $gte: Number(minRating) };
  const sortBy = sort === 'price' ? { hourlyRate: 1 } : { avgRating: -1, reviewCount: -1 };
  const tutors = await TutorProfile.find(filter).populate('user', 'name').sort(sortBy);
  res.json(tutors);
});

// Tutor's own profile + earnings (declared before /:id)
router.get('/me/profile', protect, requireRole('tutor'), async (req, res) => {
  res.json(await TutorProfile.findOne({ user: req.user._id }));
});

router.put('/me/profile', protect, requireRole('tutor'), async (req, res) => {
  const { subjects, hourlyRate, bio, location, availability } = req.body;
  const profile = await TutorProfile.findOne({ user: req.user._id });
  if (Array.isArray(subjects)) profile.subjects = subjects.map((s) => s.trim()).filter(Boolean);
  if (hourlyRate !== undefined) profile.hourlyRate = Number(hourlyRate);
  if (bio !== undefined) profile.bio = bio;
  if (location !== undefined) profile.location = location;
  if (availability !== undefined) profile.availability = availability;
  await profile.save();
  res.json(profile);
});

router.get('/me/earnings', protect, requireRole('tutor'), async (req, res) => {
  const profile = await TutorProfile.findOne({ user: req.user._id });
  const bookingIds = (await Booking.find({ tutor: req.user._id }).select('_id')).map((b) => b._id);
  const payments = await Payment.find({ booking: { $in: bookingIds }, status: { $in: ['held', 'released'] } })
    .populate({ path: 'booking', select: 'subject date' })
    .sort({ createdAt: -1 });
  res.json({
    walletBalance: profile.walletBalance,
    pendingRelease: payments.filter((p) => p.status === 'held').reduce((s, p) => s + p.tutorEarning, 0),
    payments,
  });
});

router.get('/:id', async (req, res) => {
  const tutor = await TutorProfile.findById(req.params.id).populate('user', 'name');
  if (!tutor || !tutor.isVerified) return res.status(404).json({ message: 'Tutor not found' });
  res.json(tutor);
});

module.exports = router;
