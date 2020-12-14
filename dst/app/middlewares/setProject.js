"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * リクエストプロジェクト設定ルーター
 */
const cinerinoapi = require("@cinerino/sdk");
const express = require("express");
const setProject = express.Router();
// プロジェクト指定ルーティング配下については、すべてreq.projectを上書き
setProject.use('/projects/:id', (req, _, next) => {
    req.project = { typeOf: cinerinoapi.factory.chevre.organizationType.Project, id: req.params.id };
    next();
});
exports.default = setProject;
