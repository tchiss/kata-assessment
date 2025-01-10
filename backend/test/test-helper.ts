export const config = {
  nodemailer: {
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'test@example.com',
      pass: 'password',
    },
  },
  'nodemailer.auth.user': 'test@example.com',
  'app.secret': 'secret',
  'app.frontendUrl': 'http://localhost:3000',
  app: {
    port: 3000,
    secret: 'secret',
  },
};
