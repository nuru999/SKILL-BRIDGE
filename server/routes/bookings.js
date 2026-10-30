const router = require('express').Router();
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Review = require('../models/Review');
const TutorProfile = require('../models/TutorProfile');
const { protect, requireRole } = require('../middleware/auth');

const ACTIVE = ['pending', 'accepted', 'paid'];

router.post('/', protect, requireRole('student'), async (req, res) => {
  const { tutorProfileId, subject, date, startTime, duration, location } = req.body;
  if (!tutorProfileId || !subject || !date || !startTime || !duration || !location)
    return res.status(400).json({ message: 'Please fill in every booking field' });

  const profile = await TutorProfile.findById(tutorProfileId);
  if (!profile || !profile.isVerified) return res.status(404).json({ message: 'Tutor not found' });
  if (String(profile.user) === String(req.user._id)) return res.status(400).json({ message: 'You cannot book yourself' });

  const day = new Date(date);
  if (day < new Date(new Date().setHours(0, 0, 0, 0))) return res.status(400).json({ message: 'Pick a date that is not in the past' });

  // Prevent double-booking of the same tutor, date and start time
  const clash = await Booking.findOne({ tutor: profile.user, date: day, startTime, status: { $in: ACTIVE } });
  if (clash) return res.status(409).json({ message: 'That time slot is already taken. Please choose another.' });

  const booking = await Booking.create({
    student: req.user._id,
    tutor: profile.user,
    subject,
    date: day,
    startTime,
    duration: Number(duration),
    location,
    amount: profile.hourlyRate * Number(duration),
  });
  res.status(201).json(booking);
});

router.get('/mine', protect, requireRole('student', 'tutor'), async (req, res) => {
  const field = req.user.role === 'tutor' ? 'tutor' : 'student';
  const bookings = await Booking.find({ [field]: req.user._id })
    .populate('student', 'name phone')
    .populate('tutor', 'name phone')
    .sort({ date: -1 })
    .lean();
  const reviewed = new Set((await Review.find({ booking: { $in: bookings.map((b) => b._id) } })).map((r) => String(r.booking)));
  res.json(bookings.map((b) => ({ ...b, reviewed: reviewed.has(String(b._id)) })));
});

router.patch('/:id/status', protect, async (req, res) => {
  const { status } = req.body;
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: 'Booking not found' });

  const isTutor = String(booking.tutor) === String(req.user._id);
  const isStudent = String(booking.student) === String(req.user._id);
  if (!isTutor && !isStudent) return res.status(403).json({ message: 'Not your booking' });

  const allowed = {
    tutor: { pending: ['accepted', 'declined'], paid: ['completed'] },
    student: { pending: ['cancelled'], accepted: ['cancelled'] },
  }[isTutor ? 'tutor' : 'student'];
  if (!(allowed[booking.status] || []).includes(status))
    return res.status(400).json({ message: `You cannot change a ${booking.status} booking to ${status}` });

  if (status === 'completed') {
    // Release held money: tutor wallet is credited, commission stays with the platform
    const payment = await Payment.findOne({ booking: booking._id, status: 'held' });
    if (!payment) return res.status(400).json({ message: 'No paid amount found for this booking' });
    payment.status = 'released';
    await payment.save();
    await TutorProfile.updateOne({ user: booking.tutor }, { $inc: { walletBalance: payment.tutorEarning } });
  }
  booking.status = status;
  await booking.save();
  res.json(booking);
});

module.exports = router;
