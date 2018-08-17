
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
                "type": "flex",
                "altText": "This is a Flex Message",
                contents: {
                    "type": "bubble",
                    "body": {
                        "type": "box",
                        "layout": "horizontal",
                        "contents": [
                            {
                                "type": "text",
                                "text": "Hello,"
                            },
                            {
                                "type": "text",
                                "text": "World!"
                            }
                        ]
                    }
                }
            },
            {
                "type": "flex",
                "altText": "This is a Flex Message",
                contents: {
                    "type": "bubble",
                    "header": {
                        "type": "box",
                        "layout": "vertical",
                        "contents": [
                            {
                                "type": "text",
                                "text": "Header text"
                            }
                        ]
                    },
                    "hero": {
                        "type": "image",
                        "url": "https://avatars1.githubusercontent.com/u/42027651?s=200&v=4",
                    },
                    "body": {
                        "type": "box",
                        "layout": "vertical",
                        "contents": [
                            {
                                "type": "text",
                                "text": "Body text",
                            }
                        ]
                    },
                    "footer": {
                        "type": "box",
                        "layout": "vertical",
                        "contents": [
                            {
                                "type": "text",
                                "text": "Footer text",
                            }
                        ]
                    },
                    "styles": {
                        "header": {
                            "backgroundColor": "#00ffff"
                        },
                        "hero": {
                            "separator": true,
                            "separatorColor": "#000000"
                        },
                        "footer": {
                            "backgroundColor": "#00ffff",
                            "separator": true,
                            "separatorColor": "#000000"
                        }
                    }
                }
            },
            {
                "type": "flex",
                "altText": "This is a Flex Message",
                contents: {
                    "type": "carousel",
                    "contents": [
                        {
                            "type": "bubble",
                            "header": {
                                "type": "box",
                                "layout": "vertical",
                                "contents": [
                                    {
                                        "type": "text",
                                        "text": "************1111"
                                    }
                                ]
                            },
                            // "hero": {
                            //     "type": "image",
                            //     "url": "https://avatars1.githubusercontent.com/u/42027651?s=200&v=4",
                            // },
                            "body": {
                                "type": "box",
                                "layout": "vertical",
                                "contents": [
                                    {
                                        "type": "box",
                                        "layout": "horizontal",
                                        "contents": [
                                            {
                                                "type": "text",
                                                "text": "cardNo",
                                                "align": "start"
                                            },
                                            // {
                                            //     "type": "filler"
                                            // },
                                            {
                                                "type": "text",
                                                "text": "************1111",
                                                "align": "end"
                                            }
                                        ]
                                    },
                                    {
                                        "type": "box",
                                        "layout": "horizontal",
                                        "contents": [
                                            {
                                                "type": "text",
                                                "text": "holderName",
                                                "align": "start"
                                            },
                                            {
                                                "type": "text",
                                                "text": "AA BB",
                                                "align": "end"
                                            }
                                        ]
                                    },
                                ]
                            },
                            "footer": {
                                "type": "box",
                                "layout": "vertical",
                                "contents": [
                                    {
                                        "type": "text",
                                        "text": "Footer text",
                                    }
                                ]
                            },
                            // "styles": {
                            //     "header": {
                            //         "separator": true,
                            //         "backgroundColor": "#ffffff",
                            //         "separatorColor": "#eeeeee"
                            //     },
                            //     "body": {
                            //         "separator": true,
                            //         "separatorColor": "#eeeeee"
                            //     },
                            //     "footer": {
                            //         "backgroundColor": "#ffffff",
                            //         "separator": true,
                            //         "separatorColor": "#dddddd"
                            //     }
                            // }
                        },
                        {
                            "type": "bubble",
                            "body": {
                                "type": "box",
                                "layout": "vertical",
                                "contents": [
                                    {
                                        "type": "text",
                                        "text": "First bubble"
                                    }
                                ]
                            }
                        },
                        {
                            "type": "bubble",
                            "body": {
                                "type": "box",
                                "layout": "vertical",
                                "contents": [
                                    {
                                        "type": "image",
                                        "url": "https://avatars1.githubusercontent.com/u/42027651?s=200&v=4",
                                    },
                                    // {
                                    //     "type": "icon",
                                    //     "url": "https://example.com/icon/png/caution.png",
                                    //     "size": "lg"
                                    // },
                                    {
                                        "type": "separator",
                                    },
                                    {
                                        "type": "text",
                                        "text": "Text in the box"
                                    }
                                ]
                            }
                        }
                    ]
                }
            }
        ]
    }
}).then(() => {
}).catch(console.error);
