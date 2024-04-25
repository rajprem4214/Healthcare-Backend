import axios,{AxiosResponse} from 'axios';

const phoneNumberID = "160665677127918"; // Replace with your actual PhoneNumber ID
const accessToken = "EAAC7PpFxZB98BOwz8xdKkx5cXnLIOnwurcOF989f9egJjK5MF2FOy4TN42OQZAwDmRtb4UcZABYVMJgLPGhWgwIYerl67B82COd54maDlT3ZAAh4X72ZCZArjKzPK112S4nZCIgKNfDj6QYN836DydAmJHdnt8F9kWnK3IqYE8mS6FtyjeRk9wtjLQwNpOocuFwMJ1pPEOZCqAONElzewz4ZD"; // Replace with your actual Access Token


export async function sendOtpViaWhatsApp(phone: string, otp: string): Promise<void> {
    const sendMessageURL = `https://graph.facebook.com/v17.0/${phoneNumberID}/messages`;

    const config = {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
    };

    const payload = {
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: {
            body: `Your OTP is ${otp}`,
        },
    };

    axios.post(sendMessageURL, payload, config)
        .then((response: AxiosResponse) => {
            console.log('Message sent successfully:', response.data);
        })
        .catch((error) => {
            console.error('Error sending message:', error.message);
        });
}


