/**
 * webhookルーター
 */
import { WebhookEvent } from '@line/bot-sdk';
import * as createDebug from 'debug';
import * as express from 'express';
import { OK } from 'http-status';

import LINE from '../../lineClient';
import { WebhookController } from '../controllers/webhook';
import authentication from '../middlewares/authentication';
import faceLogin from '../middlewares/faceLogin';

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
            await handleEvent(e, req);
        }));
        res.status(OK)
            .send('ok');
    });

async function handleEvent(event: WebhookEvent, req: express.Request) {
    try {
        const webhookController = new WebhookController(req);

        switch (event.type) {
            case 'message':
                await webhookController.message(event);
                break;

            case 'postback':
                await webhookController.postback(event);
                break;

            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore next */
            case 'follow':
                await webhookController.follow(event);
                break;

            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore next */
            case 'unfollow':
                await webhookController.unfollow(event);
                break;

            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore next */
            case 'join':
                await webhookController.join(event);
                break;

            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore next */
            case 'leave':
                await webhookController.leave(event);
                break;

            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore next */
            case 'beacon':
                await webhookController.beacon(event);
                break;

            default:
        }
    } catch (error) {
        debug(error);
        await LINE.pushMessage(req.user.userId, { type: 'text', text: `${error.name}:${error.message}` });
    }
}

export default webhookRouter;
