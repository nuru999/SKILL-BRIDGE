const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    amount: { type: Number, required: true },
    commission: { type: Number, required: true },
    tutorEarning: { type: Number, required: true },
    method: { type: String, default: 'mpesa' },
    transactionRef: { type: String, required: true, unique: true },
    phone: String,
    checkoutRequestId: String, // from Daraja, used to match callbacks and status checks
    mpesaReceipt: String,
    failureReason: String,
    // pending -> held (paid, waiting for session) -> released (session done, tutor credited); failed = prompt cancelled or declined
    status: { type: String, enum: ['pending', 'held', 'released', 'failed'], default: 'pending' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
