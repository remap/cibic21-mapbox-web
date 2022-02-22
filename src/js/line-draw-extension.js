if (MapManager) {
  MapManager.prototype.drawGeoJson = function drawGeoJson({ geojson }) {
    this.map.addSource('geodraw', {
      type: 'geojson',
      data: geojson
    })
    this.map.addLayer({
      id: 'line',
      type: 'line',
      source: 'geodraw',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#888',
        'line-width': 8
      }
    });
  }
  MapManager.prototype.drawOnLine = function drawOnLine({ geojson, stepAngle = 0.001 }) {
    if(this.drawingOnLine){
      return
    }
    this.drawingOnLine = true;
    // subdivide line
    let segments = [geojson.geometry.coordinates[0]];
    for (let i = 1, l = geojson.geometry.coordinates.length; i < l; i++) {
      const start = geojson.geometry.coordinates[i - 1];
      const end = geojson.geometry.coordinates[i];
      const dLat = end[0] - start[0];
      const dLng = end[1] - start[1];
      const length = Math.sqrt(Math.pow(dLat, 2) + Math.pow(dLng, 2));
      const segmentCount = Math.ceil(length / stepAngle);
      const sLat = dLat / segmentCount;
      const sLng = dLng / segmentCount;
      const subSegments = [];
      for (s = 1; s <= segmentCount; s++) {
        subSegments.push([start[0] + sLat * s, start[1] + sLng * s]);
      }
      segments = segments.concat(subSegments);
    }



    const ongoing = {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "type": "LineString",
        "coordinates": [
          segments[0],
          segments[1]
        ]
      }
    };
    let currentIndex = 1;
    let source = this.map.getSource('livedraw');
    if (!source) {
      this.map.addSource('livedraw', {
        type: 'geojson',
        data: ongoing
      });
      source = this.map.getSource('livedraw');
    }
    if (!this.map.getLayer('line')) {
      this.map.addLayer({
        id: 'line',
        type: 'line',
        source: 'livedraw',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#800',
          'line-width': 8
        }
      });
    }
    this.map.jumpTo({ center: segments[0] });
    const addSegment = () => {
      currentIndex++;
      if (segments.length === currentIndex) {
        this.drawingOnLine = false;
        return;
      }
      ongoing.geometry.coordinates.push(segments[currentIndex]);
      source.setData(ongoing);
      this.map.jumpTo({ center: segments[currentIndex], speed: 0.5 });
      requestAnimationFrame(addSegment);
    }
    requestAnimationFrame(addSegment);

  }
} else {
  throw Error('MapManager sdk must be included before applying an extension');
}
