import {
    Connlib,
    ConnlibAttribute,
    ConnlibMethod,
    ConnlibModelElement
} from './classes';

export class FramedIoInheritance {
    id: number;
    sourceId: number;
    targetId: number;
    name: string;
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

Connlib.registerType("io.framed.model.Inheritance", { type: FramedIoInheritance, class: "inheritance", hasChildren: false });
Connlib.registerType("io.framed.model.Relationship", { type: FramedIoRelationship, class: "relationship", hasChildren: false });
Connlib.registerType("io.framed.model.RoleType", { type: FramedIoRoleType, class: "roletype", hasChildren: false });
Connlib.registerType("io.framed.model.Scene", { type: FramedIoScene, class: "scene", hasChildren: true });