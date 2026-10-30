// Safaricom Daraja (M-Pesa Express / STK Push) helper. Uses Node's built-in fetch.
const BASE = () => (process.env.MPESA_ENV === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke');

const fail = (status, message) => Object.assign(new Error(message), { status });

exports.isConfigured = () =>
  !!(process.env.MPESA_CONSUMER_KEY && process.env.MPESA_CONSUMER_SECRET && process.env.MPESA_SHORTCODE &&
     process.env.MPESA_PASSKEY && process.env.MPESA_CALLBACK_URL);

// 0712345678, +254712345678, 254712345678, 712345678 -> 254712345678 (or null if invalid)
exports.normalizePhone = (input) => {
  let p = String(input || '').replace(/\D/g, '');
  if (p.startsWith('0')) p = '254' + p.slice(1);
  else if (p.length === 9 && /^[17]/.test(p)) p = '254' + p;
  return /^254[17]\d{8}$/.test(p) ? p : null;
};

let cached = { token: null, expires: 0 };
async function getToken() {
  if (cached.token && Date.now() < cached.expires) return cached.token;
  const basic = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');
  const res = await fetch(`${BASE()}/oauth/v1/generate?grant_type=client_credentials`, { headers: { Authorization: `Basic ${basic}` } });
  if (!res.ok) throw fail(502, 'Could not authenticate with M-Pesa. Check MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET.');
  const data = await res.json();
  cached = { token: data.access_token, expires: Date.now() + (Number(data.expires_in || 3599) - 60) * 1000 };
  return cached.token;
}

const pad = (n) => String(n).padStart(2, '0');
function stamp() {
  const d = new Date();
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}
function credentials() {
  const timestamp = stamp();
  const password = Buffer.from(process.env.MPESA_SHORTCODE + process.env.MPESA_PASSKEY + timestamp).toString('base64');
  return { timestamp, password };
}

// Sends the "Enter your M-Pesa PIN" prompt to the customer's phone.
exports.stkPush = async ({ phone, amount, reference, description }) => {
  const token = await getToken();
  const { timestamp, password } = credentials();
  const shortcode = process.env.MPESA_SHORTCODE;
  const callback = new URL(process.env.MPESA_CALLBACK_URL);
  if (process.env.MPESA_CALLBACK_SECRET) callback.searchParams.set('key', process.env.MPESA_CALLBACK_SECRET);

  const res = await fetch(`${BASE()}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: process.env.MPESA_TRANSACTION_TYPE || 'CustomerPayBillOnline',
      Amount: Math.max(1, Math.round(amount)),
      PartyA: phone,
      PartyB: shortcode,
      PhoneNumber: phone,
      CallBackURL: callback.toString(),
      AccountReference: String(reference).slice(0, 12),
      TransactionDesc: String(description).slice(0, 13),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ResponseCode !== '0') {
    console.error('STK push failed:', data);
    throw fail(502, data.errorMessage || data.ResponseDescription || 'M-Pesa rejected the payment request');
  }
  return data; // { MerchantRequestID, CheckoutRequestID, CustomerMessage, ... }
};

// Asks Daraja what happened to a prompt. Works without a public callback URL.
exports.stkQuery = async (checkoutRequestId) => {
  const token = await getToken();
  const { timestamp, password } = credentials();
  const res = await fetch(`${BASE()}/mpesa/stkpushquery/v1/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ BusinessShortCode: process.env.MPESA_SHORTCODE, Password: password, Timestamp: timestamp, CheckoutRequestID: checkoutRequestId }),
  });
  const data = await res.json().catch(() => ({}));
  // While the customer is still typing their PIN, Daraja answers with an error: treat as "still waiting"
  if (!res.ok || data.ResultCode === undefined) return { state: 'pending' };
  if (String(data.ResultCode) === '0') return { state: 'success' };
  return { state: 'failed', reason: data.ResultDesc || 'Payment was not completed' };
};
