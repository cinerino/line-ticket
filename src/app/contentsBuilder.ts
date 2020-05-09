/**
 * コンテンツビルダー
 */
import * as cinerinoapi from '@cinerino/api-nodejs-client';
// import { FlexBox, FlexBubble, FlexComponent, FlexMessage, QuickReplyItem, TextMessage } from '@line/bot-sdk';
import { FlexBox, FlexBubble, FlexComponent, FlexMessage } from '@line/bot-sdk';
import * as moment from 'moment';
import * as qs from 'qs';
import { format } from 'util';

import User from './user';

export type IAccountGoodWithDetail = cinerinoapi.factory.ownershipInfo.IGoodWithDetail<cinerinoapi.factory.ownershipInfo.AccountGoodType>;
export type IReservationGoodWithDetail
    = cinerinoapi.factory.ownershipInfo.IGoodWithDetail<cinerinoapi.factory.chevre.reservationType.EventReservation>;
export type IAccountOwnershipInfoWithDetail = cinerinoapi.factory.ownershipInfo.IOwnershipInfo<IAccountGoodWithDetail>;
export type IReservationOwnershipInfoWithDetail = cinerinoapi.factory.ownershipInfo.IOwnershipInfo<IReservationGoodWithDetail>;

export type IReservationPriceSpec =
    cinerinoapi.factory.chevre.reservation.IPriceSpecification<cinerinoapi.factory.chevre.reservationType.EventReservation>;

// tslint:disable-next-line:max-func-body-length
export function project2flexBubble(params: {
    project: cinerinoapi.factory.project.IProject;
}): FlexBubble {
    const project = params.project;

    const thumbnailImageUrl = (typeof project.logo === 'string')
        ? project.logo
        // tslint:disable-next-line:max-line-length
        : 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRrhpsOJOcLBwc1SPD9sWlinildy4S05-I2Wf6z2wRXnSxbmtRz';

    const body: FlexBox = {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
            {
                type: 'text',
                text: String(project.name),
                wrap: true,
                weight: 'bold',
                gravity: 'center',
                size: 'xl'
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
                                text: '運営',
                                color: '#aaaaaa',
                                size: 'sm',
                                flex: 1
                            },
                            {
                                type: 'text',
                                text: String(project.parentOrganization?.name.ja),
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
    };

    return {
        type: 'bubble',
        hero: {
            type: 'image',
            url: thumbnailImageUrl,
            size: 'full',
            aspectRatio: '20:13',
            aspectMode: 'cover',
            action: {
                type: 'uri',
                label: 'event',
                // tslint:disable-next-line:no-http-string
                uri: 'http://linecorp.com/'
            }
        },
        body: body,
        footer: {
            type: 'box',
            layout: 'horizontal',
            contents: [
                {
                    type: 'button',
                    action: {
                        type: 'postback',
                        label: 'プロジェクト選択',
                        data: qs.stringify({
                            action: 'selectProject',
                            id: String(project.id),
                            name: String(project.name)
                        })
                    }
                }
            ]
        }
    };
}

// tslint:disable-next-line:max-func-body-length
export function createConfirmOrderFlexBubble(params: {
    id: string;
    seller: cinerinoapi.factory.seller.IOrganization<any>;
    profile: cinerinoapi.factory.person.IProfile;
    tmpReservations: cinerinoapi.factory.chevre.transaction.reserve.ISubReservation[];
    price?: number;
}): FlexMessage {
    const seller = params.seller;
    const profile = params.profile;
    const tmpReservations = params.tmpReservations;
    const price = params.price;

    const bodyContents: FlexComponent[] = [
        {
            type: 'text',
            text: '注文をご確認ください',
            weight: 'bold',
            color: '#1DB446',
            size: 'sm'
        },
        {
            type: 'text',
            text: seller.name.ja,
            weight: 'bold',
            size: 'xxl',
            margin: 'md',
            maxLines: 0,
            wrap: true
        },
        {
            type: 'text',
            text: (seller.telephone !== undefined) ? seller.telephone : 'Unknown telephone',
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
                                    flex: 1
                                },
                                {
                                    type: 'text',
                                    text: `${profile.givenName} ${profile.familyName}`,
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
                                    text: 'Email',
                                    color: '#aaaaaa',
                                    size: 'sm',
                                    flex: 1
                                },
                                {
                                    type: 'text',
                                    text: String(profile.email),
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
                                    text: 'Tel',
                                    color: '#aaaaaa',
                                    size: 'sm',
                                    flex: 1
                                },
                                {
                                    type: 'text',
                                    text: String(profile.telephone),
                                    wrap: true,
                                    size: 'sm',
                                    color: '#666666',
                                    flex: 4
                                }
                            ]
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
                ...tmpReservations.map<FlexBox>((tmpReservation) => {
                    const item = tmpReservation;
                    const event = item.reservationFor;
                    const offerName = (typeof item.reservedTicket.ticketType.name === 'string')
                        ? item.reservedTicket.ticketType.name
                        : item.reservedTicket.ticketType.name?.ja;
                    // tslint:disable-next-line:max-line-length no-unnecessary-local-variable
                    const str = (item.reservedTicket.ticketedSeat !== undefined)
                        ? `${item.reservedTicket.ticketedSeat.seatNumber} ${offerName}`
                        : '座席なし';
                    let priceStr = String(item.priceCurrency);
                    if (item.price !== undefined) {
                        if (typeof item.price === 'number') {
                            priceStr = `${item.price} ${item.priceCurrency}`;
                        } else {
                            // tslint:disable-next-line:max-line-length
                            const unitPriceSpec = <cinerinoapi.factory.chevre.priceSpecification.IPriceSpecification<cinerinoapi.factory.chevre.priceSpecificationType.UnitPriceSpecification>>
                                item.price.priceComponent.find(
                                    // tslint:disable-next-line:max-line-length
                                    (spec) => spec.typeOf === cinerinoapi.factory.chevre.priceSpecificationType.UnitPriceSpecification
                                );
                            if (unitPriceSpec !== undefined) {
                                // tslint:disable-next-line:max-line-length
                                priceStr = `${unitPriceSpec.price}/${unitPriceSpec.referenceQuantity.value} ${item.priceCurrency}`;
                            }
                        }
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
                                        text: `${event.name.ja} ${moment(event.startDate)
                                            .format('MM/DD HH:mm')}`,
                                        size: 'xs',
                                        color: '#555555',
                                        wrap: true
                                    },
                                    {
                                        type: 'text',
                                        text: str,
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
                            text: `${tmpReservations.length}`,
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
                            text: `${price} ${cinerinoapi.factory.priceCurrency.JPY}`,
                            size: 'sm',
                            color: '#111111',
                            align: 'end'
                        }
                    ]
                }
                // {
                //     type: 'box',
                //     layout: 'horizontal',
                //     contents: [
                //         {
                //             type: 'text',
                //             text: '決済方法',
                //             size: 'sm',
                //             color: '#555555'
                //         },
                //         {
                //             type: 'text',
                //             text: params.paymentMethodType,
                //             size: 'sm',
                //             color: '#111111',
                //             align: 'end'
                //         }
                //     ]
                // }
            ]
        }
    ];
    const body: FlexBox = {
        type: 'box',
        layout: 'vertical',
        contents: bodyContents
    };
    const contents: FlexBubble = {
        type: 'bubble',
        styles: {
            footer: {
                separator: true
            }
        },
        body: body,
        footer: {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
                {
                    type: 'button',
                    // flex: 2,
                    style: 'primary',
                    action: {
                        type: 'postback',
                        label: '注文確定',
                        data: `action=confirmOrder&transactionId=${params.id}`
                    }
                },
                {
                    type: 'button',
                    action: {
                        type: 'postback',
                        label: 'キャンセル',
                        data: `action=cancelOrder&transactionId=${params.id}`
                    }
                }
            ]
        }
    };

    return {
        type: 'flex',
        altText: 'This is a Flex Message',
        contents: contents
    };
}

// tslint:disable-next-line:max-func-body-length
export function screeningEventSeries2flexBubble(params: {
    date: string;
    event: cinerinoapi.factory.chevre.event.IEvent<cinerinoapi.factory.chevre.eventType.ScreeningEventSeries>;
}): FlexBubble {
    const event = params.event;

    const thumbnailImageUrl = (event.workPerformed.thumbnailUrl !== undefined
        && event.workPerformed.thumbnailUrl !== null)
        ? event.workPerformed.thumbnailUrl
        // tslint:disable-next-line:max-line-length
        : 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRrhpsOJOcLBwc1SPD9sWlinildy4S05-I2Wf6z2wRXnSxbmtRz';

    const body: FlexBox = {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
            {
                type: 'text',
                text: String(event.name.ja),
                wrap: true,
                weight: 'bold',
                gravity: 'center',
                size: 'xl'
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
                                text: 'Place',
                                color: '#aaaaaa',
                                size: 'sm',
                                flex: 1
                            },
                            {
                                type: 'text',
                                text: String((<any>event.location.name).ja),
                                wrap: true,
                                color: '#666666',
                                size: 'sm',
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
                                text: 'VideoFormat',
                                color: '#aaaaaa',
                                size: 'sm',
                                flex: 1
                            },
                            {
                                type: 'text',
                                text: (Array.isArray(event.videoFormat) && event.videoFormat.length > 0)
                                    ? event.videoFormat.map((f) => f.typeOf)
                                        .join(',')
                                    : '---',
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
                                text: 'Duration',
                                color: '#aaaaaa',
                                size: 'sm',
                                flex: 1
                            },
                            {
                                type: 'text',
                                text: (typeof event.duration === 'string')
                                    ? moment.duration(event.duration)
                                        .toISOString()
                                    : '---',
                                wrap: true,
                                size: 'sm',
                                color: '#666666',
                                flex: 4
                            }
                        ]
                    }
                ]
            }
        ]
    };

    return {
        type: 'bubble',
        hero: {
            type: 'image',
            url: thumbnailImageUrl,
            size: 'full',
            aspectRatio: '20:13',
            aspectMode: 'cover',
            action: {
                type: 'uri',
                label: 'event',
                // tslint:disable-next-line:no-http-string
                uri: 'http://linecorp.com/'
            }
        },
        body: body,
        footer: {
            type: 'box',
            layout: 'horizontal',
            contents: [
                {
                    type: 'button',
                    action: {
                        type: 'postback',
                        label: 'スケジュール選択',
                        data: qs.stringify({
                            action: 'askScreeningEvent',
                            screeningEventSeriesId: event.id,
                            date: params.date
                        })
                    }
                }
            ]
        }
    };
}

// tslint:disable-next-line:max-func-body-length
export function screeningEvent2flexBubble(params: {
    event: cinerinoapi.factory.chevre.event.IEvent<cinerinoapi.factory.chevre.eventType.ScreeningEvent>;
    user: User;
}): FlexBubble {
    const event = params.event;

    const MAX_AVAILABILITY_SCORE = 5;

    const query = qs.stringify({ eventId: event.id, userId: params.user.userId });
    const selectSeatsUri = `/projects/${event.project.id}/transactions/placeOrder/selectSeatOffers?${query}`;
    const liffUri = `line://app/${process.env.LIFF_ID}?${qs.stringify({ cb: selectSeatsUri })}`;
    let availability = 100;
    if (event.remainingAttendeeCapacity === 0) {
        availability = 0;
    } else {
        if (typeof event.maximumAttendeeCapacity === 'number' && typeof event.remainingAttendeeCapacity === 'number') {
            // tslint:disable-next-line:no-magic-numbers
            availability = Math.floor((event.remainingAttendeeCapacity / event.maximumAttendeeCapacity) * 100);
        }
    }

    // tslint:disable-next-line:no-magic-numbers
    const availabilityScore = Math.floor(availability / Math.floor(100 / MAX_AVAILABILITY_SCORE));

    return {
        type: 'bubble',
        body: <any>{
            type: 'box',
            layout: 'vertical',
            spacing: 'md',
            contents: [
                {
                    type: 'text',
                    text: event.name.ja,
                    wrap: true,
                    weight: 'bold',
                    gravity: 'center',
                    size: 'xl'
                },
                {
                    type: 'box',
                    layout: 'baseline',
                    margin: 'md',
                    contents: [
                        ...(availabilityScore > 0)
                            // tslint:disable-next-line:prefer-array-literal
                            ? [...Array(availabilityScore)].map(() => {
                                return {
                                    type: 'icon',
                                    size: 'sm',
                                    url: `https://${params.user.host}/img/labels/theater-seat-blue-80.png`
                                };
                            })
                            : [],
                        ...(availabilityScore < MAX_AVAILABILITY_SCORE)
                            // tslint:disable-next-line:prefer-array-literal
                            ? [...Array(MAX_AVAILABILITY_SCORE - availabilityScore)].map(() => {
                                return {
                                    type: 'icon',
                                    size: 'sm',
                                    url: `https://${params.user.host}/img/labels/theater-seat-grey-80.png`
                                };
                            })
                            : [],
                        {
                            type: 'text',
                            text: `${availability}%`,
                            size: 'sm',
                            color: '#999999',
                            margin: 'md',
                            flex: 0
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
                                    text: 'Place',
                                    color: '#aaaaaa',
                                    size: 'sm',
                                    flex: 1
                                },
                                {
                                    type: 'text',
                                    text: String((<any>event.location.name).ja),
                                    wrap: true,
                                    color: '#666666',
                                    size: 'sm',
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
                                    text: 'Date',
                                    color: '#aaaaaa',
                                    size: 'sm',
                                    flex: 1
                                },
                                {
                                    type: 'text',
                                    text: moment(event.startDate)
                                        .format('YYYY-MM-DD'),
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
                                    text: 'Time',
                                    color: '#aaaaaa',
                                    size: 'sm',
                                    flex: 1
                                },
                                {
                                    type: 'text',
                                    text: `${moment(event.startDate)
                                        .format('HH:mm')} - ${moment(event.endDate)
                                            .format('HH:mm')}`,
                                    wrap: true,
                                    size: 'sm',
                                    color: '#666666',
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
            layout: 'horizontal',
            contents: [
                {
                    type: 'button',
                    action: {
                        type: 'uri',
                        label: '座席選択',
                        uri: liffUri
                    }
                }
            ]
        }
    };
}

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
                        // tslint:disable-next-line:max-func-body-length
                        ...order.acceptedOffers.map<FlexBox>((orderItem) => {
                            let itemName: string;
                            let itemDescription: string;
                            let priceStr = orderItem.priceCurrency.toString();

                            switch (orderItem.itemOffered.typeOf) {
                                case cinerinoapi.factory.chevre.reservationType.EventReservation:
                                    const item = orderItem.itemOffered;
                                    const event = item.reservationFor;

                                    itemName = format(
                                        '%s %s',
                                        event.name.ja,
                                        moment(event.startDate)
                                            .format('MM/DD HH:mm')
                                    );

                                    const offerName = (typeof item.reservedTicket.ticketType.name === 'string')
                                        ? item.reservedTicket.ticketType.name
                                        : item.reservedTicket.ticketType.name?.ja;

                                    // tslint:disable-next-line:max-line-length no-unnecessary-local-variable
                                    if (item.reservedTicket !== undefined) {
                                        if (item.reservedTicket.ticketedSeat !== undefined) {
                                            itemDescription = format(
                                                '%s %s',
                                                item.reservedTicket.ticketedSeat.seatNumber,
                                                offerName
                                            );
                                        } else {
                                            itemDescription = format(
                                                '%s %s',
                                                '座席なし',
                                                offerName
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
                                    itemName = (typeof orderItem.itemOffered.name === 'string')
                                        ? `${String(orderItem.itemOffered.typeOf)} ${String(orderItem.itemOffered.name)}`
                                        : String(orderItem.itemOffered.typeOf);

                                    itemDescription = (typeof orderItem.itemOffered.description === 'string')
                                        ? String(orderItem.itemOffered.description)
                                        : 'no description';

                                    if (typeof orderItem.itemOffered.identifier === 'string') {
                                        itemDescription = `${orderItem.itemOffered.identifier}`;
                                    }
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
    creditCard: cinerinoapi.factory.chevre.paymentMethod.paymentCard.creditCard.ICheckedCard;
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
                            accountType: cinerinoapi.factory.accountType.Prepaid,
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
                            paymentCard: {
                                typeOf: cinerinoapi.factory.accountType.Prepaid,
                                identifier: account.accountNumber
                            }
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
export function paymentCard2flexBubble(params: {
    paymentCard: cinerinoapi.factory.chevre.paymentMethod.paymentCard.prepaidCard.IPrepaidCard;
    user: User;
}): FlexBubble {
    const paymentCard = params.paymentCard;

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
                            text: String(paymentCard.identifier),
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
                                    text: String(paymentCard.name),
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
                                    text: String(paymentCard.typeOf),
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
                                    text: String(paymentCard.amount?.value),
                                    wrap: true,
                                    size: 'sm',
                                    color: '#666666',
                                    flex: 5
                                }
                            ]
                        }
                        // {
                        //     type: 'box',
                        //     layout: 'baseline',
                        //     spacing: 'sm',
                        //     contents: [
                        //         {
                        //             type: 'text',
                        //             text: 'OpenDate',
                        //             color: '#aaaaaa',
                        //             size: 'sm',
                        //             flex: 2
                        //         },
                        //         {
                        //             type: 'text',
                        //             text: moment(paymentCard.validFrom)
                        //                 .format('lll'),
                        //             wrap: true,
                        //             color: '#666666',
                        //             size: 'sm',
                        //             flex: 5
                        //         }
                        //     ]
                        // }
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
                        label: '取引履歴',
                        data: qs.stringify({
                            action: 'searchAccountMoneyTransferActions',
                            paymentCard: {
                                typeOf: paymentCard.typeOf,
                                identifier: paymentCard.identifier,
                                accessCode: paymentCard.accessCode
                            }
                        })
                    }
                },
                {
                    type: 'button',
                    action: {
                        type: 'postback',
                        label: '入金',
                        data: qs.stringify({
                            action: 'selectDepositAmount',
                            paymentCard: {
                                typeOf: paymentCard.typeOf,
                                identifier: paymentCard.identifier
                            }
                        })
                    }
                }
                // {
                //     type: 'button',
                //     action: {
                //         type: 'postback',
                //         label: 'コード発行',
                //         data: qs.stringify({
                //             action: 'authorizeOwnershipInfo',
                //             goodType: ownershipInfo.typeOfGood.typeOf,
                //             id: ownershipInfo.id
                //         })
                //     }
                // },
                // {
                //     type: 'button',
                //     action: {
                //         type: 'message',
                //         label: 'おこづかいをもらう',
                //         text: 'おこづかい'
                //     }
                // },
                // {
                //     type: 'button',
                //     action: {
                //         type: 'postback',
                //         label: '解約',
                //         data: qs.stringify({
                //             action: 'closeAccount',
                //             accountType: account.accountType,
                //             accountNumber: account.accountNumber
                //         })
                //     }
                // }
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

// tslint:disable-next-line:max-func-body-length
export function reservation2flexBubble(params: {
    ownershipInfo: IReservationOwnershipInfoWithDetail;
}): FlexBubble {
    const ownershipInfo = params.ownershipInfo;

    const itemOffered = ownershipInfo.typeOfGood;
    const event = itemOffered.reservationFor;
    const thumbnailImageUrl = (event.workPerformed !== undefined
        && event.workPerformed.thumbnailUrl !== undefined
        && event.workPerformed.thumbnailUrl !== null)
        ? event.workPerformed.thumbnailUrl
        // tslint:disable-next-line:max-line-length
        : 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRrhpsOJOcLBwc1SPD9sWlinildy4S05-I2Wf6z2wRXnSxbmtRz';

    return {
        type: 'bubble',
        hero: {
            type: 'image',
            url: thumbnailImageUrl,
            size: 'full',
            aspectRatio: '20:13',
            aspectMode: 'cover',
            action: {
                type: 'uri',
                label: 'event',
                // tslint:disable-next-line:no-http-string
                uri: 'http://linecorp.com/'
            }
        },
        body: {
            type: 'box',
            layout: 'vertical',
            spacing: 'md',
            contents: [
                {
                    type: 'text',
                    text: String(event.name.ja),
                    wrap: true,
                    weight: 'bold',
                    gravity: 'center',
                    size: 'xl'
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
                                    text: '日時',
                                    color: '#aaaaaa',
                                    size: 'sm',
                                    flex: 1
                                },
                                {
                                    type: 'text',
                                    text: moment(event.startDate)
                                        .format('llll'),
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
                                    text: '場所',
                                    color: '#aaaaaa',
                                    size: 'sm',
                                    flex: 1
                                },
                                {
                                    type: 'text',
                                    text: `${(<any>event.superEvent.location.name).ja} ${(<any>event.location.name).ja}`,
                                    wrap: true,
                                    color: '#666666',
                                    size: 'sm',
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
                                    text: '座席',
                                    color: '#aaaaaa',
                                    size: 'sm',
                                    flex: 1
                                },
                                {
                                    type: 'text',
                                    text: (itemOffered.reservedTicket.ticketedSeat !== undefined)
                                        ? itemOffered.reservedTicket.ticketedSeat.seatNumber
                                        : '座席なし',
                                    wrap: true,
                                    color: '#666666',
                                    size: 'sm',
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
                                    text: '券種',
                                    color: '#aaaaaa',
                                    size: 'sm',
                                    flex: 1
                                },
                                {
                                    type: 'text',
                                    text: (typeof itemOffered.reservedTicket.ticketType.name === 'string')
                                        ? itemOffered.reservedTicket.ticketType.name
                                        : String(itemOffered.reservedTicket.ticketType.name?.ja),
                                    wrap: true,
                                    color: '#666666',
                                    size: 'sm',
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
                                    text: '発行者',
                                    color: '#aaaaaa',
                                    size: 'sm',
                                    flex: 1
                                },
                                {
                                    type: 'text',
                                    text: (itemOffered.reservedTicket.issuedBy !== undefined)
                                        ? itemOffered.reservedTicket.issuedBy.name
                                        : 'No reservedTicket.issuedBy',
                                    wrap: true,
                                    color: '#666666',
                                    size: 'sm',
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
                                    text: '予約者',
                                    color: '#aaaaaa',
                                    size: 'sm',
                                    flex: 1
                                },
                                {
                                    type: 'text',
                                    text: (itemOffered.reservedTicket.underName !== undefined)
                                        ? itemOffered.reservedTicket.underName.name
                                        : 'No reservedTicket.underName',
                                    wrap: true,
                                    color: '#666666',
                                    size: 'sm',
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
                                    text: 'Status',
                                    color: '#aaaaaa',
                                    size: 'sm',
                                    flex: 1
                                },
                                {
                                    type: 'text',
                                    text: String(itemOffered.reservationStatus),
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
            layout: 'horizontal',
            contents: [
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
                }
            ]
        }
    };
}

// tslint:disable-next-line:max-func-body-length
export function profile2bubble(params: cinerinoapi.factory.person.IProfile): FlexBubble {
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
                    text: 'PROFILE',
                    weight: 'bold',
                    color: '#1DB446',
                    size: 'sm'
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
                                    text: '姓',
                                    size: 'sm',
                                    color: '#aaaaaa',
                                    flex: 2
                                },
                                {
                                    type: 'text',
                                    text: (params.familyName !== '') ? String(params.familyName) : 'Unknown',
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
                                    text: '名',
                                    size: 'sm',
                                    color: '#aaaaaa',
                                    flex: 2
                                },
                                {
                                    type: 'text',
                                    text: (params.givenName !== '') ? String(params.givenName) : 'Unknown',
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
                                    text: 'Eメール',
                                    size: 'sm',
                                    color: '#aaaaaa',
                                    flex: 2
                                },
                                {
                                    type: 'text',
                                    text: (params.email !== '') ? String(params.email) : 'Unknown',
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
                                    text: 'TEL',
                                    size: 'sm',
                                    color: '#aaaaaa',
                                    flex: 2
                                },
                                {
                                    type: 'text',
                                    text: (params.telephone !== '') ? String(params.telephone) : 'Unknown',
                                    size: 'sm',
                                    color: '#666666',
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
