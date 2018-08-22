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
 * 予約ルーター
 */
const express = require("express");
const reservationsRouter = express.Router();
/**
 * QRスキャン
 */
reservationsRouter.get('/scanScreeningEventReservationCode', (_, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        // フォーム
        res.render('reservations/scanScreeningEventReservationCode', {});
    }
    catch (error) {
        next(error);
    }
}));
exports.default = reservationsRouter;
