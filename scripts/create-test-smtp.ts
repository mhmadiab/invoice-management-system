import nodemailer from "nodemailer";

const account = await nodemailer.createTestAccount();

console.log("SMTP_HOST=", account.smtp.host);
console.log("SMTP_PORT=", account.smtp.port);
console.log("SMTP_USER=", account.user);
console.log("SMTP_PASSWORD=", account.pass);
console.log("SMTP_FROM=", account.user);