/**
 * コンテンツビルダー
 */
import * as cinerinoapi from '@cinerino/api-nodejs-client';
// import { FlexBox, FlexBubble, FlexComponent, FlexMessage, QuickReplyItem, TextMessage } from '@line/bot-sdk';
import { FlexBox, FlexBubble } from '@line/bot-sdk';
import * as moment from 'moment';
import * as qs from 'qs';
import { format } from 'util';

import User from './user';

export type IAccountGoodWithDetail = cinerinoapi.factory.ownershipInfo.IGoodWithDetail<cinerinoapi.factory.ownershipInfo.AccountGoodType>;
export type IAccountOwnershipInfoWithDetail = cinerinoapi.factory.ownershipInfo.IOwnershipInfo<IAccountGoodWithDetail>;

export type IReservationPriceSpec =
    cinerinoapi.factory.chevre.reservation.IPriceSpecification<cinerinoapi.factory.chevre.reservationType.EventReservation>;

// tslint:disable-next-line:max-func-body-length
export function order2flexBubble(params: {
    order: cinerinoapi.factory.order.IOrder;
}): FlexBubble {
    const order = params.order;

    return {
        type: 'bubble',
        styles: {
            footer: {
                separator: true
            }
        },
        body: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: 'RECEIPT',
                    weight: 'bold',
                    color: '#1DB446',
                    size: 'sm'
                },
                {
                    type: 'text',
                    text: order.seller.name,
                    weight: 'bold',
                    size: 'xxl',
                    margin: 'md',
                    maxLines: 0,
                    wrap: true
                },
                {
                    type: 'text',
                    text: (order.seller.telephone !== undefined) ? order.seller.telephone : 'Unknown telephone',
                    size: 'xs',
                    color: '#aaaaaa',
                    wrap: true
                },
                {
                    type: 'separator',
                    margin: 'xxl'
                },
                {
                    type: 'box',
                    layout: 'vertical',
                    margin: 'xxl',
                    spacing: 'sm',
                    contents: [
                        {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                {
                                    type: 'text',
                                    text: '注文番号',
                                    size: 'sm',
                                    color: '#aaaaaa',
                                    flex: 2
                                },
                                {
                                    type: 'text',
                                    text: String(order.orderNumber),
                                    size: 'sm',
                                    color: '#666666',
                                    flex: 5
                                }
                            ]
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                {
                                    type: 'text',
                                    text: '注文日時',
                                    size: 'sm',
                                    color: '#aaaaaa',
                                    flex: 2
                                },
                                {
                                    type: 'text',
                                    text: moment(order.orderDate)
                                        .format('llll'),
                                    size: 'sm',
                                    color: '#666666',
                                    flex: 5
                                }
                            ]
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                {
                                    type: 'text',
                                    text: '確認番号',
                                    size: 'sm',
                                    color: '#aaaaaa',
                                    flex: 2
                                },
                                {
                                    type: 'text',
                                    text: String(order.confirmationNumber),
                                    size: 'sm',
                                    color: '#666666',
                                    flex: 5
                                }
                            ]
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                {
                                    type: 'text',
                                    text: 'Status',
                                    size: 'sm',
                                    color: '#aaaaaa',
                                    flex: 2
                                },
                                {
                                    type: 'text',
                                    text: String(order.orderStatus),
                                    size: 'sm',
                                    color: '#666666',
                                    flex: 5
                                }
                            ]
                        }
                    ]
                },
                {
                    type: 'separator',
                    margin: 'xxl'
                },
                {
                    type: 'box',
                    layout: 'vertical',
                    margin: 'xxl',
                    spacing: 'sm',
                    contents: [
                        ...order.acceptedOffers.map<FlexBox>((orderItem) => {
                            let itemName = String(orderItem.itemOffered.typeOf);
                            let itemDescription = 'no description';
                            let priceStr = orderItem.priceCurrency.toString();

                            switch (orderItem.itemOffered.typeOf) {
                                case 'ProgramMembership':
                                    break;

                                case cinerinoapi.factory.chevre.reservationType.EventReservation:
                                    const item = orderItem.itemOffered;
                                    const event = item.reservationFor;

                                    itemName = format(
                                        '%s %s',
                                        event.name.ja,
                                        moment(event.startDate)
                                            .format('MM/DD HH:mm')
                                    );

                                    // tslint:disable-next-line:max-line-length no-unnecessary-local-variable
                                    if (item.reservedTicket !== undefined) {
                                        if (item.reservedTicket.ticketedSeat !== undefined) {
                                            itemDescription = format(
                                                '%s %s',
                                                item.reservedTicket.ticketedSeat.seatNumber,
                                                item.reservedTicket.ticketType.name.ja
                                            );
                                        } else {
                                            itemDescription = format(
                                                '%s %s',
                                                '座席なし',
                                                item.reservedTicket.ticketType.name.ja
                                            );
                                        }
                                    } else {
                                        itemDescription = 'No Reserved Ticket';
                                    }

                                    if (orderItem.priceSpecification !== undefined) {
                                        const priceSpecification = <IReservationPriceSpec>orderItem.priceSpecification;
                                        // tslint:disable-next-line:max-line-length
                                        const unitPriceSpec = <cinerinoapi.factory.chevre.priceSpecification.IPriceSpecification<cinerinoapi.factory.chevre.priceSpecificationType.UnitPriceSpecification>>
                                            priceSpecification.priceComponent.find(
                                                // tslint:disable-next-line:max-line-length
                                                (spec) => spec.typeOf === cinerinoapi.factory.chevre.priceSpecificationType.UnitPriceSpecification
                                            );
                                        if (unitPriceSpec !== undefined) {
                                            // tslint:disable-next-line:max-line-length
                                            priceStr = `${unitPriceSpec.price}/${unitPriceSpec.referenceQuantity.value} ${unitPriceSpec.priceCurrency}`;
                                        } else {
                                            priceStr = 'No Unit Price Spec';
                                        }
                                    } else {
                                        priceStr = 'No Price Spec';
                                    }

                                    break;
                                default:
                            }

                            return {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'box',
                                        layout: 'vertical',
                                        flex: 2,
                                        contents: [
                                            {
                                                type: 'text',
                                                text: itemName,
                                                size: 'xs',
                                                color: '#555555',
                                                wrap: true
                                            },
                                            {
                                                type: 'text',
                                                text: itemDescription,
                                                size: 'xs',
                                                color: '#aaaaaa'
                                            }
                                        ]
                                    },
                                    {
                                        type: 'text',
                                        text: priceStr,
                                        size: 'xs',
                                        color: '#111111',
                                        align: 'end',
                                        flex: 1,
                                        gravity: 'top'
                                    }
                                ]
                            };
                        }),
                        {
                            type: 'separator',
                            margin: 'xxl'
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            margin: 'xxl',
                            contents: [
                                {
                                    type: 'text',
                                    text: 'ITEMS',
                                    size: 'sm',
                                    color: '#555555'
                                },
                                {
                                    type: 'text',
                                    text: String(order.acceptedOffers.length),
                                    size: 'sm',
                                    color: '#111111',
                                    align: 'end'
                                }
                            ]
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                {
                                    type: 'text',
                                    text: 'TOTAL',
                                    size: 'sm',
                                    color: '#555555'
                                },
                                {
                                    type: 'text',
                                    text: `${order.price} ${order.priceCurrency}`,
                                    size: 'sm',
                                    color: '#111111',
                                    align: 'end'
                                }
                            ]
                        }

                    ]
                },
                {
                    type: 'separator',
                    margin: 'xxl'
                },
                {
                    type: 'box',
                    layout: 'vertical',
                    margin: 'md',
                    spacing: 'sm',
                    contents: [
                        {
                            type: 'box',
                            layout: 'horizontal',
                            margin: 'md',
                            contents: [
                                {
                                    type: 'text',
                                    text: 'PAYMENT ID',
                                    size: 'xs',
                                    color: '#aaaaaa',
                                    flex: 0
                                },
                                {
                                    type: 'text',
                                    text: (order.paymentMethods.length > 0)
                                        ? (String(order.paymentMethods[0].paymentMethodId).length > 0)
                                            ? String(order.paymentMethods[0].paymentMethodId)
                                            : 'No ID'
                                        : '---',
                                    color: '#aaaaaa',
                                    size: 'xs',
                                    align: 'end'
                                }
                            ]
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            margin: 'md',
                            contents: [
                                {
                                    type: 'text',
                                    text: 'ACCOUNT ID',
                                    size: 'xs',
                                    color: '#aaaaaa',
                                    flex: 0
                                },
                                {
                                    type: 'text',
                                    text: (order.paymentMethods.length > 0)
                                        ? (String(order.paymentMethods[0].accountId).length > 0)
                                            ? String(order.paymentMethods[0].accountId)
                                            : 'No ID'
                                        : '---',
                                    color: '#aaaaaa',
                                    size: 'xs',
                                    align: 'end'
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    };
}

// tslint:disable-next-line:max-func-body-length
export function creditCard2flexBubble(params: {
    creditCard: cinerinoapi.factory.paymentMethod.paymentCard.creditCard.ICheckedCard;
    user: User;
}): FlexBubble {
    const creditCard = params.creditCard;

    return {
        type: 'bubble',
        styles: {
            footer: {
                separator: true
            }
        },
        body: {
            type: 'box',
            layout: 'vertical',
            spacing: 'md',
            contents: [
                {
                    type: 'box',
                    layout: 'baseline',
                    contents: [
                        {
                            type: 'icon',
                            url: `https://${params.user.host}/img/labels/credit-card-64.png`
                        },
                        {
                            type: 'text',
                            text: (creditCard.cardName.length > 0) ? creditCard.cardName : 'Unknown Card Name',
                            wrap: true,
                            weight: 'bold',
                            margin: 'sm',
                            gravity: 'center',
                            size: 'xl'
                        }
                    ]
                },
                {
                    type: 'box',
                    layout: 'vertical',
                    margin: 'lg',
                    spacing: 'sm',
                    contents: [
                        {
                            type: 'box',
                            layout: 'baseline',
                            spacing: 'sm',
                            contents: [
                                {
                                    type: 'text',
                                    text: 'HolderName',
                                    color: '#aaaaaa',
                                    size: 'sm',
                                    flex: 2
                                },
                                {
                                    type: 'text',
                                    text: creditCard.holderName,
                                    wrap: true,
                                    size: 'sm',
                                    color: '#666666',
                                    flex: 4
                                }
                            ]
                        },
                        {
                            type: 'box',
                            layout: 'baseline',
                            spacing: 'sm',
                            contents: [
                                {
                                    type: 'text',
                                    text: 'CarNo',
                                    color: '#aaaaaa',
                                    size: 'sm',
                                    flex: 2
                                },
                                {
                                    type: 'text',
                                    text: creditCard.cardNo,
                                    wrap: true,
                                    size: 'sm',
                                    color: '#666666',
                                    flex: 4
                                }
                            ]
                        },
                        {
                            type: 'box',
                            layout: 'baseline',
                            spacing: 'sm',
                            contents: [
                                {
                                    type: 'text',
                                    text: 'Expire',
                                    color: '#aaaaaa',
                                    size: 'sm',
                                    flex: 2
                                },
                                {
                                    type: 'text',
                                    text: creditCard.expire,
                                    wrap: true,
                                    color: '#666666',
                                    size: 'sm',
                                    flex: 4
                                }
                            ]
                        }
                    ]
                }
            ]
        },
        footer: {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
                {
                    type: 'button',
                    action: {
                        type: 'postback',
                        label: '削除',
                        data: `action=deleteCreditCard&cardSeq=${creditCard.cardSeq}`
                    }
                },
                {
                    type: 'button',
                    action: {
                        type: 'postback',
                        label: 'コード発行',
                        data: `action=publishCreditCardToken&cardSeq=${creditCard.cardSeq}`
                    }
                }
            ]
        }
    };
}

// tslint:disable-next-line:max-func-body-length
export function account2flexBubble(params: {
    ownershipInfo: IAccountOwnershipInfoWithDetail;
    user: User;
}): FlexBubble {
    const ownershipInfo = params.ownershipInfo;

    const account = ownershipInfo.typeOfGood;

    return {
        type: 'bubble',
        styles: {
            footer: {
                separator: true
            }
        },
        body: {
            type: 'box',
            layout: 'vertical',
            spacing: 'md',
            contents: [
                {
                    type: 'box',
                    layout: 'baseline',
                    contents: [
                        {
                            type: 'icon',
                            url: `https://${params.user.host}/img/labels/coin-64.png`
                        },
                        {
                            type: 'text',
                            text: account.accountNumber,
                            wrap: true,
                            weight: 'bold',
                            margin: 'sm',
                            gravity: 'center',
                            size: 'xl'
                        }
                    ]
                },
                {
                    type: 'box',
                    layout: 'vertical',
                    margin: 'lg',
                    spacing: 'sm',
                    contents: [
                        {
                            type: 'box',
                            layout: 'baseline',
                            spacing: 'sm',
                            contents: [
                                {
                                    type: 'text',
                                    text: 'Name',
                                    color: '#aaaaaa',
                                    size: 'sm',
                                    flex: 2
                                },
                                {
                                    type: 'text',
                                    text: account.name,
                                    wrap: true,
                                    size: 'sm',
                                    color: '#666666',
                                    flex: 5
                                }
                            ]
                        },
                        {
                            type: 'box',
                            layout: 'baseline',
                            spacing: 'sm',
                            contents: [
                                {
                                    type: 'text',
                                    text: 'Type',
                                    color: '#aaaaaa',
                                    size: 'sm',
                                    flex: 2
                                },
                                {
                                    type: 'text',
                                    text: account.accountType,
                                    wrap: true,
                                    size: 'sm',
                                    color: '#666666',
                                    flex: 5
                                }
                            ]
                        },
                        {
                            type: 'box',
                            layout: 'baseline',
                            spacing: 'sm',
                            contents: [
                                {
                                    type: 'text',
                                    text: 'Balance',
                                    color: '#aaaaaa',
                                    size: 'sm',
                                    flex: 2
                                },
                                {
                                    type: 'text',
                                    text: `${account.balance}`,
                                    wrap: true,
                                    size: 'sm',
                                    color: '#666666',
                                    flex: 5
                                }
                            ]
                        },
                        {
                            type: 'box',
                            layout: 'baseline',
                            spacing: 'sm',
                            contents: [
                                {
                                    type: 'text',
                                    text: 'Available',
                                    color: '#aaaaaa',
                                    size: 'sm',
                                    flex: 2
                                },
                                {
                                    type: 'text',
                                    text: `${account.availableBalance}`,
                                    wrap: true,
                                    color: '#666666',
                                    size: 'sm',
                                    flex: 5
                                }
                            ]
                        },
                        {
                            type: 'box',
                            layout: 'baseline',
                            spacing: 'sm',
                            contents: [
                                {
                                    type: 'text',
                                    text: 'Status',
                                    color: '#aaaaaa',
                                    size: 'sm',
                                    flex: 2
                                },
                                {
                                    type: 'text',
                                    text: account.status,
                                    wrap: true,
                                    color: '#666666',
                                    size: 'sm',
                                    flex: 5
                                }
                            ]
                        },
                        {
                            type: 'box',
                            layout: 'baseline',
                            spacing: 'sm',
                            contents: [
                                {
                                    type: 'text',
                                    text: 'OpenDate',
                                    color: '#aaaaaa',
                                    size: 'sm',
                                    flex: 2
                                },
                                {
                                    type: 'text',
                                    text: moment(account.openDate)
                                        .format('lll'),
                                    wrap: true,
                                    color: '#666666',
                                    size: 'sm',
                                    flex: 5
                                }
                            ]
                        }
                    ]
                }
            ]
        },
        footer: {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
                {
                    type: 'button',
                    action: {
                        type: 'postback',
                        label: '取引履歴確認',
                        data: qs.stringify({
                            action: 'searchAccountMoneyTransferActions',
                            accountType: cinerinoapi.factory.accountType.Coin,
                            accountNumber: account.accountNumber
                        })
                    }
                },
                {
                    type: 'button',
                    action: {
                        type: 'postback',
                        label: 'クレジットカードで入金',
                        data: qs.stringify({
                            action: 'selectDepositAmount',
                            accountType: cinerinoapi.factory.accountType.Coin,
                            accountNumber: account.accountNumber
                        })
                    }
                },
                {
                    type: 'button',
                    action: {
                        type: 'postback',
                        label: 'コード発行',
                        data: qs.stringify({
                            action: 'authorizeOwnershipInfo',
                            goodType: ownershipInfo.typeOfGood.typeOf,
                            id: ownershipInfo.id
                        })
                    }
                },
                // {
                //     type: 'button',
                //     action: {
                //         type: 'message',
                //         label: 'おこづかいをもらう',
                //         text: 'おこづかい'
                //     }
                // },
                {
                    type: 'button',
                    action: {
                        type: 'postback',
                        label: '解約',
                        data: qs.stringify({
                            action: 'closeAccount',
                            accountType: account.accountType,
                            accountNumber: account.accountNumber
                        })
                    }
                }
            ]
        }
    };
}

// tslint:disable-next-line:max-func-body-length
export function moneyTransferAction2flexBubble(params: {
    action: cinerinoapi.factory.pecorino.action.transfer.moneyTransfer.IAction<any>;
    user: User;
}): FlexBubble {
    const a = params.action;

    let actionName = '---';
    switch (a.purpose.typeOf) {
        case cinerinoapi.factory.pecorino.transactionType.Withdraw:
            actionName = '出金';
            break;
        case cinerinoapi.factory.pecorino.transactionType.Transfer:
            actionName = '転送';
            break;
        case cinerinoapi.factory.pecorino.transactionType.Deposit:
            actionName = '入金';
            break;

        default:
    }

    return {
        type: 'bubble',
        // styles: {
        //     footer: {
        //         separator: true
        //     }
        // },
        body: {
            type: 'box',
            layout: 'vertical',
            spacing: 'md',
            contents: [
                {
                    type: 'box',
                    layout: 'baseline',
                    contents: [
                        {
                            type: 'icon',
                            url: `https://${params.user.host}/img/labels/coin-64.png`
                        },
                        {
                            type: 'text',
                            text: actionName,
                            wrap: true,
                            weight: 'bold',
                            margin: 'sm',
                            gravity: 'center',
                            size: 'xl'
                        }
                    ]
                },
                {
                    type: 'box',
                    layout: 'vertical',
                    margin: 'lg',
                    spacing: 'sm',
                    contents: [
                        {
                            type: 'box',
                            layout: 'baseline',
                            spacing: 'sm',
                            contents: [
                                {
                                    type: 'text',
                                    text: 'Date',
                                    wrap: true,
                                    color: '#aaaaaa',
                                    size: 'sm',
                                    flex: 2
                                },
                                {
                                    type: 'text',
                                    text: moment(a.endDate)
                                        .format('YY.MM.DD HH:mm'),
                                    wrap: true,
                                    size: 'sm',
                                    color: '#666666',
                                    flex: 5
                                }
                            ]
                        },
                        {
                            type: 'box',
                            layout: 'baseline',
                            spacing: 'sm',
                            contents: [
                                {
                                    type: 'text',
                                    text: 'Amount',
                                    wrap: true,
                                    color: '#aaaaaa',
                                    size: 'sm',
                                    flex: 2
                                },
                                {
                                    type: 'text',
                                    text: String(a.amount),
                                    wrap: true,
                                    size: 'sm',
                                    color: '#666666',
                                    flex: 5
                                }
                            ]
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            spacing: 'sm',
                            contents: [
                                {
                                    type: 'box',
                                    layout: 'vertical',
                                    margin: 'sm',
                                    spacing: 'sm',
                                    flex: 2,
                                    contents: [
                                        {
                                            type: 'text',
                                            text: 'From',
                                            wrap: true,
                                            color: '#aaaaaa',
                                            size: 'sm'
                                        }
                                    ]
                                },
                                {
                                    type: 'box',
                                    layout: 'vertical',
                                    margin: 'sm',
                                    spacing: 'sm',
                                    flex: 5,
                                    contents: [
                                        {
                                            type: 'text',
                                            text: (typeof a.fromLocation.name === 'string'
                                                && a.fromLocation.name.length > 0)
                                                ? a.fromLocation.name
                                                : '---',
                                            wrap: true,
                                            size: 'sm',
                                            color: '#666666'
                                        },
                                        {
                                            type: 'text',
                                            text: (typeof (<any>a.fromLocation).accountNumber === 'string')
                                                ? (<any>a.fromLocation).accountNumber
                                                : '---',
                                            wrap: true,
                                            size: 'sm',
                                            color: '#666666'
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            spacing: 'sm',
                            contents: [
                                {
                                    type: 'box',
                                    layout: 'vertical',
                                    margin: 'sm',
                                    spacing: 'sm',
                                    flex: 2,
                                    contents: [
                                        {
                                            type: 'text',
                                            text: 'To',
                                            wrap: true,
                                            color: '#aaaaaa',
                                            size: 'sm'
                                        }
                                    ]
                                },
                                {
                                    type: 'box',
                                    layout: 'vertical',
                                    margin: 'sm',
                                    spacing: 'sm',
                                    flex: 5,
                                    contents: [
                                        {
                                            type: 'text',
                                            text: (typeof a.toLocation.name === 'string' && a.toLocation.name.length > 0)
                                                ? a.toLocation.name
                                                : '---',
                                            wrap: true,
                                            size: 'sm',
                                            color: '#666666'
                                        },
                                        {
                                            type: 'text',
                                            text: (typeof (<any>a.toLocation).accountNumber === 'string')
                                                ? (<any>a.toLocation).accountNumber
                                                : '---',
                                            wrap: true,
                                            size: 'sm',
                                            color: '#666666'
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            type: 'box',
                            layout: 'baseline',
                            spacing: 'sm',
                            contents: [
                                {
                                    type: 'text',
                                    text: 'Description',
                                    wrap: true,
                                    color: '#aaaaaa',
                                    size: 'sm',
                                    flex: 2
                                },
                                {
                                    type: 'text',
                                    text: (typeof a.description === 'string' && a.description.length > 0)
                                        ? a.description
                                        : '---',
                                    wrap: true,
                                    color: '#666666',
                                    size: 'sm',
                                    flex: 5
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    };
}
