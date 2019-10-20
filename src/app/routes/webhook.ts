/**
 * webhookルーター
 */
import { WebhookEvent } from '@line/bot-sdk';
import * as createDebug from 'debug';
import * as express from 'express';
import { OK } from 'http-status';

import LINE from '../../lineClient';
import * as WebhookController from '../controllers/webhook';
import authentication from '../middlewares/authentication';
import faceLogin from '../middlewares/faceLogin';
import User from '../user';

const webhookRouter = express.Router();
const debug = createDebug('cinerino-line-ticket:router');

webhookRouter.post(
    '',
    faceLogin,
    authentication,
    // line.middleware(config),
    async (req, res) => {
        debug('body:', req.body);
        await Promise.all(req.body.events.map(async (e: WebhookEvent) => {
            await handleEvent(e, req.user);
        }));
        res.status(OK)
            .send('ok');
    });

async function handleEvent(event: WebhookEvent, user: User) {
    try {
        switch (event.type) {
            case 'message':
                await WebhookController.message(event, user);
                break;

            case 'postback':
                await WebhookController.postback(event, user);
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
        await LINE.pushMessage(user.userId, { type: 'text', text: `${error.name}:${error.message}` });
    }
}

export default webhookRouter;
