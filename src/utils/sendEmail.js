import nodemailer from 'nodemailer';

export const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.ukr.net',
    port: 2525,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD, // Перевір, чи це "Пароль застосунку"
    },
    // Налаштування таймауту (щоб не чекати 100 секунд)
    connectionTimeout: 5000, // 5 секунд на з'єднання
    greetingTimeout: 5000, // 5 секунд на вітання від сервера
    socketTimeout: 5000,
  });

  try {
    console.log(`Sending email to ${options.email}...`);

    const info = await transporter.sendMail({
      from: `"Kingdom of Drama" <${process.env.SMTP_USER}>`,
      to: options.email,
      subject: options.subject,
      html: options.html,
    });

    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Nodemailer Error:', error.message);
    // Прокидаємо помилку далі, щоб спрацював catch у контролері
    throw new Error(`Failed to send email: ${error.message}`);
  }
};
