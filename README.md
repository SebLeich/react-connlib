# Connlib
The repository contains Connlib, a repository for rendering connectors in the web. The library provides the following features:
- auto path calculation using automated shape-connector overlap detection
- add custom model constructs (relations and shapes) by inheriting predefined shapes

![Connlib demo image](./assets/demo.png)

In future, we plan to implement the following features:
- display intersections between connectors

A demo is available under: https://sebleich.github.io/react-connlib/ (please use with Google Chrome)

## using Connlib with a custom framework

Connlib provides connection-shape overlap prevention. 
Therefore, we implemented an IDA* algorithm. 
The recommended flow is represented within the activity diagram below. 
Initially, a new Connlib instance should be initialized by calling `Connlib.createRootInstance()`. 
By default, Connlib searches for a root element (a div HTML element) with the identifer `id = 'root'`. 
Developers can change the root container by overwriting the public property `rootContainer` at the static `Connlib` object. 
Therefore, we recommend to use the JavaScript call `document.getElementById('fooContainer')`. 
Afterwards, the Connlib root instance can be accessed by calling `Connlib.rootInstance`. 

![Connlib activity](./assets/activity.JPG)
