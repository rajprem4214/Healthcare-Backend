import { createTransport, Transporter } from "nodemailer";

export const transporter: Transporter = createTransport({
    service: 'gmail',
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        // TODO: replace `user` and `pass` values from <https://forwardemail.net>
        user: "rajprem3230@gmail.com",
        pass: "galf mkhr frpz tnnb",
    },
});