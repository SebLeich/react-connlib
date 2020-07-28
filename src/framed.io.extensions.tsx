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
    ConnlibEventTypes,
    ConnlibConnection,
    ConnlibFulfillmentEndpoint,
    ConnlibEventRelationEndpoint,
    ConnlibDottedLineStyle,
    ConnlibAggregationEndpoint,
    ConnlibCompositionEndpoint,
    ConnlibDashedLineStyle
} from './classes';
import { number } from 'prop-types';

export class FramedIoDataInterface {
    root: [string, ConnlibModelElement];
    connections: ConnlibConnectionWrapper;
    layer: ConnlibLayerWrapper;
}

class FramedIoConnectionWrapper {
    id: number;
    sourceId: number;
    targetId: number;
    name: string;
}

export class FramedIoAbstractRelationship extends ConnlibConnection {
    id: number;
    sourceId: number;
    targetId: number;
    name: string;
}

export class FramedIoRelationship extends FramedIoAbstractRelationship { }
export class FramedIoAggregation extends FramedIoAbstractRelationship {
    static targetEndpointType = new ConnlibAggregationEndpoint();
}
export class FramedIoComposition extends FramedIoAbstractRelationship {
    static targetEndpointType = new ConnlibCompositionEndpoint();
}
export class FramedIoCreateRelationship extends FramedIoAbstractRelationship {
    static targetEndpointType = new ConnlibEventRelationEndpoint();
    static lineStyle = new ConnlibDashedLineStyle();
}
export class FramedIoDestroyRelationship extends FramedIoAbstractRelationship { }
export class FramedIoFulfillmentRelationship extends FramedIoAbstractRelationship {
    static targetEndpointType = new ConnlibFulfillmentEndpoint();
}

export class FramedIoClass extends ConnlibAbstractStructuralType {
    id: number;
    name: string;
    attributes: [];
    methods: [];
    static backgroundColor = "rgb(239 239 239)";
}

export class FramedIoCompartment extends ConnlibAbstractStructuralType {
    id: number;
    name: string;
    attributes: [[string, ConnlibAttribute]];
    methods: [[string, ConnlibMethod]];
    children: [[string, ConnlibModelElement]];
    static backgroundColor = "#ffffd3";
    static borderRadius = 3;
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
    static borderRadius = 3;
    static backgroundColor = "rgb(239 255 238)";
}

class EmbeddedRelations {
    parent: number = null;
    child: number = null;
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

        let embeddedMap: EmbeddedRelations[] = [];

        for (let child of rootElement.children) {
            if (Connlib.renderComponents){
                Connlib.rootInstance.registerChild(child[0], child[1], rootLayer[child[1].id]);
                let type = Connlib.getTypeMapEntry(child[0]);
                if(type.hasChildren) for(let c of child[1].children){
                    embeddedMap.push({ parent: child[1].id, child: c[1].id });
                }
            } else {
                throw("cannot proceed!");
            }
        }

        // afterwards, update grid
        if (Connlib.useOverlapDetection) Connlib.rootInstance.updateGrid();

        for(let index in data.connections.connections){
            let type: string = (data.connections.connections[index] as any)[0] as string;
            let connector: FramedIoConnectionWrapper = (data.connections.connections[index] as any)[1];
            if(Connlib.rootInstance.hasRepresentation(connector.sourceId) && Connlib.rootInstance.hasRepresentation(connector.targetId)){
                let connection = Connlib.rootInstance.connect({
                    sourceId: connector.sourceId,
                    targetId: connector.targetId,
                    typeNS: type
                });   
            } else {
                let embedded = embeddedMap.find(x => Connlib.rootInstance.hasRepresentation(connector.sourceId) && x.child == connector.targetId);
                if(embedded){
                    console.log(connector);
                    let connection = Connlib.rootInstance.connect({
                        sourceId: connector.sourceId,
                        targetId: embedded.parent,
                        typeNS: type,
                        hasPort: true
                    });   
                }
            }
        }
        
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
        Connlib.registerType("io.framed.model.Aggregation", { type: FramedIoAggregation, class: "aggregation", hasChildren: false }),
        Connlib.registerType("io.framed.model.Fulfillment", { type: FramedIoFulfillmentRelationship, class: "fulfillment", hasChildren: false });
    }
}