const nodemailer = require('nodemailer');

let transporter;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return transporter;
}

async function sendEmail({ to, subject, html }) {
  await getTransporter().sendMail({
    from: `"HabitSquad" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to,
    subject,
    html
  });
}

async function sendGroupInviteEmail({ to, inviterName, groupName, inviteCode }) {
  const joinUrl = `${process.env.FRONTEND_URL}/join?code=${inviteCode}`;

  await sendEmail({
    to,
    subject: `${inviterName} invited you to join "${groupName}" on HabitSquad`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #6366f1;">You're invited to HabitSquad!</h2>
        <p><strong>${inviterName}</strong> has invited you to join the group <strong>"${groupName}"</strong> on HabitSquad.</p>
        <p>HabitSquad helps you build better habits with friends through accountability and friendly competition.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${joinUrl}" style="background: #6366f1; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Join Group
          </a>
        </div>
        <p style="color: #666;">Or use this invite code after signing up: <strong>${inviteCode}</strong></p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">If you didn't expect this invitation, you can safely ignore this email.</p>
      </div>
    `
  });
}

async function sendVerificationEmail({ to, name, token }) {
  const verifyUrl = `${process.env.FRONTEND_URL}/verify?token=${token}`;

  await sendEmail({
    to,
    subject: 'Verify your HabitSquad account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #22c55e;">Welcome to HabitSquad, ${name}!</h2>
        <p>Please verify your email address to get started.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background: #22c55e; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Verify Email
          </a>
        </div>
        <p style="color: #666; font-size: 13px;">Or copy this link: ${verifyUrl}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">If you didn't create an account, you can safely ignore this email.</p>
      </div>
    `
  });
}

async function sendPasswordResetEmail({ to, token }) {
  const resetUrl = `${process.env.FRONTEND_URL}/reset?token=${token}`;

  await sendEmail({
    to,
    subject: 'Reset your HabitSquad password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #6366f1;">Reset your password</h2>
        <p>Someone (hopefully you) asked to reset the password on your HabitSquad account.</p>
        <p>Click the button below within the next hour to set a new one:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background: #6366f1; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 13px;">Or copy this link: ${resetUrl}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">If you didn't request this, you can safely ignore this email — your password won't change.</p>
      </div>
    `
  });
}

async function sendGroupAddedEmail({ to, inviterName, groupName }) {
  const dashboardUrl = `${process.env.FRONTEND_URL}/dashboard`;

  await sendEmail({
    to,
    subject: `${inviterName} invited you to "${groupName}" on HabitSquad`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #6366f1;">You have a new group invite!</h2>
        <p><strong>${inviterName}</strong> invited you to join the group <strong>"${groupName}"</strong> on HabitSquad.</p>
        <p>Open the app to accept or decline the invite.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${dashboardUrl}" style="background: #6366f1; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Open HabitSquad
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">If you didn't expect this invitation, you can safely ignore it or decline from the app.</p>
      </div>
    `
  });
}

module.exports = { sendEmail, sendGroupInviteEmail, sendGroupAddedEmail, sendVerificationEmail, sendPasswordResetEmail };
