/**
 * 取引ルーター
 */
import * as createDebug from 'debug';
import * as express from 'express';

import * as PostbackController from '../controllers/webhook/postback';
import User from '../user';

const transactionsRouter = express.Router();
const debug = createDebug('cinerino-line-ticket:*');

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

/**
 * 自分の取引のクレジットカード情報入力戻り先
 */
transactionsRouter.post(
    '/transactions/:transactionId/inputCreditCard',
    async (req, res, next) => {
        try {
            debug('credit card token created.', req.body.token);
            const user = new User({
                host: req.hostname,
                userId: req.query.userId,
                state: req.query.state
            });

            // 入金
            await PostbackController.depositFromCreditCard({
                user: user,
                amount: parseInt(req.body.amount, 10),
                toAccountNumber: req.body.toAccountNumber,
                creditCardToken: req.body.token
            });

            const location = 'line://';
            res.send(`
<html>
<body onload="location.href='line://'">
<div style="text-align:center; font-size:400%">
<h1>入金完了</h1>
<a href="${location}">LINEに戻る</a>
</div>
</body>
</html>`
            );
        } catch (error) {
            next(error);
        }
    });

export default transactionsRouter;
