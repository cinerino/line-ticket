/**
 * 注文ルーター
 */
import * as express from 'express';

const ordersRouter = express.Router();
ordersRouter.get(
    '/findByConfirmationNumber',
    async (_, res, next) => {
        try {
            // フォーム
            res.render('orders/findByConfirmationNumber', {
            });
        } catch (error) {
            next(error);
        }
    });
export default ordersRouter;
