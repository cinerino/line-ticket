
const request = require('request-promise-native');

request.post({
    simple: false,
    url: 'https://api.line.me/v2/bot/message/push',
    auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
    json: true,
    body: {
        to: 'U28fba84b4008d60291fc861e2562b34f',
        messages: [
            {
                "type": "text", // ①
                "text": "Select your favorite food category or send me your location!",
                "quickReply": { // ②
                    "items": [
                        {
                            "type": "action", // ③
                            "imageUrl": "https://example.com/sushi.png",
                            "action": {
                                "type": "message",
                                "label": "Sushi",
                                "text": "Sushi"
                            }
                        },
                        {
                            "type": "action",
                            "imageUrl": "https://example.com/tempura.png",
                            "action": {
                                "type": "message",
                                "label": "Tempura",
                                "text": "Tempura"
                            }
                        },
                        {
                            "type": "action", // ④
                            "action": {
                                "type": "location",
                                "label": "Send location"
                            }
                        }
                    ]
                }
            }
        ]
    }
}).then(() => {
}).catch(console.error);
