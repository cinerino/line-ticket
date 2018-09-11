"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * defaultルーター
 */
const express = require("express");
const accounts_1 = require("./accounts");
const auth_1 = require("./auth");
const liff_1 = require("./liff");
const orders_1 = require("./orders");
const reservations_1 = require("./reservations");
const transactions_1 = require("./transactions");
const webhook_1 = require("./webhook");
const router = express.Router();
// middleware that is specific to this router
// router.use((req, res, next) => {
//   debug('Time: ', Date.now())
//   next()
// })
router.use(auth_1.default);
router.use('/accounts', accounts_1.default);
router.use('/liff', liff_1.default);
router.use('/orders', orders_1.default);
router.use('/reservations', reservations_1.default);
router.use('/transactions', transactions_1.default);
router.use('/webhook', webhook_1.default);
exports.default = router;
