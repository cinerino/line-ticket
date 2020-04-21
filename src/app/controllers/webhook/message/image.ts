import { Request } from 'express';
import * as stream from 'stream';

import LINE from '../../../../lineClient';
import User from '../../../user';

/**
 * 画像メッセージウェブフックコントローラ
 */
export class ImageMessageWebhookController {
    // private project?: { id: string };
    private readonly user: User;

    constructor(req: Request) {
        // this.project = req.project;
        this.user = req.user;
    }

    public async indexFace(messageId: string) {
        // faceをコレクションに登録
        const content = await LINE.getMessageContent(messageId);
        const source = await streamToBuffer(content);
        await this.user.indexFace(source);
        await LINE.pushMessage(this.user.userId, { type: 'text', text: '顔写真を登録しましたので、Face Loginをご利用できます' });
    }

}

async function streamToBuffer(readable: stream.Readable) {
    return new Promise<Buffer>((resolve, reject) => {
        const buffers: Buffer[] = [];
        readable.on('error', reject)
            .on('data', (data) => buffers.push(<Buffer>data))
            .on('end', () => {
                resolve(Buffer.concat(buffers));
            });
    });
}
