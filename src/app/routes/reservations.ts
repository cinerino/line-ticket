/**
 * 予約ルーター
 */
import * as express from 'express';

const reservationsRouter = express.Router();

/**
 * QRスキャン
 */
reservationsRouter.get(
    '/scanScreeningEventReservationCode',
    async (_, res, next) => {
        try {
            // フォーム
            res.render('reservations/scanScreeningEventReservationCode', {
            });
        } catch (error) {
            next(error);
        }
    });

export default reservationsRouter;
