import { Connlib, ConnlibDataInterface } from './classes';
import * as input from "../assets/input.json";

(window as any).Connlib = Connlib;

document.getElementById("upload").addEventListener("click", () => {
    Connlib.importData(input as any);
});
document.getElementById("toggle-blocking-cells").addEventListener("click", () => {
    Connlib.rootInstance.toggleBlockedCells();
});

Connlib.standaloneSetupObservable.subscribe(() => {
    Connlib.importData(input as any);
    Connlib.moveX = 150;
    Connlib.moveY = 150;
    Connlib.applyTransform();
});
document.addEventListener("DOMContentLoaded", function () {
    Connlib.setUpStandalone();
});