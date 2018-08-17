/**
 * LIFFルーター
 */
import * as express from 'express';

const liffRouter = express.Router();

/**
 * LIFFアプリケーション初期エンドポイント
 */
liffRouter.get(
    '',
    async (req, res, next) => {
        try {
            res.redirect(req.query.cb);
        } catch (error) {
            next(error);
        }
    });

export default liffRouter;
