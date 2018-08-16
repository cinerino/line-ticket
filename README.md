# Cinerino LINE Ticket

## Table of contents

* [Usage](#usage)
* [Code Samples](#code-samples)
* [Jsdoc](#jsdoc)
* [License](#license)
* [Reference](#reference)

## Usage

### Environment variables

| Name                               | Required | Purpose                | Value                           |
|------------------------------------|----------|------------------------|---------------------------------|
| `DEBUG`                            | false    | cinerino-line-ticket:* | Debug                           |
| `NODE_ENV`                         | true     |                        | environment name                |
| `API_TOKEN_ISSUER`                 | true     |                        |                                 |
| `REDIS_HOST`                       | true     |                        |                                 |
| `REDIS_PORT`                       | true     |                        |                                 |
| `REDIS_KEY`                        | true     |                        |                                 |
| `USER_REFRESH_TOKEN`               | true     |                        |                                 |
| `USER_EXPIRES_IN_SECONDS`          | true     |                        | User login expiration period    |
| `REFRESH_TOKEN_EXPIRES_IN_SECONDS` | true     |                        | Refresh token expiration period |
| `CINERINO_ENDPOINT`                | true     |                        |                                 |
| `CINERINO_AUTHORIZE_SERVER_DOMAIN` | true     |                        |                                 |
| `CINERINO_CLIENT_ID`               | true     |                        |                                 |
| `CINERINO_CLIENT_SECRET`           | true     |                        |                                 |
| `CINERINO_CODE_VERIFIER`           | true     |                        |                                 |
| `PECORINO_ENDPOINT`                | true     |                        |                                 |
| `PECORINO_CLIENT_ID`               | true     |                        |                                 |
| `PECORINO_CLIENT_SECRET`           | true     |                        |                                 |
| `PECORINO_AUTHORIZE_SERVER_DOMAIN` | true     |                        |                                 |
| `AWS_ACCESS_KEY_ID`                | true     |                        |                                 |
| `AWS_SECRET_ACCESS_KEY`            | true     |                        |                                 |
| `FACE_MATCH_THRESHOLD`             | true     |                        | Face match threshold            |
| `LINE_ID`                          | true     |                        | LINE Bot application ID         |
| `LINE_BOT_CHANNEL_ACCESS_TOKEN`    | true     |                        |                                 |

## Code Samples

Code sample are [here](https://github.com/cinerino/line-ticket/tree/master/example).

## License

ISC

## Reference

### LINE Reference

* [LINE BUSSINESS CENTER](https://business.line.me/ja/)
* [LINE@MANAGER](https://admin-official.line.me/)
* [API Reference](https://devdocs.line.me/ja/)
* [LINE Pay技術サポート](https://pay.line.me/jp/developers/documentation/download/tech?locale=ja_JP)
* [LINE Pay Home](https://pay.line.me/jp/)

### Cognitive Services

* [Web Language Model API](https://westus.dev.cognitive.microsoft.com/docs/services/55de9ca4e597ed1fd4e2f104/operations/55de9ca4e597ed19b0de8a51)
