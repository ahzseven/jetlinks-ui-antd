import React, { useEffect, useState, Fragment } from "react";
import ChartCard from "@/pages/analysis/components/Charts/ChartCard";
import { Tooltip, Icon, Row, Col, Tag, Badge, Spin } from "antd";
import { MiniArea, MiniProgress } from "@/pages/analysis/components/Charts";
import { IVisitData } from "@/pages/analysis/data";
import moment from "moment";
import apis from "@/services";
import EventLog from "./event-log/EventLog";
import encodeQueryParam from "@/utils/encodeParam";
import { response } from "express";

interface Props {
    device: any
}

interface State {
    runInfo: any;
    propertiesData: any[];
    eventVisible: boolean;
    metadata: any;
    eventData: any[];
    deviceState: any;
    // currentEvent: any;
    // currentEventData: any;
}
const topColResponsiveProps = {
    xs: 24,
    sm: 12,
    md: 12,
    lg: 12,
    xl: 6,
    style: { marginBottom: 24 },
};

// mock data
const visitData: IVisitData[] = [];
const beginDay = new Date().getTime();

const fakeY = [7, 5, 4, 2, 4, 7, 5, 6, 5, 9, 6, 3, 1, 5, 3, 6, 5];
for (let i = 0; i < fakeY.length; i += 1) {
    visitData.push({
        x: moment(new Date(beginDay + 1000 * 60 * 60 * 24 * i)).format('YYYY-MM-DD'),
        y: fakeY[i],
    });
}

const eventLevel = new Map();
eventLevel.set('ordinary', <Badge status="processing" text="普通" />);
eventLevel.set('warn', <Badge status="warning" text="警告" />);
eventLevel.set('urgent', <Badge status="error" text="紧急" />);

const Status: React.FC<Props> = (props) => {

    const initState: State = {
        runInfo: {},
        propertiesData: [],
        eventVisible: false,
        metadata: {},
        eventData: [],
        deviceState: {}
        // currentEvent: {},
        // currentEventData: {}
    }
    const [runInfo, setRunInfo] = useState(initState.runInfo);
    const [propertiesData, setPropertiesData] = useState(initState.propertiesData);
    const [eventVisible, setEventVisible] = useState(initState.eventVisible);
    const [metadata, setMetadata] = useState(initState.metadata);
    const [eventData, setEventData] = useState(initState.eventData);
    const [deviceState, setDeviceState] = useState(initState.deviceState);
    // const [currentEvent, setCurrentEvent] = useState(initState.currentEvent);
    // const [currentEventData, setCurrentEventData] = useState(initState.currentEventData);

    useEffect(() => {
        loadRunInfo();
        loadProperties();
    }, []);


    useEffect(() => {
        //组装数据
        if (runInfo && runInfo.metadata) {
            const metadata = JSON.parse(runInfo.metadata);
            const { properties, events } = metadata;
            //设置properties的值
            const tempProperties = properties.map((item: any) => {
                const temp = propertiesData.find(i => i.property === item.id);
                // if (!temp) return item;
                item.loading = false;
                item.formatValue = temp?.formatValue ? temp?.formatValue : '--';
                return item;
            });

            metadata.properties = tempProperties;

            //设置event数据
            events.map((event: any) => {
                //加载数据
                event.loading = false;
                apis.deviceInstance.eventData(
                    props.device.productId,
                    event.id,
                    encodeQueryParam({
                        pageIndex: 0,
                        pageSize: 10,
                        terms: { deviceId: props.device.id }
                    })
                ).then(response => {
                    const data = response.result;
                    eventData.push({ eventId: event.id, data })
                    setEventData([...eventData])
                });
            });
            setMetadata(metadata);
        }

    }, [runInfo]);


    const loadRunInfo = () => {
        runInfo.loading = true;
        setRunInfo({ ...runInfo });
        apis.deviceInstance.runInfo(props.device.id)
            .then(response => {
                if (response.result) {
                    response.result.loading = false;
                }
                setRunInfo(response.result);
                setDeviceState(response.result);
            });
    }

    const refresDeviceState = () => {
        apis.deviceInstance.runInfo(props.device.id)
            .then(response => {
                if (response.result) {
                    response.result.loading = false;
                }
                setDeviceState(response.result);
            })
    }

    const loadProperties = () => {
        apis.deviceInstance.properties(props.device.productId, props.device.id)
            .then(response => {
                setPropertiesData(response.result);
            });
    }

    const loadEventData = (eventId: string) => {
        apis.deviceInstance.eventData(
            props.device.productId,
            eventId,
            encodeQueryParam({
                terms: { deviceId: props.device.id }
            })
        ).then(response => {
            const tempEvent = response.result;
            // tempEvent.total = 666666;
            eventData.forEach(item => {
                if (item.eventId === eventId) {
                    item.data = tempEvent;
                }
            });
            setEventData([...eventData])


            // //关闭加载中状态
            // const { events } = metadata;
            // //修改加载状态
            // let tempEvents = events.map((i: any) => {
            //     if (i.id === eventId) {
            //         i.loading = false;
            //     }
            //     return i;
            // });
            // metadata.events = tempEvents;
            // setMetadata({ ...metadata });
        });
    }


    const renderMiniChart = (item: any) => {
        const type = item.dataType;
        switch (type) {
            case 'double':
            case 'int':
                let data = propertiesData.find(i => i.property === item.id)?.numberValue;
                return (
                    <MiniProgress percent={data} strokeWidth={8} target={item.valueType.max || 100} color="#1A90FA" />
                );
            case 'object':
                return (
                    <div>
                        <Tag color="red"><Icon type="close-circle" />紧急</Tag>
                        <div style={{ float: "right" }}>
                            <a onClick={() => setEventVisible(true)}>查看详情</a>
                        </div>
                    </div>
                )
            default:
                return <MiniArea color="#975FE4" data={visitData} />

        }
    }

    const refreshPropertyItem = (item: any) => {
        const { properties } = metadata;
        //先修改加载状态
        // const temp = properties.find(i => i.id !== item.id);
        let tempProperties = properties.map((i: any) => {
            if (i.id === item.id) {
                i.loading = true;
            }
            return i;
        });
        // item.loading = true;
        metadata.properties = tempProperties;
        setMetadata({ ...metadata });

        //为了显示Loading效果
        refreshProperties(item);

    }

    const refreshEventItem = (item: any) => {
        const { events } = metadata;
        //修改加载状态
        let tempEvents = events.map((i: any) => {
            if (i.id === item.id) {
                i.loading = true;
            }
            return i;
        });
        metadata.events = tempEvents;
        setMetadata({ ...metadata });
        //为了显示Loading效果
        // setTimeout(() => loadEventData(item.id), 5000);
        // loadEventData(item.id);
        apis.deviceInstance.eventData(
            props.device.productId,
            item.id,
            encodeQueryParam({
                terms: { deviceId: props.device.id }
            })
        ).then(response => {
            const tempEvent = response.result;
            // tempEvent.total = 666666;
            eventData.forEach(item => {
                if (item.eventId === item.id) {
                    item.data = tempEvent;
                }
            });
            // console.log([...eventData], '刷新后');
            setEventData([...eventData])


            //关闭加载中状态
            const { events } = metadata;
            //修改加载状态
            let tempEvents = events.map((i: any) => {
                if (i.id === item.id) {
                    i.loading = false;
                }
                return i;
            });
            metadata.events = tempEvents;
            setMetadata({ ...metadata });
        });
    }

    const refreshProperties = (item: any) => {
        const { properties } = metadata;
        apis.deviceInstance.property(props.device.id, item.id)
            .then((response: any) => {
                console.log(response, 'resp[')
                const tempResult = response?.result;
                if (tempResult) {
                    // let result: any[] = [];

                    // for (const key in tempResult) {
                    //     if (tempResult.hasOwnProperty(key)) {
                    //         const element = tempResult[key];
                    //         result.push({ key: Object.keys(element)[0], value: Object.values(element)[0] })
                    //     }
                    // }
                    const temp = properties.map((item: any) => {
                        // if (!item) return;
                        // const temp = result.find((i: any) => i.key === item.id);
                        // if (!temp) return item;
                        // console.log(item, tempResult, 'ssss');
                        if (item.id === tempResult.property) {
                            item.formatValue = tempResult.formatValue;
                        }
                        item.loading = false;
                        return item;
                    });

                    metadata.properties = temp;
                } else {
                    const temp = properties.map((item: any) => {
                        // if (!item) return;
                        // const temp = result.find((i: any) => i.key === item.id);
                        // if (!temp) return item;
                        // item.formatValue = temp.value;
                        item.loading = false;
                        return item;
                    });

                    metadata.properties = temp;
                }
                setMetadata({ ...metadata });

            });

    }

    return (
        <div>
            {
                metadata && metadata.properties ? <Row gutter={24}>
                    <Col {...topColResponsiveProps}>
                        <Spin spinning={runInfo.loading}>

                            <ChartCard
                                bordered={false}
                                title='设备状态'
                                action={
                                    <Tooltip
                                        title='刷新'
                                    >
                                        <Icon type="sync" onClick={() => { refresDeviceState() }} />
                                    </Tooltip>
                                }
                                contentHeight={46}
                                total={deviceState?.state?.text}
                            >
                                <span>上线时间：{moment(runInfo?.onlineTime).format('YYYY-MM-DD HH:mm:ss')}</span>
                            </ChartCard>
                        </Spin>

                    </Col>

                    {
                        (metadata.properties).map((item: any) => {
                            if (!item) return;
                            return (
                                <Col {...topColResponsiveProps} key={item.id}>
                                    <Spin spinning={item.loading}>
                                        <ChartCard
                                            bordered={false}
                                            title={item.name}
                                            action={
                                                <Tooltip
                                                    title='刷新'
                                                >
                                                    <Icon type="sync" onClick={() => { refreshPropertyItem(item) }} />
                                                </Tooltip>
                                            }
                                            total={item.formatValue || 0}
                                            contentHeight={46}
                                        >
                                            <span></span>
                                        </ChartCard>
                                    </Spin>
                                </Col>
                            )
                        }
                        )
                    }

                    {
                        (metadata.events).map((item: any) => {
                            let tempData = eventData.find(i => i.eventId === item.id);
                            return (
                                <Col {...topColResponsiveProps} key={item.id}>
                                    <Spin spinning={item.loading}>
                                        <ChartCard
                                            bordered={false}
                                            title={item.name}
                                            action={
                                                <Tooltip
                                                    title='刷新'
                                                >
                                                    <Icon type="sync" onClick={() => { refreshEventItem(item) }} />
                                                </Tooltip>
                                            }

                                            total={`${tempData?.data.total || 0}次`}
                                            contentHeight={46}
                                        >
                                            <span>
                                                {eventLevel.get(item.expands?.level)}
                                                <a
                                                    style={{ float: "right" }}
                                                    onClick={() => {
                                                        setEventVisible(true);
                                                    }}>
                                                    查看详情
                                                </a>
                                            </span>
                                        </ChartCard>

                                    </Spin>

                                    {
                                        eventVisible &&
                                        <EventLog
                                            data={tempData?.data}
                                            item={item}
                                            close={() => { setEventVisible(false) }}
                                            type={props.device.productId}
                                            deviceId={props.device.id}
                                        />
                                    }
                                </Col>
                            )
                        }
                        )
                    }

                </Row>
                    :
                    <Col {...topColResponsiveProps}>
                        <ChartCard
                            bordered={false}
                            title='设备状态'
                            action={
                                <Tooltip
                                    title='刷新'
                                >
                                    <Icon type="sync" />
                                </Tooltip>
                            }
                            contentHeight={46}
                            total={'设备未激活'}
                        >
                            <span></span>
                        </ChartCard>
                    </Col>
            }
        </div>
    );
}

export default Status;