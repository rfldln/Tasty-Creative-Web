import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  const { to, subject, text, html } = await request.json();

  try {
    // Set up the transporter using your Google App password
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER, // Your Gmail address
        pass: process.env.GMAIL_APP_PASSWORD, // Your Google App password
      },
    });

    // Mail options
    const mailOptions = {
      from: process.env.GMAIL_USER, // sender address
      to: to, // list of recipients
      subject: subject, // Subject line
      text: text, // plain text body
      html: html, // HTML body
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    return new Response(
      JSON.stringify({ success: true, messageId: info.messageId }),
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500 }
    );
  }
}
