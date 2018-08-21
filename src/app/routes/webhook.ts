/**
 * webhookルーター
 */
import * as line from '@line/bot-sdk';
import * as createDebug from 'debug';
import * as express from 'express';
import { OK } from 'http-status';

import * as WebhookController from '../controllers/webhook';
import authentication from '../middlewares/authentication';
import faceLogin from '../middlewares/faceLogin';
// import User from '../user';

const webhookRouter = express.Router();
const debug = createDebug('cinerino-line-ticket:*');
const config = {
    channelAccessToken: <string>process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN,
    channelSecret: <string>process.env.LINE_BOT_CHANNEL_SECRET
};
const client = new line.Client(config);

webhookRouter.all(
    '/',
    faceLogin,
    authentication,
    line.middleware(config),
    async (req, res) => {
        debug('body:', JSON.stringify(req.body));
        await Promise.all(req.body.events.map(async (e: line.WebhookEvent) => {
            await handleEvent(e);
        }));
        // .then((result) => res.json(result));
        res.status(OK).send('ok');
    });

async function handleEvent(event: line.WebhookEvent) {
    try {
        switch (event.type) {
            case 'message':
                // await WebhookController.message(event, user);
                await client.replyMessage(
                    event.replyToken,
                    {
                        type: 'text',
                        text: 'hello'
                    }
                );
                break;

            case 'postback':
                await WebhookController.postback(event, <any>null);
                break;

            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore next */
            case 'follow':
                await WebhookController.follow(event);
                break;

            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore next */
            case 'unfollow':
                await WebhookController.unfollow(event);
                break;

            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore next */
            case 'join':
                await WebhookController.join(event);
                break;

            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore next */
            case 'leave':
                await WebhookController.leave(event);
                break;

            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore next */
            case 'beacon':
                await WebhookController.beacon(event);
                break;

            default:
        }
    } catch (error) {
        debug(error);
    }
}

export default webhookRouter;
