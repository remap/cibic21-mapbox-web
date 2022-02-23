if (MapManager) {
  MapManager.prototype.addGeoJson = function addGeoJson({ geojson, sourceId, layerStyles, beforeId, layerId }) {
    this.addGeoJsonSource({ geojson, sourceId });
    this.addGeoJsonLayer({sourceId, layerId: (layerId || `${sourceId}Layer`), layerStyles, beforeId });
  }
  MapManager.prototype.addGeoJsonSource = function addGeoJsonSource({ geojson, sourceId }) {
    this.idToGJSource = this.idToGJSource || {};
    if (this.idToGJSource[sourceId]) {
      this.updateGeoJsonSource({ geojson, sourceId });
      return
    }
    this.map.addSource(sourceId, {
      type: 'geojson',
      data: geojson
    });
    this.idToGJSource[sourceId] = this.map.getSource(sourceId);
  }
  MapManager.prototype.addGeoJsonLayer = function addGeoJsonLayer({ layerId, sourceId, layerStyles, beforeId }) {
    this.gjLayerIds = this.gjLayerIds || [];
    if (this.gjLayerIds.includes(layerId)) {
      this.updateGeoJsonLayer({ layerId, layerStyles });
      return;
    }
    this.gjLayerIds.push(layerId);
    const layerProps = {
      id: layerId,
      type: layerStyles['type'] || 'line',
      source: sourceId,
      layout: layerStyles['layout'] || {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: layerStyles['paint'] || {
        'line-color': '#f00',
        'line-width': 1
      }
    };
    if (layerStyles['filter'] !== undefined) {
      layerProps['filter'] = layerStyles['filter'];
    }
    this.map.addLayer(layerProps, beforeId);
  }
  MapManager.prototype.updateGeoJson = function updateGeoJson({ geojson, sourceId, layerStyles, beforeId, layerId }) {
    this.updateGeoJsonSource({ geojson, sourceId });
    this.updateGeoJsonLayer({sourceId, layerId: (layerId || `${sourceId}Layer`), layerStyles, beforeId });
  }
  MapManager.prototype.updateGeoJsonSource = function updateGeoJsonSource({ geojson, sourceId }) {
    this.idToGJSource = this.idToGJSource || {};
    if (!this.idToGJSource[sourceId]) {
      console.log(`failed to update: source "${sourceId}" not found`);
      return;
    }
    this.idToGJSource[sourceId].setData(geojson);
  }

  MapManager.prototype.updateGeoJsonLayer = function updateGeoJsonLayer({ layerId, layerStyles }) {
    this.gjLayerIds = this.gjLayerIds || [];
    if (!this.gjLayerIds.includes(layerId)) {
      console.log(`failed to update: layer "${layerId}" not found`);
      return;
    }
    if (layerStyles['paint']) {
      for (let prop in layerStyles['paint']) {
        this.map.setPaintProperty(layerId, prop, layerStyles['paint'][prop]);
      }
    }
    if (layerStyles['layout']) {
      for (let prop in layerStyles['layout']) {
        this.map.setLayoutProperty(layerId, prop, layerStyles['layout'][prop]);
      }
    }
    if (layerStyles['filter'] !== undefined) {
      this.map.setFilter(layerId, layerStyles['filter']);
    }
  }

  MapManager.prototype.removeGeoJson = function removeGeoJson({ sourceId, layerId }) {
    const layerIdToRemove = layerId || `${sourceId}Layer`;
    this.removeGeoJsonLayer({layerId:layerIdToRemove});
    this.removeGeoJsonSource({sourceId});
  }

  MapManager.prototype.removeGeoJsonSource = function removeGeoJsonSource({ sourceId }) {
    this.idToGJSource = this.idToGJSource || {};
    if (!this.idToGJSource[sourceId]) {
      console.log(`failed to remove: source "${sourceId}" not found`);
      return;
    }
    this.map.removeSource(sourceId);
    delete this.idToGJSource[sourceId];
  }
  MapManager.prototype.removeGeoJsonLayer = function removeGeoJsonLayer({ layerId }) {
    this.gjLayerIds = this.gjLayerIds || [];
    if (!this.gjLayerIds.includes(layerId)) {
      console.log(`failed to remove: layer "${layerId}" not found`);
      return;
    }
    this.map.removeLayer(layerId);
    this.gjLayerIds.splice(this.gjLayerIds.indexOf(layerId),1);
  }

  MapManager.prototype.getGeoJson = function getGeoJson() {
    this.idToGJSource = this.idToGJSource || {};
    this.gjLayerIds = this.gjLayerIds || [];
    return {sources: Object.keys(this.idToGJSource), layers: this.gjLayerIds};
  }
  MapManager.prototype.getGeoJsonSources = function getGeoJsonSources() {
    this.idToGJSource = this.idToGJSource || {};
    return Object.keys(this.idToGJSource);
  }
  MapManager.prototype.getGeoJsonLayers = function getGeoJsonLayers() {
    this.gjLayerIds = this.gjLayerIds || [];
    return this.gjLayerIds;
  }
}
