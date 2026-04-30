// SMS / OTP sender. Uses 2Factor.in if TWO_FACTOR_API_KEY is set, else
// falls back to console logging (dev mode).

function normalizePhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  // Strip leading "91" if 12 digits, or assume already 10 digits IN
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  if (digits.length === 10) return '91' + digits;
  if (digits.length >= 10 && digits.length <= 15) return digits;
  return null;
}

async function sendOtpSms(phone, otp) {
  const apiKey = process.env.TWO_FACTOR_API_KEY;
  if (apiKey) {
    // 2Factor.in template "AUTOGEN" sends a default-formatted SMS using
    // the OTP we provide. Free-tier accounts get a default template.
    const url = `https://2factor.in/API/V1/${apiKey}/SMS/${encodeURIComponent(phone)}/${otp}/AUTOGEN`;
    const res = await fetch(url, { method: 'GET' });
    const data = await res.json().catch(() => ({}));
    if (data.Status !== 'Success') {
      throw new Error(data.Details || 'SMS provider rejected the request');
    }
    return;
  }
  // Dev fallback — log OTP. Useful while signing up for an SMS provider.
  console.log(`[OTP DEV] phone=${phone} otp=${otp}`);
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

module.exports = { sendOtpSms, normalizePhone, generateOtp };
