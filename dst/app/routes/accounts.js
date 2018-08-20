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
 * 口座ルーター
 */
const express = require("express");
const accountsRouter = express.Router();
/**
 * 口座開設
 */
accountsRouter.get('/open', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        res.render('accounts/open', {
            accountType: req.query.accountType
        });
    }
    catch (error) {
        next(error);
    }
}));
exports.default = accountsRouter;
