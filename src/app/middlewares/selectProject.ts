/**
 * 顔ログインミドルウェア
 */
import * as cinerinoapi from '@cinerino/api-nodejs-client';
import { QuickReplyItem, TextMessage, WebhookEvent } from '@line/bot-sdk';
import { NextFunction, Request, Response } from 'express';
import { OK } from 'http-status';
import * as qs from 'qs';
// import * as request from 'request-promise-native';

import LINE from '../../lineClient';
// import User from '../user';

export default async (req: Request, res: Response, next: NextFunction) => {
    try {
        // プロジェクト選択中かどうか
        let selectedProjectId = await req.user.getSelectedProject();
        await LINE.pushMessage(req.user.userId, { type: 'text', text: `選択中のプロジェクト:${selectedProjectId}` });

        // 選択アクションであればプロジェクト選択
        const events: WebhookEvent[] = req.body.events;
        const event = events[0];
        if (event !== undefined) {
            switch (event.type) {
                // case 'message':
                //     if (event.message.type === 'text') {
                //         try {
                //         } catch (error) {
                //             await LINE.pushMessage(userId, { type: 'text', text: error.message });
                //         }

                //         res.status(OK)
                //             .send('ok');

                //         return;
                //     }
                //     break;

                case 'postback':
                    const data = qs.parse(event.postback.data);
                    if (data.action === 'selectProject') {
                        selectedProjectId = data.id;
                        if (typeof selectedProjectId === 'string' && selectedProjectId.length > 0) {
                            await req.user.selectProject({ id: <string>data.id });
                            await LINE.pushMessage(req.user.userId, { type: 'text', text: 'プロジェクトを選択しました' });
                            await LINE.pushMessage(req.user.userId, { type: 'text', text: `選択中のプロジェクト:${data.id}` });
                        } else {
                            // プロジェクト変更アクション
                            await sendSelectMessage(req);
                        }

                        res.status(OK)
                            .send('ok');

                        return;
                    }

                    break;

                default:
            }
        }

        // 選択中であればリクエストにプロジェクトセット
        if (typeof selectedProjectId === 'string') {
            req.project = { typeOf: cinerinoapi.factory.organizationType.Project, id: selectedProjectId };

            next();

            return;
        }

        // 選択中でなければ選択メッセージ送信
        await sendSelectMessage(req);

        res.status(OK)
            .send('ok');
    } catch (error) {
        next(new cinerinoapi.factory.errors.Unauthorized(error.message));
    }
};

export async function sendSelectMessage(req: Request) {
    const projectIds = String(process.env.PROJECT_IDS)
        .split(',');
    const quickReplyItems: QuickReplyItem[] = projectIds.map((projectId) => {
        return {
            type: 'action',
            // imageUrl: `https://${this.user.host}/img/labels/reservation-ticket.png`,
            action: {
                type: 'postback',
                label: projectId,
                data: qs.stringify({
                    action: 'selectProject',
                    id: projectId
                })
            }
        };
    });

    const message: TextMessage = {
        type: 'text',
        text: 'プロジェクトを選択してください',
        quickReply: {
            items: quickReplyItems
        }
    };
    await LINE.pushMessage(req.user.userId, [message]);
}
