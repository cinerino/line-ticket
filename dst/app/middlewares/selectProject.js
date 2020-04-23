"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 顔ログインミドルウェア
 */
const cinerinoapi = require("@cinerino/api-nodejs-client");
const http_status_1 = require("http-status");
const qs = require("qs");
// import * as request from 'request-promise-native';
const lineClient_1 = require("../../lineClient");
// import User from '../user';
const message_1 = require("../controllers/webhook/message");
const contentsBuilder_1 = require("../contentsBuilder");
exports.default = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // プロジェクト選択中かどうか
        let selectedProject = yield req.user.getSelectedProject();
        if (selectedProject !== undefined) {
            yield lineClient_1.default.pushMessage(req.user.userId, { type: 'text', text: `選択中のプロジェクト:${selectedProject.name}` });
        }
        else {
            yield lineClient_1.default.pushMessage(req.user.userId, { type: 'text', text: '選択中のプロジェクトがありません' });
        }
        // 選択アクションであればプロジェクト選択
        const events = req.body.events;
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
                            yield req.user.selectProject(selectedProject);
                            yield lineClient_1.default.pushMessage(req.user.userId, { type: 'text', text: 'プロジェクトを選択しました' });
                            yield lineClient_1.default.pushMessage(req.user.userId, { type: 'text', text: `選択中のプロジェクト:${selectedProject.name}` });
                            const messageController = new message_1.MessageWebhookController(req);
                            yield messageController.pushHowToUse({ replyToken: event.replyToken });
                        }
                        else {
                            // プロジェクト変更アクション
                            yield sendSelectMessage(req);
                        }
                        res.status(http_status_1.OK)
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
        yield sendSelectMessage(req);
        res.status(http_status_1.OK)
            .send('ok');
    }
    catch (error) {
        next(new cinerinoapi.factory.errors.Unauthorized(error.message));
    }
});
function sendSelectMessage(req) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const projectService = new cinerinoapi.service.Project({
                endpoint: process.env.CINERINO_ENDPOINT,
                auth: req.user.authClientApplication
            });
            const searchProjectsResult = yield projectService.search({ limit: 10 });
            if (searchProjectsResult.data.length === 0) {
                yield lineClient_1.default.pushMessage(req.user.userId, { type: 'text', text: 'プロジェクトが見つかりませんでした' });
                return;
            }
            yield lineClient_1.default.pushMessage(req.user.userId, { type: 'text', text: 'プロジェクトを選択してください' });
            // const accessToken = await params.user.authClient.getAccessToken();
            const flex = {
                type: 'flex',
                altText: 'プロジェクトを選択してください',
                contents: {
                    type: 'carousel',
                    contents: [
                        // tslint:disable-next-line:no-magic-numbers
                        ...searchProjectsResult.data.slice(0, 10)
                            .map((project) => {
                            return contentsBuilder_1.project2flexBubble({ project: project });
                        })
                    ]
                }
            };
            yield lineClient_1.default.pushMessage(req.user.userId, [flex]);
        }
        catch (error) {
            yield lineClient_1.default.pushMessage(req.user.userId, { type: 'text', text: `プロジェクトを検索できませんでした: ${error.message}` });
        }
    });
}
exports.sendSelectMessage = sendSelectMessage;
