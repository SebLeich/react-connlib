import * as React from "react";
import * as ReactDOM from "react-dom";
import { Subject, Subscription } from "rxjs";

// internal classes
export interface ConnlibModelElement { }
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
export class ConnlibAbstractRelationship {
    id: number;
    sourceId: number;
    targetId: number;
    name: string;
}
export class ConnlibAttribute implements ConnlibModelElement {
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
export class ConnlibComposition extends ConnlibAbstractRelationship { }
export class ConnlibCreateRelationship extends ConnlibAbstractRelationship { }
export class ConnlibDestroyRelationship extends ConnlibAbstractRelationship { }
export class ConnlibFulfillmentRelationship extends ConnlibAbstractRelationship { }
export class ConnlibLabel {
    text: string;
    left: number;
    top: number;
    position: number;
    id: string;
}
/**
 * the class represents a DOM element's connlib internal representation
 */
export class ConnlibLayerData {
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
    connlibInstance: ConnlibInstance;
    middle: ConnlibPoint = null;

    setPosition(left: number, top: number) {
        this.left = left;
        this.top = top;
        this.right = left + this.width;
        this.bottom = top + this.height;
        this.middle = null;
        this.layerPositionObservable.next(this);
    }
    setSize(width: number, height: number) {
        this.height = height;
        this.width = width;
        this.right = this.left + width;
        this.bottom = this.top + height;
        this.middle = null;
        this.layerSizeObservable.next(this);
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
    connlibInstance: ConnlibInstance;
    isSettedUp: boolean = false;
    positionChangeObservable: Subject<ConnlibPathPoint>;
    setPosition(point: ConnlibPoint) {
        this.left = point.left;
        this.top = point.top;
        this.positionChangeObservable.next(this);
    }
    setUp(connlibInstance: ConnlibInstance) {
        this.connlibInstance = connlibInstance;
        this.positionChangeObservable = new Subject();
        this.isSettedUp = true;
    }
}
/**
 * the class contains a connlib endpoint
 */
class ConnlibEndpoint extends ConnlibPathPoint {
    guid: string = Guid.newGuid();
    componentRef: ConnlibEndpointComponent;
    source: ConnlibLayerData;
    direction: number;
    type: ConnlibEndpointInterface;
    connlibInstance: ConnlibInstance;
    rawXPosition: number;
    rawYPosition: number;
    positionInitiallySetted: boolean = false;

    setPosition(point: ConnlibPoint) {
        this.left = point.left;
        this.top = point.top;
        this.setRawPosition(this.connlibInstance.instancePointToRawPoint(point));
        this.positionChangeObservable.next(this);
    }
    setRawPosition(point: ConnlibPoint) {
        if (!this.connlibInstance) {
            console.warn("cannot transform instance position to raw position: no connlib instance referenced ...");
            return;
        }
        let p = this.connlibInstance.instancePointToRawPoint(point);
        this.rawXPosition = p.left;
        this.rawYPosition = p.top;
        this.positionInitiallySetted = true;
    }
    setUp(connlibInstance: ConnlibInstance) {
        this.connlibInstance = connlibInstance;
        this.positionChangeObservable = new Subject();
        this.type = new ConnlibRelationship();
        this.type.width = 20;
        this.type.height = Connlib.endpointHeightFormula(20);
        if (this.top && this.left && connlibInstance) this.setRawPosition(this.connlibInstance.instancePointToRawPoint({
            top: this.top,
            left: this.left
        }));
        this.isSettedUp = true;
    }
    validate() {
        if (!this.positionInitiallySetted) {
            console.warn("cannot render endpoint: position is not setted!", this);
            return;
        }
        this.componentRef.setState({
            left: this.left,
            top: this.top,
            direction: this.direction,
            type: this.type
        });
    }
}
/**
 * the connlib endpoint interface
 * all endpoint's you want to render needs to implement the interface
 */
interface ConnlibEndpointInterface {
    width: number;
    height: number;
    fill: string;
    hasPort: boolean;
    portWidth: number;
    portColor: string;
    portBorderColor: string;
    portBorderWidth: number;
    arrowType: number;
    arrowFill: string;
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
export class ConnlibDataInterface {
    root: [string, ConnlibModelElement];
    connections: ConnlibConnectionWrapper;
    layer: ConnlibLayerWrapper;
}
export class ConnlibAbstractStructuralType implements ConnlibModelElement {
    id: number;
}
export class ConnlibPackage extends ConnlibAbstractStructuralType {
    name: string;
    metadata: ConnlibMetaData;
    children: [string, ConnlibModelElement];
}
export class ConnlibClass extends ConnlibAbstractStructuralType {
    name: string;
    attributes: [];
    methods: [];
}
export class ConnlibCompartment extends ConnlibAbstractStructuralType {
    name: string;
    attributes: [[string, ConnlibAttribute]];
    methods: [[string, ConnlibMethod]];
    children: [[string, ConnlibModelElement]]
}
export class ConnlibConnectionWrapper {
    connections: [[string, ConnlibAbstractRelationship]]
}
export class ConnlibEvent extends ConnlibAbstractStructuralType {
    id: number;
    type: string;
    desc: string;
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
    static windowListenersSettedUp = false;
    static useOverlapDetection = true;
    static blockingClassName = "connlib-connection-blocked";
    static connectableClassName = "connlib-connectable";
    static endpointStack = 15;
    static pathCornerRadius = 2;

    static endpointSize: 20; // the endpoint svg's width & the height is calculated with the formula below
    static endpointHeightFormula = (size: number) => { return size * 1.5 };

    static elementDOMElementMapLambda = (conatiner: HTMLElement, elementId: number) => {
        return conatiner.querySelector("[data-id='" + elementId + "']");
    };
    static overwriteConnectionOnValidation = true;
    static moveStep = 50; // the step size of the window move events
    static endpointCopyTolerance = 20; // how far should endpoints be distanced until the library creates a new endpoint?
    static invertMoveDirection = false;
    // should connlib render components at the dom?
    static renderComponents = false;
    // the root element
    static renderComponentsRoot: HTMLElement = document.getElementById("root");
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
    private static _zoom = 1;
    public static get zoom(): number {
        return this._zoom;
    }
    public static set zoom(zoom: number) {
        this._zoom = zoom;
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
        this.rootInstance.container.style.transform = "translate(" + this.moveX + "px, " + this.moveY + "px)";
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
                direction: ConnlibDirection.TOP,
                type: null
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
                direction: ConnlibDirection.RIGHT,
                type: null
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
                direction: ConnlibDirection.BOTTOM,
                type: null
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
                direction: ConnlibDirection.LEFT,
                type: null
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
    private static cellsArrayToPathPointArray(cells: ConnlibGridCell[]): ConnlibPathPoint[] {
        return cells.map(x => {
            let point = new ConnlibPathPoint();
            point.left = x.c;
            point.top = x.r;
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
        this.renderComponentsRoot.innerHTML = "";
    }
    /**
     * the attribute stores all connlib instances
     */
    private static instances: { [key: string]: ConnlibInstance } = {};
    /**
     * the method returns an endpoint's conn
     */
    static getEndpointConnectionPoint(endpoint: ConnlibEndpoint): ConnlibEndpoint {
        let point = new ConnlibEndpoint();
        point.source = endpoint.source;
        point.direction = endpoint.direction;
        point.type = endpoint.type;
        point.left = endpoint.left;
        point.top = endpoint.top;
        point.setUp(this.rootInstance);
        switch (endpoint.direction) {
            case ConnlibDirection.TOP:
                point.top = endpoint.top - this.endpointStack;
                break;
            case ConnlibDirection.RIGHT:
                point.left = endpoint.left + this.endpointStack;
                break;
            case ConnlibDirection.BOTTOM:
                point.top = endpoint.top + this.endpointStack;
                break;
            case ConnlibDirection.LEFT:
                point.left = endpoint.left - this.endpointStack;
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
     * the method enables user's to upload data
     * after upload, the connlib elements getting repainted
     */
    public static importData(data: ConnlibDataInterface) {

        let start = performance.now();

        this.clear();

        // @ts-ignore
        let type = ConnlibTypeMap[data.root[0]];
        if (!type) throw ("unknown type of the root element: " + data.root[0]);

        let rootElement = (data.root[1] as typeof type.type);
        if (!rootElement) throw ("no root element within the input file!");

        let rootId = parseInt(rootElement.id);
        if (!Number.isInteger(rootId)) throw ("the root element has no valid identifier!");

        let rootLayer = data.layer[rootId].data;
        let rootLayerLayer = rootLayer[rootId];
        if (!rootLayerLayer) throw ("the layer needs to be represent within itself");

        let rootInstance = this.getInstance();
        this.rootInstance = rootInstance;
        rootInstance.deepth = 0;
        rootInstance.setContainer(this.renderComponentsRoot, rootLayerLayer);

        // first render all childs (if neccessary)
        if (type.hasChildren) {
            for (let child of rootElement.children) {
                let childType = ConnlibTypeMap[child[0]];
                if (!childType) {
                    console.warn("unknown type of the child element: " + child[0]);
                    continue;
                }
                let currentLayer = rootLayer[child[1].id];
                currentLayer.layerPositionObservable = new Subject();
                currentLayer.layerSizeObservable = new Subject();
                currentLayer.connlibInstance = rootInstance;
                currentLayer.domElement = this.elementDOMElementMapLambda(rootInstance.container, child[1].id) as HTMLElement;
                currentLayer.bottom = currentLayer.top + currentLayer.height;
                currentLayer.right = currentLayer.left + currentLayer.width;
                rootInstance.addLayer(child[1].id, currentLayer);
                if (this.renderComponents) this.renderComponent(childType, child[1].id, rootLayer[child[1].id], rootInstance.container);
                if (childType.hasChildren) {
                    let currentInstance = this.getInstance();
                    currentInstance.deepth = 1;
                    currentInstance.setContainer(this.renderComponentsRoot, rootLayerLayer);
                }
            }
        }

        // afterwards, update grid
        if (Connlib.useOverlapDetection) rootInstance.updateGrid();

        for (let connectorId in rootLayerLayer.connectors) {
            let connectorObjectArray = data.connections.connections.find(x => x[1].id === parseInt(connectorId));
            let connectorData = rootLayerLayer.connectors[connectorId];
            let connector = new ConnlibConnection();
            connector.connlibInstance = rootInstance;
            connector.source = rootInstance.getLayerByElementId(connectorObjectArray[1].sourceId);
            connector.target = rootInstance.getLayerByElementId(connectorObjectArray[1].targetId);
            connector.updatePathPoints(connectorData.pathPoints);
            rootInstance.registerConnector(connector);
        }

        rootInstance.render();
        //rootInstance.renderEndpoints();
        //rootInstance.renderConnectors();
        let end = performance.now();
        console.log("finished in: " + (end - start).toFixed(0) + "ms")
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
     * the method is currently used for render debug components
     */
    private static renderComponent(type: ConnlibTypeMapEntry, elementId: number, layer: ConnlibLayerData, container: HTMLElement) {
        let element = document.createElement("div");
        element.classList.add(type.class, this.blockingClassName, "connlib-element");
        element.dataset["id"] = elementId.toString();
        element.style.top = layer.top + "px";
        element.style.left = layer.left + "px";
        element.style.width = layer.width + "px";
        element.style.height = layer.height + "px";
        container.appendChild(element);
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
        output.left = Math.round(point.left / Connlib.connlibGridScale) * Connlib.connlibGridScale;
        output.top = Math.round(point.top / Connlib.connlibGridScale) * Connlib.connlibGridScale;
        return output;
    }
    /**
     * this method sets the library up as a standalone, containg the following features:
     * - own window listeners
     * - own element rendering
     */
    public static setUpStandalone() {
        this.standaloneSetup = true;
        this.renderComponents = true;
        this.setUpWindowListeners();
        this.standaloneSetupObservable.next();
    }
    /**
     * the method sets the window listeners up
     */
    public static setUpWindowListeners() {
        // arrow keys for pan
        window.addEventListener("keyup", (event) => {
            switch (event.keyCode) {
                case 37:
                    if (this.invertMoveDirection) this.moveX -= this.moveStep;
                    this.moveX += this.moveStep;
                    break;
                case 38:
                    if (this.invertMoveDirection) this.moveY -= this.moveStep;
                    this.moveY += this.moveStep;
                    break;
                case 39:
                    if (this.invertMoveDirection) this.moveX += this.moveStep;
                    this.moveX -= this.moveStep;
                    break;
                case 40:
                    if (this.invertMoveDirection) this.moveY += this.moveStep;
                    this.moveY -= this.moveStep;
                    break;
            }
            this.applyTransform();
        });
        window.addEventListener("mousedown", (event) => {
            if (this.dragFlag == null) {
                event.preventDefault();
                event.stopPropagation();
                if ((event.target as HTMLElement).classList.contains("connlib-connectable")) {
                    let c = ConnlibExtensions.cumulativeOffset(event.target as HTMLElement);
                    this.dragFlag = new ConnlibConnectionCreateWrapper((c.left + event.offsetX), (c.top + event.offsetY), (event.target as HTMLElement));
                } else {
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
                    throw ("not implemented now");
                /*
                let i = Connlib.cumulativeOffset();
                switch (dF.type) {
                    case connlibLine.lineType.HORIZONTAL:
                        this.dragFlag.source.setTop(corr.top - i.top);
                        this.dragFlag.target.setTop(corr.top - i.top);
                        break;
                    case connlibLine.lineType.VERTICAL:
                        this.dragFlag.source.setLeft(corr.left - i.left);
                        this.dragFlag.target.setLeft(corr.left - i.left);
                        break;
                }
                break;
                */
                case ConnlibPanWrapper:
                    let t = (this.dragFlag as ConnlibPanWrapper).calculateTransform(event.clientX, event.clientY);
                    Connlib.moveX = t.x;
                    Connlib.moveY = t.y;
                    Connlib.applyTransform();
                    break;
                case ConnlibConnectionCreateWrapper:
                    (this.dragFlag as ConnlibConnectionCreateWrapper).updateTarget(c.left + event.offsetX, c.top + event.offsetY);
                    break;
            }
        });
        window.addEventListener("mouseup", () => {
            switch (this.dragFlag.constructor) {
                case ConnlibConnectionCreateWrapper:
                    (this.dragFlag as ConnlibConnectionCreateWrapper).destroy();
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
                e1.direction = ConnlibDirection.BOTTOM;
                e1.source = connector.target;
            } else {
                console.warn("cannot calculate path: overlaping source and target");
                return;
            }
        } else {
            let fun = this.calcFunForTwoPoints(connector.source.middle, connector.target.middle);
            let interSource = this.calculateBoundingIntersections(connector.source, fun);
            let interTarget = this.calculateBoundingIntersections(connector.target, fun);
            if (!this.rootInstance.rendered) this.rootInstance.render();
            let eSource = ConnlibExtensions.getClosestPointToRefPoint(interSource, connector.target.middle).p as ConnlibEndpoint;
            var source = new ConnlibEndpoint();
            source.left = eSource.left;
            source.top = eSource.top;
            source.source = connector.source;
            source.direction = eSource.direction;
            source.setUp(this.rootInstance);
            this.rootInstance.registerEndpoint(source);
            let eTarget = ConnlibExtensions.getClosestPointToRefPoint(interTarget, connector.source.middle).p as ConnlibEndpoint;
            var target = new ConnlibEndpoint();
            target.left = eTarget.left;
            target.top = eTarget.top;
            target.source = connector.source;
            target.direction = eTarget.direction;
            target.setUp(this.rootInstance);
            this.rootInstance.registerEndpoint(target);
            let sourceCell = this.rootInstance.getGridCellForRawEndpoint(this.getEndpointConnectionPoint(source));
            let targetCell = this.rootInstance.getGridCellForRawEndpoint(this.getEndpointConnectionPoint(target));
            let pathPoints = ConnlibExtensions.IDAStar(this.rootInstance, sourceCell, targetCell, source.direction);
            connector.updatePathPoints(this.cellsArrayToPathPointArray(pathPoints));

        }
    }

    // static observables afterwards
    public static scaleChangeObservable: Subject<number> = new Subject();
    public static standaloneSetupObservable: Subject<any> = new Subject();
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
    static IDAStar(connlibInstance: ConnlibInstance, e1: ConnlibGridCell, e2: ConnlibGridCell, direction: number) {
        let source: ConnlibGridCell = e1;
        let target: ConnlibGridCell = e2;
        var costs = {};
        var stack: any = {};
        var threshold = this.manhattanDistance(source, target);
        stack[threshold.toString()] = {};
        stack[threshold.toString()][source.r] = source;
        var found = false;
        let max = 100000;
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
                    let breakPoints = [];
                    for (let pI in path) {
                        if (path[pI].c == source.c && path[pI].r == source.r) {
                            breakPoints.push(source);
                        } else if (parseInt(pI) == 0) {
                            breakPoints.push(path[(parseInt(pI)).toString()]);
                        } else {
                            if (path[(parseInt(pI) - 1).toString()].d != path[pI].d) breakPoints.push(path[(parseInt(pI) - 1).toString()]);
                        }
                    }
                    breakPoints.push(target);
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

    soureSubscription: Subscription;
    targetSubscription: Subscription;

    orientation: number;
    direction: number;

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
    }
    /**
     * the method sets the line's source and target (+orientation +direction)
     * @param source 
     * @param target 
     */
    setSourceAndTarget(source: ConnlibPathPoint, target: ConnlibPathPoint) {
        this._setSource(source);
        this._setTarget(target);
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
        this.soureSubscription = this._source.positionChangeObservable.subscribe(() => {
            console.log("source point updated!");
        });
    }

    private _setTarget(point: ConnlibPathPoint) {
        if (!point.isSettedUp) throw ("point is not setted up!");
        if (this.targetSubscription) {
            this.targetSubscription.unsubscribe();
            this._target = null;
        }
        this._target = point;
        this.targetSubscription = this._target.positionChangeObservable.subscribe(() => {
            console.log("target point updated!");
        });
    }
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

    getEndpoints() {
        return this._pathPoints.filter(x => (x as ConnlibEndpoint).source != null);
    }

    removeLine(line: ConnlibLine): boolean {
        if (this._lines[line.guid]) {
            delete this._lines[line.guid];
            return true;
        }
        return false;
    }

    updatePathPoints(points: ConnlibPathPoint[]) {
        if (points.length < 2) {
            console.warn("path is invalid: no path points found - started path auto calculation");
            Connlib.startCompletePathCalculation(this);
        } else {
            while (Object.keys(this._lines).length > 0) {
                this._lines[Object.keys(this._lines)[0]].destroy();
            }
            this._pathPoints = points;
            for (var i = 1; i < points.length; i++) {
                let l = new ConnlibLine();
                l.connection = this;
                l.connlibInstance = this.connlibInstance;
                l.setSourceAndTarget(points[i - 1], points[i]);
                this._lines[l.guid] = l;
            }
            console.log(this._lines);
        }
    }

    validate() {
        this.componentRef.setState({
            lines: Object.keys(this._lines).map(key => this._lines[key])
        });
    }
}

class ConnlibConnectionValidationInit {
    isValid: boolean;
    callback: Subject<ConnlibConnection>;
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
    // the layers represented within the 
    private _layers: { [key: number]: ConnlibLayerData } = {};

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
    addLayer(elementId: number, layer: ConnlibLayerData): boolean {
        if (!this._layers[elementId]) {
            this._layers[elementId] = layer;
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
        for (let index in this._layers) {
            if (this._layers[index].domElement == data.source) {
                source = this._layers[index];
                break;
            }
        }
        var target = null;
        for (let index in this._layers) {
            if (this._layers[index].domElement == data.target) {
                target = this._layers[index];
                break;
            }
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
        c.connlibInstance = this;
        this._connections[c.guid] = c;
        c.source = source;
        c.target = target;
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
        return this._layers[elementId];
    }

    makeSource(element: HTMLElement, options: ConnlibSourceOptionsInit) {

    }

    makeTarget(element: HTMLElement, options: ConnlibTargetOptionsInit) {

    }
    /**
     * the method transforms the raw point (position on screen) to a instance point (position on instance)
     */
    rawPointToInstancePoint(point: ConnlibEndpoint): ConnlibEndpoint {
        let o = new ConnlibEndpoint();
        o.left = point.left - this.layer.left;
        o.top = point.top - this.layer.top;
        o.source = point.source;
        o.direction = point.direction;
        o.type = point.type;
        o.setUp(this);
        return o;
    }
    registerConnector(connector: ConnlibConnection) {
        this._connections[connector.guid] = connector;
    }

    registerEndpoint(point: ConnlibEndpoint) {
        this._endPoints[point.guid] = point;
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
        let connectorArray = Object.keys(this._connections).map(key => this._connections[key]);
        let endpointArray = Object.keys(this._endPoints).map(key => this._endPoints[key]);
        this.componentRef.setState({
            guid: this.guid,
            layer: this.layer,
            deepth: this._deepth,
            endpoints: endpointArray,
            connectors: connectorArray
        });
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
    setContainer(element: HTMLElement, layer?: ConnlibLayerData) {
        this.container = element;
        this.componentRef = ReactDOM.render(
            React.createElement(ConnlibInstanceComponent),
            document.getElementById(element.id)
        );
        if (layer) {
            this.layer = layer;
        } else {
            this.layer.left = 0;
            this.layer.top = 0;
            this.layer.width = element.clientWidth;
            this.layer.height = element.clientHeight;
        }
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
        let blocks = this.container.getElementsByClassName(Connlib.blockingClassName);
        for (let element of blocks) {
            let left = parseFloat((element as HTMLElement).style.left) - this.layer.left;
            let top = parseFloat((element as HTMLElement).style.top) - this.layer.top;
            let l = Math.round(left / Connlib.connlibGridScale) * Connlib.connlibGridScale;
            let r = Math.round((element.clientWidth + left) / Connlib.connlibGridScale) * Connlib.connlibGridScale;
            let t = Math.round(top / Connlib.connlibGridScale) * Connlib.connlibGridScale;
            let b = Math.round((element.clientHeight + top) / Connlib.connlibGridScale) * Connlib.connlibGridScale;
            for (var row = t; row <= b; row += Connlib.connlibGridScale) {
                if (!this._internalGrid.cells[row]) console.log("row undefined in grid: " + row, this._internalGrid);
                for (var col = l; col <= r; col += Connlib.connlibGridScale) {
                    if (!this._internalGrid.cells[row][col]) console.warn("column " + col + " is undefined in grid row " + row);
                    this._internalGrid.cells[row][col].w = 0;
                }
            }
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
            let type = (this.state as any).type as ConnlibEndpointInterface;
            var top: number;
            var height: number;
            var left: number;
            var width: number;
            switch ((this.state as any).direction) {
                case ConnlibDirection.TOP:
                    if (type.hasPort && type.portWidth > type.width) {
                        left = ((this.state as any).left - (type.portWidth / 2));
                        width = type.portWidth;
                    } else {
                        left = ((this.state as any).left - (type.width / 2));
                        width = type.width;
                    }
                    top = (this.state as any).top - type.height;
                    height = type.height;
                    break;
                case ConnlibDirection.RIGHT:
                    left = (this.state as any).left;
                    width = type.height;
                    if (type.hasPort && type.portWidth > type.width) {
                        top = ((this.state as any).top - (type.portWidth / 2));
                        height = type.portWidth;
                    } else {
                        top = ((this.state as any).top - (type.width / 2));
                        height = type.width;
                    }
                    break;
                case ConnlibDirection.BOTTOM:
                    if (type.hasPort && type.portWidth > type.width) {
                        left = ((this.state as any).left - (type.portWidth / 2));
                        width = type.portWidth;
                    } else {
                        left = ((this.state as any).left - (type.width / 2));
                        width = type.width;
                    }
                    top = (this.state as any).top;
                    height = type.height;
                    break;
                case ConnlibDirection.LEFT:
                    left = (this.state as any).left - type.height;
                    width = type.height;
                    if (type.hasPort && type.portWidth > type.width) {
                        top = ((this.state as any).top - (type.portWidth / 2));
                        height = type.portWidth;
                    } else {
                        top = ((this.state as any).top - (type.portWidth / 2));
                        height = type.width;
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
            return <svg className="connlib-endpoint" style={style}></svg>
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
            let style = {
                height: (this.state as any).layer.height,
                width: (this.state as any).layer.width,
                left: (this.state as any).layer.left,
                top: (this.state as any).layer.top
            };
            let connectors: any[] = [];
            let endpoints: any[] = [];
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
    private pathWithoutR(lines: ConnlibLine[]): string {
        let max = lines.length;
        var i = 0;
        var d = "";
        for (let line of (this.state as any).lines) {
            if (i == 0) {
                if (max > 2) {
                    d += "M " + (line as ConnlibLine).sL + " " + (line as ConnlibLine).sT + " ARC " + " L " + (line as ConnlibLine).tL + " " + (line as ConnlibLine).tT;
                } else {
                    d += "M " + (line as ConnlibLine).sL + " " + (line as ConnlibLine).sT + " L " + (line as ConnlibLine).tL + " " + (line as ConnlibLine).tT;
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
            var d: string;
            var max = (this.state as any).lines.length;
            if (Connlib.pathCornerRadius > 0) {
                for (let i = 1; i < max; i++) {
                    let prevLine = (this.state as any).lines[i - 1] as ConnlibLine;
                    let currLine = (this.state as any).lines[i] as ConnlibLine;
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
                    if (i == 1) {
                        d = "M" + prevLine.sL + "," + prevLine.sT + " L";
                    } else {
                        d += " L ";
                    }
                    if (prevLine.orientation == ConnlibOrientation.HORIZONTAL) {
                        if (prevLine.direction == ConnlibDirection.RIGHT) {
                            d += (prevLine.tL - r) + ",";
                        } else if (prevLine.direction == ConnlibDirection.LEFT) {
                            d += (prevLine.tL + r) + ",";
                        }
                        d += prevLine.sT;
                    } else if (prevLine.orientation == ConnlibOrientation.VERTICAL) {
                        d += prevLine.sL + ",";
                        if (prevLine.direction == ConnlibDirection.BOTTOM) {
                            d += (prevLine.tT - r);
                        } else if (prevLine.direction == ConnlibDirection.TOP) {
                            d += (prevLine.tT + r);
                        }
                    } else {
                        console.warn("don't know how to handle lopsided connectors ...");
                        d += prevLine.tL + "," + prevLine.tT;
                    }
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
                        case ConnlibDirection.RIGHT:
                            d += " A" + r + "," + r + " " + cW + " " + (prevLine.tL - Connlib.pathCornerRadius) + "," + prevLine.tT;
                            break;
                    }
                    if (i == (max - 1)) {
                        // only start
                        d += " L" + currLine.tL + "," + currLine.tT;
                    }
                }
            } else {
                d = this.pathWithoutR((this.state as any).lines);
            }
            return <path d={d} stroke="black" fill="transparent" strokeWidth="1" />
        }
        return null;
    }
}

class ConnlibConnectInit {
    source: HTMLElement;
    target: HTMLElement;
    anchor: [];
    anchors: [[]];
    connector: [];
    overlays: [];
    endpoint: string;
    paintStyle: ConnlibPaintStyle;
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
const ConnlibEndpointType = {
    "DEFAULT": 0,
    "ARROW": 1,
    "INHERITANCE": 2,
    "PORT": 3
}
const ConnlibTypeMap: { [key: string]: ConnlibTypeMapEntry } = {
    "io.framed.model.Attribute": {
        type: ConnlibAttribute,
        class: "attribute",
        hasChildren: false
    },
    "io.framed.model.Class": {
        type: ConnlibClass,
        class: "class",
        hasChildren: false
    },
    "io.framed.model.Compartment": {
        type: ConnlibCompartment,
        class: "compartment",
        hasChildren: true
    },
    "io.framed.model.Composition": {
        type: ConnlibComposition,
        class: "composition",
        hasChildren: false
    },
    "io.framed.model.CreateRelationship": {
        type: ConnlibCreateRelationship,
        class: "create-relationship",
        hasChildren: false
    },
    "io.framed.model.DestroyRelationship": {
        type: ConnlibDestroyRelationship,
        class: "destroy-relationship",
        hasChildren: false
    },
    "io.framed.model.Event": {
        type: ConnlibEvent,
        class: "event",
        hasChildren: false
    },
    "io.framed.model.Fulfillment": {
        type: ConnlibFulfillmentRelationship,
        class: "fulfillment",
        hasChildren: false
    },
    "io.framed.model.Package": {
        type: ConnlibPackage,
        class: "package",
        hasChildren: true
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
        this.path.style.stroke = "black";
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

// the default stencil
/**
 * a default inheritance
 */
class ConnlibInheritance implements ConnlibEndpointInterface {
    width: number = Connlib.endpointSize;
    height: number = Connlib.endpointHeightFormula(Connlib.endpointSize);
    hasPort: boolean = false;
    fill: string = "transparent";
    portBorderColor: string;
    portBorderWidth: number;
    portColor: string;
    portWidth: number;
    arrowFill: string = "#ffffff";
    arrowType: number = ConnlibEndpointType.INHERITANCE;
}
/**
 * a default relation without arrows
 */
class ConnlibRelationship implements ConnlibEndpointInterface {
    width: number;
    height: number;
    hasPort: boolean;
    fill: string;
    portBorderColor: string;
    portBorderWidth: number;
    portColor: string;
    portWidth: number;
    arrowFill: string;
    arrowType: number;
    constructor() {
        this.arrowType = ConnlibEndpointType.DEFAULT;
        this.fill = "transparent";
        this.hasPort = false;
        this.width = Connlib.endpointSize;
        this.height = Connlib.endpointHeightFormula(this.width);
    }
}