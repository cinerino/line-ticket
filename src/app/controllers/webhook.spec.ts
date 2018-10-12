// tslint:disable:no-implicit-dependencies
/**
 * webhookルーターテスト
 */
before(() => {
    process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN = 'xxxx';
    process.env.LINE_BOT_CHANNEL_SECRET = 'xxxx';
    process.env.USER_EXPIRES_IN_SECONDS = '3600';
    process.env.REFRESH_TOKEN_EXPIRES_IN_SECONDS = '2678400';
});
describe('POST /webhook', () => {
    // no test
});
