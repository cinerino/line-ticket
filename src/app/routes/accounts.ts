/**
 * 口座ルーター
 */
import * as express from 'express';

const accountsRouter = express.Router();

/**
 * 口座開設
 */
accountsRouter.get(
    '/open',
    async (req, res, next) => {
        try {
            res.render('accounts/open', {
                accountType: req.query.accountType
            });
        } catch (error) {
            next(error);
        }
    });

export default accountsRouter;
