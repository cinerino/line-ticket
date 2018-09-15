/**
 * ユーザールーター
 */
import * as express from 'express';

const peopleRouter = express.Router();
/**
 * プロフィールフォーム
 */
peopleRouter.get(
    '/me/profile',
    async (req, res, next) => {
        try {
            res.render('people/me/profile', {
                values: (req.query.profile !== undefined) ? req.query.profile : {}
            });
        } catch (error) {
            next(error);
        }
    });
export default peopleRouter;
