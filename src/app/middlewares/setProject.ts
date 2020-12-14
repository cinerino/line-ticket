/**
 * リクエストプロジェクト設定ルーター
 */
import * as cinerinoapi from '@cinerino/sdk';
import * as express from 'express';

const setProject = express.Router();

// プロジェクト指定ルーティング配下については、すべてreq.projectを上書き
setProject.use(
    '/projects/:id',
    (req, _, next) => {
        req.project = { typeOf: cinerinoapi.factory.chevre.organizationType.Project, id: req.params.id };

        next();
    }
);

export default setProject;
