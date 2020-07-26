import {
    Connlib,
    ConnlibAttribute,
    ConnlibMethod,
    ConnlibModelElement,
    ConnlibMetaData,
    ConnlibAbstractStructuralType,
    ConnlibLayerWrapper,
    ConnlibConnectionWrapper,
    ConnlibEvent,
    ConnlibObjectType,
    ConnlibEventTypes
} from './classes';

export class FramedIoDataInterface {
    root: [string, ConnlibModelElement];
    connections: ConnlibConnectionWrapper;
    layer: ConnlibLayerWrapper;
}

export class FramedIoAbstractRelationship {
    id: number;
    sourceId: number;
    targetId: number;
    name: string;
}

export class FramedIoComposition extends FramedIoAbstractRelationship { }
export class FramedIoCreateRelationship extends FramedIoAbstractRelationship { }
export class FramedIoDestroyRelationship extends FramedIoAbstractRelationship { }
export class FramedIoFulfillmentRelationship extends FramedIoAbstractRelationship { }

export class FramedIoClass extends ConnlibAbstractStructuralType {
    id: number;
    name: string;
    attributes: [];
    methods: [];
}

export class FramedIoCompartment extends ConnlibAbstractStructuralType {
    id: number;
    name: string;
    attributes: [[string, ConnlibAttribute]];
    methods: [[string, ConnlibMethod]];
    children: [[string, ConnlibModelElement]];
    static backgroundColor = "#ffffd3";
}

export class FramedIoEvent extends ConnlibEvent {
    id: number;
    type: string;
    desc: string;
    onInit(data: FramedIoEvent){
        this.desc = data.desc;
        switch(data.type){
            case "STANDARD":
                this.icon = ConnlibEventTypes.Standard;
                break;
        }
        console.log(data);
    }
}

export class FramedIoInheritance {
    id: number;
    sourceId: number;
    targetId: number;
    name: string;
}

export class FramedIoPackage extends ConnlibAbstractStructuralType {
    id: number;
    name: string;
    metadata: ConnlibMetaData;
    children: [string, ConnlibModelElement];
}

export class FramedIoRelationship {
    id: number;
    sourceId: number;
    targetId: number;
    name: string;
}

export class FramedIoRoleType {
    id: number;
    name: string;
    occurrenceConstraint: string;
    attributes: [[string, ConnlibAttribute]];
    methods: [[string, ConnlibMethod]];
}

export class FramedIoScene extends ConnlibAbstractStructuralType {
    id: number;
    name: string;
    attributes: [[string, ConnlibAttribute]];
    children: [[string, ConnlibModelElement]];
    static backgroundColor = "rgb(239 255 238)";
}

export class FramedIoModule {
    static importData(data: FramedIoDataInterface){
        let start = performance.now();
        Connlib.clear();

        let rootElement = (data.root[1] as any);
        if (!rootElement) throw ("no root element within the input file!");

        let rootId = rootElement.id;
        if (!Number.isInteger(rootId)) throw ("the root element has no valid identifier!");

        let rootLayer = data.layer[rootId].data;
        let rootLayerLayer = rootLayer[rootId];
        if (!rootLayerLayer) throw ("the layer needs to be represent within itself");

        Connlib.createRootInstance();

        rootLayerLayer.connlibInstance = Connlib.rootInstance;

        for (let child of rootElement.children) {
            if (Connlib.renderComponents){
                Connlib.rootInstance.registerChild(child[0], child[1], rootLayer[child[1].id]);
            } else {
                throw("cannot proceed!");
            }
        }

        // afterwards, update grid
        if (Connlib.useOverlapDetection) Connlib.rootInstance.updateGrid();

        /*
        for (let connectorId in rootLayerLayer.connectors) {
            let connectorObjectArray = data.connections.connections.find(x => x[1].id === parseInt(connectorId));
            let connectorData = rootLayerLayer.connectors[connectorId];
            let connector = new ConnlibConnection();
            connector.connlibInstance = rootInstance;
            connector.source = rootInstance.getLayerByElementId(connectorObjectArray[1].sourceId);
            connector.target = rootInstance.getLayerByElementId(connectorObjectArray[1].targetId);
            connector.updatePathPoints(connectorData.pathPoints, null, null);
            rootInstance.registerConnector(connector);
        }
        */

        Connlib.rootInstance.render();
        let end = performance.now();
        console.log("finished in: " + (end - start).toFixed(0) + "ms")
    }
    static registerAllConstructs() {
        Connlib.registerType("io.framed.model.Class", { type: FramedIoClass, class: "class", hasChildren: false });
        Connlib.registerType("io.framed.model.Compartment", { type: FramedIoCompartment, class: "compartment", hasChildren: true });
        Connlib.registerType("io.framed.model.Event", { type: FramedIoEvent, class: "event", hasChildren: false });
        Connlib.registerType("io.framed.model.Inheritance", { type: FramedIoInheritance, class: "inheritance", hasChildren: false });
        Connlib.registerType("io.framed.model.Package", { type: FramedIoPackage, class: "package", hasChildren: true });
        Connlib.registerType("io.framed.model.Relationship", { type: FramedIoRelationship, class: "relationship", hasChildren: false });
        Connlib.registerType("io.framed.model.RoleType", { type: FramedIoRoleType, class: "roletype", hasChildren: false });
        Connlib.registerType("io.framed.model.Scene", { type: FramedIoScene, class: "scene", hasChildren: true });
        Connlib.registerType("io.framed.model.Composition", { type: FramedIoComposition, class: "composition", hasChildren: false });
        Connlib.registerType("io.framed.model.CreateRelationship", { type: FramedIoCreateRelationship, class: "create-relationship", hasChildren: false });
        Connlib.registerType("io.framed.model.DestroyRelationship", { type: FramedIoDestroyRelationship, class: "destroy-relationship", hasChildren: false }),
        Connlib.registerType("io.framed.model.Fulfillment", { type: FramedIoFulfillmentRelationship, class: "fulfillment", hasChildren: false });
    }
}