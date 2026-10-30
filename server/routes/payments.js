const router = require('express').Router();
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const { protect, requireRole } = require('../middleware/auth');
const { getCommissionRate } = require('../utils/settings');
const mpesa = require('../utils/mpesa');

async function markPaid(payment, receipt) {
  if (payment.status !== 'pending') return;
  payment.status = 'held'; // platform holds the money until the session is completed
  if (receipt) payment.mpesaReceipt = receipt;
  await payment.save();
  await Booking.findByIdAndUpdate(payment.booking, { status: 'paid' });
}

// Student starts payment for an accepted booking
router.post('/initiate', protect, requireRole('student'), async (req, res) => {
  const booking = await Booking.findById(req.body.bookingId);
  if (!booking || String(booking.student) !== String(req.user._id)) return res.status(404).json({ message: 'Booking not found' });
  if (booking.status !== 'accepted') return res.status(400).json({ message: 'You can only pay once the tutor accepts the booking' });

  const live = mpesa.isConfigured();
  let phone;
  if (live) {
    phone = mpesa.normalizePhone(req.body.phone);
    if (!phone) return res.status(400).json({ message: 'Enter a valid Safaricom number, e.g. 0712345678' });
  }

  let payment = await Payment.findOne({ booking: booking._id, status: 'pending' });
  if (!payment) {
    const rate = await getCommissionRate();
    const commission = Math.round((booking.amount * rate) / 100);
    payment = await Payment.create({
      booking: booking._id,
      amount: booking.amount,
      commission,
      tutorEarning: booking.amount - commission,
      transactionRef: 'SB' + Date.now() + Math.floor(Math.random() * 1000),
    });
  }

  if (!live) return res.json({ payment, mode: 'demo', message: 'Demo mode: M-Pesa is not configured, so confirm the payment with the demo button.' });

  // MPESA_TEST_AMOUNT lets you charge e.g. KES 1 while testing; the recorded session fee stays the real amount
  const chargeAmount = process.env.MPESA_TEST_AMOUNT ? Number(process.env.MPESA_TEST_AMOUNT) : payment.amount;
  const result = await mpesa.stkPush({ phone, amount: chargeAmount, reference: payment.transactionRef, description: 'SkillBridge' });
  payment.phone = phone;
  payment.checkoutRequestId = result.CheckoutRequestID;
  await payment.save();
  res.json({ payment, mode: 'mpesa', message: result.CustomerMessage || 'Check your phone and enter your M-Pesa PIN.' });
});

// The website polls this while the customer is typing their PIN
router.get('/:id/status', protect, requireRole('student'), async (req, res) => {
  const payment = await Payment.findById(req.params.id).populate('booking');
  if (!payment || String(payment.booking.student) !== String(req.user._id)) return res.status(404).json({ message: 'Payment not found' });

  if (payment.status === 'pending' && payment.checkoutRequestId && mpesa.isConfigured()) {
    const q = await mpesa.stkQuery(payment.checkoutRequestId);
    if (q.state === 'success') await markPaid(payment);
    else if (q.state === 'failed') { payment.status = 'failed'; payment.failureReason = q.reason; await payment.save(); }
  }
  res.json({ status: payment.status, reason: payment.failureReason, receipt: payment.mpesaReceipt });
});

// DEMO ONLY: lets you show the full flow without a live M-Pesa account
router.post('/simulate', protect, requireRole('student'), async (req, res) => {
  if (process.env.ALLOW_SIMULATED_PAYMENTS !== 'true') return res.status(403).json({ message: 'Simulated payments are disabled' });
  const payment = await Payment.findById(req.body.paymentId).populate('booking');
  if (!payment || String(payment.booking.student) !== String(req.user._id)) return res.status(404).json({ message: 'Payment not found' });
  await markPaid(payment);
  res.json({ message: 'Payment received and held until the session is completed' });
});

// Daraja calls this when the customer finishes or cancels (needs a public URL; polling covers you if it is unreachable)
router.post('/mpesa/callback', async (req, res) => {
  if (process.env.MPESA_CALLBACK_SECRET && req.query.key !== process.env.MPESA_CALLBACK_SECRET) return res.status(403).end();
  const cb = req.body?.Body?.stkCallback;
  if (cb) {
    const payment = await Payment.findOne({ checkoutRequestId: cb.CheckoutRequestID });
    if (payment && payment.status === 'pending') {
      if (cb.ResultCode === 0) {
        const receipt = cb.CallbackMetadata?.Item?.find((i) => i.Name === 'MpesaReceiptNumber')?.Value;
        await markPaid(payment, receipt);
      } else {
        payment.status = 'failed';
        payment.failureReason = cb.ResultDesc;
        await payment.save();
      }
    }
  }
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

module.exports = router;
