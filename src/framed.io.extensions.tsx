import {
    Connlib,
    ConnlibAttribute,
    ConnlibMethod,
    ConnlibModelElement,
    ConnlibMetaData
} from './classes';

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

export class FramedIoClass {
    id: number;
    name: string;
    attributes: [];
    methods: [];
}

export class FramedIoCompartment {
    id: number;
    name: string;
    attributes: [[string, ConnlibAttribute]];
    methods: [[string, ConnlibMethod]];
    children: [[string, ConnlibModelElement]]
}

export class FramedIoEvent {
    id: number;
    type: string;
    desc: string;
}

export class FramedIoInheritance {
    id: number;
    sourceId: number;
    targetId: number;
    name: string;
}

export class FramedIoPackage {
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

export class FramedIoScene {
    id: number;
    name: string;
    attributes: [[string, ConnlibAttribute]];
    children: [[string, ConnlibModelElement]]
}

export class FramedIoModule {
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