/**
 * 取引ルーター
 */
import * as express from 'express';

const transactionsRouter = express.Router();

/**
 * クレジットカード情報入力フォーム
 */
transactionsRouter.get(
    '/transactions/inputCreditCard',
    async (req, res, next) => {
        try {
            // フォーム
            res.render('transactions/inputCreditCard', {
                amount: req.query.amount,
                toAccountNumber: req.query.toAccountNumber,
                gmoShopId: req.query.gmoShopId,
                cb: req.query.cb // フォームのPOST先
            });
        } catch (error) {
            next(error);
        }
    });

export default transactionsRouter;
