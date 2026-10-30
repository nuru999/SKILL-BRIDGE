# SkillBridge

An online marketplace that connects students with peer tutors for in-person learning, and manages discovery, booking, payment, commission, tutor earnings, reviews and administration. Built with the MERN stack (MongoDB, Express, React, Node).

## Run it

You need Node 18+ and MongoDB (local, or a free MongoDB Atlas connection string).

```bash
# 1. API
cd server
cp .env.example .env        # then edit MONGO_URI and JWT_SECRET
npm install
npm run seed                # creates demo accounts (see below)
npm run dev                 # http://localhost:5000

# 2. Website (second terminal)
cd client
npm install
npm run dev                 # http://localhost:5173
```

## Demo accounts (password for all: `Password123`)

| Role | Email |
|---|---|
| Admin | admin@skillbridge.test |
| Student | student@skillbridge.test |
| Tutor | brian@skillbridge.test (also amina@ and faith@) |

## Demo script for your presentation

1. **Student** searches "React", opens Brian's profile, requests a booking (2 hours).
2. **Tutor** (Brian) logs in, accepts the request.
3. **Student** clicks *Pay with M-Pesa*, then *Demo: confirm M-Pesa payment*. The money is now held by the platform.
4. **Tutor** marks the session completed. Commission (15%) is kept by the platform, the rest goes to Brian's wallet.
5. **Student** leaves a review. Brian's rating updates.
6. **Tutor** requests a payout. **Admin** marks it paid, changes the commission rate, and verifies new tutors.

## How the money flows

Session fee KES 1,600 (2h at KES 800) with 15% commission: platform keeps KES 240, tutor earns KES 1,360. Payment states: `pending` then `held` (paid, session not done) then `released` (tutor credited).

## Booking states

`pending` then `accepted` (or `declined`) then `paid` then `completed`. A student can cancel while `pending` or `accepted`. Double-booking the same tutor, date and start time is blocked.

## Project structure

```
server/   Express API: models/, routes/, middleware/, seed.js
client/   React app (Vite): pages/ for students, tutors and admin
```

## M-Pesa (Safaricom Daraja)

Payments use Daraja's STK Push. With no M-Pesa keys in `server/.env` the app stays in demo mode (a demo confirm button). With keys set, the student enters a number, gets the PIN prompt on their phone, and the site confirms the payment automatically.

1. Create a free account at developer.safaricom.co.ke, then create an app with the **Lipa Na M-Pesa Sandbox** product to get a Consumer Key and Consumer Secret.
2. Add to `server/.env`: `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE=174379`, the sandbox `MPESA_PASSKEY` (see `.env.example`), `MPESA_CALLBACK_URL`, and `MPESA_TEST_AMOUNT=1`.
3. Restart the API. Pay a booking: the site polls Daraja every 5 seconds, so it works even if the callback URL is not reachable. For instant callbacks, expose port 5000 with ngrok or cloudflared and set `MPESA_CALLBACK_URL` to `https://YOUR-TUNNEL/api/payments/mpesa/callback`.

The sandbox is for testing and moves no real money. Charging real customers needs a Paybill or Till and Safaricom's Go Live approval, then `MPESA_ENV=production` with your production keys.

## Possible next steps

Real-time chat (Socket.io), email notifications, map-based tutor search, group sessions, a mobile app.
