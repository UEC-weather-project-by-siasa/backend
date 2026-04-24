const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});


const sendAlertEmail = async (emails, deviceName, sensorName, condition, threshold, actualValue) => {
  const isMultiple = Array.isArray(emails);
  
  const mailOptions = {
    from: `"UEC Weather Alert" <${process.env.SMTP_USER}>`,
    to: isMultiple ? undefined : emails,      // ถ้าคนเดียวใส่ To
    bcc: isMultiple ? emails.join(',') : undefined, // ถ้าหลายคนใส่ BCC
    subject: `System Alert: ${deviceName} - ${sensorName} is out of range!`,
    html: `
      <h2>Sensor Alert Triggered</h2>
      <p><strong>Device:</strong> ${deviceName}</p>
      <p><strong>Sensor:</strong> ${sensorName}</p>
      <p><strong>Condition:</strong> ${condition} ${threshold}</p>
      <p><strong>Current Value:</strong> <span style="color: red; font-size: 1.2em;">${actualValue}</span></p>
      <br/>
      <p>Please check your system dashboard for more details.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Alert email sent to ${isMultiple ? emails.length + ' users' : emails}`);
  } catch (error) {
    console.error('Failed to send email:', error);
  }
};

const sendBroadcastEmail = async (emails, subject, message) => {
  const mailOptions = {
    from: `"UEC Weather System" <${process.env.SMTP_USER}>`,
    bcc: emails.join(','), // ส่งแบบ BCC หาทุกคน
    subject: `${subject}`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #3b82f6;">System Broadcast</h2>
        <p style="font-size: 1.1em; line-height: 1.6;">${message}</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #888; font-size: 0.8em;">This is an automated system broadcast from UEC Weather Platform.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Broadcast email sent to ${emails.length} users.`);
  } catch (error) {
    console.error('Failed to send broadcast email:', error);
    throw error;
  }
};

const sendResetPasswordEmail = async (email, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  const mailOptions = {
    from: `"UEC Weather System" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>Reset Your Password</h2>
        <p>You requested a password reset. Please click the button below to set a new password:</p>
        <a href="${resetUrl}" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendAlertEmail, sendBroadcastEmail , sendResetPasswordEmail};