# Connlib
The repository contains Connlib, a repository for rendering connectors in the web. The library provides the following features:
- auto path calculation using automated shape-connector overlap detection
- add custom model constructs (relations and shapes) by inheriting predefined shapes

![Connlib demo image](./assets/demo.png)

In future, we plan to implement the following features:
- display intersections between connectors

A demo is available under: https://sebleich.github.io/react-connlib/ (please use with Google Chrome)

## getting started with Connlib

Initially, developers needs to decide whether they want to setup Connlib in standalone mode and use the predefined interfaces and functionalities or as integrated library. 
If you are not sure which mode is the best solution for your use-case follow the procedure below. 

![Connlib standalone vs. integrated mode](./assets/standalonevsintegratedconnlib.png)

However, you need to start by listening on the DOMContentLoaded event by adding `document.addEventListener("DOMContentLoaded", callbackFunction)`.

### Connlib as standalone application

In that case, your `callbackFunction()` must call the function `Connlib.setUpStandalone()`. 
Thereby, 

### Connlib as integrated library

## using Connlib with a custom framework

Connlib provides connection-shape overlap prevention. 
Therefore, we implemented an IDA* algorithm. 
The recommended flow is represented within the activity diagram below. 
Initially, a new Connlib instance should be initialized by calling `Connlib.createRootInstance()`. 
By default, Connlib searches for a root element (a div HTML element) with the identifer `id = 'root'`. 
Developers can change the root container by overwriting the public property `rootContainer` at the static `Connlib` object. 
Therefore, we recommend to use the JavaScript call `Connlib.rootContainer = document.getElementById('fooContainer')`. 
Afterwards, the Connlib root instance can be accessed by calling `Connlib.rootInstance`. 
Finally, all created Connlib istances should be rendered by calling the instance's method `instance.render()`. 
Alternatively, the static method `Connlib.render()` renders all Connlib instances. 

![Connlib activity](./assets/activity.JPG)

## the static Connlib object

### properties

| Property | TS type | Description |
| --- | --- | --- |
| connectorColor | string | the connector's and arrow colors |
| disableConnectorDrag | boolean | is the connector drag functionality disabled? |
| endpointIndent | number | model element endpoint's indent |
| endpointPadding | number | the endpoint's padding |
| instancePadding | number | the created Connlib instance's SVG padding |
| invertMoveDirection | boolean | if the integrated pan functionality is activated: is the moving direction inverted? |
| lineOverlayWidth | number | width of the line overlay drag handles |
| moveStep | number | if the integrated pan functionality is activated: how many pixels should the viewpoint move on arrow key press? |
| rootContainer | HTMLElement | the root html element |
| rootInstance | ConnlibInstance | the Connlib root instance, available after initalization `Connlib.createRootInstance()` |
| standaloneSetup | boolean | is Connlib running in the standalone mode? |
| useConnlibPanAndKeyup | boolean | should Connlib use it's own pan and keyup navigation? |

### methods

| Method | Parameters | Return type | Description
| --- | --- | --- | --- |
| setUpWindowListeners | | | the method adds the window listeners for the pan & arrow key navigation (if `useConnlibPanAndKeyup == true`) and the connector drag functionality |
