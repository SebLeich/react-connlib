# Connlib
The repository contains Connlib, a repository for rendering connectors in the web. The library provides the following features:
- auto path calculation using automated shape-connector overlap detection

## using Connlib with a custom framework

Connlib provides connection-shape overlap prevention. 
Therefore, we implemented an IDA* algorithm. 
The library detects the blocked areas by checking all elements within the instance’s root against a predefined class. 
If you want to use the connection-shape overlap prevention, then you need to either use the default value connlib-connection-blocked 
or adjust the predefined class within the static field Connlib.blockingClassName.
If you dont want to use the connection-shape overlap prevention, then you need to set the Connlib.useOverlapDetection to false. 
Please mention, in that case, that newly created connectors might overlap with other shapes.
