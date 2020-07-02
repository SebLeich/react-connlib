import * as React from "react";
import * as ReactDOM from "react-dom";
import { Subject } from "rxjs";

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

class ConnlibConnectionInstantiationObject {
    guid: string = Guid.newGuid();
}
export class ConnlibAbstractRelationship {
    id: number;
    sourceId: number;
    targetId: number;
    name: string;
    guid: string;
    constructor(object: ConnlibConnectionInstantiationObject) {
        this.guid = object.guid;
    }
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
export class ConnlibLayerData {
    left: number;
    top: number;
    width: number;
    height: number;
    autosize: boolean;
    data: any;
    labels: ConnlibLabel[];
    connectors: ConnlibConnectorDataWrapper;
}
export class ConnlibPathPoint {
    left: number;
    top: number;
    endpoint: ConnlibPathPointEndpointOptions;
}
class ConnlibPathPointEndpointOptions {
    sourceId: number;
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

export class Connlib {
    // is the library setted up in the standalone mode?
    static standaloneSetup = false;
    /**
     * does the connlib library listen to window events, containing:
     * arrow keys (keycodes: 37 - 40)
     */
    static windowListenersSettedUp = false;
    static moveStep = 50; // the step size of the window move events
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

    /**
     * the method applys the transform to all contents
     */
    public static applyTransform() {
        this.rootInstance.container.style.transform = "translate(" + this.moveX + "px, " + this.moveY + "px)";
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
                if (this.renderComponents) this.renderComponent(childType, rootLayer[child[1].id], rootInstance.container);
                if (childType.hasChildren) {
                    let currentInstance = this.getInstance();
                    currentInstance.deepth = 1;
                    currentInstance.setContainer(this.renderComponentsRoot, rootLayerLayer);
                }
            }
        }

        // afterwards, set container and update grid
        rootInstance.updateGrid();

        let end = performance.now();
        console.log("finished in: " + (end - start).toFixed(0) + "ms")
    }
    /**
     * the method is currently used for render debug components
     */
    private static renderComponent(type: ConnlibTypeMapEntry, layer: ConnlibLayerData, container: HTMLElement) {
        let element = document.createElement("div");
        element.classList.add(type.class, "connlib-connection-blocked", "connlib-element");
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
    public static setUpStandalone(){
        this.standaloneSetup = true;
        this.renderComponents = true;
        this.setUpWindowListeners();
        this.standaloneSetupObservable.next();
    }
    /**
     * the method sets the window listeners up
     */
    public static setUpWindowListeners() {
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
    }

    // static observables afterwards
    public static scaleChangeObservable: Subject<number> = new Subject();
    public static standaloneSetupObservable: Subject<any> = new Subject();
    public static zoomChangeObservable: Subject<number> = new Subject();
}
/**
 * the class provides all the neccessary functionality needed for the library
 */
export class ConnlibExtensions {
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

export class ConnlibConnection {

}
export class ConnlibDropInfoInit {
    sourceId: string;
    targetId: string;
    connection: ConnlibConnection;
}

export class ConnlibInstance {

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
    private connections: { [key: string]: ConnlibAbstractRelationship } = {};

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

    bind(event: string, handler: (info: ConnlibDropInfoInit) => any) {

    }

    componentDidMount() {

    }

    componentWillUnmount() {

    }

    connect(data: ConnlibConnectInit): ConnlibConnection {
        let obj = new ConnlibConnectionInstantiationObject();
        let c = new ConnlibAbstractRelationship(obj);
        this.connections[obj.guid] = c;
        return c;
    }

    deleteConnection(connection: ConnlibAbstractRelationship) {
        if (!this.connections[connection.guid]) {
            throw ("cannot delete connection: no connection found with the passed guid");
        }
        delete this.connections[connection.guid];
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

    makeSource(element: HTMLElement, options: ConnlibSourceOptionsInit) {

    }

    makeTarget(element: HTMLElement, options: ConnlibTargetOptionsInit) {

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
    }
    /**
     * the method removes the current instance from the dom
     */
    remove() {
        ReactDOM.unmountComponentAtNode(this.container);
        this.componentRef = null;
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
            this.componentRef.setState({
                guid: this.guid,
                layer: layer,
                deepth: this._deepth
            });
        } else {
            this.layer.left = 0;
            this.layer.top = 0;
            this.layer.width = element.clientWidth;
            this.layer.height = element.clientHeight;
            this.componentRef.setState({
                guid: this.guid,
                deepth: this._deepth
            });
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
    toggleBlockedCells(){
        if(this._blockingCellsRendered){
            this._blockingCellsRendered = false;
            this.componentRef.clear();
            // rerender connectors
            let elements = document.getElementsByClassName("connlib-connection-blocked");
            for (let element of elements) (element as HTMLElement).style.display = "block";
        } else {
            this._blockingCellsRendered = true;
            let elements = document.getElementsByClassName("connlib-connection-blocked");
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
        this.internalGrid = new ConnlibGrid(this.layer.width, this.layer.height);
        let blocks = this.container.getElementsByClassName("connlib-connection-blocked");
        for (let element of blocks) {
            let left = parseFloat((element as HTMLElement).style.left) - this.layer.left;
            let top = parseFloat((element as HTMLElement).style.top) - this.layer.top;
            let l = Math.round(left / Connlib.connlibGridScale) * Connlib.connlibGridScale;
            let r = Math.round((element.clientWidth + left) / Connlib.connlibGridScale) * Connlib.connlibGridScale;
            let t = Math.round(top / Connlib.connlibGridScale) * Connlib.connlibGridScale;
            let b = Math.round((element.clientHeight + top) / Connlib.connlibGridScale) * Connlib.connlibGridScale;
            for (var row = t; row <= b; row += Connlib.connlibGridScale) {
                if(!this._internalGrid.cells[row]) console.log("row undefined in grid: " + row, this._internalGrid);
                for (var col = l; col <= r; col += Connlib.connlibGridScale) {
                    if(!this._internalGrid.cells[row][col]) console.warn("column " + col + " is undefined in grid row " + row);
                    this._internalGrid.cells[row][col].w = 0;
                }
            }
        }
    }

    // instance's observables
    public deepthChangeObservable: Subject<ConnlibInstance> = new Subject();
    public gridChangeObservable: Subject<ConnlibInstance> = new Subject();
}
/**
 * a connlib instance's react component for DOM interaction
 */
class ConnlibInstanceComponent extends React.Component {
    ref: React.RefObject<SVGSVGElement> = React.createRef();
    /**
     * the method enables user's to (hard) clear the svg
     */
    clear(){
        while (this.ref.current.lastChild) {
            this.ref.current.removeChild(this.ref.current.lastChild);
        }
    }
    /**
     * the method is called on component rendering
     */
    render() {
        if ((this.state as any)) {
            if ((this.state as any).layer) {
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
            } else {
                return (
                    <svg className="connlib-instance" data-deepth={(this.state as any).deepth} >
                        {(this.state as any).guid}
                    </svg>
                );
            }
        }
        return null;
    }
}

export class ConnlibConnectInit {
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
export class ConnlibEndpointOptionsInit {
    isSource: boolean;
    isTarget: boolean;
    anchors: string[] = [];
    endpoint: string;
    dragOptions: ConnlibDragOptionsInit;
    dropOptions: ConnlibDropOptionsInit;
    constructor() {

    }
}
export class ConnlibTargetOptionsInit {
    allowLoopback: boolean;
    constructor() {

    }
}
export class ConnlibPaintStyle {
    stroke: string;
    strokeWidth: number;
    dashstyle: string;
    fill: string;
}
/**
 * internal wrapper for a point
 */
class ConnlibPoint {
    left: number;
    top: number;
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