import * as line from '@line/bot-sdk';
/**
 * LINEクライアント
 */
const LINE = new line.Client({
    channelAccessToken: <string>process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN,
    channelSecret: <string>process.env.LINE_BOT_CHANNEL_SECRET
});
export default LINE;
