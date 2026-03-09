import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export const sendEmail = async (options) => {
  return transporter.sendEmail(options);
};

// import Brevo from '@getbrevo/brevo';

// export const sendMail = async ({ from, to, subject, html }) => {
//   try {
//     const client = new Brevo.TransactionalEmailsApi();
//     client.setApiKey(
//       Brevo.TransactionalEmailsApiApiKeys.apiKey,
//       process.env.BREVO_API_KEY,
//     );

//     const sendSmtpEmail = {
//       sender: { email: from || process.env.SMTP_FROM },
//       to: [{ email: to }],
//       subject,
//       htmlContent: html,
//     };

//     const response = await client.sendTransacEmail(sendSmtpEmail);
//     console.log('✅ Email sent via Brevo API:', response.messageId || response);
//     return response;
//   } catch (error) {
//     console.error('❌ Email sending error:', error);
//     throw error;
//   }
// };
