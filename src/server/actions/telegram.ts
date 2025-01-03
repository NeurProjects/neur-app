import axios from 'axios';
const TELEGRAM_API_URL = 'https://api.telegram.org/bot';

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const botUsername = process.env.TELEGRAM_BOT_USERNAME;

async function getChatIdByUsername(username: string): Promise<number> {
  const url = `${TELEGRAM_API_URL}${botToken}/getUpdates`;
  const response = await axios.get(url);

  if (response.status !== 200) {
    throw new Error('Failed to send message to username');
  }

  const data = response.data;
  const messages = data.result;

  const chatId = messages.find((message: any) => message.message.from.username === username);

  if (!chatId) {
    throw new Error('ChatId not found! please start the bot ' + "t.me/" + botUsername);
  }

  return chatId.message.chat.id;
}

export async function sendTelegramNotification(message: string, username?: string, chatId?: number) {
  if (!chatId && !username) {
    throw new Error('Telegram chatId or username is required');
  }

  if (username) {
    try {
      chatId = await getChatIdByUsername(username);
    } catch (error) {
      console.error('Failed to get chatId by username', error);
    }
  }

  const url = `${TELEGRAM_API_URL}${botToken}/sendMessage`;
  console.log(chatId);
  const response = await axios.post(url, {
    chat_id: chatId,
    text: message,
  });
  console.log(response);
  if (response.status != 200) {
    throw new Error('Failed to send Telegram notification');
  }
  console.log('Telegram notification sent');
}