class MapManager {
  constructor({ wsUrl, postMessage, postMessageOrigin }) {
    if (mapboxgl === undefined) {
      throw Error('Mapbox sdk must be included before MapManager is constructed')
    }
    this.postMessageOrigin = postMessageOrigin;
    // websocket messaging
    this.outputs = []
    this.ws = null;
    if (wsUrl) {
      this.wsUrl = wsUrl;
      this.wsEvents = {};
      this.outputs.push(this.sendWs.bind(this));
      this.connectWs();
    }

    // Postmessage API
    if (postMessage) {
      window.addEventListener('message', (event) => {
        if (this.postMessageOrigin && this.postMessageOrigin != event.origin) {
          return
        }
        // don't listen to events we just sent
        if (event.source === window) {
          return
        }
        this.handelMessage(event.data)
      });
      this.outputs.push(this.sendPostMessage.bind(this));
    }

    this.mapDefaults = {
      container: 'map', // container ID
      style: 'mapbox://styles/mapbox/streets-v11', // style URL
      center: [-118.4452, 34.0689], // starting position [lng, lat]
      zoom: 9, // starting zoom,
      attributionControl: false
    }
    this.trackedProjections = {}
  }

  connectWs() {
    this.clearWsEvents();
    this.ws = new WebSocket(this.wsUrl)
    this.wsConnectTimeout = setTimeout(this.onWsTimeout.bind(this), 30 * 1000);
    this.wsEvents = {
      'message': this.wsHandelMessage.bind(this),
      'error': this.onWsError.bind(this),
      'close': this.connectWs.bind(this),
      'open': () => {
        clearTimeout(this.wsConnectTimeout);
        this.ws.send(JSON.stringify({
          response: 'ready'
        }));
      }
    }
    for (let event in this.wsEvents) {
      this.ws.addEventListener(event, this.wsEvents[event])
    }

  }
  clearWsEvents() {
    if (!this.ws) { return }
    for (let event in this.wsEvents) {
      this.ws.removeEventListener(event, this.wsEvents[event])
    }
  }
  onWsError(event) {
    console.log('ws error', event)
    this.clearWsEvents();
    this.ws = null;
    this.connectWs();
  }
  onWsTimeout(event) {
    console.log('ws failed to connect in time')
    this.clearWsEvents();
    this.ws = null;
    this.connectWs();
  }
  wsHandelMessage(event) {
    try {
      const obj = JSON.parse(event.data)
      this.handelMessage(obj);
    } catch (ex) {
      console.error(ex)
    }
  }
  sendWs(name, results) {
    if (!this.ws) { return }
    const responseObj = { response: name }
    if (results) {
      responseObj['results'] = results
    }
    this.ws.send(JSON.stringify(responseObj))
  }
  wsPing() {
    if (this.ws) {
      this.sendWs('pong');
    }
  }
  sendPostMessage(name, results) {
    const responseObj = { response: name }
    if (results) {
      responseObj['results'] = results
    }
    const target = this.postMessageOrigin || '*';
    if (window.parent) {
      window.parent.postMessage(responseObj, target);
    }
  }
  sendResponse(name, results) {
    this.outputs.forEach((o) => o(name, results))
  }

  addJsResponseHandler(handler) {
    this.outputs.push(handler)
  }
  removeJsResponseHandler(handler) {
    const index = this.outputs.indexOf(handler)
    if (index === -1) {
      // not found
      return false
    }
    this.outputs.splice(index, 1);
  }

  handelMessage(data) {
    // console.log(data)
    if ('action' in data) {
      if (data.action === 'map') {
        if (!this.map) { return; }
        try {
          const result = this.map[data.options.method].apply(this.map, data.options.args)
          if ('results' in data.options) {

            const responseName = `map${data.options.method[0].toLocaleUpperCase()}${data.options.method.substring(1)}Result`
            this.sendResponse(responseName, { success: result, key: data.options.results })
          }
        } catch (err) {
          if ('results' in data.options) {
            const responseName = `map${data.options.method[0].toLocaleUpperCase()}${data.options.method.substring(1)}Result`
            this.sendResponse(responseName, { error: err, key: data.options.results })
          }
        }
      }
      else if ('options' in data && data.options) {
        if (Array.isArray(data.options)) {
          this[data.action].apply(this, data.options);
        }
        else {
          this[data.action](data.options);
        }
      }
      else {
        this[data.action]();
      }
    }
  }
  doAction(action, options) {
    this.handelMessage({ action, options })
  }
  setToken({ accessToken }) {
    mapboxgl.accessToken = accessToken;
  }
  setMapDefaults({ defaults }) {
    this.mapDefaults = { ...this.mapDefaults, ...defaults };
  }
  init() {
    if (!mapboxgl.accessToken) {
      console.error('access token not set');
      return;
    }
    this.map = new mapboxgl.Map(this.mapDefaults);
    this.map.once('load', () => {
      this.sendResponse('loaded', { result: 'loaded' });
      this.sendStatus();
    })
    this.map.on('move', () => {
      this.sendStatus();
    })
  }
  sendStatus() {
    const { lng, lat } = this.map.getCenter();
    const zoom = this.map.getZoom();
    const bounds = this.map.getBounds();
    const results = { lat, lng, zoom, bounds };
    if (Object.keys(this.trackedProjections).length) {
      results.projections = {}
      for (let name in this.trackedProjections) {
        const xy = this.map.project(this.trackedProjections[name])
        results.projections[name] = xy;
      }
    }
    this.sendResponse('mapstatus', results);
  }
  trackProjection({ name, location }) {
    this.trackedProjections[name] = location;
  }
  untrackProjection({ name }) {
    delete this.trackedProjections[name];
  }
  clearTrackedProjections() {
    this.trackedProjections = {};
  }
  showBounds({ bounds, options }) {
    if (!this.map) { console.error('map not initialized'); return }
    const camera = this.map.cameraForBounds(bounds, options);
    console.log(camera)
    this.map.easeTo(camera);
  }
}
