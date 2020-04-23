/**
 * 顔ログインミドルウェア
 */
import * as cinerinoapi from '@cinerino/api-nodejs-client';
import { FlexBubble, FlexMessage, WebhookEvent } from '@line/bot-sdk';
import { NextFunction, Request, Response } from 'express';
import { OK } from 'http-status';
import * as qs from 'qs';
// import * as request from 'request-promise-native';

import LINE from '../../lineClient';
// import User from '../user';

import { MessageWebhookController } from '../controllers/webhook/message';

import { project2flexBubble } from '../contentsBuilder';

export default async (req: Request, res: Response, next: NextFunction) => {
    try {
        // プロジェクト選択中かどうか
        let selectedProject = await req.user.getSelectedProject();
        if (selectedProject !== undefined) {
            await LINE.pushMessage(req.user.userId, { type: 'text', text: `選択中のプロジェクト:${selectedProject.name}` });
        } else {
            await LINE.pushMessage(req.user.userId, { type: 'text', text: '選択中のプロジェクトがありません' });
        }

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
                        const projectId = data.id;
                        if (typeof projectId === 'string' && projectId.length > 0) {
                            selectedProject = {
                                typeOf: cinerinoapi.factory.organizationType.Project,
                                id: data.id,
                                name: data.name
                            };
                            await req.user.selectProject(selectedProject);
                            await LINE.pushMessage(req.user.userId, { type: 'text', text: 'プロジェクトを選択しました' });
                            await LINE.pushMessage(req.user.userId, { type: 'text', text: `選択中のプロジェクト:${selectedProject.name}` });

                            const messageController = new MessageWebhookController(req);
                            await messageController.pushHowToUse({ replyToken: event.replyToken });
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
        if (selectedProject !== undefined) {
            req.project = { typeOf: cinerinoapi.factory.organizationType.Project, id: selectedProject.id };

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
    try {
        const projectService = new cinerinoapi.service.Project({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: req.user.authClientApplication
        });
        const searchProjectsResult = await projectService.search({ limit: 10 });

        if (searchProjectsResult.data.length === 0) {
            await LINE.pushMessage(req.user.userId, { type: 'text', text: 'プロジェクトが見つかりませんでした' });

            return;
        }

        // const accessToken = await params.user.authClient.getAccessToken();
        const flex: FlexMessage = {
            type: 'flex',
            altText: 'プロジェクトを選択してください',
            contents: {
                type: 'carousel',
                contents: [
                    // tslint:disable-next-line:no-magic-numbers
                    ...searchProjectsResult.data.slice(0, 10)
                        .map<FlexBubble>((project) => {
                            return project2flexBubble({ project: project });
                        })
                ]
            }
        };
        await LINE.pushMessage(req.user.userId, [flex]);

        // const quickReplyItems: QuickReplyItem[] = searchProjectsResult.data.map((project) => {
        //     return {
        //         type: 'action',
        //         // imageUrl: `https://${this.user.host}/img/labels/reservation-ticket.png`,
        //         action: {
        //             type: 'postback',
        //             label: String(project.name),
        //             data: qs.stringify({
        //                 action: 'selectProject',
        //                 id: String(project.id)
        //             })
        //         }
        //     };
        // });

        // const message: TextMessage = {
        //     type: 'text',
        //     text: 'プロジェクトを選択してください',
        //     quickReply: {
        //         items: quickReplyItems
        //     }
        // };
        // await LINE.pushMessage(req.user.userId, [message]);
    } catch (error) {
        await LINE.pushMessage(req.user.userId, { type: 'text', text: `プロジェクトを検索できませんでした: ${error.message}` });
    }
}
