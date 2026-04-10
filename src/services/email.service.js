const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true, // เปลี่ยนเป็น true ถ้าใช้พอร์ต 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// เปลี่ยน `to` เป็นรับ Array ได้
const sendAlertEmail = async (emails, deviceName, sensorName, condition, threshold, actualValue) => {
  const isMultiple = Array.isArray(emails);
  
  const mailOptions = {
    from: `"UEC Weather Alert" <${process.env.SMTP_USER}>`,
    to: isMultiple ? undefined : emails,      // ถ้าคนเดียวใส่ To
    bcc: isMultiple ? emails.join(',') : undefined, // ถ้าหลายคนใส่ BCC
    subject: `⚠️ System Alert: ${deviceName} - ${sensorName} is out of range!`,
    html: `
      <h2>🚨 Sensor Alert Triggered</h2>
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
    console.log(`📧 Alert email sent to ${isMultiple ? emails.length + ' users' : emails}`);
  } catch (error) {
    console.error('Failed to send email:', error);
  }
};

const sendBroadcastEmail = async (emails, subject, message) => {
  const mailOptions = {
    from: `"UEC Weather System" <${process.env.SMTP_USER}>`,
    bcc: emails.join(','), // ส่งแบบ BCC หาทุกคน
    subject: `📢 ${subject}`,
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
    console.log(`📧 Broadcast email sent to ${emails.length} users.`);
  } catch (error) {
    console.error('Failed to send broadcast email:', error);
    throw error;
  }
};

module.exports = { sendAlertEmail, sendBroadcastEmail };