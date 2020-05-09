"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * プロジェクト詳細ルーター
 */
const express = require("express");
const accounts_1 = require("../accounts");
const liff_1 = require("../liff");
const orders_1 = require("../orders");
const paymentCards_1 = require("../paymentCards");
const people_1 = require("../people");
const reservations_1 = require("../reservations");
const transactions_1 = require("../transactions");
const webhook_1 = require("../webhook");
const projectDetailRouter = express.Router();
projectDetailRouter.use((req, _, next) => {
    var _a;
    // プロジェクト未指定は拒否
    if (typeof ((_a = req.project) === null || _a === void 0 ? void 0 : _a.id) !== 'string') {
        next(new Error('プロジェクトが指定されていません'));
        return;
    }
    next();
});
projectDetailRouter.use('/accounts', accounts_1.default);
projectDetailRouter.use('/liff', liff_1.default);
projectDetailRouter.use('/orders', orders_1.default);
projectDetailRouter.use('/paymentCards', paymentCards_1.default);
projectDetailRouter.use('/people', people_1.default);
projectDetailRouter.use('/reservations', reservations_1.default);
projectDetailRouter.use('/transactions', transactions_1.default);
projectDetailRouter.use('/webhook', webhook_1.default);
exports.default = projectDetailRouter;
