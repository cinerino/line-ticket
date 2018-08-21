/**
 * 画像メッセージハンドラー
 */
import * as stream from 'stream';

import LINE from '../../../../lineClient';
import User from '../../../user';

export async function indexFace(user: User, messageId: string) {
    // faceをコレクションに登録
    const content = await LINE.getMessageContent(messageId);
    const source = await streamToBuffer(content);
    await user.indexFace(source);
    await LINE.pushMessage(user.userId, { type: 'text', text: '顔写真を登録しましたので、Face Loginをご利用できます' });
}
async function streamToBuffer(readable: stream.Readable) {
    return new Promise<Buffer>((resolve, reject) => {
        const buffers: Uint8Array[] = [];
        readable.on('error', reject)
            .on('data', (data) => buffers.push(data))
            .on('end', () => {
                resolve(Buffer.concat(buffers));
            });
    });
}
