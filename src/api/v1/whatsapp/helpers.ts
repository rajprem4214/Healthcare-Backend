import { sendWhatsappTextMessage } from "./services"

export const handleTextMessage = async (from: string, msg_body: string) => {
    const message = `🌟 Hey there! Welcome to the InUwell!\n🌈 We're here to make your health journey a breeze. 🚀 Simply share your health records, and we'll handle the rest!\n📋💼 Your well-being is our priority!`
    await sendWhatsappTextMessage(from, message);
}
