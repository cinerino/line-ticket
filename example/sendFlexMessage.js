
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
                type: 'flex',
                altText: "This is a Flex Message",
                contents: {
                    "type": "bubble",
                    "styles": {
                        "footer": {
                            "separator": true
                        }
                    },
                    "body": {
                        "type": "box",
                        "layout": "vertical",
                        "contents": [
                            {
                                "type": "text",
                                "text": "RECEIPT",
                                "weight": "bold",
                                "color": "#1DB446",
                                "size": "sm"
                            },
                            {
                                "type": "text",
                                "text": "Brown StoreBrown StoreBrown StoreBrown Store",
                                "weight": "bold",
                                "size": "xxl",
                                "margin": "md",
                                wrap: true
                            },
                            {
                                "type": "text",
                                "text": "Miraina Tower, 4-1-6 Shinjuku, Tokyo",
                                "size": "xs",
                                "color": "#aaaaaa",
                                "wrap": true
                            },
                            {
                                "type": "separator",
                                "margin": "xxl"
                            },
                            {
                                "type": "box",
                                "layout": "vertical",
                                "margin": "xxl",
                                "spacing": "sm",
                                "contents": [

                                    {
                                        "type": "text",
                                        "text": "BROWN'S ADVENTURE\nIN MOVIE",
                                        "wrap": true,
                                        "weight": "bold",
                                        "gravity": "center",
                                        "size": "xl"
                                    },
                                    {
                                        "type": "box",
                                        "layout": "baseline",
                                        "margin": "md",
                                        "contents": [
                                            {
                                                "type": "icon",
                                                "size": "sm",
                                                "url": "https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png"
                                            },
                                            {
                                                "type": "icon",
                                                "size": "sm",
                                                "url": "https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png"
                                            },
                                            {
                                                "type": "icon",
                                                "size": "sm",
                                                "url": "https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png"
                                            },
                                            {
                                                "type": "icon",
                                                "size": "sm",
                                                "url": "https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png"
                                            },
                                            {
                                                "type": "icon",
                                                "size": "sm",
                                                "url": "https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gray_star_28.png"
                                            },
                                            {
                                                "type": "text",
                                                "text": "4.0",
                                                "size": "sm",
                                                "color": "#999999",
                                                "margin": "md",
                                                "flex": 0
                                            }
                                        ]
                                    },
                                    {
                                        "type": "box",
                                        "layout": "vertical",
                                        "margin": "lg",
                                        "spacing": "sm",
                                        "contents": [
                                            {
                                                "type": "box",
                                                "layout": "baseline",
                                                "spacing": "sm",
                                                "contents": [
                                                    {
                                                        "type": "text",
                                                        "text": "Date",
                                                        "color": "#aaaaaa",
                                                        "size": "sm",
                                                        "flex": 1
                                                    },
                                                    {
                                                        "type": "text",
                                                        "text": "Monday 25, 9:00PM",
                                                        "wrap": true,
                                                        "size": "sm",
                                                        "color": "#666666",
                                                        "flex": 4
                                                    }
                                                ]
                                            },
                                            {
                                                "type": "box",
                                                "layout": "baseline",
                                                "spacing": "sm",
                                                "contents": [
                                                    {
                                                        "type": "text",
                                                        "text": "Place",
                                                        "color": "#aaaaaa",
                                                        "size": "sm",
                                                        "flex": 1
                                                    },
                                                    {
                                                        "type": "text",
                                                        "text": "7 Floor, No.3",
                                                        "wrap": true,
                                                        "color": "#666666",
                                                        "size": "sm",
                                                        "flex": 4
                                                    }
                                                ]
                                            },
                                            {
                                                "type": "box",
                                                "layout": "baseline",
                                                "spacing": "sm",
                                                "contents": [
                                                    {
                                                        "type": "text",
                                                        "text": "Seats",
                                                        "color": "#aaaaaa",
                                                        "size": "sm",
                                                        "flex": 1
                                                    },
                                                    {
                                                        "type": "text",
                                                        "text": "C Row, 18 Seat",
                                                        "wrap": true,
                                                        "color": "#666666",
                                                        "size": "sm",
                                                        "flex": 4
                                                    }
                                                ]
                                            }
                                        ]
                                    },
                                    {
                                        "type": "box",
                                        "layout": "horizontal",
                                        "contents": [
                                            {
                                                "type": "text",
                                                "text": "Energy Drink",
                                                "size": "sm",
                                                "color": "#555555",
                                                "flex": 0
                                            },
                                            {
                                                "type": "text",
                                                "text": "$2.99",
                                                "size": "sm",
                                                "color": "#111111",
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
                                                "text": "Chewing Gum",
                                                "size": "sm",
                                                "color": "#555555",
                                                "flex": 0
                                            },
                                            {
                                                "type": "text",
                                                "text": "$0.99",
                                                "size": "sm",
                                                "color": "#111111",
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
                                                "text": "Bottled Water",
                                                "size": "sm",
                                                "color": "#555555",
                                                "flex": 0
                                            },
                                            {
                                                "type": "text",
                                                "text": "$3.33",
                                                "size": "sm",
                                                "color": "#111111",
                                                "align": "end"
                                            }
                                        ]
                                    },
                                    {
                                        "type": "separator",
                                        "margin": "xxl"
                                    },
                                    {
                                        "type": "box",
                                        "layout": "horizontal",
                                        "margin": "xxl",
                                        "contents": [
                                            {
                                                "type": "text",
                                                "text": "ITEMS",
                                                "size": "sm",
                                                "color": "#555555"
                                            },
                                            {
                                                "type": "text",
                                                "text": "3",
                                                "size": "sm",
                                                "color": "#111111",
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
                                                "text": "TOTAL",
                                                "size": "sm",
                                                "color": "#555555"
                                            },
                                            {
                                                "type": "text",
                                                "text": "$7.31",
                                                "size": "sm",
                                                "color": "#111111",
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
                                                "text": "CASH",
                                                "size": "sm",
                                                "color": "#555555"
                                            },
                                            {
                                                "type": "text",
                                                "text": "$8.0",
                                                "size": "sm",
                                                "color": "#111111",
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
                                                "text": "CHANGE",
                                                "size": "sm",
                                                "color": "#555555"
                                            },
                                            {
                                                "type": "text",
                                                "text": "$0.69",
                                                "size": "sm",
                                                "color": "#111111",
                                                "align": "end"
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                "type": "separator",
                                "margin": "xxl"
                            },
                            {
                                "type": "box",
                                "layout": "horizontal",
                                "margin": "md",
                                "contents": [
                                    {
                                        "type": "text",
                                        "text": "PAYMENT ID",
                                        "size": "xs",
                                        "color": "#aaaaaa",
                                        "flex": 0
                                    },
                                    {
                                        "type": "text",
                                        "text": "#743289384279",
                                        "color": "#aaaaaa",
                                        "size": "xs",
                                        "align": "end"
                                    }
                                ]
                            }
                        ]
                    }
                }
            },
            // {
            //     "type": "flex",
            //     "altText": "This is a Flex Message",
            //     contents: {
            //         "type": "bubble",
            //         "body": {
            //             "type": "box",
            //             "layout": "horizontal",
            //             "contents": [
            //                 {
            //                     "type": "text",
            //                     "text": "Hello,"
            //                 },
            //                 {
            //                     "type": "text",
            //                     "text": "World!"
            //                 }
            //             ]
            //         }
            //     }
            // },
            // {
            //     "type": "flex",
            //     "altText": "This is a Flex Message",
            //     contents: {
            //         "type": "bubble",
            //         "header": {
            //             "type": "box",
            //             "layout": "vertical",
            //             "contents": [
            //                 {
            //                     "type": "text",
            //                     "text": "Header text"
            //                 }
            //             ]
            //         },
            //         "hero": {
            //             "type": "image",
            //             "url": "https://avatars1.githubusercontent.com/u/42027651?s=200&v=4",
            //         },
            //         "body": {
            //             "type": "box",
            //             "layout": "vertical",
            //             "contents": [
            //                 {
            //                     "type": "text",
            //                     "text": "Body text",
            //                 }
            //             ]
            //         },
            //         "footer": {
            //             "type": "box",
            //             "layout": "vertical",
            //             "contents": [
            //                 {
            //                     "type": "text",
            //                     "text": "Footer text",
            //                 }
            //             ]
            //         },
            //         "styles": {
            //             "header": {
            //                 "backgroundColor": "#00ffff"
            //             },
            //             "hero": {
            //                 "separator": true,
            //                 "separatorColor": "#000000"
            //             },
            //             "footer": {
            //                 "backgroundColor": "#00ffff",
            //                 "separator": true,
            //                 "separatorColor": "#000000"
            //             }
            //         }
            //     }
            // },
            // {
            //     "type": "flex",
            //     "altText": "This is a Flex Message",
            //     contents: {
            //         "type": "carousel",
            //         "contents": [
            //             {
            //                 "type": "bubble",
            //                 "header": {
            //                     "type": "box",
            //                     "layout": "vertical",
            //                     "contents": [
            //                         {
            //                             "type": "text",
            //                             "text": "************1111"
            //                         }
            //                     ]
            //                 },
            //                 "hero": {
            //                     "type": "image",
            //                     "url": "https://avatars1.githubusercontent.com/u/42027651?s=200&v=4",
            //                 },
            //                 "body": {
            //                     "type": "box",
            //                     "layout": "vertical",
            //                     "contents": [
            //                         {
            //                             "type": "box",
            //                             "layout": "horizontal",
            //                             "contents": [
            //                                 {
            //                                     "type": "text",
            //                                     "text": "cardNo",
            //                                     "align": "start"
            //                                 },
            //                                 {
            //                                     "type": "filler"
            //                                 },
            //                                 {
            //                                     "type": "text",
            //                                     "text": "************1111",
            //                                     "align": "end"
            //                                 }
            //                             ]
            //                         },
            //                         {
            //                             "type": "box",
            //                             "layout": "horizontal",
            //                             "contents": [
            //                                 {
            //                                     "type": "text",
            //                                     "text": "holderName",
            //                                     "align": "start"
            //                                 },
            //                                 {
            //                                     "type": "text",
            //                                     "text": "AA BB",
            //                                     "align": "end"
            //                                 }
            //                             ]
            //                         },
            //                     ]
            //                 },
            //                 "footer": {
            //                     "type": "box",
            //                     "layout": "vertical",
            //                     "contents": [
            //                         {
            //                             "type": "text",
            //                             "text": "Footer text",
            //                         }
            //                     ]
            //                 },
            //                 "styles": {
            //                     "header": {
            //                         "separator": true,
            //                         "backgroundColor": "#ffffff",
            //                         "separatorColor": "#eeeeee"
            //                     },
            //                     "body": {
            //                         "separator": true,
            //                         "separatorColor": "#eeeeee"
            //                     },
            //                     "footer": {
            //                         "backgroundColor": "#ffffff",
            //                         "separator": true,
            //                         "separatorColor": "#dddddd"
            //                     }
            //                 }
            //             },
            //             {
            //                 "type": "bubble",
            //                 "body": {
            //                     "type": "box",
            //                     "layout": "vertical",
            //                     "contents": [
            //                         {
            //                             "type": "text",
            //                             "text": "First bubble"
            //                         }
            //                     ]
            //                 }
            //             },
            //             {
            //                 "type": "bubble",
            //                 "body": {
            //                     "type": "box",
            //                     "layout": "vertical",
            //                     "contents": [
            //                         {
            //                             "type": "image",
            //                             "url": "https://avatars1.githubusercontent.com/u/42027651?s=200&v=4",
            //                         },
            //                         {
            //                             "type": "separator",
            //                         },
            //                         {
            //                             "type": "text",
            //                             "text": "Text in the box"
            //                         }
            //                     ]
            //                 }
            //             }
            //         ]
            //     }
            // }
        ]
    }
}).then(() => {
}).catch(console.error);
