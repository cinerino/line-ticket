/**
 * リクエストプロジェクト設定ルーター
 */
import * as cinerinoapi from '@cinerino/api-nodejs-client';
import * as express from 'express';

const setProject = express.Router();

setProject.use((req, _, next) => {
    let project: cinerinoapi.factory.project.IProject | undefined;

    // 環境変数設定が存在する場合
    if (typeof process.env.PROJECT_ID === 'string') {
        project = { typeOf: cinerinoapi.factory.organizationType.Project, id: process.env.PROJECT_ID };
    }

    // プロジェクトが決定すればリクエストに設定
    if (project !== undefined) {
        req.project = project;
    }

    next();
});

// プロジェクト指定ルーティング配下については、すべてreq.projectを上書き
setProject.use(
    '/projects/:id',
    (req, _, next) => {
        req.project = { typeOf: cinerinoapi.factory.organizationType.Project, id: req.params.id };

        next();
    }
);

export default setProject;
