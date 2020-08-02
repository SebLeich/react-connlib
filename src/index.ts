import { Connlib } from './classes';
import * as input from "../assets/input.json";
import { FramedIoModule, FramedIoDataInterface } from "./framed.io.extensions";

(window as any).Connlib = Connlib;
FramedIoModule.registerAllConstructs();

Connlib.standaloneSetupObservable.subscribe(() => {
    FramedIoModule.importData(input as any);
    Connlib.moveX = 150;
    Connlib.moveY = 150;
    Connlib.applyTransform();
    //alert("This is an alpha version of Connlib. Please use Google Chrome for maximum compatibility (such as drag functionality).");
});
document.addEventListener("DOMContentLoaded", function () {
    Connlib.setUpStandalone();
    let callback = (event: Event) => {
        let target = event.target as HTMLInputElement;
        if(target.files.length == 0) {
            console.log("no files selected!");
            return;
        }
        let reader = new FileReader();
        reader.onloadend = (data: any) => {
            try {
                var json = JSON.parse(data.target.result) as FramedIoDataInterface;
                FramedIoModule.importData(json);
            } catch(e){

            } finally {
                target.value = "";
                target.removeEventListener("change", callback);
            }
        }
        reader.readAsText(target.files[0], "utf-8");
    };
    document.getElementById("upload-input").addEventListener("change", callback);
});