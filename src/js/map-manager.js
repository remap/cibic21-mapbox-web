class MapManager {
  constructor({ wsUrl, postMessage, postMessageOrigin }) {
    if (mapboxgl === undefined) {
      throw Error('Mapbox sdk must be included before MapManager is constructed')
    }
    this.postMessageOrigin = postMessageOrigin;
    // websocket messaging
    this.outputs = []
    if (wsUrl) {
      // TODO consider resiliency
      this.ws = new WebSocket(wsUrl)
      this.ws.addEventListener('message', this.wsHandelMessage.bind(this))
      this.ws.addEventListener('open', () => {
        this.ws.send(JSON.stringify({
          action: 'ready'
        }))
      })
      this.outputs.push(this.sendWs.bind(this));
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
    const responseObj = { response: name }
    if (results) {
      responseObj['results'] = results
    }
    this.ws.send(JSON.stringify(responseObj))
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
    if ('action' in data) {
      if (data.action === 'map') {
        if (!this.map) { return; }
        try {
          const result = this.map[data.options.method].apply(this.map, data.options.args)
          if ('results' in data.options) {

            const responseName = `map${data.options.method[0].toLocaleUpperCase()}${data.options.method.substring(1)}Result`
            this.sendResponse(responseName, { success: result })
          }
        } catch (err) {
          if ('results' in data.options) {
            const responseName = `map${data.options.method[0].toLocaleUpperCase()}${data.options.method.substring(1)}Result`
            this.sendResponse(responseName, { error: err })
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
    this.sendResponse('mapstatus', { lat, lng, zoom, bounds });
  }
  showBounds({ bounds, options }) {
    if (!this.map) { console.error('map not initialized'); return }
    const camera = this.map.cameraForBounds(bounds, options);
    console.log(camera)
    this.map.easeTo(camera);
  }
}
