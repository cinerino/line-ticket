import * as cinerinoapi from '@cinerino/sdk';
import * as AWS from 'aws-sdk';
import * as createDebug from 'debug';
import * as redis from 'ioredis';
import * as jwt from 'jsonwebtoken';

const debug = createDebug('cinerino-line-ticket:app');

// 以下環境変数をセットすること
// AWS_ACCESS_KEY_ID
// AWS_SECRET_ACCESS_KEY
const rekognition = new AWS.Rekognition({
    apiVersion: '2016-06-27',
    region: 'us-west-2'
});

const redisClient = new redis({
    host: <string>process.env.REDIS_HOST,
    port: Number(<string>process.env.REDIS_PORT),
    password: <string>process.env.REDIS_KEY,
    tls: (process.env.REDIS_TLS_SERVERNAME !== undefined) ? { servername: process.env.REDIS_TLS_SERVERNAME } : undefined
});

export interface ICredentials {
    /**
     * リフレッシュトークン
     */
    refresh_token?: string;
    /**
     * 期限UNIXタイムスタンプ
     */
    expiry_date?: number;
    /**
     * アクセストークン
     */
    access_token: string;
    /**
     * IDトークン
     */
    id_token?: string;
    /**
     * トークンタイプ
     */
    token_type?: string;
}

/**
 * トークンに含まれる情報インターフェース
 */
export interface IPayload {
    sub: string;
    token_use: string;
    scope: string;
    iss: string;
    exp: number;
    iat: number;
    version: number;
    jti: string;
    client_id: string;
    username?: string;
}

/**
 * ユーザー設定インターフェース
 */
export interface IConfigurations {
    host: string;
    userId: string;
    state: string;
}

const USER_EXPIRES_IN_SECONDS = process.env.USER_EXPIRES_IN_SECONDS;
if (USER_EXPIRES_IN_SECONDS === undefined) {
    throw new Error('Environment variable USER_EXPIRES_IN_SECONDS required.');
}
// tslint:disable-next-line:no-magic-numbers
const EXPIRES_IN_SECONDS = Number(USER_EXPIRES_IN_SECONDS);

const REFRESH_TOKEN_EXPIRES_IN_SECONDS_ENV = process.env.REFRESH_TOKEN_EXPIRES_IN_SECONDS;
if (REFRESH_TOKEN_EXPIRES_IN_SECONDS_ENV === undefined) {
    throw new Error('Environment variable REFRESH_TOKEN_EXPIRES_IN_SECONDS required.');
}
// tslint:disable-next-line:no-magic-numbers
const REFRESH_TOKEN_EXPIRES_IN_SECONDS = parseInt(REFRESH_TOKEN_EXPIRES_IN_SECONDS_ENV, 10);

if (process.env.CINERINO_AUTHORIZE_SERVER_DOMAIN_AUTHORIZATION_CODE === undefined) {
    process.env.CINERINO_AUTHORIZE_SERVER_DOMAIN_AUTHORIZATION_CODE = process.env.CINERINO_AUTHORIZE_SERVER_DOMAIN;
}

/**
 * 友達決済情報
 */
export interface IFriendPayInfo {
    transactionId: string;
    userId: string;
    price: number;
}

/**
 * おこづかい情報
 */
export interface ITransferMoneyInfo {
    /**
     * LINEユーザーID
     */
    userId: string;
    /**
     * 振込先口座番号
     */
    accountNumber: string;
    /**
     * 振込先名
     */
    name: string;
}

/**
 * LINEユーザー
 * @class
 * @see https://aws.amazon.com/blogs/mobile/integrating-amazon-cognito-user-pools-with-api-gateway/
 */
export default class User {
    public host: string;
    public state: string;
    public userId: string;
    public payload: IPayload;
    public accessToken: string;
    public authClientApplication: cinerinoapi.auth.ClientCredentials;
    public authClient: cinerinoapi.auth.OAuth2 | cinerinoapi.auth.ClientCredentials;
    public authClientOAuth2: cinerinoapi.auth.OAuth2;
    public rekognitionCollectionId: string;

    constructor(configurations: IConfigurations) {
        this.host = configurations.host;
        this.userId = configurations.userId;
        this.state = configurations.state;
        this.rekognitionCollectionId = `cinerino-line-ticket-${this.userId}`;
        this.authClientApplication = new cinerinoapi.auth.ClientCredentials({
            domain: <string>process.env.CINERINO_AUTHORIZE_SERVER_DOMAIN,
            clientId: <string>process.env.CINERINO_CLIENT_ID,
            clientSecret: <string>process.env.CINERINO_CLIENT_SECRET,
            scopes: [],
            state: ''
        });
        this.authClient = new cinerinoapi.auth.ClientCredentials({
            domain: <string>process.env.CINERINO_AUTHORIZE_SERVER_DOMAIN,
            clientId: <string>process.env.CINERINO_CLIENT_ID,
            clientSecret: <string>process.env.CINERINO_CLIENT_SECRET,
            scopes: [],
            state: ''
        });
        this.authClientOAuth2 = new cinerinoapi.auth.OAuth2({
            domain: <string>process.env.CINERINO_AUTHORIZE_SERVER_DOMAIN_AUTHORIZATION_CODE,
            clientId: <string>process.env.CINERINO_CLIENT_ID_AUTHORIZATION_CODE,
            clientSecret: <string>process.env.CINERINO_CLIENT_SECRET_AUTHORIZATION_CODE,
            redirectUri: `https://${this.host}/signIn`,
            logoutUri: `https://${this.host}/logout`
        });
    }

    public generateAuthUrl() {
        return this.authClientOAuth2.generateAuthUrl({
            scopes: [],
            state: this.state,
            codeVerifier: <string>process.env.CINERINO_CODE_VERIFIER
        });
    }

    public generateLogoutUrl() {
        return this.authClientOAuth2.generateLogoutUrl();
    }

    public async getCredentials(): Promise<ICredentials | undefined> {
        return redisClient.get(`line-ticket:credentials:${this.userId}`)
            .then((value) => (value === null) ? undefined : JSON.parse(value));
    }

    public async getRefreshToken(): Promise<string | undefined> {
        return redisClient.get(`line-ticket:refreshToken:${this.userId}`)
            .then((value) => (value === null) ? undefined : value);
    }

    public async getSelectedProject(): Promise<cinerinoapi.factory.project.IProject | undefined> {
        const redisValue = await redisClient.get(`line-ticket:selectedProject:${this.userId}`)
            .then((value) => (value === null) ? undefined : value);

        if (typeof redisValue === 'string') {
            try {
                return JSON.parse(redisValue);
            } catch (error) {
                // no op
            }
        }

        return;
    }

    public setCredentials(credentials: ICredentials) {
        const payload = <any>jwt.decode(credentials.access_token);
        debug('payload:', payload);
        this.payload = payload;
        this.accessToken = credentials.access_token;
        this.authClient = this.authClientOAuth2;
        this.authClient.setCredentials(credentials);

        return this;
    }

    public async selectProject(params: cinerinoapi.factory.project.IProject) {
        await redisClient.multi()
            .set(`line-ticket:selectedProject:${this.userId}`, JSON.stringify(params))
            .expire(`line-ticket:selectedProject:${this.userId}`, EXPIRES_IN_SECONDS, debug)
            .exec();
    }

    public async signIn(code: string) {
        // 認証情報を取得できればログイン成功
        const credentials = await this.authClientOAuth2.getToken(code, <string>process.env.CINERINO_CODE_VERIFIER);
        debug('credentials published', credentials);

        if (credentials.access_token === undefined) {
            throw new Error('Access token is required for credentials.');
        }

        if (credentials.refresh_token === undefined) {
            throw new Error('Refresh token is required for credentials.');
        }

        // ログイン状態を保持
        const results = await redisClient.multi()
            .set(`line-ticket:credentials:${this.userId}`, JSON.stringify(credentials))
            .expire(`line-ticket:credentials:${this.userId}`, EXPIRES_IN_SECONDS, debug)
            .exec();
        debug('results:', results);

        // rekognitionコレクション作成
        await new Promise<void>((resolve, reject) => {
            rekognition.createCollection(
                {
                    CollectionId: this.rekognitionCollectionId
                },
                async (err, __) => {
                    if (err instanceof Error) {
                        // すでに作成済であればok
                        if (err.code === 'ResourceAlreadyExistsException') {
                            resolve();
                        } else {
                            reject(err);
                        }
                    } else {
                        resolve();
                    }
                });
        });

        // リフレッシュトークンを保管
        await redisClient.multi()
            .set(`line-ticket:refreshToken:${this.userId}`, credentials.refresh_token)
            .expire(`line-ticket:refreshToken:${this.userId}`, REFRESH_TOKEN_EXPIRES_IN_SECONDS, debug)
            .exec();
        debug('refresh token saved.');

        this.setCredentials({ ...credentials, access_token: credentials.access_token });

        return this;
    }

    public async signInForcibly(credentials: ICredentials) {
        // ログイン状態を保持
        const results = await redisClient.multi()
            .set(`line-ticket:credentials:${this.userId}`, JSON.stringify(credentials))
            .expire(`line-ticket:credentials:${this.userId}`, EXPIRES_IN_SECONDS, debug)
            .exec();
        debug('results:', results);

        this.setCredentials({ ...credentials, access_token: credentials.access_token });

        return this;
    }

    public async logout() {
        await redisClient.del(`line-ticket:credentials:${this.userId}`);
    }

    public async findTransaction(): Promise<cinerinoapi.factory.transaction.placeOrder.ITransaction> {
        return redisClient.get(`line-ticket:transaction:${this.userId}`)
            .then((value) => {
                return (value !== null) ? JSON.parse(value) : undefined;
            });
    }
    public async saveTransaction(transaction: cinerinoapi.factory.transaction.placeOrder.ITransaction) {
        await redisClient.multi()
            .set(`line-ticket:transaction:${this.userId}`, JSON.stringify(transaction))
            .expire(`line-ticket:transaction:${this.userId}`, EXPIRES_IN_SECONDS, debug)
            .exec();
    }
    public async findSeatReservationAuthorization(params: {
        purpose: {
            /**
             * 取引ID
             */
            id: string;
        };
        // tslint:disable-next-line:max-line-length
    }): Promise<cinerinoapi.factory.action.authorize.offer.seatReservation.IAction<cinerinoapi.factory.service.webAPI.Identifier.Chevre> | undefined> {
        return redisClient.get(`line-ticket:seatReservationAuthorization:${this.userId}:${params.purpose.id}`)
            .then((value) => {
                return (value !== null) ? JSON.parse(value) : undefined;
            });
    }
    public async saveSeatReservationAuthorization(
        // tslint:disable-next-line:max-line-length
        params: cinerinoapi.factory.action.authorize.offer.seatReservation.IAction<cinerinoapi.factory.service.webAPI.Identifier.Chevre>
    ) {
        await redisClient.multi()
            .set(`line-ticket:seatReservationAuthorization:${this.userId}:${params.purpose.id}`, JSON.stringify(params))
            .expire(`line-ticket:seatReservationAuthorization:${this.userId}:${params.purpose.id}`, EXPIRES_IN_SECONDS, debug)
            .exec();
    }

    public async findProductOfferAuthorization(params: {
        purpose: {
            /**
             * 取引ID
             */
            id: string;
        };
        // tslint:disable-next-line:max-line-length
    }): Promise<cinerinoapi.factory.action.authorize.offer.product.IAction | undefined> {
        return redisClient.get(`line-ticket:productOfferAuthorization:${this.userId}:${params.purpose.id}`)
            .then((value) => {
                return (value !== null) ? JSON.parse(value) : undefined;
            });
    }
    public async saveProductOfferAuthorization(
        params: cinerinoapi.factory.action.authorize.offer.product.IAction
    ) {
        await redisClient.multi()
            .set(`line-ticket:productOfferAuthorization:${this.userId}:${params.purpose.id}`, JSON.stringify(params))
            .expire(`line-ticket:productOfferAuthorization:${this.userId}:${params.purpose.id}`, EXPIRES_IN_SECONDS, debug)
            .exec();
    }

    public async findTransactionAmount(): Promise<number | undefined> {
        return redisClient.get(`line-ticket:transactionAmount:${this.userId}`)
            .then((value) => {
                return (value !== null) ? Number(value) : undefined;
            });
    }

    public async saveTransactionAmount(amount: number) {
        await redisClient.multi()
            .set(`line-ticket:transactionAmount:${this.userId}`, amount)
            .expire(`line-ticket:transactionAmount:${this.userId}`, EXPIRES_IN_SECONDS, debug)
            .exec();
    }

    public async findProfile(
    ): Promise<cinerinoapi.factory.person.IProfile | undefined> {
        return redisClient.get(`line-ticket:profile:${this.userId}`)
            .then((value) => {
                return (value !== null) ? JSON.parse(value) : undefined;
            });
    }

    public async saveProfile(
        profile: cinerinoapi.factory.person.IProfile
    ) {
        await redisClient.multi()
            .set(`line-ticket:profile:${this.userId}`, JSON.stringify(profile))
            .expire(`line-ticket:profile:${this.userId}`, EXPIRES_IN_SECONDS, debug)
            .exec();
    }

    public async saveCallbackState(state: string) {
        await redisClient.multi()
            .set(`line-ticket:callbackState:${this.userId}`, state)
            .expire(`line-ticket:callbackState:${this.userId}`, EXPIRES_IN_SECONDS, debug)
            .exec();
    }

    public async findCallbackState(): Promise<Object | undefined> {
        return redisClient.get(`line-ticket:callbackState:${this.userId}`)
            .then((value) => {
                return (value !== null) ? JSON.parse(value) : undefined;
            });
    }

    public async deleteCallbackState() {
        await redisClient.del(`line-ticket:callbackState:${this.userId}`);
    }

    /**
     * 友達決済トークンをトークン化する
     */
    // tslint:disable-next-line:prefer-function-over-method
    public async signFriendPayInfo(friendPayInfo: IFriendPayInfo) {
        return new Promise<string>((resolve, reject) => {
            jwt.sign(friendPayInfo, 'secret', (err: Error, encoded: string) => {
                if (err instanceof Error) {
                    reject(err);
                } else {
                    resolve(encoded);
                }
            });
        });
    }

    /**
     * 友達決済トークンを検証する
     */
    // tslint:disable-next-line:prefer-function-over-method
    public async verifyFriendPayToken(token: string) {
        return new Promise<IFriendPayInfo>((resolve, reject) => {
            jwt.verify(token, 'secret', (err: Error, decoded: IFriendPayInfo) => {
                if (err instanceof Error) {
                    reject(err);
                } else {
                    resolve(decoded);
                }
            });
        });
    }

    /**
     * 友達決済トークンをトークン化する
     */
    // tslint:disable-next-line:prefer-function-over-method
    public async signTransferMoneyInfo(transferMoneyInfo: ITransferMoneyInfo) {
        return new Promise<string>((resolve, reject) => {
            jwt.sign(transferMoneyInfo, 'secret', (err: Error, encoded: string) => {
                if (err instanceof Error) {
                    reject(err);
                } else {
                    resolve(encoded);
                }
            });
        });
    }

    /**
     * 友達決済トークンを検証する
     */
    // tslint:disable-next-line:prefer-function-over-method
    public async verifyTransferMoneyToken(token: string) {
        return new Promise<ITransferMoneyInfo>((resolve, reject) => {
            jwt.verify(token, 'secret', (err: Error, decoded: ITransferMoneyInfo) => {
                if (err instanceof Error) {
                    reject(err);
                } else {
                    resolve(decoded);
                }
            });
        });
    }

    /**
     * 顔画像を検証する
     * @param source 顔画像buffer
     */
    public async verifyFace(source: Buffer) {
        return new Promise<AWS.Rekognition.Types.SearchFacesByImageResponse>((resolve, reject) => {
            rekognition.searchFacesByImage(
                {
                    CollectionId: this.rekognitionCollectionId,
                    FaceMatchThreshold: 0,
                    // FaceMatchThreshold: FACE_MATCH_THRESHOLD,
                    MaxFaces: 5,
                    Image: {
                        Bytes: source
                    }
                },
                (err, data) => {
                    if (err instanceof Error) {
                        reject(err);
                    } else {
                        resolve(data);
                    }
                });
        });
    }

    /**
     * 顔画像を登録する
     * @param source 顔画像buffer
     */
    public async indexFace(source: Buffer) {
        await new Promise<void>((resolve, reject) => {
            rekognition.indexFaces(
                {
                    CollectionId: this.rekognitionCollectionId,
                    Image: {
                        Bytes: source
                    },
                    DetectionAttributes: ['ALL']
                    // ExternalImageId: 'STRING_VALUE'
                },
                (err, __) => {
                    if (err instanceof Error) {
                        reject(err);
                    } else {
                        debug('face indexed.');
                        resolve();
                    }
                });
        });
    }

    /**
     * 登録済顔画像を検索する
     */
    public async searchFaces() {
        return new Promise<AWS.Rekognition.FaceList>((resolve, reject) => {
            rekognition.listFaces(
                {
                    CollectionId: this.rekognitionCollectionId
                },
                (err, data) => {
                    if (err instanceof Error) {
                        // コレクション未作成であれば空配列を返す
                        if (err.code === 'ResourceNotFoundException') {
                            resolve([]);
                        } else {
                            reject(err);
                        }
                    } else {
                        const faces = (data.Faces !== undefined) ? data.Faces : [];
                        resolve(faces);
                    }
                });
        });
    }
}
