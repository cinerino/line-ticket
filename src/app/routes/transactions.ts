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
                gmoShopId: req.query.gmoShopId
            });
        } catch (error) {
            next(error);
        }
    });

/**
 * 座席選択フォーム
 */
transactionsRouter.get(
    '/transactions/placeOrder/selectSeatOffers',
    async (req, res, next) => {
        try {
            // フォーム
            res.render('transactions/placeOrder/selectSeatOffers', {
                eventId: req.query.eventId
            });
        } catch (error) {
            next(error);
        }
    });

/**
 * QRスキャン
 */
transactionsRouter.get(
    '/transactions/placeOrder/scanQRCode',
    async (req, res, next) => {
        try {
            // フォーム
            res.render('transactions/placeOrder/scanQRCode', {
                transactionId: req.query.transactionId
            });
        } catch (error) {
            next(error);
        }
    });

export default transactionsRouter;
