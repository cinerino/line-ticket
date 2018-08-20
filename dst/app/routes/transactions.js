"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 取引ルーター
 */
const express = require("express");
const transactionsRouter = express.Router();
/**
 * クレジットカード情報入力フォーム
 */
transactionsRouter.get('/transactions/inputCreditCard', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        // フォーム
        res.render('transactions/inputCreditCard', {
            gmoShopId: req.query.gmoShopId
        });
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 座席選択フォーム
 */
transactionsRouter.get('/transactions/placeOrder/selectSeatOffers', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        // フォーム
        res.render('transactions/placeOrder/selectSeatOffers', {
            eventId: req.query.eventId
        });
    }
    catch (error) {
        next(error);
    }
}));
/**
 * QRスキャン
 */
transactionsRouter.get('/transactions/placeOrder/scanQRCode', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        // フォーム
        res.render('transactions/placeOrder/scanQRCode', {
            eventId: req.query.eventId
        });
    }
    catch (error) {
        next(error);
    }
}));
exports.default = transactionsRouter;
