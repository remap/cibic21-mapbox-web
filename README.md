This project provides a javascript library for controlling a mapboxgl map via a message passing API using the window postmessage API, websockets, or direct Javascript control. 

# Usage


## Setup
--------------------------------------------------------------------------------

To use the system you will first have to include mapbox GL JS version >= 2.0 and the associated CSS

We recommend placing the following in the header but it only needs to be included before including `map-manager.js` such that `mapboxgl` is in the global scope (the window object in a browser).

```html
<link href="https://api.mapbox.com/mapbox-gl-js/v2.6.1/mapbox-gl.css" rel="stylesheet">
<script src="https://api.mapbox.com/mapbox-gl-js/v2.6.1/mapbox-gl.js"></script>
```

After mapbox GL JS is include you can include `map-manager.js`

```html
<script src="js/map-manager.js"></script>
```

This will expose `MapManager` in the global scope.

After this you may wish to include any extensions to the `MapManager` that you may require.

We recommend extending `MapManager` by adding to the prototype, as in the following:

```js
if(MapManager){
    MapManager.prototype.alertMapCenter = function alertMapCenter(){
        const center = this.map.getCenter();
        alert(center);
    }
}
```

## Message Passing
--------------------------------------------------------------------------------

The majority of interactions with the MapManager are expected to be handled by passing and receiving message object.

Objects passed to the MapManager have the following form:

```js
{
    action:'ACTIONNAME',
    options:[1,{},null,'string']
}
```

Objects received from MapManager have the form:

```js
{
    name:'RESULTNAME',
    results: {}
}
```

Messages may be passed via one or more of the following methods:

- Calling the handelMessage on the MapManager instance with a message object
- WebSocket messages with json data
- Window postMessage messages

### Direct Message Passing

No special configuration needs to be passed to the MapManager constructor to enable direct message passing.

```js
const mapMan = new MapManager({});
mapMan.handelMessage({action:'setToken',options:{accessToken:'MY_ACCESS_TOKEN'}});
```

#### doAction
`MapManager.handelMessage()` is a little verbose `MapManager.doAction()` provides a more simplistic api.

The following are equivalent:
```js
mapMan.handelMessage({action:'setToken',options:{accessToken:'MY_ACCESS_TOKEN'}});
mapMan.doAction('setToken',{accessToken:'MY_ACCESS_TOKEN'});
```



### WebSockets

In order to use WebSockets you will need to pass the websocket url to the MapManager constructor using the `wsUrl` option.

```js
const mapMan = new MapManager({wsUrl:'ws://localhost:3000'});
```

This url will be passed directly to the `WebSocket` constructor and should start with `ws://` or `wss://`

The MapManager will attempt to parse any incoming message as JSON and then use it as a message.

### Window.postMessage

In order to use postMessage you will need to pass the postMessage flag to the MapManager constructor using the `postMessage` option. Optionally you may include `postMessageOrigin` to do postMessage origin filtering. This origin will be used to filter incoming and outgoing messages.

```js
const mapMan = new MapManager({postMessage:true});
```
```js
const mapMan = new MapManager({postMessage:true, postMessageOrigin:'http://localhost:3000'});
```

See for example: [iframe-parent.html](src/iframe-parent.html) and [iframe-child.html](src/iframe-child.html)


The MapManager will attempt to parse any incoming message to use as a message.

## Initialization
--------------------------------------------------------------------------------

Setting up a mapbox map requires a few basic bits of information. 

The first and most important part is the mapbox Access Token. You should set the accessToken before passing the init message.

```js
const mapMan = new MapManager({});
mapMan.handelMessage({action:'setToken',options:{accessToken:'MY_ACCESS_TOKEN'}});
```

You will also likely want to configure several aspects of the map's default position and styling. These defaults are passed directly to the mapbox GL JS Map object constructor.

Values for these settings are in the mapDefaults and are as follow:

```js
mapDefaults = {
    container: 'map', // container ID
    style: 'mapbox://styles/mapbox/streets-v11', // style URL
    center: [-118.4452, 34.0689], // starting position [lng, lat]
    zoom: 9, // starting zoom,
    attributionControl: false // show/hide map attribution
}
```

You can update these defaults by passing the `setMapDefaults` message. Not all defaults must be included.

```js
mapMan.handelMessage({
    action:'setMapDefaults',
    options:{
        defaults:{
            center: [-79.9959, 40.4406],
            zoom: 12
        }
    }
});
```

Finally to actually create the map you should pass the `init` message. 

```js
mapMan.handelMessage({action:'init'});
```

## General Methodology
--------------------------------------------------------------------------------

The general idea behind MapManager is that it provides a way to create a mapbox GL JS map and control it via message passing.

Aside from the messages mentioned during initialization other messages are structured to directly call methods on the mapbox Map object.

Operations on the map object use the "map" action name and an "options" object with a "method" string field and a "args" array field.
Optionaly you may include a "results" flag if you want the return result from the map object.

### Examples

Message:
```json
{
    "action":"map",
    "options":{
        "method":"setZoom",
        "args":[12]
    }
}
```

Equivilant JS

```js
map.setZoom(12)
```


Message:
```json
{
    "action":"map",
    "options":{
        "method":"getCenter",
        "args":[],
        "results":true
    }
}
```

Equivilant JS

```js
return map.getCenter()
```

Message:
```json
{
    "action":"map",
    "options":{
        "method":"flyTo",
        "args":[{
            "center":[-118.4452, 34.0689],
            "screenSpeed":0.5
        },{
            "customData":"UCLA"
        }],
        "results":true
    }
}
```

Equivilant JS

```js
return map.flyTo({
            center:[-118.4452, 34.0689],
            screenSpeed:0.5
        },{
            customData:"UCLA"
        })
```

