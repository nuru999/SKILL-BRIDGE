const Setting = require('../models/Setting');

exports.getCommissionRate = async () => {
  const s = await Setting.findOne({ key: 'commissionRate' });
  return s ? Number(s.value) : 15;
};
