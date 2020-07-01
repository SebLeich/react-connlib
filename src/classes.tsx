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
    constructor(object: ConnlibConnectionInstantiationObject){
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

    // should connlib render components at the dom?
    static renderComponents = true;
    // the root element
    static renderComponentsRoot: HTMLElement = document.getElementById("root");
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
    public static set connlibGridScale(scale: number){
        this._connlibGridScale = scale;
        this.scaleChangeObservable.next(scale);
    }

    private static _zoom = 1;
    public static get zoom(): number {
        return this._zoom;
    }
    public static set zoom(zoom: number){
        this._zoom = zoom;
        this.zoomChangeObservable.next(zoom);
    }

    /**
     * the method clears all connlib instances
     */
    public static clear(){
        for(let instanceId in this.instances){
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
    public static getInstanceByGuid(guid: string){
        return this.instances[guid];
    }
    /**
     * the method enables user's to upload data
     * after upload, the connlib elements getting repainted
     */
    public static importData(data: ConnlibDataInterface){

        this.clear();

        // @ts-ignore
        let type = ConnlibTypeMap[data.root[0]];
        if(!type) throw("unknown type of the root element: " + data.root[0]);
        
        let rootElement = (data.root[1] as typeof type);
        if(!rootElement) throw("no root element within the input file!");

        let rootId = parseInt(rootElement.id);
        if(!Number.isInteger(rootId)) throw("the root element has no valid identifier!");

        let rootLayer = data.layer[rootId].data;
        let rootLayerLayer = rootLayer[rootId];
        if(!rootLayerLayer) throw("the layer needs to be represent within itself");

        let rootInstance = this.getInstance();
        rootInstance.setContainer(this.renderComponentsRoot, rootLayerLayer);
    }
    /**
     * the method redraws all connlib instances
     */
    public static repaintEverything(){
        for(let guid in this.instances) this.instances[guid].repaintEverything();
    }

    // static observables afterwards
    public static scaleChangeObservable: Subject<number> = new Subject();
    public static zoomChangeObservable: Subject<number> = new Subject();
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

    addEndpoint(target: HTMLElement, options: ConnlibEndpointOptionsInit){

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
        if(!this.connections[connection.guid]){
            throw("cannot delete connection: no connection found with the passed guid");
        }
        delete this.connections[connection.guid];
    }
    deleteEndpoint(element: HTMLElement){

    }
    deleteEveryConnection(){

    }
    deleteEveryEndpoint(){

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
    makeSource(element: HTMLElement, options: ConnlibSourceOptionsInit){

    }
    makeTarget(element: HTMLElement, options: ConnlibTargetOptionsInit){

    }
    /**
     * the method removes the current instance from the dom
     */
    remove(){
        ReactDOM.unmountComponentAtNode(this.container);
        this.componentRef = null;
    }
    repaintEverything(){

    }
    reset(){

    }
    revalidate(element: HTMLElement){
        // redraw all assigned connections
    }
    setContainer(element: HTMLElement, layer?: ConnlibLayerData) {
        this.container = element;
        this.componentRef = ReactDOM.render(
            React.createElement(ConnlibInstanceComponent),
            document.getElementById(element.id)
        );
        if(layer){
            this.layer = layer;
            this.componentRef.setState({
                guid: this.guid,
                layer: layer
            });
        } else {
            this.layer.left = 0;
            this.layer.top = 0;
            this.layer.width = element.clientWidth;
            this.layer.height = element.clientHeight;
            this.componentRef.setState({
                guid: this.guid
            });
        }
    }
    setSourceEnabled(element: HTMLElement){

    }
    setTargetEnabled(element: HTMLElement){

    }
    setZoom(zoom: number){

    }
    unmakeEverySource(){

    }
    unmakeEveryTarget(){

    }
    unmakeSource(element: HTMLElement){
        
    }
    unmakeTarget(element: HTMLElement){

    }
    /**
     * the method recalculates the instance's internal grid
     */
    updateGrid(){
        this.internalGrid = new ConnlibGrid(this.layer.width, this.layer.height);
    }

    // instance's observables
    public gridChangeObservable: Subject<ConnlibInstance> = new Subject();
}
/**
 * a connlib instance's react component for DOM interaction
 */
class ConnlibInstanceComponent extends React.Component {
    /**
     * the method is called on component rendering
     */
    render() {
        if((this.state as any)){
            if((this.state as any).layer){
                let style = {
                    height: (this.state as any).layer.height,
                    width: (this.state as any).layer.width,
                    left: (this.state as any).layer.left,
                    top: (this.state as any).layer.top
                };
                return (
                    <svg className="connlib-instance" style={style} >
                        {(this.state as any).guid}
                    </svg>
                );
            } else {
                return (
                    <svg className="connlib-instance" >
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
    constructor(){

    }
}
export class ConnlibTargetOptionsInit {
    allowLoopback: boolean;
    constructor(){

    }
}
export class ConnlibPaintStyle {
    stroke: string;
    strokeWidth: number;
    dashstyle: string;
    fill: string;
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

const ConnlibTypeMap = {
    "io.framed.model.Attribute": ConnlibAttribute,
    "io.framed.model.Class": ConnlibClass,
    "io.framed.model.Compartment": ConnlibCompartment,
    "io.framed.model.Composition": ConnlibComposition,
    "io.framed.model.CreateRelationship": ConnlibCreateRelationship,
    "io.framed.model.DestroyRelationship": ConnlibDestroyRelationship,
    "io.framed.model.Event": Event,
    "io.framed.model.Fulfillment": ConnlibFulfillmentRelationship,
    "io.framed.model.Inheritance": ConnlibInheritance,
    "io.framed.model.Relationship": ConnlibRelationship,
    "io.framed.model.RoleType": ConnlibRoleType,
    "io.framed.model.Package": ConnlibPackage,
    "io.framed.model.Scene": ConnlibScene
}