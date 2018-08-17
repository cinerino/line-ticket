const request = require('request-promise-native');

request.put(
    `https://api.line.me/liff/v1/apps/${process.env.LIFF_ID}/view`,
    {
        headers: {
            Authorization: `Bearer ${process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN}`
        },
        json: true,
        body: {
            // "view": {
            // type: "compact",
            type: "tall",
            // type: "full",
            url: "https://cinerino-line-ticket.azurewebsites.net/transactions/inputCreditCard"
            // }
        }
    }
).then(console.log).catch(console.error);
