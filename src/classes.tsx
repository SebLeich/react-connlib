import * as React from "react";
import * as ReactDOM from "react-dom";
import { Subject } from "rxjs";
import { element } from "prop-types";

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
export class ConnlibInheritance extends ConnlibAbstractRelationship { }
export class ConnlibRelationship extends ConnlibAbstractRelationship { }
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
export class ConnlibPathPoint extends ConnlibPoint {
    endpoint: ConnlibPathPointEndpointOptions;
    constructor(){
        super();
    }
}
class ConnlibPathPointEndpointOptions {
    source: ConnlibLayerData;
    direction: number;
    type: number;
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
export class ConnlibRoleType extends ConnlibAbstractStructuralType {
    name: string;
    occurrenceConstraint: string;
    attributes: [[string, ConnlibAttribute]];
    methods: [[string, ConnlibMethod]];
}
export class ConnlibScene extends ConnlibAbstractStructuralType {
    name: string;
    attributes: [[string, ConnlibAttribute]];
    children: [[string, ConnlibModelElement]]
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
     */
    static windowListenersSettedUp = false;
    static useOverlapDetection = true;
    static blockingClassName = "connlib-connection-blocked";
    static connectableClassName = "connlib-connectable";
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
    private static _connlibGridScale = 10;
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
                endpoint: {
                    source: layer,
                    direction: ConnlibDirection.TOP,
                    type: null
                }
            });
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
                endpoint: {
                    source: layer,
                    direction: ConnlibDirection.RIGHT,
                    type: null
                }
            });
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
                endpoint: {
                    source: layer,
                    direction: ConnlibDirection.BOTTOM,
                    type: null
                }
            });
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
                endpoint: {
                    source: layer,
                    direction: ConnlibDirection.LEFT,
                    type: null
                }
            });
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
            connector.source = rootInstance.getLayerByElementId(connectorObjectArray[1].sourceId);
            connector.target = rootInstance.getLayerByElementId(connectorObjectArray[1].targetId);
            connector.pathPoints = connectorData.pathPoints;
            rootInstance.addConnector(connector);
        }

        rootInstance.render();
        rootInstance.renderEndpoints();
        let end = performance.now();
        console.log("finished in: " + (end - start).toFixed(0) + "ms")
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
            connector.validation.callback.next(null);
            return;
        }
        if (!connector.source.connlibInstance) {
            console.warn("cannot calculate path: undefined source layer's connlib instance!");
            connector.validation.callback.next(null);
            return;
        }
        if (!connector.target) {
            console.warn("cannot calculate path: undefined target layer!");
            connector.validation.callback.next(null);
            return;
        }
        if (!connector.target.connlibInstance) {
            console.warn("cannot calculate path: undefined target layer's connlib instance!");
            connector.validation.callback.next(null);
            return;
        }
        if (!connector.source.middle) connector.source.middle = this.calculateMiddle(connector.source);
        if (!connector.target.middle) connector.target.middle = this.calculateMiddle(connector.target);
        if (connector.source.middle.left == connector.target.middle.left) {
            if (connector.source.bottom > connector.target.top) {
                let e1 = new ConnlibPathPoint();
                e1.left = connector.source.middle.left;
                e1.top = connector.source.bottom;
                e1.endpoint = new ConnlibPathPointEndpointOptions();
                e1.endpoint.direction = ConnlibDirection.BOTTOM;
                e1.endpoint.source = connector.source;
                let e2 = new ConnlibPathPoint();
                e2.left = connector.target.middle.left;
                e2.top = connector.target.top;
                e2.endpoint = new ConnlibPathPointEndpointOptions();
                e2.endpoint.direction = ConnlibDirection.TOP;
                e2.endpoint.source = connector.target;

            } else if (connector.source.top < connector.target.bottom) {
                let e1 = new ConnlibPathPoint();
                e1.left = connector.source.middle.left;
                e1.top = connector.source.top;
                e1.endpoint = new ConnlibPathPointEndpointOptions();
                e1.endpoint.direction = ConnlibDirection.TOP;
                e1.endpoint.source = connector.source;
                let e2 = new ConnlibPathPoint();
                e2.left = connector.target.middle.left;
                e2.top = connector.target.bottom;
                e1.endpoint = new ConnlibPathPointEndpointOptions();
                e1.endpoint.direction = ConnlibDirection.BOTTOM;
                e1.endpoint.source = connector.target;
            } else {
                console.warn("cannot calculate path: overlaping source and target");
                connector.validation.callback.next(null);
                return;
            }
        } else {
            let fun = this.calcFunForTwoPoints(connector.source.middle, connector.target.middle);
            let interSource = this.calculateBoundingIntersections(connector.source, fun);
            let interTarget = this.calculateBoundingIntersections(connector.target, fun);
            if(!this.rootInstance.rendered) this.rootInstance.render();
            let eSource = ConnlibExtensions.getClosestPointToRefPoint(interSource, connector.target.middle);
            let eTarget = ConnlibExtensions.getClosestPointToRefPoint(interTarget, connector.target.middle);
            this.rootInstance.centeredRect(this.rootInstance.rawPointToInstancePoint(eSource.p), 5, "red", []);
            this.rootInstance.centeredRect(this.rootInstance.rawPointToInstancePoint(eTarget.p), 5, "red", []);
            console.log(eSource, eTarget);
        }
        connector.validation.callback.next(connector);
    }
    /**
     * the method transforms the given path point into a connlib point
     * @param point
     */
    public static transformConnlibPathPointToConnlibPoint(point: ConnlibPathPoint): ConnlibPoint {
        let output = new ConnlibPoint();
        output.left = point.left;
        output.top = point.top;
        return output;
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
    static getClosestPointToRefPoint(basis: ConnlibPoint[], ref: ConnlibPoint){
        return (basis.map(x => {
            return {
                dist: this.eukDist(x, ref),
                p: x
            }
        })).sort((a, b) => {
            if(a.dist > b.dist) return 1;
            else if(a.dist < b.dist) return -1;
            return 0;
        })[0];
    }
    /**
     * the method returns the manhattan distance between the two points
     * @param {*} p1 first point
     * @param {*} p2 second point
     */
    static manhattanDistance(point1: ConnlibPoint, point2: ConnlibPoint) {
        return Math.abs(point1.top - point2.top) + Math.abs(point1.left - point2.left);
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
                this.cells[r][c] = { "r": r, "c": c, "w": 1 };
            }
        }
    }
}
/**
 * a connlib line represents a linear path segment defined by a source and a target
 */
class ConnlibLine implements ConnlibDragFlagInterface {

}

export class ConnlibConnection {
    guid: string = Guid.newGuid();
    source: ConnlibLayerData;
    target: ConnlibLayerData;
    pathPoints: ConnlibPathPoint[] = [];
    validation: ConnlibConnectionValidationInit;
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
    // the endpoints
    private _endPoints: { [key: string]: ConnlibPathPoint } = {};
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

    addConnector(connector: ConnlibConnection) {
        this._connections[connector.guid] = connector;
        let endpoints = connector.pathPoints.filter(x => x.endpoint != null);
        if (endpoints.length < 2) {
            console.log("invalid connector added! this conenctor needs endpoints and a path calculation!", connector);
            connector.validation = new ConnlibConnectionValidationInit();
            connector.validation.isValid = false;
            connector.validation.callback = new Subject();
            Connlib.startCompletePathCalculation(connector);
        } else {
            connector.validation = new ConnlibConnectionValidationInit();
            connector.validation.isValid = true;
            connector.validation.callback = null;
        }
    }

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
    rawPointToInstancePoint(point: ConnlibPoint): ConnlibPoint {
        return {
            left: point.left - this.layer.left,
            top: point.top - this.layer.top
        };
    }
    /**
     * the method renders a rectangle at the given position (in center) with the given color
     * @param {*} point 
     * @param {*} color 
     */
    centeredRect(point: ConnlibPoint, size: number, color: string, classList: string[]){
        let p = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        p.setAttribute("x", (point.left-(size/2)) + "px");
        p.setAttribute("y", (point.top-(size/2)) + "px");
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
        this.componentRef.setState({
            guid: this.guid,
            layer: this.layer,
            deepth: this._deepth
        });
        this.rendered = true;
        this.renderedObservable.next(this);
    }
    /**
     * the method renders the instance's connectors
     */
    renderConnectors(preventRenderIfInstanceIsNotRenderedYet?: boolean) {
        if (!this.rendered) {
            if (preventRenderIfInstanceIsNotRenderedYet) {
                console.warn("the connlib instance is not rendered and you setted the flag to prevent render of instance if is not rendered to true: thus, the connectors could not be rendered!");
                return;
            }
            this.render();
        }
        if (!this.endpointsRendered) {
            if (preventRenderIfInstanceIsNotRenderedYet) {
                console.warn("the connlib instance is not rendered and you setted the flag to prevent render of instance if is not rendered to true: thus, the connectors could not be rendered!");
                return;
            }
            this.renderEndpoints();
        }

    }

    renderEndpoints() {
        console.log("render endpoints ...");

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
            return (
                <svg className="connlib-instance" data-deepth={(this.state as any).deepth} style={style} ref={this.ref} >
                    {(this.state as any).guid}
                </svg>
            );
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
    "io.framed.model.Inheritance": {
        type: ConnlibInheritance,
        class: "inheritance",
        hasChildren: false
    },
    "io.framed.model.Relationship": {
        type: ConnlibRelationship,
        class: "relationship",
        hasChildren: false
    },
    "io.framed.model.RoleType": {
        type: ConnlibRoleType,
        class: "roletype",
        hasChildren: false
    },
    "io.framed.model.Package": {
        type: ConnlibPackage,
        class: "package",
        hasChildren: true
    },
    "io.framed.model.Scene": {
        type: ConnlibScene,
        class: "scene",
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