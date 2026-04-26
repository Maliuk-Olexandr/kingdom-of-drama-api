import path from 'path';

import nodemailer from 'nodemailer';
import hbs from 'nodemailer-express-handlebars';

export const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.ukr.net',
    port: 2525,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000,
  });

  // Налаштування Handlebars для Nodemailer
  const handlebarOptions = {
    viewEngine: {
      extName: '.hbs',
      partialsDir: path.resolve('./src/templates'),
      defaultLayout: false,
    },
    viewPath: path.resolve('./src/templates'),
    extName: '.hbs',
  };

  transporter.use('compile', hbs(handlebarOptions));

  try {
    console.log(
      `Sending template [${options.template}] to ${options.to || options.email}...`,
    );

    const mailOptions = {
      from: `"Kingdom of Drama" <${process.env.SMTP_USER}>`,
      to: options.to || options.email,
      subject: options.subject,
      template: options.template, // назва файлу без .hbs
      context: options.context, // змінні для шаблону {{token}}, {{name}} тощо
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Nodemailer Error:', error.message);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};
