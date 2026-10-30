require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const TutorProfile = require('./models/TutorProfile');
const Setting = require('./models/Setting');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const hash = await bcrypt.hash('Password123', 10);
  const mk = (name, email, role, phone) => User.findOneAndUpdate({ email }, { name, email, role, phone, passwordHash: hash }, { upsert: true, new: true });

  await mk('SkillBridge Admin', 'admin@skillbridge.test', 'admin', '0700000000');
  await mk('Demo Student', 'student@skillbridge.test', 'student', '0711111111');
  await Setting.findOneAndUpdate({ key: 'commissionRate' }, { value: 15 }, { upsert: true });

  const tutors = [
    ['Amina Wanjiru', 'amina@skillbridge.test', ['Database Systems', 'SQL'], 600, 'Main library, 2nd floor', 'Weekdays after 4pm', 'Distinction in DBMS. I explain normalisation with real campus examples.'],
    ['Brian Otieno', 'brian@skillbridge.test', ['JavaScript', 'React', 'Node.js'], 800, 'Computer lab B', 'Evenings and Saturdays', 'Final-year student who built three MERN apps. Happy to pair-program.'],
    ['Faith Mutua', 'faith@skillbridge.test', ['Calculus', 'Statistics'], 500, 'Cafeteria, block C', 'Mon, Wed, Fri mornings', 'Maths tutor for first and second years. Patient and exam-focused.'],
  ];
  for (const [name, email, subjects, hourlyRate, location, availability, bio] of tutors) {
    const u = await mk(name, email, 'tutor', '0722222222');
    await TutorProfile.findOneAndUpdate({ user: u._id }, { user: u._id, subjects, hourlyRate, location, availability, bio, isVerified: true }, { upsert: true });
  }
  console.log('Seeded. All demo accounts use password: Password123');
  process.exit(0);
})();
