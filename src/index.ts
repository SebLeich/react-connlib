import { Connlib, ConnlibDataInterface } from './classes';
import * as input from "../assets/input.json";

(window as any).Connlib = Connlib;

document.getElementById("upload").addEventListener("click", () => {
    Connlib.importData(input as any);
});

setTimeout(() => Connlib.importData(input as any), 200);