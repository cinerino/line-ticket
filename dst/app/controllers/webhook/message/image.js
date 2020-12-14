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
exports.ImageMessageWebhookController = void 0;
const lineClient_1 = require("../../../../lineClient");
/**
 * 画像メッセージウェブフックコントローラ
 */
class ImageMessageWebhookController {
    constructor(req) {
        // this.project = req.project;
        this.user = req.user;
    }
    indexFace(messageId) {
        return __awaiter(this, void 0, void 0, function* () {
            // faceをコレクションに登録
            const content = yield lineClient_1.default.getMessageContent(messageId);
            const source = yield streamToBuffer(content);
            yield this.user.indexFace(source);
            yield lineClient_1.default.pushMessage(this.user.userId, { type: 'text', text: '顔写真を登録しましたので、Face Loginをご利用できます' });
        });
    }
}
exports.ImageMessageWebhookController = ImageMessageWebhookController;
function streamToBuffer(readable) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const buffers = [];
            readable.on('error', reject)
                .on('data', (data) => buffers.push(data))
                .on('end', () => {
                resolve(Buffer.concat(buffers));
            });
        });
    });
}
