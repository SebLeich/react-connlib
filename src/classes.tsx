import * as React from "react";
import * as ReactDOM from "react-dom";
import { MdMailOutline, MdFileUpload, MdZoomIn, MdZoomOut } from 'react-icons/md';
import { Subject, Subscription } from "rxjs";

/**
 * the class enables to generate new guid's
 */
class Guid {
    static newGuid(instance?: any) {
        let guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        this.globalGuidMap[guid] = instance;
        return guid;
    }
    // the internal guid map
    static globalGuidMap: any = {};
}

export interface ConnlibModelElement {
    id?: number;
    guid: string;
    children?: any[];
    onInit?(data?: any): void;
}

/**
 * the control row for general functionality
 */
class ConnlibControlRowComponent extends React.Component {
    triggerUpload(){
        document.getElementById("upload-input").click();
    }
    triggerZoomIn(){
        if(Connlib.zoom > 3) return;
        Connlib.zoom += .1;
    }
    triggerZoomOut(){
        if(Connlib.zoom <= .1) return;
        Connlib.zoom -= .1;
    }
    render(){
        let content = (
            <div className="control-row-inner">
                <MdZoomOut className="control" onClick={() => this.triggerZoomOut()} />
                <div className="zoom-preview">
                    x {(Connlib.zoom).toFixed(1)}
                </div>
                <MdZoomIn className="control" onClick={() => this.triggerZoomIn()} />
                <MdFileUpload className="control" onClick={() => this.triggerUpload()} />
            </div>
        )
        return content;
    }
}

/**
 * unused classes
 */
export class ConnlibAttribute {
    id: number;
    name: string;
    type: string;
}

export class ConnlibParameter {
    id: number;
    name: string;
    type: string;
}

export class ConnlibMethod {
    id: number;
    name: string;
    type: string;
    parameters: [string, ConnlibParameter];
}

export class ConnlibLabel {
    text: string;
    left: number;
    top: number;
    position: number;
    id: string;
}
// end unused classes

/**
 * the class represents a DOM element's connlib internal representation
 */
export class ConnlibLayerData {
    guid: string = Guid.newGuid();
    left: number;
    top: number;
    width: number;
    height: number;
    bottom: number;
    right: number;
    autosize: boolean;
    data: any;
    labels: ConnlibLabel[];
    connectors: ConnlibConnectorDataWrapper;
    domElement: HTMLElement;
    layerPositionObservable: Subject<ConnlibLayerData>;
    layerSizeObservable: Subject<ConnlibLayerData>;
    positionChangeStartedObservable: Subject<any> = new Subject();
    positionChangeReadyObservable: Subject<any> = new Subject();
    connlibInstance: ConnlibInstance;
    middle: ConnlibPoint = null;
    setPosition(left: number, top: number) {
        this.left = left;
        this.top = top;
        this.validateSize();
        this.layerPositionObservable.next(this);
    }
    setSize(width: number, height: number) {
        this.height = height;
        this.width = width;
        this.validateSize();
        this.layerSizeObservable.next(this);
    }
    validateSize() {
        this.right = this.left + this.width;
        this.bottom = this.top + this.height;
        this.middle = null;
    }
}
/**
 * internal wrapper for a point
 */
class ConnlibPoint {
    left: number;
    top: number;
}
/**
 * a basic connlib pathpoint used for connections
 */
class ConnlibPathPoint extends ConnlibPoint {
    canMoveX: boolean = true;
    canMoveY: boolean = true;
    isSource: boolean = false;
    isTarget: boolean = false;
    createLineDirections: number[] = [];
    /**
     * the directions, in which the point enables to create new lines
     * e.g. right endpoint: the connection point enables to create a line in the right direction
     */
    connlibInstance: ConnlibInstance;
    isSettedUp: boolean = false;
    positionChangeObservable: Subject<ConnlibPositionChangeEvent> = new Subject<ConnlibPositionChangeEvent>();
    cascadingUpdate(event: ConnlibPositionChangeEvent) {
        event.participants.push(this);
        if (event.diffX && event.diffY) throw ("corrupted update: change is only in one direction valid!");
        if (event.diffX) {
            this.left += event.diffX;
            this.positionChangeObservable.next(event);
        } else if (event.diffY) {
            this.top += event.diffY;
            this.positionChangeObservable.next(event);
        }
    }
    setUp(connlibInstance: ConnlibInstance) {
        this.connlibInstance = connlibInstance;
        this.isSettedUp = true;
    }
}
/**
 * an internal class wrapping the neccessary data for side change events
 */
class ConnlibEndpointSideChangeData {
    oldDirection: number = null;
    updatedEndpoint: ConnlibEndpoint = null;
}
/**
 * the class contains a connlib endpoint
 */
class ConnlibEndpoint extends ConnlibPathPoint {
    guid: string = Guid.newGuid();
    componentRef: ConnlibEndpointComponent;
    source: ConnlibLayerData;
    direction: number;
    connlibInstance: ConnlibInstance;
    connector: ConnlibConnection;
    instanceX: number;
    instanceY: number;
    hidden: boolean = false;
    connectorPoint: ConnlibPathPoint = null;
    sourceSideChangeObservable: Subject<ConnlibEndpointSideChangeData> = new Subject<ConnlibEndpointSideChangeData>();
    /**
     * this method is analogue to a path point's position change, but it should not cascade the event back!
     * thus, this method is everytime the end of a position update cascade
     */
    cascadingUpdate(event: ConnlibPositionChangeEvent) {
        if (event.participants.indexOf(this) > -1) return;
        event.participants.push(this);
        if (event.diffX && event.diffY) throw ("corrupted update: change is only in one direction valid!");
        let result = this.outOfSourceBound();
        if (!result.value) {
            if (event.diffX) {
                this.left += event.diffX;
            } else if (event.diffY) {
                this.top += event.diffY;
            } else {
                console.log(event);
            }
            this.validateInstancePosition();
            this.validate();
        } else {
            Connlib.dragFlag = null;
            this.left = result.point.left;
            this.top = result.point.top;
            let oldDirection = this.direction;
            this.direction = result.direction;
            this.validateInstancePosition();
            this.sourceSideChangeObservable.next({
                oldDirection: oldDirection,
                updatedEndpoint: this
            });
            this.validate();
        }
    }

    destroy() {
        if (this.connlibInstance) this.connlibInstance.removeEndpoint(this);
        if (this.connector) {
            if (this.connector.isSourceEndpoint(this)) this.connector.realSource = null;
            if (this.connector.isTargetEndpoint(this)) this.connector.realTarget = null;
        }
        this.sourceSideChangeObservable.unsubscribe();
    }

    getInstancePosition(): ConnlibPoint {
        return this.connlibInstance.rawPointToInstancePoint(this);
    }

    hide() {
        this.hidden = true;
        this.validate();
    }

    onMousedown() {
        Connlib.dragFlag = this;
    }

    outOfSourceBound(): { value: boolean, point: ConnlibPoint, direction: number } {
        switch (this.direction) {
            case ConnlibDirection.BOTTOM:
                if ((this.source.left + this.connlibInstance.layer.left) > this.left) {
                    return {
                        value: true,
                        point: {
                            left: (this.source.left + this.connlibInstance.layer.left),
                            top: (this.source.bottom + this.connlibInstance.layer.top) - 5,
                        },
                        direction: ConnlibDirection.LEFT
                    }
                } else if ((this.source.right + this.connlibInstance.layer.left) < this.left) {
                    return {
                        value: true,
                        point: {
                            left: (this.source.right + this.connlibInstance.layer.left),
                            top: (this.source.bottom + this.connlibInstance.layer.top) - 5
                        },
                        direction: ConnlibDirection.RIGHT
                    }
                }
                break;
            case ConnlibDirection.TOP:
                if ((this.source.left + this.connlibInstance.layer.left) > this.left) {
                    return {
                        value: true,
                        point: {
                            left: (this.source.left + this.connlibInstance.layer.left),
                            top: (this.source.top + this.connlibInstance.layer.top) + 5,
                        },
                        direction: ConnlibDirection.LEFT
                    }
                } else if ((this.source.right + this.connlibInstance.layer.left) < this.left) {
                    return {
                        value: true,
                        point: {
                            left: (this.source.right + this.connlibInstance.layer.left),
                            top: (this.source.top + this.connlibInstance.layer.top) + 5
                        },
                        direction: ConnlibDirection.RIGHT
                    }
                }
                break;
            case ConnlibDirection.LEFT:
                if ((this.source.top + this.connlibInstance.layer.top) > this.top) {
                    return {
                        value: true,
                        point: {
                            left: (this.source.left + this.connlibInstance.layer.left) + 5,
                            top: (this.source.top + this.connlibInstance.layer.top),
                        },
                        direction: ConnlibDirection.TOP
                    }
                } else if ((this.source.bottom + this.connlibInstance.layer.top) < this.top) {
                    return {
                        value: true,
                        point: {
                            left: (this.source.left + this.connlibInstance.layer.left) + 5,
                            top: (this.source.bottom + this.connlibInstance.layer.top),
                        },
                        direction: ConnlibDirection.BOTTOM
                    }
                }
                break;
            case ConnlibDirection.RIGHT:
                if ((this.source.top + this.connlibInstance.layer.top) > this.top) {
                    return {
                        value: true,
                        point: {
                            left: (this.source.right + this.connlibInstance.layer.left) - 5,
                            top: (this.source.top + this.connlibInstance.layer.top),
                        },
                        direction: ConnlibDirection.TOP
                    }
                } else if ((this.source.bottom + this.connlibInstance.layer.top) < this.top) {
                    return {
                        value: true,
                        point: {
                            left: (this.source.right + this.connlibInstance.layer.left) - 5,
                            top: (this.source.bottom + this.connlibInstance.layer.top),
                        },
                        direction: ConnlibDirection.BOTTOM
                    }
                }
                break;
        }
        return {
            value: false,
            point: null,
            direction: null
        };
    }

    setPosition(point: ConnlibPoint) {
        this.left = point.left;
        this.top = point.top;
        this.validateInstancePosition();
    }

    setUp(connlibInstance: ConnlibInstance) {
        this.connlibInstance = connlibInstance;
        if (this.top && this.left && connlibInstance) this.validateInstancePosition();
        this.isSettedUp = true;
    }

    show() {
        this.hidden = false;
        this.validate();
    }

    updateLeft(left: number) {
        if (this.direction == ConnlibDirection.LEFT || this.direction == ConnlibDirection.RIGHT) {
            console.warn("this method should not be called: only for horizontal movement of TOP/BOTTOM endpoints");
            return;
        }
        let diff = left - this.left;
        this.left = left;
        let result = this.outOfSourceBound();
        if (!result.value) {
            this.validateInstancePosition();
            this.validate();
            let event = new ConnlibPositionChangeEvent();
            event.origin = this;
            event.participants.push(this);
            event.movementOrientation = ConnlibOrientation.HORIZONTAL;
            event.diffX = diff;
            this.positionChangeObservable.next(event);
        } else {
            this.left = result.point.left;
            this.top = result.point.top;
            let oldDirection = this.direction;
            this.direction = result.direction;
            this.validateInstancePosition();
            this.validate();
            Connlib.dragFlag = null;
            this.sourceSideChangeObservable.next({
                oldDirection: oldDirection,
                updatedEndpoint: this
            });
        }
    }

    updateTop(top: number) {
        if (this.direction == ConnlibDirection.TOP || this.direction == ConnlibDirection.BOTTOM) {
            console.warn("this method should not be called: only for vertical movement of RIGHT/LEFT endpoints");
            return;
        }
        let diff = top - this.top;
        this.top = top;
        let result = this.outOfSourceBound();
        if (!result.value) {
            this.validateInstancePosition();
            this.validate();
            let event = new ConnlibPositionChangeEvent();
            event.origin = this;
            event.participants.push(this);
            event.movementOrientation = ConnlibOrientation.VERTICAL;
            event.diffY = diff;
            this.positionChangeObservable.next(event);
        } else {
            this.left = result.point.left;
            this.top = result.point.top;
            let oldDirection = this.direction;
            this.direction = result.direction;
            this.validateInstancePosition();
            this.validate();
            Connlib.dragFlag = null;
            this.sourceSideChangeObservable.next({
                oldDirection: oldDirection,
                updatedEndpoint: this
            });
        }
    }

    validate() {
        if (!this.componentRef) {
            this.connlibInstance.render();
            return;
        }
        let type: ConnlibEndpointInterface = new ConnlibRelationshipEndpoint();
        var hasPort: boolean = false;
        if (this.connector) {
            if ((this.connector.constructor as any).sourceEndpointType && this.connector.isSourceEndpoint(this)){
                type = (this.connector.constructor as any).sourceEndpointType;
            }
            else if ((this.connector.constructor as any).targetEndpointType && this.connector.isTargetEndpoint(this)){
                type = (this.connector.constructor as any).targetEndpointType;
                hasPort = this.connector.toEmbedded;
            }
        }
        type.width = Connlib.endpointSize;
        type.height = Connlib.endpointHeightFormula(Connlib.endpointSize);
        this.componentRef.setState({
            left: this.left,
            top: this.top,
            direction: this.direction,
            type: type,
            hidden: this.hidden,
            hasPort: hasPort,
            mousedown: () => this.onMousedown()
        });
    }

    validateInstancePosition() {
        let p = this.getInstancePosition();
        this.instanceX = p.left;
        this.instanceY = p.top;
    }
}
/**
 * the connlib endpoint interface
 * all endpoint's you want to render needs to implement the interface
 */
interface ConnlibEndpointInterface {
    width: number;
    height: number;
    fill?: string;
    portType?: ConnlibPortTypeOptions;
    arrowType?: ConnlibArrowTypeOptions;
}
/**
 * the connlib endpoint interface
 * all endpoint's you want to render needs to implement the interface
 */
interface ConnlibLineStyle {
    dashArray?: string;
    strokeWidth?: number;
}

export class ConnlibConnectorData {
    pathPoints: ConnlibPathPoint[];
}

export class ConnlibConnectorDataWrapper {
    [key: number]: ConnlibConnectorData;
}

export class ConnlibLayerDataWrapper {
    [key: number]: ConnlibLayerData;
}

export class ConnlibLayer {
    data: ConnlibLayerDataWrapper;
}

export class ConnlibLayerWrapper {
    [key: number]: ConnlibLayer;
}

export class ConnlibObjectType implements ConnlibModelElement {
    id?: number;
    guid: string = Guid.newGuid();
    componentRef?: any = null;
    layer: ConnlibLayerData;
    connlibInstance: ConnlibInstance;
    positionChangeObservable: Subject<any> = new Subject();
    positionChangeStartedObservable: Subject<any> = new Subject();
    positionChangeReadyObservable: Subject<any> = new Subject();

    onInit?(data?: any) {

    }

    onMousedown(event: MouseEvent) {
        this.positionChangeStartedObservable.next(this);
        let drag = new ConnlibObjectTypeMoveWrapper();
        drag.ref = this;
        drag.diffX = event.offsetX;
        drag.diffY = event.offsetY;
        Connlib.dragFlag = drag;
    }

    updatePosition(position: ConnlibPoint) {
        this.positionChangeObservable.next({ position: position, ref: this });
    }

    validate(layer: ConnlibLayerData) {
        console.warn("you must overwrite this function!", this);
    }
}
/**
 * 
 */
export class ConnlibAbstractStructuralType extends ConnlibObjectType {
    static backgroundColor?: string = "#fafafa";
    static borderRadius?: number = 3;
    static borderWidth?: number = 1;
    children?: any[] = [];
    componentRef?: ConnlibAbstractStructuralTypeComponent;

    get JSXComponent() {
        return ConnlibAbstractStructuralTypeComponent;
    }

    validate(layer: ConnlibLayerData) {
        if (!this.componentRef) {
            console.warn("cannot revalidate view: the component has no view!");
            return;
        }
        this.componentRef.setState({
            top: layer.top,
            left: layer.left,
            height: layer.height,
            width: layer.width,
            borderWidth: (this.constructor as any).borderWidth,
            backgroundColor: (this.constructor as any).backgroundColor,
            borderRadius: (this.constructor as any).borderRadius,
            mousedown: (event: MouseEvent) => this.onMousedown(event),
            guid: this.guid,
            externalId: this.id
        });
    }
}
/**
 * the react component of the endpoint
 */
class ConnlibAbstractStructuralTypeComponent extends React.Component {
    ref: React.RefObject<HTMLDivElement> = React.createRef();
    /**
     * the method is called on component rendering
     */
    render() {
        if (this.state as any) {
            let bW = (this.state as any).borderWidth;
            let style: React.CSSProperties = {
                position: "absolute",
                top: (this.state as any).top,
                height: (this.state as any).height - (2 * bW),
                left: (this.state as any).left,
                width: (this.state as any).width - (2 * bW),
                borderWidth: bW,
                backgroundColor: (this.state as any).backgroundColor,
                borderRadius: (this.state as any).borderRadius
            };
            return (
                <div data-guid={(this.state as any).guid} data-externalid={(this.state as any).externalId} style={style} className="structural-type" onMouseDown={() => (this.state as any).mousedown(event)}></div>
            );
        }
        return null;
    }
}

export class ConnlibEvent extends ConnlibObjectType {

    icon: any = null;
    borderWidth: number = 2;

    get JSXComponent() {
        return ConnlibEventComponent;
    }

    validate(layer: ConnlibLayerData) {
        if (!this.componentRef) {
            console.warn("cannot revalidate view: the component has no view!");
            return;
        }
        this.componentRef.setState({
            top: layer.top,
            left: layer.left,
            height: layer.height,
            width: layer.width,
            icon: this.icon,
            borderWidth: this.borderWidth,
            mousedown: (event: MouseEvent) => this.onMousedown(event)
        });
    }
}
/**
 * the react component of the endpoint
 */
class ConnlibEventComponent extends React.Component {
    ref: React.RefObject<HTMLDivElement> = React.createRef();
    /**
     * the method is called on component rendering
     */
    render() {
        if (this.state as any) {
            let icon = (this.state as any).icon;
            let bW = (this.state as any).borderWidth;
            let style: React.CSSProperties = {
                position: "absolute",
                top: (this.state as any).top,
                height: (this.state as any).height - (bW * 2),
                left: (this.state as any).left,
                width: (this.state as any).width - (bW * 2),
                borderWidth: bW
            };
            return (
                <div style={style} className="event-outer" onMouseDown={() => (this.state as any).mousedown(event)}>
                    <span className="spacer"></span>
                    {icon}
                    <span className="spacer"></span>
                </div>
            );
        }
        return null;
    }
}

export const ConnlibEventTypes = {
    "Standard": <MdMailOutline className="icon" />
}

export class ConnlibConnectionWrapper {
    connections: [[string, any]]
}

export class ConnlibMetaData {
    creationDate: string;
    modifiedDate: string;
    author: string;
}
/**
 * the static connlib interface
 */
export class Connlib {
    // is the library setted up in the standalone mode?
    static standaloneSetup = false;
    /**
     * does the connlib library listen to window events, containing:
     * arrow keys (keycodes: 37 - 40)
     * pan
     * 
     */
    static instancePadding = 200;
    static disableConnectorDrag = false;
    static windowListenersSettedUp = false;
    static useOverlapDetection = true;
    static useConnlibPanAndKeyup = true;
    static blockingClassName = "connlib-connection-blocked";
    static connectableClassName = "connlib-connectable";
    static endpointStack = 15;
    static pathCornerRadius = 3;
    static connectorColor = "#464646";
    static endpointIndent: number = 5;
    static createLineSize: number = 10;
    static lineOverlayWidth: number = 5;
    static endpointSize: number = 30; // the endpoint svg's width & the height is calculated with the formula below
    static endpointHeightFormula = function (size: number) {
        return size * 1.5;
    }
    static endpointPadding: number = 5;
    static overwriteConnectionOnValidation = true;
    static moveStep = 50; // the step size of the window move events
    static invertMoveDirection = false;
    // should connlib render components at the dom?
    static renderComponents = false;
    // the root element
    static rootContainer: HTMLElement = document.getElementById("root");
    // the dynamic root instance
    static rootInstance: ConnlibInstance = null;
    static moveX = 0; // x-transform property
    static moveY = 0; // y-transform property
    /**
     * the presetted connlib grid scale for auto path calculation
     * be careful! a low scale can cause high browser load
     * both, memory and CPU are endangered
     * default: 10
     */
    private static _connlibGridScale = 5;
    public static get connlibGridScale(): number {
        return this._connlibGridScale;
    }
    public static set connlibGridScale(scale: number) {
        this._connlibGridScale = scale;
        this.scaleChangeObservable.next(scale);
    }
    // the instance's zoom level (default: 1)
    private static _zoom = .8;
    public static get zoom(): number {
        return this._zoom;
    }
    public static set zoom(zoom: number) {
        this._zoom = zoom;
        this.applyTransform();
        this.zoomChangeObservable.next(zoom);
    }
    // the drag clipboard containg the current dragged element
    static dragFlag: ConnlibDragFlagInterface = null;
    // the current mouseover references the current hovered element
    static currentMouseover: any = null;

    /**
     * the method applys the transform to all contents
     */
    public static applyTransform() {
        this.rootInstance.container.style.transform = "translate(" + this.moveX + "px, " + this.moveY + "px) scale(" + this.zoom + ", " + this.zoom + ")";
    }
    /**
     * the method calculates the intersection points between a layer and a linear function
     */
    private static calculateBoundingIntersections(layer: ConnlibLayerData, fun: ConnlibLinearFunction): ConnlibPathPoint[] {
        let points: ConnlibPathPoint[] = [];
        // top side
        let interTop = this.calcIntersectionBetweenTwoFuncs(fun, {
            m: 0,
            n: layer.top
        });
        if (!interTop.parallely && interTop.left >= layer.left && interTop.left <= layer.right) {
            points.push({
                left: interTop.left,
                top: interTop.top,
                source: layer,
                direction: ConnlibDirection.TOP
            } as ConnlibEndpoint);
        }
        // right side
        let interRight = {
            top: this.calculateFunctionForX(fun, layer.right),
            left: layer.right
        };
        if (interRight.top >= layer.top && interRight.top <= layer.bottom) {
            points.push({
                left: interRight.left,
                top: interRight.top,
                source: layer,
                direction: ConnlibDirection.RIGHT
            } as ConnlibEndpoint);
        }
        // top side
        let interBottom = this.calcIntersectionBetweenTwoFuncs(fun, {
            m: 0,
            n: layer.bottom
        });
        if (!interBottom.parallely && interBottom.left >= layer.left && interBottom.left <= layer.right) {
            points.push({
                left: interBottom.left,
                top: interBottom.top,
                source: layer,
                direction: ConnlibDirection.BOTTOM
            } as ConnlibEndpoint);
        }
        // left side
        let interLeft = {
            top: this.calculateFunctionForX(fun, layer.left),
            left: layer.left
        };
        if (interRight.top >= layer.top && interRight.top <= layer.bottom) {
            points.push({
                left: interLeft.left,
                top: interLeft.top,
                source: layer,
                direction: ConnlibDirection.LEFT
            } as ConnlibEndpoint);
        }
        return points;
    }
    /**
     * the method calculates a function between two points
     * make sure, that the left coordinates not equal!
     * @param point1
     * @param point2 
     */
    static calcFunForTwoPoints(point1: ConnlibPoint, point2: ConnlibPoint): ConnlibLinearFunction {
        /**
         * I    y = mx + n
         * II   point1.top = m * point1.left + n
         * III  point2.top = m * point2.left + n
         * IV   point1.top - m * point1.left = point2.top - m * point2.left
         * V    - m * point1.left + m * point2.left = point2.top - point1.top
         * VI   m * (-point1.left + point2.left) = point2.top - point1.top
         */
        if (point1.left == point2.left) {
            throw ("cannot calculate function: left coordinates are equal!");
        }
        let m = (point2.top - point1.top) / (point2.left - point1.left);
        return {
            "m": m,
            "n": point1.top - (m * point1.left)
        };
    }
    /**
     * the method calculates the intersection between two points
     * @param fun1 
     * @param fun2 
     */
    static calcIntersectionBetweenTwoFuncs(fun1: ConnlibLinearFunction, fun2: ConnlibLinearFunction) {
        /**
         * I    fun1.m * x + fun1.n = fun2.m * x + fun2.n
         * II   x * (fun1.m - fun2.m) = fun2.n - fun1.n
         */
        if (fun1.m == fun2.m) {
            if (fun1.n == fun2.n) {
                return {
                    "parallely": true,
                    "identical": true,
                    "left": null,
                    "top": null
                };
            } else {
                return {
                    "parallely": true,
                    "identical": false,
                    "left": null,
                    "top": null
                };
            }
        }
        let x = (fun2.n - fun1.n) / (fun1.m - fun2.m);
        return {
            "parallely": false,
            "identical": false,
            "left": x,
            "top": fun1.m * x + fun1.n
        };
    }
    /**
     * the method returns the function's value for a given x value
     */
    static calculateFunctionForX(fun: ConnlibLinearFunction, xValue: number): number {
        return (fun.m * xValue) + fun.n;
    }
    /**
     * the method calculates the passed layer's middle point
     * @param layer 
     */
    private static calculateMiddle(layer: ConnlibLayerData): ConnlibPoint {
        return { "left": layer.left + (layer.width / 2), "top": layer.top + (layer.height / 2) };
    }
    /**
     * the method returns an array of path points
     * @param cells 
     */
    static cellsArrayToPathPointArray(cells: ConnlibOutputGridCell[]): ConnlibPathPoint[] {
        return cells.map(x => {
            let point = new ConnlibPathPoint();
            point.left = (x.c);
            point.top = (x.r);
            point.setUp(this.rootInstance);
            return point;
        });
    }
    /**
     * the method clears all connlib instances
     */
    public static clear() {
        for (let instanceId in this.instances) {
            let instance = this.instances[instanceId];
            instance.remove();
        }
        this.instances = {};
        this.rootContainer.innerHTML = "";
    }
    /**
     * the attribute stores all connlib instances
     */
    private static instances: { [key: string]: ConnlibInstance } = {};

    static createRootInstance() {
        let rootInstance = Connlib.getInstance();
        rootInstance.deepth = 0;
        rootInstance.setContainer(this.rootContainer);
        this.rootInstance = rootInstance;
    }
    /**
     * the method returns an endpoint's conn
     */
    static getEndpointConnectionPoint(endpoint: ConnlibEndpoint): ConnlibEndpoint {
        let point = new ConnlibEndpoint();
        point.source = endpoint.source;
        point.direction = endpoint.direction;
        point.left = endpoint.left;
        point.top = endpoint.top;
        point.setUp(this.rootInstance);
        endpoint.connectorPoint = point;
        let h = this.endpointHeightFormula(Connlib.endpointSize);
        switch (endpoint.direction) {
            case ConnlibDirection.TOP:
                point.top = endpoint.top - h;
                break;
            case ConnlibDirection.RIGHT:
                point.left = endpoint.left + h;
                break;
            case ConnlibDirection.BOTTOM:
                point.top = endpoint.top + h;
                break;
            case ConnlibDirection.LEFT:
                point.left = endpoint.left - h;
                break;
            default:
                console.warn("the point has no direction setted!", endpoint);
                break;
        }
        return point;
    }
    /**
     * the method returns a new connlib instance
     * warning: no container setted!
     */
    public static getInstance(): ConnlibInstance {
        let id = Guid.newGuid();
        let i = new ConnlibInstance();
        i.guid = id;
        this.instances[i.guid] = i;
        return i;
    }
    /**
     * the method returns a connlib instance for a given id
     * @param guid instance's identifier
     */
    public static getInstanceByGuid(guid: string) {
        return this.instances[guid];
    }
    /**
     * the method returns a registered type by namespace
     * @param namespace 
     */
    static getTypeMapEntry(namespace: string): ConnlibTypeMapEntry {
        return ConnlibTypeMap[namespace];
    }
    /**
     * the method registers a type within the map
     * @param namespace 
     * @param entry 
     */
    public static registerType(namespace: string, entry: ConnlibTypeMapEntry) {
        if (ConnlibTypeMap[namespace]) {
            console.warn("cannot register " + namespace + ": already registered!");
            return;
        }
        ConnlibTypeMap[namespace] = entry;
    }
    /**
     * the method renders all Connlib instances
     */
    public static render(){
        for(let index in this.instances) this.instances[index].render();
    }
    /**
     * the method redraws all connlib instances
     */
    public static repaintEverything() {
        for (let guid in this.instances) this.instances[guid].repaintEverything();
    }
    /**
     * the methofd rounds the passed point's coordinates in accordance to the current scale
     */
    public static roundToScale(point: ConnlibPoint): ConnlibPoint {
        let output = point as ConnlibEndpoint;
        output.left = this.roundValueToScale(point.left);
        output.top = this.roundValueToScale(point.top);
        return output;
    }
    /**
     * the method rounds a value to scale
     */
    public static roundValueToScale(value: number) {
        return Math.round(value / Connlib.connlibGridScale) * Connlib.connlibGridScale;
    }
    /**
     * this method sets the library up as a standalone, containg the following features:
     * - own window listeners
     * - own element rendering
     */
    public static setUpStandalone() {
        this.standaloneSetup = true;
        this.useConnlibPanAndKeyup = true;
        this.renderComponents = true;
        this.renderControlBar();
        this.setUpWindowListeners();
        this.standaloneSetupObservable.next();
    }
    /**
     * the method renders the control bar
     */
    public static renderControlBar(){
        let controlRow = ReactDOM.render(
            React.createElement(ConnlibControlRowComponent),
            document.getElementById("control-row")
        );
        Connlib.zoomChangeObservable.subscribe(() => {
            controlRow.setState({
                zoom: Connlib.zoom
            });
        });
    }
    /**
     * the method sets the window listeners up
     */
    public static setUpWindowListeners() {
        // arrow keys for pan
        if(this.useConnlibPanAndKeyup){
            window.addEventListener("keyup", (event) => {
                switch (event.keyCode) {
                    case 37:
                        if (this.invertMoveDirection) this.moveX -= this.moveStep;
                        else this.moveX += this.moveStep;
                        break;
                    case 38:
                        if (this.invertMoveDirection) this.moveY -= this.moveStep;
                        else this.moveY += this.moveStep;
                        break;
                    case 39:
                        if (this.invertMoveDirection) this.moveX += this.moveStep;
                        else this.moveX -= this.moveStep;
                        break;
                    case 40:
                        if (this.invertMoveDirection) this.moveY += this.moveStep;
                        else this.moveY -= this.moveStep;
                        break;
                }
                this.applyTransform();
            });
        }
        window.addEventListener("mousedown", (event) => {
            if (this.dragFlag == null) {
                event.preventDefault();
                event.stopPropagation();
                if ((event.target as HTMLElement).classList.contains("connlib-connectable")) {
                    let c = ConnlibExtensions.cumulativeOffset(event.target as HTMLElement);
                    this.dragFlag = new ConnlibConnectionCreateWrapper((c.left + event.offsetX), (c.top + event.offsetY), (event.target as HTMLElement));
                } else if(this.useConnlibPanAndKeyup) {
                    this.dragFlag = new ConnlibPanWrapper(event.clientX, event.clientY, Connlib.moveX, Connlib.moveY);
                }
            }
        });
        window.addEventListener("mousemove", (event) => {
            if (!this.dragFlag) return;
            let c = ConnlibExtensions.cumulativeOffset(event.target as HTMLElement);
            let corr = { left: event.offsetX + c.left, top: event.offsetY + c.top };
            switch (this.dragFlag.constructor) {
                case ConnlibLine:
                    if(Connlib.disableConnectorDrag) return;
                    var line = (this.dragFlag as ConnlibLine);
                    let diffX = corr.left - line.connlibInstance.layer.left - line.sL;
                    let diffY = corr.top - line.connlibInstance.layer.top - line.sT;
                    switch (line.orientation) {
                        case ConnlibOrientation.HORIZONTAL:
                            if (diffY == 0) return;
                            if (line._source.canMoveY && line._target.canMoveY) line.updateTop(corr.top - line.connlibInstance.layer.top);
                            else {
                                if (diffY <= ((-1) * (Connlib.createLineSize))) {
                                    if (line._source.createLineDirections.indexOf(ConnlibDirection.TOP) > -1) {
                                        let newPoint = new ConnlibPathPoint();
                                        newPoint.connlibInstance = line.connlibInstance;
                                        newPoint.left = line._source.left;
                                        newPoint.top = corr.top - line.connlibInstance.layer.top;
                                        newPoint.setUp(line.connlibInstance);
                                        let source = line._source;
                                        line._source = newPoint;
                                        line.connection.setUpNewLine(source, newPoint);
                                        line._target.top = corr.top - line.connlibInstance.layer.top;
                                        line.connection.validate();
                                    }
                                    if (line._target.createLineDirections.indexOf(ConnlibDirection.TOP) > -1) {
                                        let newPoint = new ConnlibPathPoint();
                                        newPoint.connlibInstance = line.connlibInstance;
                                        newPoint.left = line._target.left;
                                        newPoint.top = corr.top - line.connlibInstance.layer.top;
                                        newPoint.setUp(line.connlibInstance);
                                        let target = line._target;
                                        line._target = newPoint;
                                        line.connection.setUpNewLine(newPoint, target);
                                        line._source.top = corr.top - line.connlibInstance.layer.top;
                                        line.connection.validate();
                                    }
                                } else if (diffY >= Connlib.createLineSize) {
                                    // to bottom
                                    if (line._source.createLineDirections.indexOf(ConnlibDirection.BOTTOM) > -1) {
                                        let newPoint = new ConnlibPathPoint();
                                        newPoint.connlibInstance = line.connlibInstance;
                                        newPoint.left = line._source.left;
                                        newPoint.top = corr.top - line.connlibInstance.layer.top;
                                        newPoint.setUp(line.connlibInstance);
                                        let source = line._source;
                                        line._source = newPoint;
                                        line.connection.setUpNewLine(source, newPoint);
                                        line._target.top = corr.top - line.connlibInstance.layer.top;
                                        line.connection.validate();
                                    }
                                    if (line._target.createLineDirections.indexOf(ConnlibDirection.BOTTOM) > -1) {
                                        let newPoint = new ConnlibPathPoint();
                                        newPoint.connlibInstance = line.connlibInstance;
                                        newPoint.left = line._target.left;
                                        newPoint.top = corr.top - line.connlibInstance.layer.top;
                                        newPoint.setUp(line.connlibInstance);
                                        let target = line._target;
                                        line._target = newPoint;
                                        line.connection.setUpNewLine(newPoint, target);
                                        line._source.top = corr.top - line.connlibInstance.layer.top;
                                        line.connection.validate();
                                    }
                                }
                            }
                            break;
                        case ConnlibOrientation.VERTICAL:
                            if (diffX == 0) return;
                            if (line._source.canMoveX && line._target.canMoveX) line.updateLeft(corr.left - line.connlibInstance.layer.left);
                            else {
                                // move to left
                                if (diffX <= ((-1) * (Connlib.createLineSize))) {
                                    // source
                                    if (line._source.createLineDirections.indexOf(ConnlibDirection.LEFT) > -1) {
                                        let newPoint = new ConnlibPathPoint();
                                        newPoint.connlibInstance = line.connlibInstance;
                                        newPoint.left = line._source.left;
                                        newPoint.top = line._source.top;
                                        newPoint.setUp(line.connlibInstance);
                                        let source = line._source;
                                        line._source = newPoint;
                                        line.connection.setUpNewLine(source, newPoint);
                                        line._source.left = corr.left - line.connlibInstance.layer.left;
                                        line.connection.validate();
                                    }
                                    // target
                                    if (line._target.createLineDirections.indexOf(ConnlibDirection.LEFT) > -1) {
                                        let newPoint = new ConnlibPathPoint();
                                        newPoint.connlibInstance = line.connlibInstance;
                                        newPoint.left = line._target.left;
                                        newPoint.top = line._target.top;
                                        newPoint.setUp(line.connlibInstance);
                                        let target = line._target;
                                        line._target = newPoint;
                                        line.connection.setUpNewLine(newPoint, target);
                                        line._source.left = corr.left - line.connlibInstance.layer.left;
                                        line.connection.validate();
                                    }
                                    // move to right
                                } else if (diffX >= Connlib.createLineSize) {
                                    // source
                                    if (line._source.createLineDirections.indexOf(ConnlibDirection.RIGHT) > -1) {
                                        let newPoint = new ConnlibPathPoint();
                                        newPoint.connlibInstance = line.connlibInstance;
                                        newPoint.left = corr.left - line.connlibInstance.layer.left;
                                        newPoint.top = line._target.top;
                                        newPoint.setUp(line.connlibInstance);
                                        let source = line._source;
                                        line._source = newPoint;
                                        line.connection.setUpNewLine(source, newPoint);
                                        line._source.left = corr.left - line.connlibInstance.layer.left;
                                        line.connection.validate();
                                    }
                                    // target
                                    if (line._target.createLineDirections.indexOf(ConnlibDirection.RIGHT) > -1) {
                                        let newPoint = new ConnlibPathPoint();
                                        newPoint.connlibInstance = line.connlibInstance;
                                        newPoint.left = corr.left - line.connlibInstance.layer.left;
                                        newPoint.top = line._target.top;
                                        newPoint.setUp(line.connlibInstance);
                                        let target = line._target;
                                        line._target = newPoint;
                                        line.connection.setUpNewLine(newPoint, target);
                                        line._source.left = corr.left - line.connlibInstance.layer.left;
                                        line.connection.validate();
                                    }
                                }
                            }
                            break;
                    }
                    break;
                case ConnlibEndpoint:
                    if(Connlib.disableConnectorDrag) return;
                    var endpoint = this.dragFlag as ConnlibEndpoint;
                    switch (endpoint.direction) {
                        case ConnlibDirection.TOP:
                        case ConnlibDirection.BOTTOM:
                            endpoint.updateLeft(corr.left);
                            break;
                        case ConnlibDirection.RIGHT:
                        case ConnlibDirection.LEFT:
                            endpoint.updateTop(corr.top);
                            break;
                    }
                    break;
                case ConnlibPanWrapper:
                    let t = (this.dragFlag as ConnlibPanWrapper).calculateTransform(event.clientX, event.clientY);
                    Connlib.moveX = t.x;
                    Connlib.moveY = t.y;
                    Connlib.applyTransform();
                    break;
                case ConnlibConnectionCreateWrapper:
                    (this.dragFlag as ConnlibConnectionCreateWrapper).updateTarget(c.left + event.offsetX, c.top + event.offsetY);
                    break;
                case ConnlibObjectTypeMoveWrapper:
                    let dF = this.dragFlag as ConnlibObjectTypeMoveWrapper;
                    dF.ref.updatePosition({
                        left: corr.left - dF.diffX,
                        top: corr.top - dF.diffY
                    });
                    break;
            }
        });
        window.addEventListener("mouseup", () => {
            if (!this.dragFlag) return;
            switch (this.dragFlag.constructor) {
                case ConnlibConnectionCreateWrapper:
                    (this.dragFlag as ConnlibConnectionCreateWrapper).destroy();
                    break;
                case ConnlibObjectTypeMoveWrapper:
                    (this.dragFlag as ConnlibObjectTypeMoveWrapper).destroy();
                    break;
            }
            this.dragFlag = null;
        });
    }
    /**
     * the method starts a complete path calculation for the passed connector, containing:
     * 
     */
    public static startCompletePathCalculation(connector: ConnlibConnection) {
        if (!connector.source) {
            console.warn("cannot calculate path: undefined source layer!");
            return;
        }
        if (!connector.source.connlibInstance) {
            console.warn("cannot calculate path: undefined source layer's connlib instance!");
            return;
        }
        if (!connector.target) {
            console.warn("cannot calculate path: undefined target layer!");
            return;
        }
        if (!connector.target.connlibInstance) {
            console.warn("cannot calculate path: undefined target layer's connlib instance!");
            return;
        }
        connector.source.validateSize();
        connector.target.validateSize();
        if (!connector.source.middle) connector.source.middle = this.calculateMiddle(connector.source);
        if (!connector.target.middle) connector.target.middle = this.calculateMiddle(connector.target);
        if (connector.source.middle.left == connector.target.middle.left) {
            if (connector.source.bottom > connector.target.top) {
                let e1 = new ConnlibEndpoint();
                e1.left = connector.source.middle.left;
                e1.top = connector.source.bottom;
                e1.direction = ConnlibDirection.BOTTOM;
                e1.source = connector.source;
                let e2 = new ConnlibEndpoint();
                e2.left = connector.target.middle.left;
                e2.top = connector.target.top;
                e2.direction = ConnlibDirection.TOP;
                e2.source = connector.target;

            } else if (connector.source.top < connector.target.bottom) {
                let e1 = new ConnlibEndpoint();
                e1.left = connector.source.middle.left;
                e1.top = connector.source.top;
                e1.direction = ConnlibDirection.TOP;
                e1.source = connector.source;
                let e2 = new ConnlibEndpoint();
                e2.left = connector.target.middle.left;
                e2.top = connector.target.bottom;
                e2.direction = ConnlibDirection.BOTTOM;
                e2.source = connector.target;
            } else {
                console.warn("cannot calculate path: overlaping source and target");
                return;
            }
        } else {
            // HEREEE
            let fun = this.calcFunForTwoPoints(connector.source.middle, connector.target.middle);
            let interSource = this.calculateBoundingIntersections(connector.source, fun);
            let interTarget = this.calculateBoundingIntersections(connector.target, fun);
            if (!this.rootInstance.rendered) this.rootInstance.render();
            let eSource = ConnlibExtensions.getClosestPointToRefPoint(interSource, connector.target.middle).p as ConnlibEndpoint;
            var source = new ConnlibEndpoint();
            switch (eSource.direction) {
                case ConnlibDirection.TOP:
                case ConnlibDirection.BOTTOM:
                    source.left = Connlib.roundValueToScale(eSource.left) + connector.connlibInstance.layer.left;
                    source.top = eSource.top + connector.connlibInstance.layer.top;
                    break;
                case ConnlibDirection.LEFT:
                case ConnlibDirection.RIGHT:
                    source.left = eSource.left + connector.connlibInstance.layer.left;
                    source.top = Connlib.roundValueToScale(eSource.top) + connector.connlibInstance.layer.top;
                    break;
            }
            source.connector = connector;
            source.source = connector.source;
            source.direction = eSource.direction;
            source.setUp(this.rootInstance);
            this.rootInstance.registerEndpoint(source);
            let eTarget = ConnlibExtensions.getClosestPointToRefPoint(interTarget, connector.source.middle).p as ConnlibEndpoint;
            var target = new ConnlibEndpoint();
            switch (eTarget.direction) {
                case ConnlibDirection.TOP:
                case ConnlibDirection.BOTTOM:
                    target.left = Connlib.roundValueToScale(eTarget.left) + connector.connlibInstance.layer.left;
                    target.top = eTarget.top + connector.connlibInstance.layer.top;
                    break;
                case ConnlibDirection.LEFT:
                case ConnlibDirection.RIGHT:
                    target.left = eTarget.left + connector.connlibInstance.layer.left;
                    target.top = Connlib.roundValueToScale(eTarget.top) + connector.connlibInstance.layer.top;
                    break;
            }
            target.connector = connector;
            target.source = connector.target;
            target.direction = eTarget.direction;
            target.setUp(this.rootInstance);
            this.rootInstance.registerEndpoint(target);
            let sourceCell = this.rootInstance.getGridCellForRawEndpoint(this.getEndpointConnectionPoint(source));
            let targetCell = this.rootInstance.getGridCellForRawEndpoint(this.getEndpointConnectionPoint(target));
            let pathPoints = ConnlibExtensions.IDAStar(this.rootInstance, sourceCell, targetCell, source.direction);
            connector.onHideObservable.subscribe(() => source.hide());
            connector.onShowObservable.subscribe(() => source.show());
            connector.onHideObservable.subscribe(() => target.hide());
            connector.onShowObservable.subscribe(() => target.show());
            connector.updatePathPoints(this.cellsArrayToPathPointArray(pathPoints), source, target);
        }
    }

    // static observables afterwards
    public static scaleChangeObservable: Subject<number> = new Subject();
    public static standaloneSetupObservable: Subject<any> = new Subject();
    public static viewPointChangeObservable: Subject<any> = new Subject();
    public static zoomChangeObservable: Subject<number> = new Subject();
}
/**
 * the class provides all the neccessary functionality needed for the library
 */
class ConnlibExtensions {
    /**
     * the method returns the element's cumultative offset
     * @param {*} element 
     */
    static cumulativeOffset(element: HTMLElement) {
        var top = 0, left = 0;
        var last = element;
        do {
            if (element.tagName == "svg") {
                top += parseFloat(element.style.top) || 0;
                left += parseFloat(element.style.left) || 0;
                last = element;
                element = element.parentElement;
            } else {
                top += element.offsetTop || 0;
                left += element.offsetLeft || 0;
                last = element;
                element = element.parentElement;
            }
        } while (element);
        return {
            top: top,
            left: left
        };
    };
    /**
     * the method calculates the euclydean distance between two points
     * @param {*} p1 
     * @param {*} p2 
     */
    static eukDist(p1: ConnlibPoint, p2: ConnlibPoint) {
        return Math.sqrt(Math.pow(p1.left - p2.left, 2) + Math.pow(p1.top - p2.top, 2))
    }
    /**
     * the method returns the closest point (eukDist) to a ref point
     */
    static getClosestPointToRefPoint(basis: ConnlibPoint[], ref: ConnlibPoint) {
        return (basis.map(x => {
            return {
                dist: this.eukDist(x, ref),
                p: x
            }
        })).sort((a, b) => {
            if (a.dist > b.dist) return 1;
            else if (a.dist < b.dist) return -1;
            return 0;
        })[0];
    }
    /**
     * the algorithm calculates the given connections path and renders the lines immediately
     * @param {*} connection 
     * @param {*} source 
     * @param {*} target 
     * @param {*} direction start direction
     */
    static IDAStar(connlibInstance: ConnlibInstance, e1: ConnlibGridCell, e2: ConnlibGridCell, direction: number): ConnlibOutputGridCell[] {
        let source: ConnlibGridCell = e1;
        let target: ConnlibGridCell = e2;
        var costs = {};
        var stack: any = {};
        var threshold = this.manhattanDistance(source, target);
        stack[threshold.toString()] = {};
        stack[threshold.toString()][source.r] = source;
        var found = false;
        let max = 10000;
        var i = 0;
        var s: ConnlibIDAStarTempData = new ConnlibIDAStarTempData();
        s.c = source.c;
        s.r = source.r;
        s.w = source.w;
        s.d = direction;
        s.p = 1;
        s.a = [];
        while (!found) {
            if (i == max) {
                console.log(stack, connlibInstance, e1, e2, direction);
                throw ("maximum number of loops reached!");
            }
            let frontier = this.surroundingManhattanMinimumCells(connlibInstance, s, target);
            var next = null;
            for (let c of frontier) {
                if (!stack[c.d.toString()]) stack[c.d.toString()] = {};
                if (!stack[c.d.toString()][c.o.r.toString()]) {
                    stack[c.d.toString()][c.o.r.toString()] = c.o;
                } else continue;
                if (c.d < threshold) {
                    threshold = c.d;
                }
                if (c.o.r == target.r && c.o.c == target.c) {
                    found = true;
                    stack[c.d.toString()][c.o.r.toString()].seq = i + 1;
                    this.updateCostsAndGetAnchestors(costs, s);
                    let path = this.updateCostsAndGetAnchestors(costs, target);
                    let breakPoints: ConnlibOutputGridCell[] = [];
                    var lastCell: ConnlibAlgorithmGridCell = null;
                    for (let pI in path) {
                        if (path[pI].c == source.c && path[pI].r == source.r) {
                            breakPoints.push({
                                c: source.c,
                                r: source.r,
                                w: source.w,
                                isSource: true,
                                isTarget: false
                            });
                        } else if (parseInt(pI) == 0) {
                            let cell = path[(parseInt(pI)).toString()];
                            breakPoints.push({
                                c: cell.c,
                                r: cell.r,
                                w: cell.w,
                                isSource: false,
                                isTarget: false
                            });
                        } else {
                            if (path[(parseInt(pI) - 1).toString()].d != path[pI].d) {
                                let cell = path[(parseInt(pI) - 1).toString()];
                                breakPoints.push({
                                    c: cell.c,
                                    r: cell.r,
                                    w: cell.w,
                                    isSource: false,
                                    isTarget: false
                                });
                            }
                        }
                        lastCell = path[(parseInt(pI)).toString()];
                    }
                    if (lastCell) {
                        if (lastCell.d == ConnlibDirection.TOP && ((target.r != (lastCell.r - Connlib.connlibGridScale)) || (target.c != lastCell.c))) breakPoints.push({
                            c: lastCell.c,
                            r: lastCell.r,
                            w: lastCell.w,
                            isSource: false,
                            isTarget: false
                        });
                        else if (lastCell.d == ConnlibDirection.RIGHT && ((target.r != lastCell.r) || (target.c != (lastCell.c + Connlib.connlibGridScale)))) breakPoints.push({
                            c: lastCell.c,
                            r: lastCell.r,
                            w: lastCell.w,
                            isSource: false,
                            isTarget: false
                        });
                        else if (lastCell.d == ConnlibDirection.BOTTOM && ((target.r != (lastCell.r + Connlib.connlibGridScale)) || (target.c != lastCell.c))) breakPoints.push({
                            c: lastCell.c,
                            r: lastCell.r,
                            w: lastCell.w,
                            isSource: false,
                            isTarget: false
                        });
                        else if (lastCell.d == ConnlibDirection.LEFT && ((target.r != lastCell.r) || (target.c != (lastCell.c - Connlib.connlibGridScale)))) breakPoints.push({
                            c: lastCell.c,
                            r: lastCell.r,
                            w: lastCell.w,
                            isSource: false,
                            isTarget: false
                        });
                    }
                    breakPoints.push({
                        c: target.c,
                        r: target.r,
                        w: target.w,
                        isSource: false,
                        isTarget: true
                    });
                    return breakPoints;
                }
                if (c.d == threshold && c.o.d == direction) {
                    if (s.r == c.o.r && s.c == c.o.c) {
                        console.log(frontier);
                        throw ("endless loop!");
                    }
                    next = c.o;
                }
            }

            if (found) continue;

            var i2 = 0;
            while (next == null) {
                if (i2 > max) {
                    console.log(threshold, connlibInstance, e1, e2, direction, s);
                    throw ("infinity loop");
                }
                for (let i in stack[threshold.toString()]) {
                    if (stack[threshold.toString()][i].p != 1) {
                        next = stack[threshold.toString()][i];
                        break;
                    }
                }
                if (next == null) {
                    threshold++;
                }
                i2++;
            }
            next.a = this.updateCostsAndGetAnchestors(costs, s);
            s = next;
            if (!s) {
                console.log(stack);
                throw ("error: cannot find next node!");
            }
            s.p = 1;
            s.seq = i;
            i++;
        }
    }
    /**
     * the method returns whether the given two lines (in sequence) are clockwise
     * attention! line1.target must be line2.source
     */
    static isClockwise(line1: ConnlibLine, line2: ConnlibLine): boolean {
        if (line1._target.left != line2._source.left || line1._target.top != line2._source.top) {
            console.warn("cannot calculate clockwise characeristics: target line 1 != source line 2");
            return null;
        }
        let sum = ((line1._target.left - line1._source.left) * (line1._target.top + line1._target.top)) + ((line2._target.left - line2._source.left) * (line2._target.top + line2._source.top)) + ((line1._source.left - line2._target.left) * (line1._source.top + line2._target.top));
        if (sum < 0) return true;
        return false;
    }
    /**
     * the method returns the manhattan distance between the two points
     * @param {*} p1 first point
     * @param {*} p2 second point
     */
    static manhattanDistance(cell1: ConnlibGridCell, cell2: ConnlibGridCell) {
        return Math.abs(cell1.r - cell2.r) + Math.abs(cell1.c - cell2.c);
    }
    /**
     * the method returns the element's offset rectangle
     * @param {*} element 
     */
    static offsetRect(element: HTMLElement) {
        return {
            top: element.offsetTop,
            left: element.offsetLeft,
            height: element.offsetHeight,
            width: element.offsetWidth,
            right: element.offsetLeft + element.offsetWidth,
            bottom: element.offsetTop + element.offsetHeight
        };
    }
    /**
     * the method returns a grid cells surrounding cells with the lowest manhatten distance to the target
     * @param {*} source centered cell
     * @param {*} target connection's target for manhattan distance
     */
    static surroundingManhattanMinimumCells(connlibInstance: ConnlibInstance, source: ConnlibGridCell, target: ConnlibGridCell) {
        let s = this.surroundingCellsNoDiag(connlibInstance, source);
        return s.map(x => {
            return { "d": this.manhattanDistance(x, target), "o": x }
        });
    }
    /**
     * the method returns all grid cells that sourrounds the centered cell
     * the result contains a direction
     * @param {*} cell center
     */
    static surroundingCellsNoDiag(connlibInstance: ConnlibInstance, cell: ConnlibGridCell): ConnlibAlgorithmGridCell[] {
        var o: ConnlibAlgorithmGridCell[] = [];
        let grid = connlibInstance.internalGrid.cells;
        var c;
        if (grid[cell.r - Connlib.connlibGridScale] && grid[cell.r - Connlib.connlibGridScale][cell.c] && grid[cell.r - Connlib.connlibGridScale][cell.c].w == 1) {
            c = grid[cell.r - Connlib.connlibGridScale][cell.c];
            o.push({ "c": c.c, "r": c.r, "d": ConnlibDirection.TOP, "w": c.w });
        }
        if (grid[cell.r] && grid[cell.r][cell.c + Connlib.connlibGridScale] && grid[cell.r][cell.c + Connlib.connlibGridScale].w == 1) {
            c = grid[cell.r][cell.c + Connlib.connlibGridScale];
            o.push({ "c": c.c, "r": c.r, "d": ConnlibDirection.RIGHT, "w": c.w });
        }
        if (grid[cell.r + Connlib.connlibGridScale] && grid[cell.r + Connlib.connlibGridScale][cell.c] && grid[cell.r + Connlib.connlibGridScale][cell.c].w == 1) {
            c = grid[cell.r + Connlib.connlibGridScale][cell.c];
            o.push({ "c": c.c, "r": c.r, "d": ConnlibDirection.BOTTOM, "w": c.w });
        }
        if (grid[cell.r] && grid[cell.r][cell.c - Connlib.connlibGridScale] && grid[cell.r][cell.c - Connlib.connlibGridScale].w == 1) {
            c = grid[cell.r][cell.c - Connlib.connlibGridScale];
            o.push({ "c": c.c, "r": c.r, "d": ConnlibDirection.LEFT, "w": c.w });
        }
        return o;
    }
    /**
     * the method calculates the costs for the anchestors
     * @param {*} costs 
     * @param {*} currentNode 
     */
    static updateCostsAndGetAnchestors(costs: any, currentNode: any) {
        var cost = Infinity;
        var a: any = null;
        if (costs[(currentNode.r - Connlib.connlibGridScale).toString()] && costs[(currentNode.r - Connlib.connlibGridScale).toString()][currentNode.c.toString()]) {
            let oD = costs[(currentNode.r - Connlib.connlibGridScale).toString()][currentNode.c.toString()].d;
            if (oD == currentNode.d) {
                if (costs[(currentNode.r - Connlib.connlibGridScale).toString()][currentNode.c.toString()].cost < cost) {
                    cost = costs[(currentNode.r - Connlib.connlibGridScale).toString()][currentNode.c.toString()].cost;
                    a = [...costs[(currentNode.r - Connlib.connlibGridScale).toString()][currentNode.c.toString()].a, { r: currentNode.r - Connlib.connlibGridScale, c: currentNode.c, d: oD }];
                }
            } else {
                if ((costs[(currentNode.r - Connlib.connlibGridScale).toString()][currentNode.c.toString()].cost + 1) < cost) {
                    cost = costs[(currentNode.r - Connlib.connlibGridScale).toString()][currentNode.c.toString()].cost + 1;
                    a = [...costs[(currentNode.r - Connlib.connlibGridScale).toString()][currentNode.c.toString()].a, { r: currentNode.r - Connlib.connlibGridScale, c: currentNode.c, d: oD }];
                }
            }
        }
        if (costs[currentNode.r.toString()] && costs[currentNode.r.toString()][(currentNode.c + Connlib.connlibGridScale).toString()]) {
            let oD = costs[currentNode.r.toString()][(currentNode.c + Connlib.connlibGridScale).toString()].d;
            if (oD == currentNode.d) {
                if (costs[currentNode.r.toString()][(currentNode.c + Connlib.connlibGridScale).toString()].cost < cost) {
                    cost = costs[currentNode.r.toString()][(currentNode.c + Connlib.connlibGridScale).toString()].cost;
                    a = [...costs[currentNode.r.toString()][(currentNode.c + Connlib.connlibGridScale).toString()].a, { r: currentNode.r, c: currentNode.c + Connlib.connlibGridScale, d: oD }];
                }
            } else {
                if ((costs[currentNode.r.toString()][(currentNode.c + Connlib.connlibGridScale).toString()].cost + 1) < cost) {
                    cost = costs[currentNode.r.toString()][(currentNode.c + Connlib.connlibGridScale).toString()].cost;
                    a = [...costs[currentNode.r.toString()][(currentNode.c + Connlib.connlibGridScale).toString()].a, { r: currentNode.r, c: currentNode.c + Connlib.connlibGridScale, d: oD }];
                }
            }
        }
        if (costs[(currentNode.r + Connlib.connlibGridScale).toString()] && costs[(currentNode.r + Connlib.connlibGridScale).toString()][currentNode.c.toString()]) {
            let oD = costs[(currentNode.r + Connlib.connlibGridScale).toString()][currentNode.c.toString()].d;
            if (oD == currentNode.d) {
                if (costs[(currentNode.r + Connlib.connlibGridScale).toString()][currentNode.c.toString()].cost < cost) {
                    cost = costs[(currentNode.r + Connlib.connlibGridScale).toString()][currentNode.c.toString()].cost;
                    a = [...costs[(currentNode.r + Connlib.connlibGridScale).toString()][currentNode.c.toString()].a, { r: currentNode.r + Connlib.connlibGridScale, c: currentNode.c, d: oD }];
                }
            } else {
                if ((costs[(currentNode.r + Connlib.connlibGridScale).toString()][currentNode.c.toString()].cost + 1) < cost) {
                    cost = costs[(currentNode.r + Connlib.connlibGridScale).toString()][currentNode.c.toString()].cost;
                    a = [...costs[(currentNode.r + Connlib.connlibGridScale).toString()][currentNode.c.toString()].a, { r: currentNode.r + Connlib.connlibGridScale, c: currentNode.c, d: oD }];
                }
            }
        }
        if (costs[currentNode.r.toString()] && costs[currentNode.r.toString()][(currentNode.c - Connlib.connlibGridScale).toString()]) {
            let oD = costs[currentNode.r.toString()][(currentNode.c - Connlib.connlibGridScale).toString()].d;
            if (oD == currentNode.d) {
                if (costs[currentNode.r.toString()][(currentNode.c - Connlib.connlibGridScale).toString()].cost < cost) {
                    cost = costs[currentNode.r.toString()][(currentNode.c - Connlib.connlibGridScale).toString()].cost;
                    a = [...costs[currentNode.r.toString()][(currentNode.c - Connlib.connlibGridScale).toString()].a, { r: currentNode.r, c: currentNode.c - Connlib.connlibGridScale, d: oD }];
                }
            } else {
                if ((costs[currentNode.r.toString()][(currentNode.c - Connlib.connlibGridScale).toString()].cost + 1) < cost) {
                    cost = costs[currentNode.r.toString()][(currentNode.c - Connlib.connlibGridScale).toString()].cost;
                    a = costs[currentNode.r.toString()][(currentNode.c - Connlib.connlibGridScale).toString()].a;
                    a = [...costs[currentNode.r.toString()][(currentNode.c - Connlib.connlibGridScale).toString()].a, { r: currentNode.r, c: currentNode.c - Connlib.connlibGridScale, d: oD }];
                }
            }
        }
        if (cost == Infinity) cost = 0;
        if (a == null) a = [];
        else a
        if (!costs[currentNode.r.toString()]) costs[currentNode.r.toString()] = {};
        costs[currentNode.r.toString()][currentNode.c.toString()] = { cost: cost, a: a, d: currentNode.d };
        return a;
    }
}
/**
 * the internal connlib instance's grid
 */
class ConnlibGrid {
    width: number;
    height: number;
    cells: any;
    constructor(width: number, height: number) {
        this.cells = {};
        this.width = width;
        this.height = height;
        for (var r = 0; r < height; r += Connlib.connlibGridScale) {
            this.cells[r] = {};
            for (var c = 0; c < width; c += Connlib.connlibGridScale) {
                this.cells[r][c] = { "r": r, "c": c, "w": 1 } as ConnlibGridCell;
            }
        }
    }
}
/**
 * a grid cell
 */
class ConnlibGridCell {
    r: number;
    c: number;
    w: number;
}
/**
 * a output grid cell
 */
class ConnlibOutputGridCell extends ConnlibGridCell {
    isSource: boolean = false;
    isTarget: boolean = false;
}
/**
 * a internal grid cell storing additionally a cells direction relative to the previous cell
 */
class ConnlibAlgorithmGridCell extends ConnlibGridCell {
    d: number;
}
/**
 * the class contains the temporary data of the IDA star algorithm
 */
class ConnlibIDAStarTempData {
    r: number;
    c: number;
    w: number;
    d: number;
    p: number;
    seq: number;
    a: [];
}
/**
 * a connlib line represents a linear path segment defined by a source and a target
 */
class ConnlibLine implements ConnlibDragFlagInterface {

    guid: string = Guid.newGuid();

    connection: ConnlibConnection;
    connlibInstance: ConnlibInstance;

    _source: ConnlibPathPoint;
    _target: ConnlibPathPoint;
    _connectionIndex: number = 0;

    soureSubscription: Subscription;
    targetSubscription: Subscription;

    orientation: number;
    direction: number;

    length: number;

    zeroLengthObservable: Subject<ConnlibLine> = new Subject();

    get sL(): number {
        return this._source.left;
    }
    get sT(): number {
        return this._source.top;
    }
    get tL(): number {
        return this._target.left;
    }
    get tT(): number {
        return this._target.top;
    }

    /**
     * the method destroys the line and removes it from all its referenced lists
     */
    destroy() {
        if (this.connection) {
            if (!this.connection.removeLine(this)) throw ("cannot remove the line from the referenced connection");
            else this.connection = null;
        } else {
            throw ("cannot destory the line: no connection referenced!");
        }
        if (this.connlibInstance) {
            if (!this.connlibInstance.removeLine(this)) throw ("cannot remove the line from the referenced connlib instance");
            else this.connection = null;
        } else {
            throw ("cannot destory the line: no connlib instance referenced!");
        }
        if (this.soureSubscription) this.soureSubscription.unsubscribe();
        if (this.targetSubscription) this.targetSubscription.unsubscribe();
    }
    /**
     * the method returns the line's JSX representation
     */
    JSXComponent(className: string) {
        return (
            <line data-index={this._connectionIndex} x1={this.sL} y1={this.sT} x2={this.tL} y2={this.tT} className={className} onMouseDown={() => this.onMouseDown()} />
        );
    }
    /**
     * the method is triggered if a user is clicking on the particular line
     */
    onMouseDown() {
        Connlib.dragFlag = this;
    }
    /**
     * the method sets the line's source and target (+orientation +direction)
     * @param source 
     * @param target 
     */
    setSourceAndTarget(source: ConnlibPathPoint, target: ConnlibPathPoint) {
        this._setSource(source);
        this._setTarget(target);
        this.length = ConnlibExtensions.eukDist(this._source, this._target);
        if (this._source.left == this._target.left) {
            this.orientation = ConnlibOrientation.VERTICAL;
            if (this.sT > this.tT) this.direction = ConnlibDirection.TOP;
            else this.direction = ConnlibDirection.BOTTOM;
        } else if (this._source.top == this._target.top) {
            this.orientation = ConnlibOrientation.HORIZONTAL;
            if (this.sL > this.tL) this.direction = ConnlibDirection.LEFT;
            else this.direction = ConnlibDirection.RIGHT;
        } else {
            this.orientation = ConnlibOrientation.LOPSIDED;
            this.direction = null;
            console.warn("this line seems to be lopsided ...");
        };
    }

    private _setSource(point: ConnlibPathPoint) {
        if (!point.isSettedUp) throw ("point is not setted up!");
        if (this.soureSubscription) {
            this.soureSubscription.unsubscribe();
            this._source = null;
        }
        this._source = point;
        this.soureSubscription = this._source.positionChangeObservable.subscribe((event: ConnlibPositionChangeEvent) => {
            if (event.participants.indexOf(this) > -1) return;
            event.participants.push(this);
            if (this.orientation != event.movementOrientation) {
                this._target.cascadingUpdate(event);
            }
            this.length = ConnlibExtensions.eukDist(this._source, this._target);
            if (this.length < 3) this.zeroLengthObservable.next(this);
        });
    }

    private _setTarget(point: ConnlibPathPoint) {
        if (!point.isSettedUp) throw ("point is not setted up!");
        if (this.targetSubscription) {
            this.targetSubscription.unsubscribe();
            this._target = null;
        }
        this._target = point;
        this.targetSubscription = this._target.positionChangeObservable.subscribe((event: ConnlibPositionChangeEvent) => {
            if (event.participants.indexOf(this) > -1) return;
            event.participants.push(this);
            if (this.orientation != event.movementOrientation) {
                this._source.cascadingUpdate(event);
            }
            this.length = ConnlibExtensions.eukDist(this._source, this._target);
            if (this.length < 1) this.zeroLengthObservable.next(this);
        });
    }
    updateLeft(left: number) {
        let event = new ConnlibPositionChangeEvent();
        event.origin = this;
        event.participants.push(this);
        event.movementOrientation = ConnlibOrientation.HORIZONTAL;
        event.diffX = left - this.sL;
        this._source.cascadingUpdate(event);
        event.diffX = left - this.tL;
        this._target.cascadingUpdate(event);
        this.connection.validate();
    }
    updateTop(top: number) {
        let event = new ConnlibPositionChangeEvent();
        event.origin = this;
        event.participants.push(this);
        event.movementOrientation = ConnlibOrientation.VERTICAL;
        event.diffY = top - this.sT;
        this._source.cascadingUpdate(event);
        event.diffY = top - this.tT;
        this._target.cascadingUpdate(event);
        this.connection.validate();
    }
}
/**
 * the class contains a connlib position change event
 */
class ConnlibPositionChangeEvent {
    guid = Guid.newGuid();
    movementOrientation: number;
    diffX: number;
    diffY: number;
    participants: any[] = [];
    origin: ConnlibDragFlagInterface = null;
}
/**
 * an element's orientation
 */
const ConnlibOrientation = {
    "HORIZONTAL": 0,
    "VERTICAL": 1,
    "LOPSIDED": 2
}
/**
 * a connlib connection
 */
export class ConnlibConnection {
    guid: string = Guid.newGuid();
    source: ConnlibLayerData;
    target: ConnlibLayerData;
    _pathPoints: ConnlibPathPoint[] = [];
    private _lines: { [key: string]: ConnlibLine } = {};
    rendered: boolean = false;
    componentRef: ConnlibConnectionComponent;
    connlibInstance: ConnlibInstance;
    static lineStyle: ConnlibLineStyle;
    static sourceEndpointType: ConnlibEndpointInterface;
    realSource: ConnlibEndpoint; // source endpoint!
    sourcePoint: ConnlibPathPoint; // source connection point
    static targetEndpointType: ConnlibEndpointInterface;
    toEmbedded: boolean = false;
    realTarget: ConnlibEndpoint; // target endpoint!
    targetPoint: ConnlibPathPoint; // target connection point
    realSourceSubscription: Subscription;
    sourcePointSubscription: Subscription;
    sourceSideChangeSubscription: Subscription;
    realTargetSubscription: Subscription;
    targetPointSubscription: Subscription;
    targetSideChangeSubscription: Subscription;
    onHideObservable: Subject<any> = new Subject();
    onShowObservable: Subject<any> = new Subject();
    hidden: boolean = false;
    /**
     * the method destroys the connector's source and target endpoint
     */
    destroyEndpoints() {
        if (this.realSource) this.realSource.destroy();
        this.realSource = null;
        this.sourcePoint = null;
        if (this.sourcePointSubscription) this.sourcePointSubscription.unsubscribe();
        this.sourcePointSubscription = null;
        if (this.sourceSideChangeSubscription) this.sourceSideChangeSubscription.unsubscribe();
        this.sourceSideChangeSubscription = null;
        if (this.realSourceSubscription) this.realSourceSubscription.unsubscribe();
        this.realSourceSubscription = null;
        if (this.realTarget) this.realTarget.destroy();
        this.realTarget = null;
        this.targetPoint = null;
        if (this.targetPointSubscription) this.targetPointSubscription.unsubscribe();
        this.targetPointSubscription = null;
        if (this.targetSideChangeSubscription) this.targetSideChangeSubscription.unsubscribe();
        this.targetSideChangeSubscription = null;
        if (this.realTargetSubscription) this.realTargetSubscription.unsubscribe();
        this.realTargetSubscription = null;
    }
    /**
     * the method hides the connector
     */
    hide() {
        this.hidden = true;
        this.validate();
        this.onHideObservable.next();
    }
    /**
     * the method returns whether a passed endpoint is the connector's source
     */
    isSourceEndpoint(endPoint: ConnlibEndpoint) {
        return this.realSource == endPoint;
    }
    /**
     * the method returns whether a passed endpoint is the connector's target
     */
    isTargetEndpoint(endPoint: ConnlibEndpoint) {
        return this.realTarget == endPoint;
    }
    /**
     * the method checks whether a given line has a length of zero
     */
    lineHasZeroLength(line: ConnlibLine) {
        let lines = Object.keys(this._lines).map(key => this._lines[key]);
        if (lines.length < 2) throw ("not implemented now ...");
        var source: ConnlibPathPoint;
        let prev;
        let next;
        if (line._source == this.sourcePoint) source = this.sourcePoint;
        else {
            prev = lines.find(x => x._target == line._source);
            source = prev._source;
            this.removePathPoint(prev._target);
        }
        var target: ConnlibPathPoint;
        if (line._target == this.targetPoint) target = this.targetPoint;
        else {
            next = lines.find(x => x._source == line._target);
            target = next._target;
            this.removePathPoint(next._source);
        }
        let event = new ConnlibPositionChangeEvent();
        event.origin = this;
        event.participants.push(line);
        event.participants.push(target);
        event.movementOrientation = line.orientation;
        switch (event.movementOrientation) {
            case ConnlibOrientation.HORIZONTAL:
                event.diffX = target.left - source.left;
                break;
            case ConnlibOrientation.VERTICAL:
                event.diffY = target.top - source.top;
                break;
        }
        source.cascadingUpdate(event);
        let l = this.setUpNewLine(source, target);
        if (Connlib.dragFlag && (Connlib.dragFlag == line) || (Connlib.dragFlag == prev) || (Connlib.dragFlag == next)) Connlib.dragFlag = l;
        line.destroy();
        if (prev) prev.destroy();
        if (next) next.destroy();
        this.validate();
    }
    /**
     * this method is only used within lines (a line is destroyed and ensures that the "snapped" pathpoint is not longer existent)
     * @param point 
     */
    removePathPoint(point: ConnlibPathPoint) {
        let i = this._pathPoints.indexOf(point);
        if (i > -1) this._pathPoints.splice(i, 1);
        else {
            console.warn("this point is not part of the connector");
        }
    }
    /**
     * the method removes a line from the current connector
     * @param line 
     */
    removeLine(line: ConnlibLine): boolean {
        if (this._lines[line.guid]) {
            delete this._lines[line.guid];
            return true;
        }
        return false;
    }
    /**
     * 
     * @param source 
     * @param target 
     */
    setUpNewLine(source: ConnlibPathPoint, target: ConnlibPathPoint): ConnlibLine {
        let l = new ConnlibLine();
        l.connection = this;
        l.connlibInstance = this.connlibInstance;
        l.setSourceAndTarget(source, target);
        this._lines[l.guid] = l;
        this.connlibInstance.registerLine(l);
        l.zeroLengthObservable.subscribe((line: ConnlibLine) => this.lineHasZeroLength(line));
        return l;
    }
    /**
     * the method shows the current connector (if it is hidden)
     */
    show() {
        this.hidden = false;
        this.validate();
        this.onShowObservable.next();
    }
    /**
     * the method updates the connector's path
     * @param points path points
     * @param realSource real source (ConnlibEndpoint)
     * @param realTarget real target (ConnlibEndpoint)
     */
    updatePathPoints(points: ConnlibPathPoint[], realSource: ConnlibEndpoint, realTarget: ConnlibEndpoint) {
        if (points.length < 2) {
            console.warn("path is invalid: no path points found - started path auto calculation");
            Connlib.startCompletePathCalculation(this);
        } else {
            while (Object.keys(this._lines).length > 0) {
                this._lines[Object.keys(this._lines)[0]].destroy();
            }
            this._pathPoints = points;
            this.realSource = realSource;
            this.realTarget = realTarget;
            var lastLine: ConnlibLine = null;
            for (var i = 1; i < points.length; i++) {
                if (i == 1) {
                    this.sourcePoint = points[i - 1];
                    this.sourcePoint.createLineDirections.push(realSource.direction);
                    switch (realSource.direction) {
                        case ConnlibDirection.TOP:
                        case ConnlibDirection.BOTTOM:
                            this.sourcePoint.canMoveX = true;
                            this.sourcePoint.canMoveY = false;
                            break;
                        case ConnlibDirection.RIGHT:
                        case ConnlibDirection.LEFT:
                            this.sourcePoint.canMoveX = false;
                            this.sourcePoint.canMoveY = true;
                            break;
                    }
                }
                if (i == (points.length - 1)) {
                    this.targetPoint = points[i];
                    this.targetPoint.createLineDirections.push(realTarget.direction);
                    switch (realTarget.direction) {
                        case ConnlibDirection.TOP:
                        case ConnlibDirection.BOTTOM:
                            this.targetPoint.canMoveX = true;
                            this.targetPoint.canMoveY = false;
                            break;
                        case ConnlibDirection.RIGHT:
                        case ConnlibDirection.LEFT:
                            this.targetPoint.canMoveX = false;
                            this.targetPoint.canMoveY = true;
                            break;
                    }
                }
                let currLine = this.setUpNewLine(points[i - 1], points[i]);
                if (lastLine && lastLine.direction == currLine.direction) {
                    delete this._lines[lastLine.guid];
                    delete this._lines[currLine.guid];
                    this.setUpNewLine(lastLine._source, currLine._target);
                }
                if (lastLine) currLine._connectionIndex = lastLine._connectionIndex + 1;
                lastLine = currLine;
            }
            if (this.realSourceSubscription) this.realSourceSubscription.unsubscribe();
            if (this.sourceSideChangeSubscription) this.sourceSideChangeSubscription.unsubscribe();
            if (this.sourcePointSubscription) this.sourcePointSubscription.unsubscribe();
            this.realSourceSubscription = realSource.positionChangeObservable.subscribe((event: ConnlibPositionChangeEvent) => {
                this.sourcePoint.cascadingUpdate(event);
                this.validate();
            });
            // the endpoint is already moved!
            this.sourceSideChangeSubscription = realSource.sourceSideChangeObservable.subscribe((data: ConnlibEndpointSideChangeData) => {
                let sourceCell = this.connlibInstance.getGridCellForRawEndpoint(Connlib.getEndpointConnectionPoint(data.updatedEndpoint));
                let targetCell = this.connlibInstance.getGridCellForRawEndpoint(Connlib.getEndpointConnectionPoint(this.realTarget));
                let pathPoints = ConnlibExtensions.IDAStar(this.connlibInstance, sourceCell, targetCell, data.updatedEndpoint.direction);
                this.updatePathPoints(Connlib.cellsArrayToPathPointArray(pathPoints), data.updatedEndpoint, this.realTarget);
                this.validate();
            });
            this.sourcePointSubscription = this.sourcePoint.positionChangeObservable.subscribe((event: ConnlibPositionChangeEvent) => {
                if (
                    (event.movementOrientation == ConnlibOrientation.HORIZONTAL && (this.realSource.direction == ConnlibDirection.TOP || this.realSource.direction == ConnlibDirection.BOTTOM)) ||
                    (event.movementOrientation == ConnlibOrientation.VERTICAL && (this.realSource.direction == ConnlibDirection.LEFT || this.realSource.direction == ConnlibDirection.RIGHT))
                ) {
                    // end of cascade starting at the target
                    this.realSource.cascadingUpdate(event);
                    this.validate();
                } else {
                    console.log("event reached endpoint, but missing handler for combination: ", event, this.realSource);
                }
            });
            if (this.realTargetSubscription) this.realTargetSubscription.unsubscribe();
            if (this.targetSideChangeSubscription) this.targetSideChangeSubscription.unsubscribe();
            if (this.targetPointSubscription) this.targetPointSubscription.unsubscribe();
            this.realTargetSubscription = realTarget.positionChangeObservable.subscribe((event: ConnlibPositionChangeEvent) => {
                this.targetPoint.cascadingUpdate(event);
                this.validate();
            });
            this.targetSideChangeSubscription = realTarget.sourceSideChangeObservable.subscribe((data: ConnlibEndpointSideChangeData) => {
                let sourceCell = this.connlibInstance.getGridCellForRawEndpoint(Connlib.getEndpointConnectionPoint(this.realSource));
                let targetCell = this.connlibInstance.getGridCellForRawEndpoint(Connlib.getEndpointConnectionPoint(data.updatedEndpoint));
                let pathPoints = ConnlibExtensions.IDAStar(this.connlibInstance, sourceCell, targetCell, data.updatedEndpoint.direction);
                this.updatePathPoints(Connlib.cellsArrayToPathPointArray(pathPoints), data.updatedEndpoint, this.realTarget);
                this.validate();
            });
            this.targetPointSubscription = this.targetPoint.positionChangeObservable.subscribe((event: ConnlibPositionChangeEvent) => {
                if (
                    (event.movementOrientation == ConnlibOrientation.HORIZONTAL && (this.realTarget.direction == ConnlibDirection.TOP || this.realTarget.direction == ConnlibDirection.BOTTOM)) ||
                    (event.movementOrientation == ConnlibOrientation.VERTICAL && (this.realTarget.direction == ConnlibDirection.LEFT || this.realTarget.direction == ConnlibDirection.RIGHT))
                ) {
                    // end of cascade starting at the target
                    this.realTarget.cascadingUpdate(event);
                    this.validate();
                } else {
                    console.log("event reached endpoint, but missing handler for combination: ", event, this.realTarget);
                }
            });
        }
    }
    /**
     * the method revalidates the endpoint's react dom view
     */
    validate() {
        if (this._pathPoints.length < 2) return;
        let lineStyle = new ConnlibDefaultLineStyle();
        if ((this.constructor as any).lineStyle) lineStyle = (this.constructor as any).lineStyle;
        this.componentRef.setState({
            lines: Object.keys(this._lines).map(key => this._lines[key]),
            realSource: this.realSource,
            realTarget: this.realTarget,
            sourcePoint: this.sourcePoint,
            targetPoint: this.targetPoint,
            hidden: this.hidden,
            lineStyle: lineStyle,
            doubleClick: () => {
                console.log(this);
            }
        });
    }
}
/**
 * a connlib connection's react component
 */
class ConnlibConnectionComponent extends React.Component {
    ref: React.RefObject<SVGSVGElement> = React.createRef();
    /**
     * the method enables user's to (hard) clear the svg
     */
    clear() {
        while (this.ref.current.lastChild) {
            this.ref.current.removeChild(this.ref.current.lastChild);
        }
    }
    /**
     * the method creates the path string if no radius is setted
     * @param start 
     * @param lines 
     */
    private pathWithoutR(start: string, lines: ConnlibLine[]): string {
        let max = lines.length;
        var i = 0;
        var d = start;
        for (let line of (this.state as any).lines) {
            if (i == 0) {
                if (max > 2) {
                    d += " L " + (line as ConnlibLine).sL + " " + (line as ConnlibLine).sT + " ARC " + " L " + (line as ConnlibLine).tL + " " + (line as ConnlibLine).tT;
                } else {
                    d += " L " + (line as ConnlibLine).sL + " " + (line as ConnlibLine).sT + " L " + (line as ConnlibLine).tL + " " + (line as ConnlibLine).tT;
                }
            } else if (i == (max - 1)) {
                d += " L " + (line as ConnlibLine).tL + " " + (line as ConnlibLine).tT;
            } else {

                d += " L " + (line as ConnlibLine).tL + " " + (line as ConnlibLine).tT;
            }
            i++;
        }
        return d;
    }
    /**
     * the method is called on component rendering
     */
    render() {
        if ((this.state as any) && Array.isArray((this.state as any).lines)) {
            if ((this.state as any).hidden) return null;
            let dragOverlays: any[] = [];
            let overlayClass = "connlib-line-overlay";
            let realSource = ((this.state as any).realSource as ConnlibEndpoint).getInstancePosition();
            let realTarget = ((this.state as any).realTarget as ConnlibEndpoint).getInstancePosition();
            let sourcePoint = (this.state as any).sourcePoint as ConnlibPathPoint;
            let targetPoint = (this.state as any).targetPoint as ConnlibPathPoint;
            switch (((this.state as any).realSource as ConnlibEndpoint).direction) {
                case ConnlibDirection.TOP:
                case ConnlibDirection.BOTTOM:
                    if (realSource.left != sourcePoint.left) console.warn("source endpoint is lopsided! (left) " + realSource.left + ", " + sourcePoint.left);
                    break;
                case ConnlibDirection.LEFT:
                case ConnlibDirection.RIGHT:
                    if (realSource.top != sourcePoint.top) console.warn("source endpoint is lopsided! (top) " + realSource.top + ", " + sourcePoint.top);
                    break;
            }
            switch (((this.state as any).realTarget as ConnlibEndpoint).direction) {
                case ConnlibDirection.TOP:
                case ConnlibDirection.BOTTOM:
                    if (realTarget.left != targetPoint.left) console.warn("target endpoint is lopsided! (left) " + realTarget.left + ", " + targetPoint.left);
                    break;
                case ConnlibDirection.LEFT:
                case ConnlibDirection.RIGHT:
                    if (realTarget.top != targetPoint.top) console.warn("target endpoint is lopsided! (top) " + realTarget.top + ", " + targetPoint.top);
                    break;
            }
            var d: string = "M " + realSource.left + "," + realSource.top;
            if (Connlib.pathCornerRadius > 0) {
                var prevLine = ((this.state as any).lines as ConnlibLine[]).find(x => x._source == sourcePoint);
                var currLine = ((this.state as any).lines as ConnlibLine[]).find(x => x._source == prevLine._target);
                if (!currLine) {
                    if (!prevLine) {
                        console.warn("something went wrong: cannot find first two lines of the connector!", this, prevLine, currLine);
                        return null;
                    } else {
                        switch (prevLine.orientation) {
                            case ConnlibOrientation.HORIZONTAL:
                                dragOverlays.push(prevLine.JSXComponent(overlayClass + " horizontal"));
                                break;
                            case ConnlibOrientation.VERTICAL:
                                dragOverlays.push(prevLine.JSXComponent(overlayClass + " vertical"));
                                break;
                        }
                        let dashArray = (this.state as any).lineStyle.dashArray;
                        let strokeWidth = (this.state as any).lineStyle.strokeWidth;
                        d += " L" + realTarget.left + ", " + realTarget.top;
                        return (
                            <g onDoubleClick={() => (this.state as any).doubleClick()}>
                                <path d={d} stroke={Connlib.connectorColor} fill="transparent" strokeWidth={strokeWidth} strokeDasharray={dashArray} />
                                {dragOverlays}
                            </g>
                        );
                    }
                }
                var targetPointReached = false;
                while (!targetPointReached) {
                    let linesLongEnough = (currLine.length > (2 * Connlib.pathCornerRadius)) && (prevLine.length > (2 * Connlib.pathCornerRadius));
                    let clockwise = ConnlibExtensions.isClockwise(prevLine, currLine);
                    let cW: string;
                    let r = Connlib.pathCornerRadius;
                    if (clockwise == null) {
                        r = 0;
                    } else {
                        if (clockwise) {
                            cW = "0 0 1";
                        } else {
                            cW = "0 0 0";
                        }
                    }
                    if (prevLine._source == sourcePoint) {
                        d += " L" + prevLine.sL + "," + prevLine.sT + " L";
                    } else {
                        d += " L";
                    }
                    if (linesLongEnough && prevLine.orientation == ConnlibOrientation.HORIZONTAL) {
                        if (prevLine._source == sourcePoint) dragOverlays.push(prevLine.JSXComponent(overlayClass + " horizontal source-connected"));
                        else dragOverlays.push(prevLine.JSXComponent(overlayClass + " horizontal"));
                        if (prevLine.direction == ConnlibDirection.RIGHT) {
                            d += (prevLine.tL - r) + ",";
                        } else if (prevLine.direction == ConnlibDirection.LEFT) {
                            d += (prevLine.tL + r) + ",";
                        }
                        d += prevLine.sT;
                    } else if (linesLongEnough && prevLine.orientation == ConnlibOrientation.VERTICAL) {
                        if (prevLine._source == sourcePoint) dragOverlays.push(prevLine.JSXComponent(overlayClass + " vertical source-connected"));
                        else dragOverlays.push(prevLine.JSXComponent(overlayClass + " vertical"));
                        d += prevLine.sL + ",";
                        if (prevLine.direction == ConnlibDirection.BOTTOM) {
                            d += (prevLine.tT - r);
                        } else if (prevLine.direction == ConnlibDirection.TOP) {
                            d += (prevLine.tT + r);
                        }
                    } else {
                        d += prevLine.tL + "," + prevLine.tT;
                    }
                    dragOverlays.push(
                        <circle cx={prevLine.tL} cy={prevLine.tT} r="5" className="connlib-pathpoint-overlay" />
                    );
                    if (linesLongEnough) {
                        switch (currLine.direction) {
                            case ConnlibDirection.TOP:
                                d += " A" + r + "," + r + " " + cW + " " + prevLine.tL + "," + (prevLine.tT - Connlib.pathCornerRadius);
                                break;
                            case ConnlibDirection.RIGHT:
                                d += " A" + r + "," + r + " " + cW + " " + (prevLine.tL + Connlib.pathCornerRadius) + "," + prevLine.tT;
                                break;
                            case ConnlibDirection.BOTTOM:
                                d += " A" + r + "," + r + " " + cW + " " + prevLine.tL + "," + (prevLine.tT + Connlib.pathCornerRadius);
                                break;
                            case ConnlibDirection.LEFT:
                                d += " A" + r + "," + r + " " + cW + " " + (prevLine.tL - Connlib.pathCornerRadius) + "," + prevLine.tT;
                                break;
                        }
                    } else {
                        d += " L" + prevLine.tL + "," + prevLine.tT;
                    }
                    if (currLine._target == targetPoint) {
                        d += " L" + currLine.tL + "," + currLine.tT;
                        targetPointReached = true;
                        switch (currLine.orientation) {
                            case ConnlibOrientation.HORIZONTAL:
                                dragOverlays.push(currLine.JSXComponent(overlayClass + " horizontal target-connected"));
                                break;
                            case ConnlibOrientation.VERTICAL:
                                dragOverlays.push(currLine.JSXComponent(overlayClass + " vertical target-connected"));
                                break;
                        }
                    }
                    prevLine = currLine;
                    currLine = ((this.state as any).lines as ConnlibLine[]).find(x => x._source == prevLine._target);
                }
            } else {
                d = this.pathWithoutR(d, (this.state as any).lines);
            }
            // final line to final connection point
            d += " L" + realTarget.left + "," + realTarget.top;
            let dashArray = (this.state as any).lineStyle.dashArray;
            let strokeWidth = (this.state as any).lineStyle.strokeWidth;
            return (
                <g onDoubleClick={() => (this.state as any).doubleClick()}>
                    <path d={d} stroke={Connlib.connectorColor} fill="transparent" strokeWidth={strokeWidth} strokeDasharray={dashArray} />
                    {dragOverlays}
                </g>
            );
        }
        return null;
    }
}

export class ConnlibDropInfoInit {
    sourceId: string;
    targetId: string;
    connection: ConnlibConnection;
}

/**
 * a connlib instance
 */
export class ConnlibInstance {
    // is the current instance rendered?
    rendered: boolean = false;
    // are the instance's endpoints rendered?
    endpointsRendered: boolean = false;
    // a reference for the react component
    componentRef: ConnlibInstanceComponent;
    // the parent container of the connlib instance
    container: HTMLElement;
    // the instance's custom zoom level
    zoom: number = 1;
    // the instance's global unique identifier
    guid: string = null;
    // the attribute stores the instance's layer information
    layer: ConnlibLayerData = null;
    // the connections 
    private _connections: { [key: string]: ConnlibConnection } = {};
    // the lines
    private _lines: { [key: string]: ConnlibLine } = {};
    // the endpoints
    private _endPoints: { [key: string]: ConnlibEndpoint } = {};
    // the layers represented within the connlib instance
    private _layers: { [key: string]: ConnlibLayerData } = {};
    // the children for rendering (only setted if connlib should render dom elements)
    private _children: { [key: string]: ConnlibObjectType } = {};
    // the external id map
    private _externalIdInternalIdMap: { [key: number]: string } = {};

    // the instance's internal grid
    private _internalGrid: ConnlibGrid = null;
    public get internalGrid(): ConnlibGrid {
        return this._internalGrid;
    }
    public set internalGrid(grid: ConnlibGrid) {
        this._internalGrid = grid;
        this.gridChangeObservable.next(this);
    }

    // the instance's OPTIONAL deepth for debugging
    private _deepth: number = 0;
    public get deepth(): number {
        return this._deepth;
    }
    public set deepth(deepth: number) {
        this._deepth = deepth;
        this.deepthChangeObservable.next(this);
    }

    private _zIndex: number = 0;
    public get zIndex(): number {
        return this._zIndex;
    }
    public set zIndex(zIndex: number) {
        this._zIndex = zIndex;
        this.render();
        this.deepthChangeObservable.next(this);
    }

    _blockingCellsRendered: boolean = false;
    _renderCellsWalkable: boolean = true;
    _renderCellsNotWalkable: boolean = true;

    addEndpoint(target: HTMLElement, options: ConnlibEndpointOptionsInit) {

    }
    /**
     * the method adds an element's representation to the current instance
     * if the method returns false, the element was already represented within the current instance
     * @param elementId 
     * @param layer 
     */
    addLayer(layer: ConnlibLayerData, elementId?: number): boolean {
        if (!elementId || !this.getLayerByElementId(elementId)) {
            let lefDiff = layer.left - this.layer.left - Connlib.instancePadding;
            if (lefDiff < 0) {
                this.layer.left += lefDiff;
                layer.left = Connlib.instancePadding;
                this.layer.width += Math.abs(lefDiff);
                this.layer.validateSize();
                for (let index in this._layers) {
                    this._layers[index].left -= lefDiff;
                    this._layers[index].validateSize();
                }
            } else {
                layer.left -= this.layer.left;
            }

            let topDiff = layer.top - this.layer.top - Connlib.instancePadding;
            if (topDiff < 0) {
                console.log("streetch root to top " + topDiff);
                this.layer.top += topDiff;
                layer.top = Connlib.instancePadding;
                this.layer.height += Math.abs(topDiff);
                this.layer.validateSize();
                for (let index in this._layers) {
                    this._layers[index].top -= topDiff;
                    this._layers[index].validateSize();
                }
            } else {
                layer.top -= this.layer.top;
            }

            let right = (layer.left - this.layer.left) + layer.width + Connlib.instancePadding;
            if (this.layer.width < right) {
                this.layer.width = right;
                this.layer.right = this.layer.left + right;
            }
            let bottom = (layer.top - this.layer.top) + layer.height + Connlib.instancePadding;
            if (this.layer.height < bottom) {
                this.layer.height = bottom;
                this.layer.bottom = this.layer.top + bottom;
            }

            this._layers[layer.guid] = layer;
            if (elementId) this._externalIdInternalIdMap[elementId] = layer.guid;

            layer.layerPositionObservable.subscribe((layer: ConnlibLayerData) => console.log("position change!", layer));
            layer.layerSizeObservable.subscribe((layer: ConnlibLayerData) => console.log("size change!", layer));
            return true;
        }
        return false;
    }

    bind(event: string, handler: (info: ConnlibDropInfoInit) => any) {

    }

    componentDidMount() {

    }

    componentWillUnmount() {

    }

    connect(data: ConnlibConnectInit): ConnlibConnection {
        var source = null;
        if (data.sourceId) {
            source = this.getLayerByElementId(data.sourceId);
        } else {
            console.warn("cannot connect: no source found!", data);
            return;
        }
        var target = null;
        if (data.targetId) {
            target = this.getLayerByElementId(data.targetId);
        } else {
            console.warn("cannot connect: no source found!", data);
            return;
        }
        if (!source) {
            console.log(this);
            throw ("cannot create connection: the source element has no layer registered within the instance!");
        }
        if (!target) {
            console.log(this);
            throw ("cannot create connection: the target element has no layer registered within the instance!");
        }
        let c = new ConnlibConnection();
        if (data.typeNS) {
            let type = ConnlibTypeMap[data.typeNS];
            if (type) {
                c = new type.type();
            } else console.warn("cannot find type " + data.typeNS);
        }
        c.toEmbedded = data.hasPort;
        c.connlibInstance = this;
        this._connections[c.guid] = c;
        c.source = source;
        c.target = target;
        let changeCallback = () => {
            this.updateGrid();
            c.destroyEndpoints();
            Connlib.startCompletePathCalculation(c);
            c.validate();
            c.show();
        };
        let startChangeCallback = () => {
            c.hide();
        };
        source.positionChangeStartedObservable.subscribe(startChangeCallback);
        target.positionChangeStartedObservable.subscribe(startChangeCallback);
        source.positionChangeReadyObservable.subscribe(changeCallback);
        target.positionChangeReadyObservable.subscribe(changeCallback);
        c.updatePathPoints([], null, null);
        return c;
    }
    /**
     * the method returns wether the element with the passed identifier is represented within the current instance
     * @param elementId
     */
    containsElement(elementId: number): boolean {
        if (this._layers[elementId]) return true;
        return false;
    }

    deleteConnection(connection: ConnlibConnection) {

    }

    deleteEndpoint(element: HTMLElement) {

    }

    deleteEveryConnection() {

    }

    deleteEveryEndpoint() {

    }
    /**
     * the method checks whether the element with the passed identifier is represented within the connlib instance
     * @param id 
     */
    hasRepresentation(id: any): boolean {
        let guid = this._externalIdInternalIdMap[id];
        if (!guid) return false;
        if (this._layers[guid]) return true;
        return false;
    }
    /**
     * the method transforms a instance point (position on instance) to a raw point (position on screen)
     */
    instancePointToRawPoint(point: ConnlibPoint): ConnlibPoint {
        return {
            left: point.left + this.layer.left,
            top: point.top + this.layer.top
        };
    }

    isSource(element: HTMLElement): boolean {
        return false;
    }

    isSourceEnabled(element: HTMLElement): boolean {
        return false;
    }

    isTarget(element: HTMLElement): boolean {
        return false;
    }

    isTargetEnabled(element: HTMLElement): boolean {
        return false;
    }
    /**
     * the method returns the internal grid cell for the given endpoint
     */
    getGridCellForRawEndpoint(endpoint: ConnlibEndpoint): ConnlibGridCell {
        let p = Connlib.roundToScale(this.rawPointToInstancePoint(endpoint));
        return this._internalGrid.cells[p.top][p.left];
    }
    /**
     * the method returns an element's layer by identifier
     * @param elementId 
     */
    getLayerByElementId(elementId: number): ConnlibLayerData {
        let guid = this._externalIdInternalIdMap[elementId];
        if (!guid) return null;
        return this._layers[guid];
    }

    makeSource(element: HTMLElement, options: ConnlibSourceOptionsInit) {

    }

    makeTarget(element: HTMLElement, options: ConnlibTargetOptionsInit) {

    }
    /**
     * the method transforms the raw point (position on screen) to a instance point (position on instance)
     */
    rawPointToInstancePoint(point: ConnlibEndpoint): ConnlibPoint {
        return {
            left: point.left - this.layer.left,
            top: point.top - this.layer.top
        };
    }
    /**
     * 
     * @param connector 
     */
    registerConnector(connector: ConnlibConnection) {
        this._connections[connector.guid] = connector;
    }
    /**
     * only if Connlib should render the children!
     * @param namespace 
     * @param child 
     * @param layer 
     */
    registerChild(namespace: string, child: any, inputLayer: ConnlibLayerData) {
        let type = ConnlibTypeMap[namespace];
        if (!type) {
            console.warn("cannot render " + namespace + ": this type is not registered!");
            return;
        }
        let childInstance = new type.type();
        childInstance.id = child.id;
        childInstance.connlibInstance = this;
        if (childInstance.onInit) childInstance.onInit(child);
        let layer = new ConnlibLayerData();
        layer.left = inputLayer.left;
        layer.top = inputLayer.top;
        layer.width = inputLayer.width;
        layer.height = inputLayer.height;
        layer.layerPositionObservable = new Subject();
        layer.layerSizeObservable = new Subject();
        layer.connlibInstance = this;
        layer.validateSize();
        childInstance.layer = layer;
        this.addLayer(layer, child.id);
        this._children[layer.guid] = childInstance;
        if (Connlib.renderComponents && childInstance.positionChangeObservable) childInstance.positionChangeObservable.subscribe((data: any) => {
            layer.left = data.position.left - this.layer.left;
            layer.top = data.position.top - this.layer.top;
            data.ref.validate({ left: data.position.left, top: data.position.top });
        });
        if (Connlib.renderComponents && childInstance.positionChangeStartedObservable) childInstance.positionChangeStartedObservable.subscribe(() => layer.positionChangeStartedObservable.next());
        if (Connlib.renderComponents && childInstance.positionChangeReadyObservable) childInstance.positionChangeReadyObservable.subscribe(() => layer.positionChangeReadyObservable.next());
    }
    /**
     * the method enables external libraries to register an html element for collision detection with an external id
     * @param elementId external id (always numeric!)
     */
    registerElement(element: HTMLElement, elementId: number) {
        let currentLayer = new ConnlibLayerData();
        currentLayer.left = element.offsetLeft;
        currentLayer.top = element.offsetTop;
        currentLayer.width = element.offsetWidth;
        currentLayer.height = element.offsetHeight;
        currentLayer.layerPositionObservable = new Subject();
        currentLayer.layerSizeObservable = new Subject();
        currentLayer.connlibInstance = this;
        currentLayer.domElement = element;
        currentLayer.validateSize();
        this.addLayer(currentLayer, elementId);
    }

    registerEndpoint(point: ConnlibEndpoint) {
        this._endPoints[point.guid] = point;
    }

    registerLine(line: ConnlibLine) {
        this._lines[line.guid] = line;
    }
    /**
     * the method removes an endpoint from the current instance
     * @param endpoint 
     */
    removeEndpoint(endpoint: ConnlibEndpoint) {
        if (this._endPoints[endpoint.guid]) {
            delete this._endPoints[endpoint.guid];
            return true;
        }
        return false;
    }
    /**
     * the method removes a line from the current instance
     * @param connlibLine 
     */
    removeLine(line: ConnlibLine): boolean {
        if (this._lines[line.guid]) {
            delete this._lines[line.guid];
            return true;
        }
        return false;
    }
    /**
     * the method calculates the rect position and renders the cell
     */
    cellRect(cell: ConnlibGridCell, color: string, classList: string[]) {
        return this.centeredRect({
            left: cell.c,
            top: cell.r
        }, Connlib.connlibGridScale, color, classList);
    }
    /**
     * the method renders a rectangle at the given position (in center) with the given color
     * @param {*} point 
     * @param {*} color 
     */
    centeredRect(point: ConnlibPoint, size: number, color: string, classList: string[]) {
        let p = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        p.setAttribute("x", (point.left - (size / 2)) + "px");
        p.setAttribute("y", (point.top - (size / 2)) + "px");
        p.setAttribute("width", (size) + "px");
        p.setAttribute("height", (size) + "px");
        p.setAttribute("fill", color);
        p.classList.add("drawed-rect", ...classList);
        this.componentRef.ref.current.appendChild(p);
        return p;
    }
    /**
     * the method renders a rectangle at the given position with the given color
     * @param {*} point 
     * @param {*} color 
     */
    rect(point: ConnlibPoint, size: number, color: string, classList: string[]) {
        let p = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        p.setAttribute("x", point.left + "px");
        p.setAttribute("y", point.top + "px");
        p.setAttribute("width", (size - 1) + "px");
        p.setAttribute("height", (size - 1) + "px");
        p.setAttribute("fill", color);
        p.classList.add("drawed-rect", ...classList);
        this.componentRef.ref.current.appendChild(p);
        return p;
    }
    /**
     * the method removes the current instance from the dom
     */
    remove() {
        ReactDOM.unmountComponentAtNode(this.container);
        this.componentRef = null;
        this.rendered = false;
        this.renderedObservable.next(this);
    }
    /**
     * the method renders the current instance
     */
    render() {
        let childArray = Object.keys(this._children).map(key => this._children[key]);
        let connectorArray = Object.keys(this._connections).map(key => this._connections[key]);
        let endpointArray = Object.keys(this._endPoints).map(key => this._endPoints[key]);
        this.componentRef.setState({
            guid: this.guid,
            layer: this.layer,
            deepth: this._deepth,
            endpoints: endpointArray,
            connectors: connectorArray,
            children: childArray,
            zIndex: this.zIndex
        });
        for (let child of childArray) {
            let relLayer = this._layers[child.layer.guid];
            let layer = new ConnlibLayerData();
            layer.top = relLayer.top + this.layer.top;
            layer.left = relLayer.left + this.layer.left;
            layer.height = relLayer.height;
            layer.width = relLayer.width;
            child.validate(layer);
        }
        for (let endPoint of endpointArray) endPoint.validate();
        for (let connector of connectorArray) connector.validate();
        this.rendered = true;
        this.renderedObservable.next(this);
    }
    /**
     * only for debugging
     * renders all grid points
     */
    renderGridPoints() {
        var counter = 0;
        for (let row in this._internalGrid.cells) {
            for (let column in this._internalGrid.cells[row]) {
                let element = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                element.cy.baseVal.value = parseInt(row);
                element.cx.baseVal.value = parseInt(column);
                element.r.baseVal.value = 1;
                element.style.fill = "red";
                this.componentRef.ref.current.appendChild(element);
                counter++;
            }
        }
        console.log("rendered " + counter + " points");
    }

    _renderLayers() {
        for (let index in this._layers) {
            let layer = this._layers[index];
            let p = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            p.setAttribute("x", layer.left + "px");
            p.setAttribute("y", layer.top + "px");
            p.setAttribute("width", layer.width + "px");
            p.setAttribute("height", layer.height + "px");
            p.setAttribute("fill", "lightblue");
            p.classList.add("drawed-rect");
            this.componentRef.ref.current.appendChild(p);
        }
    }

    repaintEverything() {

    }

    reset() {

    }
    /**
     * the method is triggered when an element's position is changed
     * all connections relatied to the passed element should be recalculated
     */
    revalidate(element: HTMLElement) {
        // redraw all assigned connections
    }
    /**
     * 
     * @param element 
     * @param layer 
     */
    setContainer(element: HTMLElement) {
        this.container = element;
        this.componentRef = ReactDOM.render(
            React.createElement(ConnlibInstanceComponent),
            document.getElementById(element.id)
        );
        this.layer = new ConnlibLayerData();
        this.layer.left = 0;
        this.layer.top = 0;
        this.layer.width = element.clientWidth;
        this.layer.height = element.clientHeight;
        // never call update grid within this method!!
    }

    setSourceEnabled(element: HTMLElement) {

    }

    setTargetEnabled(element: HTMLElement) {

    }
    /**
     * the method sets the instance's zoom level
     * @param zoom 
     */
    setZoom(zoom: number) {
        this.zoom = zoom;
    }
    /**
     * the method renders the blocked cells of the grid
     */
    toggleBlockedCells() {
        if (this._blockingCellsRendered) {
            this._blockingCellsRendered = false;
            this.componentRef.clear();
            // rerender connectors
            let elements = document.getElementsByClassName(Connlib.blockingClassName);
            for (let element of elements) (element as HTMLElement).style.display = "block";
        } else {
            this._blockingCellsRendered = true;
            let elements = document.getElementsByClassName(Connlib.blockingClassName);
            for (let element of elements) (element as HTMLElement).style.display = "none";
            for (let rI in this._internalGrid.cells) {
                for (let cI in this._internalGrid.cells[rI]) {
                    if (this._renderCellsWalkable && this._internalGrid.cells[rI][cI].w == 1) {
                        this.rect({
                            top: parseInt(rI),
                            left: parseInt(cI)
                        }, Connlib.connlibGridScale, "green", ["blocking-cell"]);
                    } else if (this._renderCellsNotWalkable && this._internalGrid.cells[rI][cI].w == 0) {
                        this.rect({
                            top: parseInt(rI),
                            left: parseInt(cI)
                        }, Connlib.connlibGridScale, "orange", ["blocking-cell"]);
                    }
                }
            }
        }
    }

    unmakeEverySource() {

    }

    unmakeEveryTarget() {

    }

    unmakeSource(element: HTMLElement) {

    }

    unmakeTarget(element: HTMLElement) {

    }
    /**
     * the method recalculates the instance's internal grid
     */
    updateGrid() {
        if (!Connlib.useOverlapDetection) {
            console.warn("The overlap detection is turned off. Thus, you do not need this method.");
            return;
        }
        this.internalGrid = new ConnlibGrid(this.layer.width, this.layer.height);
        var i = 0;
        for (let id in this._layers) {
            let layer = this._layers[id];
            layer.validateSize();
            let left = Connlib.roundValueToScale(layer.left);
            let top = Connlib.roundValueToScale(layer.top);
            let right = Connlib.roundValueToScale(layer.right);
            let bottom = Connlib.roundValueToScale(layer.bottom);
            for (var row = top; row <= bottom; row += Connlib.connlibGridScale) {
                if (!this._internalGrid.cells[row]) console.log("iteration: " + i + ", row undefined in grid: " + row, this._internalGrid, this, layer);
                for (var col = left; col <= right; col += Connlib.connlibGridScale) {
                    if (!this._internalGrid.cells[row][col]) console.warn("column " + col + " is undefined in grid row " + row);
                    this._internalGrid.cells[row][col].w = 0;
                }
            }
            i++;
        }
    }
    // instance's observables
    public deepthChangeObservable: Subject<ConnlibInstance> = new Subject();
    public gridChangeObservable: Subject<ConnlibInstance> = new Subject();
    public renderedObservable: Subject<ConnlibInstance> = new Subject();
}

/**
 * the react component of the endpoint
 */
class ConnlibEndpointComponent extends React.Component {
    ref: React.RefObject<SVGSVGElement> = React.createRef();
    /**
     * the method enables user's to (hard) clear the svg
     */
    clear() {
        while (this.ref.current.lastChild) {
            this.ref.current.removeChild(this.ref.current.lastChild);
        }
    }
    /**
     * the method is called on component rendering
     */
    render() {
        if (this.state as any) {
            if ((this.state as any).hidden) return null;
            let type = (this.state as any).type as ConnlibEndpointInterface;
            var top: number;
            var height: number;
            var left: number;
            var width: number;
            var portLeft: number;
            var portTop: number;
            let portSize: number = Connlib.endpointSize - (2 * (Connlib.endpointPadding));
            var arrowPointer: ConnlibPoint = new ConnlibPoint();
            var arrowFooter1: ConnlibPoint = new ConnlibPoint();
            var arrowFooter2: ConnlibPoint = new ConnlibPoint();
            var routeEnd: ConnlibPoint = new ConnlibPoint();
            var className = "connlib-endpoint";
            switch ((this.state as any).direction) {
                case ConnlibDirection.TOP:
                    className += " vertical";
                    left = ((this.state as any).left - (type.width / 2));
                    width = type.width;
                    top = (this.state as any).top - type.height;
                    height = type.height + Connlib.endpointIndent;
                    portLeft = Connlib.endpointPadding;
                    portTop = type.height - portSize;
                    arrowPointer.left = width / 2;
                    if ((this.state as any).hasPort) {
                        arrowPointer.top = portTop - 1;
                    } else {
                        arrowPointer.top = type.height;
                    }
                    if (type.arrowType) {
                        routeEnd.left = arrowPointer.left;
                        routeEnd.top = arrowPointer.top - (type.arrowType.intend * 2);
                        arrowFooter1.left = arrowPointer.left + (type.arrowType.width / 2);
                        arrowFooter1.top = arrowPointer.top - (type.arrowType.intend);
                        arrowFooter2.left = arrowPointer.left - (type.arrowType.width / 2);
                        arrowFooter2.top = arrowPointer.top - (type.arrowType.intend);
                    }
                    break;
                case ConnlibDirection.RIGHT:
                    className += " horizontal";
                    left = (this.state as any).left - Connlib.endpointIndent;
                    width = type.height + Connlib.endpointIndent;
                    top = ((this.state as any).top - (type.width / 2));
                    height = type.width;
                    portLeft = Connlib.endpointIndent;
                    portTop = Connlib.endpointIndent;
                    arrowPointer.top = portTop + (portSize / 2);
                    if ((this.state as any).hasPort) {
                        arrowPointer.left = Connlib.endpointIndent + portSize;
                    } else {
                        arrowPointer.left = Connlib.endpointIndent;
                    }
                    if (type.arrowType) {
                        arrowFooter2.left = arrowPointer.left + type.arrowType.intend;
                        arrowFooter2.top = arrowPointer.top - (type.arrowType.width / 2);
                        routeEnd.left = arrowPointer.left + (type.arrowType.intend * 2);
                        routeEnd.top = arrowPointer.top;
                        arrowFooter1.left = arrowPointer.left + type.arrowType.intend;
                        arrowFooter1.top = arrowPointer.top + (type.arrowType.width / 2);
                    }
                    break;
                case ConnlibDirection.BOTTOM:
                    className += " vertical";
                    left = ((this.state as any).left - (type.width / 2));
                    width = type.width;
                    top = (this.state as any).top - Connlib.endpointIndent;
                    height = type.height + Connlib.endpointIndent;
                    portLeft = Connlib.endpointPadding;
                    portTop = Connlib.endpointIndent;
                    arrowPointer.left = width / 2;
                    if ((this.state as any).hasPort) {
                        arrowPointer.top = portTop + portSize + 1;
                    } else {
                        arrowPointer.top = Connlib.endpointIndent;
                    }
                    if (type.arrowType) {
                        arrowFooter2.left = arrowPointer.left + (type.arrowType.width / 2);
                        arrowFooter2.top = arrowPointer.top + (type.arrowType.intend);
                        routeEnd.left = arrowPointer.left;
                        routeEnd.top = arrowPointer.top + (type.arrowType.intend * 2);
                        arrowFooter1.left = arrowPointer.left - (type.arrowType.width / 2);
                        arrowFooter1.top = arrowPointer.top + (type.arrowType.intend);
                    }
                    break;
                case ConnlibDirection.LEFT:
                    className += " horizontal";
                    left = (this.state as any).left - type.height;
                    width = type.height + Connlib.endpointIndent;
                    top = ((this.state as any).top - (type.width / 2));
                    height = type.width;
                    portLeft = type.height - portSize;
                    portTop = Connlib.endpointPadding;
                    arrowPointer.top = portTop + (portSize / 2);
                    if ((this.state as any).hasPort) {
                        arrowPointer.left = type.height - portSize;
                    } else {
                        arrowPointer.left = type.height;
                    }
                    if (type.arrowType) {
                        arrowFooter1.left = arrowPointer.left - type.arrowType.intend;
                        arrowFooter1.top = arrowPointer.top - (type.arrowType.width / 2);
                        arrowFooter2.left = arrowPointer.left - type.arrowType.intend;
                        arrowFooter2.top = arrowPointer.top + (type.arrowType.width / 2);
                        routeEnd.left = arrowPointer.left - (type.arrowType.intend * 2);
                        routeEnd.top = arrowPointer.top;
                    }
                    break;
            }
            let style: React.CSSProperties = {
                position: "absolute",
                top: top,
                height: height,
                left: left,
                width: width
            };
            var inner: any[] = [];
            if ((this.state as any).hasPort) {
                inner.push(
                    <rect x={portLeft} y={portTop} height={portSize} width={portSize} strokeWidth="1" stroke="black" fill="white" className="connlib-port" />
                );
            }
            if (type.arrowType) {
                var d = "M" + arrowFooter1.left + "," + arrowFooter1.top + " L" + arrowPointer.left + "," + arrowPointer.top + " L" + arrowFooter2.left + "," + arrowFooter2.top;
                if (type.arrowType.isRoute) {
                    d += " L" + routeEnd.left + "," + routeEnd.top;
                }
                if (type.arrowType.isClosedArrow || type.arrowType.isRoute) {
                    d += " L" + arrowFooter1.left + "," + arrowFooter1.top;
                }
                inner.push(
                    <path d={d} fill={type.arrowType.fillColor} strokeWidth={type.arrowType.borderWidth} stroke={type.arrowType.borderColor} />
                );
            }
            return (
                <svg className={className} style={style} onMouseDown={(this.state as any).mousedown}>
                    {inner}
                </svg>
            );
        }
        return null;
    }
}
/**
 * a connlib instance's react component for DOM interaction
 */
class ConnlibInstanceComponent extends React.Component {

    ref: React.RefObject<SVGSVGElement> = React.createRef();
    /**
     * the method enables user's to (hard) clear the svg
     */
    clear() {
        while (this.ref.current.lastChild) {
            this.ref.current.removeChild(this.ref.current.lastChild);
        }
    }
    /**
     * the method is called on component rendering
     */
    render() {
        if ((this.state as any)) {
            let style: React.CSSProperties = {
                height: (this.state as any).layer.height,
                width: (this.state as any).layer.width,
                left: (this.state as any).layer.left,
                top: (this.state as any).layer.top,
                zIndex: (this.state as any).layer.zIndex
                //backgroundColor: "rebeccapurple"
            };
            let connectors: any[] = [];
            let endpoints: any[] = [];
            let children: any[] = [];
            for (let c of (this.state as any).children) {
                children.push(React.createElement(c.JSXComponent, {
                    key: (c as ConnlibAbstractStructuralType).guid,
                    ref: ref => (c as any).componentRef = ref
                }));
            }
            for (let c of (this.state as any).connectors) {
                connectors.push(React.createElement(ConnlibConnectionComponent, {
                    key: (c as ConnlibConnection).guid,
                    ref: ref => (c as ConnlibConnection).componentRef = ref
                }));
            }
            for (let e of (this.state as any).endpoints) {
                endpoints.push(React.createElement(ConnlibEndpointComponent, {
                    key: (e as ConnlibEndpoint).guid,
                    ref: ref => (e as ConnlibEndpoint).componentRef = ref
                }));
            }
            return (
                <div>
                    {children}
                    {endpoints}
                    <svg className="connlib-instance" data-deepth={(this.state as any).deepth} style={style} ref={this.ref} >
                        {connectors}
                    </svg>
                </div>
            );
        }
        return null;
    }
}

class ConnlibConnectInit {
    source?: HTMLElement;
    target?: HTMLElement;
    sourceId?: number;
    targetId?: number;
    typeNS?: string;
    anchor?: [];
    anchors?: [[]];
    connector?: [];
    overlays?: [];
    endpoint?: string;
    paintStyle?: ConnlibPaintStyle;
    hasPort?: boolean;
}

class ConnlibDragOptionsInit {
    drag: any;
}

class ConnlibDropOptionsInit {
    drop: any;
}

class ConnlibSourceOptionsInit {
    filter: (event: MouseEvent, element: HTMLElement) => boolean;
    filterExclude: boolean;

}

class ConnlibEndpointOptionsInit {
    isSource: boolean;
    isTarget: boolean;
    anchors: string[] = [];
    endpoint: string;
    dragOptions: ConnlibDragOptionsInit;
    dropOptions: ConnlibDropOptionsInit;
    constructor() {

    }
}

class ConnlibTargetOptionsInit {
    allowLoopback: boolean;
    constructor() {

    }
}

class ConnlibPaintStyle {
    stroke: string;
    strokeWidth: number;
    dashstyle: string;
    fill: string;
}
/**
 * the class contains a connlib linear function
 * f(x)=mx+n
 */
class ConnlibLinearFunction {
    m: number;
    n: number;
}
// global constants
const ConnlibDirection = {
    "TOP": 0,
    "RIGHT": 1,
    "BOTTOM": 2,
    "LEFT": 3
}
const ConnlibArrowType = {
    "OpenArrow": {
        id: 1,
        isRoute: false,
        fillColor: "transparent",
        borderColor: Connlib.connectorColor,
        borderWidth: 1,
        intend: (Connlib.endpointSize - (Connlib.endpointPadding * 2)) / 2,
        width: (Connlib.endpointSize - (Connlib.endpointPadding * 2)) / 2,
        isClosedArrow: false
    },
    "Inheritance": {
        id: 2,
        isRoute: false,
        fillColor: "white",
        borderColor: Connlib.connectorColor,
        borderWidth: 1,
        intend: (Connlib.endpointSize - (Connlib.endpointPadding * 2)),
        width: (Connlib.endpointSize - (Connlib.endpointPadding * 2)),
        isClosedArrow: true
    },
    "Fulfillment": {
        id: 3,
        isRoute: false,
        fillColor: "black",
        borderColor: Connlib.connectorColor,
        borderWidth: 1,
        intend: (Connlib.endpointSize - (Connlib.endpointPadding * 2)),
        width: (Connlib.endpointSize - (Connlib.endpointPadding * 2)),
        isClosedArrow: true
    },
    "EventRelation": {
        id: 3,
        isRoute: false,
        fillColor: "black",
        borderColor: Connlib.connectorColor,
        borderWidth: 1,
        intend: (Connlib.endpointSize - (Connlib.endpointPadding * 2)),
        width: (Connlib.endpointSize - (Connlib.endpointPadding * 2)) / 2,
        isClosedArrow: true
    },
    "Aggregation": {
        id: 4,
        isRoute: true,
        fillColor: "white",
        borderColor: Connlib.connectorColor,
        borderWidth: 1,
        intend: (Connlib.endpointSize - (Connlib.endpointPadding * 2)),
        width: (Connlib.endpointSize - (Connlib.endpointPadding * 2)) / 2,
        isClosedArrow: true
    },
    "Composition": {
        id: 5,
        isRoute: true,
        fillColor: "black",
        borderColor: Connlib.connectorColor,
        borderWidth: 1,
        intend: (Connlib.endpointSize - (Connlib.endpointPadding * 2)),
        width: (Connlib.endpointSize - (Connlib.endpointPadding * 2)) / 2,
        isClosedArrow: true
    }
}
const ConnlibPortType = {
    "Default": {
        portBorderColor: Connlib.connectorColor,
        portBorderWidth: 1,
        portColor: "white"
    } as ConnlibPortTypeOptions,
    "FilledPort": {
        portBorderColor: Connlib.connectorColor,
        portBorderWidth: 1,
        portColor: Connlib.connectorColor
    } as ConnlibPortTypeOptions
}
class ConnlibArrowTypeOptions {
    id: number;
    isRoute: boolean;
    fillColor?: string;
    borderColor?: string;
    borderWidth?: number;
    intend?: number;
    width?: number;
    isClosedArrow?: boolean;
}
class ConnlibPortTypeOptions {
    portColor: string;
    portBorderColor: string;
    portBorderWidth: number;
}
const ConnlibTypeMap: { [key: string]: ConnlibTypeMapEntry } = {
    "io.framed.model.Attribute": {
        type: null,
        class: "attribute",
        hasChildren: false
    }
}

class ConnlibTypeMapEntry {
    type: any;
    class: string;
    hasChildren: boolean;
}

/**
 * the interface is used for elements, that are compatible with the connlib drag functionality
 */
interface ConnlibDragFlagInterface { }
/**
 * the class contains a connector creation metadata
 */
class ConnlibConnectionCreateWrapper implements ConnlibDragFlagInterface {
    mouseX: number;
    mouseY: number;
    source: HTMLElement;
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pathH = document.createElementNS("http://www.w3.org/2000/svg", "path");
    /**
     * the constructor creates a new connector creation helper
     */
    constructor(mouseX: number, mouseY: number, source: HTMLElement) {
        this.mouseX = mouseX;
        this.mouseY = mouseY;
        this.source = source;
        this.svg.style.left = (this.mouseX - 20).toFixed(0);
        this.svg.style.top = (this.mouseY - 20).toFixed(0);
        this.svg.style.height = "40px";
        this.svg.style.width = "40px";
        this.svg.classList.add("cconnector-panel");
        this.pathH.classList.add("cconnector-bg");
        this.path.style.stroke = Connlib.connectorColor;
        this.path.style.strokeWidth = "1";
        this.svg.appendChild(this.pathH);
        this.svg.appendChild(this.path);
        Connlib.rootInstance.componentRef.ref.current.appendChild(this.svg);
        this.source.classList.add("connlib-cconnector-start");
        Connlib.currentMouseover = null;
    }
    /**
     * the method destroys the current instance
     */
    destroy() {
        this.source.classList.remove("connlib-cconnector-start");
        this.svg.parentNode.removeChild(this.svg);
        if (this.source && Connlib.currentMouseover) {
            console.log("connect " + this.source + " and " + Connlib.currentMouseover);
            /*
            connlib.instances[0].connect(this.source.id, connlib.currentMouseover.id);
            connlib.instances[0].render();
            */
        }
    }
    /**
     * the method updates the target position
     */
    updateTarget(x: number, y: number) {
        let l = Math.min(this.mouseX, x) - 20;
        let w = Math.max(this.mouseX, x) - l + 20;
        this.svg.style.left = l.toFixed(0);
        this.svg.style.width = w.toFixed(0);
        let t = Math.min(this.mouseY, y) - 20;
        let h = Math.max(this.mouseY, y) - t + 20;
        this.svg.style.top = t.toFixed(0);
        this.svg.style.height = h.toFixed(0);
        this.pathH.setAttribute("d", "M" + (this.mouseX - l) + "," + (this.mouseY - t) + " " + (x - l) + "," + (y - t));
        this.path.setAttribute("d", "M" + (this.mouseX - l) + "," + (this.mouseY - t) + " " + (x - l) + "," + (y - t));
        if (Connlib.currentMouseover) {
            Connlib.currentMouseover.classList.add("connlib-cconnector-target");
        }
    }
}
/**
 * the class binds a connlib pan information
 */
class ConnlibPanWrapper implements ConnlibDragFlagInterface {
    mouseX: number;
    mouseY: number;
    initialXTransform: number;
    initialYTransform: number;
    constructor(mouseX: number, mouseY: number, initialXTransform: number, initialYTransform: number) {
        this.mouseX = mouseX;
        this.mouseY = mouseY;
        this.initialXTransform = initialXTransform;
        this.initialYTransform = initialYTransform;
    }
    /**
     * the method returns the calculation
     * @param {*} point 
     */
    calculateTransform(x: number, y: number) {
        return { x: (this.initialXTransform + (x - this.mouseX)) * 1, y: (this.initialYTransform + (y - this.mouseY)) * 1 };
    }
}

class ConnlibObjectTypeMoveWrapper implements ConnlibDragFlagInterface {
    diffX: number = null;
    diffY: number = null;
    ref: ConnlibObjectType = null;

    destroy() {
        this.ref.positionChangeReadyObservable.next();
    }
}

// the default stencil
/**
 * a default inheritance
 */
export class ConnlibInheritanceEndpoint implements ConnlibEndpointInterface {
    width: number = Connlib.endpointSize;
    height: number = Connlib.endpointHeightFormula(Connlib.endpointSize);
    arrowType: ConnlibArrowTypeOptions = ConnlibArrowType.Inheritance;
}
/**
 * a default aggregation
 */
export class ConnlibAggregationEndpoint implements ConnlibEndpointInterface {
    width: number = Connlib.endpointSize;
    height: number = Connlib.endpointHeightFormula(Connlib.endpointSize);
    arrowType: ConnlibArrowTypeOptions = ConnlibArrowType.Aggregation;
}
/**
 * a default composition
 */
export class ConnlibCompositionEndpoint implements ConnlibEndpointInterface {
    width: number = Connlib.endpointSize;
    height: number = Connlib.endpointHeightFormula(Connlib.endpointSize);
    arrowType: ConnlibArrowTypeOptions = ConnlibArrowType.Composition;
}
/**
 * a default inheritance
 */
export class ConnlibFulfillmentEndpoint implements ConnlibEndpointInterface {
    width: number = Connlib.endpointSize;
    height: number = Connlib.endpointHeightFormula(Connlib.endpointSize);
    arrowType: ConnlibArrowTypeOptions = ConnlibArrowType.Fulfillment;
}
/**
 * a default inheritance
 */
export class ConnlibEventRelationEndpoint implements ConnlibEndpointInterface {
    width: number = Connlib.endpointSize;
    height: number = Connlib.endpointHeightFormula(Connlib.endpointSize);
    arrowType: ConnlibArrowTypeOptions = ConnlibArrowType.EventRelation;
}
/**
 * a default open arrow
 */
export class ConnlibOpenArrowEndpoint implements ConnlibEndpointInterface {
    width: number = Connlib.endpointSize;
    height: number = Connlib.endpointHeightFormula(Connlib.endpointSize);
    arrowType: ConnlibArrowTypeOptions = ConnlibArrowType.OpenArrow;
}
/**
 * a default relation without arrows
 */
export class ConnlibRelationshipEndpoint implements ConnlibEndpointInterface {
    width: number = Connlib.endpointSize;
    height: number = Connlib.endpointHeightFormula(Connlib.endpointSize);
}
/**
 * a default inheritance with a port
 */
export class ConnlibPortInheritanceEndpoint implements ConnlibEndpointInterface {
    width: number = Connlib.endpointSize;
    height: number = Connlib.endpointHeightFormula(Connlib.endpointSize);
    arrowType: ConnlibArrowTypeOptions = ConnlibArrowType.Inheritance;
    portType: ConnlibPortTypeOptions = ConnlibPortType.FilledPort;
}
/**
 * a default relation with a port
 */
export class ConnlibPortRelationshipEndpoint implements ConnlibEndpointInterface {
    width: number = Connlib.endpointSize;
    height: number = Connlib.endpointHeightFormula(Connlib.endpointSize);
    portType: ConnlibPortTypeOptions = ConnlibPortType.FilledPort;
}

export class ConnlibDefaultLineStyle implements ConnlibLineStyle {
    dashArray = "0"
    strokeWidth = 1;
}

export class ConnlibDottedLineStyle implements ConnlibLineStyle {
    dashArray = "2 2"
    strokeWidth = 1;
}

export class ConnlibDashedLineStyle implements ConnlibLineStyle {
    dashArray = "5 3"
    strokeWidth = 1;
}

export class ConnlibThickLineStyle implements ConnlibLineStyle {
    dashArray = "0"
    strokeWidth = 3;
}