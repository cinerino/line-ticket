"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * webhookルーター
 */
const line = require("@line/bot-sdk");
const createDebug = require("debug");
const express = require("express");
const http_status_1 = require("http-status");
const WebhookController = require("../controllers/webhook");
const authentication_1 = require("../middlewares/authentication");
const faceLogin_1 = require("../middlewares/faceLogin");
const webhookRouter = express.Router();
const debug = createDebug('cinerino-line-ticket:*');
const config = {
    channelAccessToken: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_BOT_CHANNEL_SECRET
};
const client = new line.Client(config);
// webhookRouter.post(
//     '/webhook',
//     (req, res) => {
//         Promise
//             .all(req.body.events.map(handleEvent))
//             .then((result) => res.json(result))
//             .catch((err) => {
//                 console.error(err);
//                 res.status(500).end();
//             });
//     });
// const client = new line.Client(config);
// function handleEvent(event: line.WebhookEvent) {
//     if (event.type !== 'message' || event.message.type !== 'text') {
//         return Promise.resolve(null);
//     }
//     return client.replyMessage(event.replyToken, {
//         type: 'text',
//         text: event.message.text
//     });
// }
webhookRouter.all('/webhook', faceLogin_1.default, authentication_1.default, 
// line.middleware(config),
(req, res) => __awaiter(this, void 0, void 0, function* () {
    debug('body:', JSON.stringify(req.body));
    yield Promise.all(req.body.events.map((e) => __awaiter(this, void 0, void 0, function* () {
        yield handleEvent(e, req.user);
    })));
    res.status(http_status_1.OK).send('ok');
}));
function handleEvent(event, user) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            switch (event.type) {
                case 'message':
                    // await WebhookController.message(event, user);
                    yield client.replyMessage(event.replyToken, {
                        type: 'text',
                        text: 'hello'
                    });
                    break;
                case 'postback':
                    yield WebhookController.postback(event, null);
                    break;
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore next */
                case 'follow':
                    yield WebhookController.follow(event);
                    break;
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore next */
                case 'unfollow':
                    yield WebhookController.unfollow(event);
                    break;
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore next */
                case 'join':
                    yield WebhookController.join(event);
                    break;
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore next */
                case 'leave':
                    yield WebhookController.leave(event);
                    break;
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore next */
                case 'beacon':
                    yield WebhookController.beacon(event);
                    break;
                default:
            }
        }
        catch (error) {
            debug(error);
        }
    });
}
exports.default = webhookRouter;
