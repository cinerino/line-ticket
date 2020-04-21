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
exports.default = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // プロジェクト選択中かどうか
        let selectedProjectId = yield req.user.getSelectedProject();
        yield lineClient_1.default.pushMessage(req.user.userId, { type: 'text', text: `選択中のプロジェクト:${selectedProjectId}` });
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
                        selectedProjectId = data.id;
                        if (typeof selectedProjectId === 'string' && selectedProjectId.length > 0) {
                            yield req.user.selectProject({ id: data.id });
                            yield lineClient_1.default.pushMessage(req.user.userId, { type: 'text', text: 'プロジェクトを選択しました' });
                            yield lineClient_1.default.pushMessage(req.user.userId, { type: 'text', text: `選択中のプロジェクト:${data.id}` });
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
        if (typeof selectedProjectId === 'string') {
            req.project = { typeOf: cinerinoapi.factory.organizationType.Project, id: selectedProjectId };
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
        const projectIds = String(process.env.PROJECT_IDS)
            .split(',');
        const quickReplyItems = projectIds.map((projectId) => {
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
        const message = {
            type: 'text',
            text: 'プロジェクトを選択してください',
            quickReply: {
                items: quickReplyItems
            }
        };
        yield lineClient_1.default.pushMessage(req.user.userId, [message]);
    });
}
exports.sendSelectMessage = sendSelectMessage;
