const MapView = {
  instance: null,
  pipelineLayer: null,
  transmissionLayer: null,
  markerLookup: {},

  BASE_COLORS: {
    'announced': '#9C9788', 'construction-pending': '#C4A035',
    'approved': '#3D5C3D', 'under-construction': '#3D5C3D',
    'operational': '#5C5C5C', 'default': '#8A8A8A',
  },
  ACCENT: { pipeline: '#2B4B6F', transmission: '#8B2B2B' },
  DASHES: { 'proposed': '8 6', 'pre-filing': '4 6', 'announced': '4 8', 'construction-pending': '12 4' },

  getColor(status, isTransmission) {
    if (status === 'proposed' || status === 'pre-filing') return MapView.ACCENT[isTransmission ? 'transmission' : 'pipeline'];
    return MapView.BASE_COLORS[status] || MapView.BASE_COLORS['default'];
  },

  init() {
    MapView.instance = L.map('map', { center: [39.0, -98.0], zoom: 5 });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd', maxZoom: 19,
    }).addTo(MapView.instance);
    MapView.pipelineLayer = L.layerGroup().addTo(MapView.instance);
    MapView.transmissionLayer = L.layerGroup().addTo(MapView.instance);
  },

  addEndpoint(lat, lng, color, radius, layerGroup, tooltipHtml, project) {
    var marker = L.circleMarker([lat, lng], { radius, fillColor: color, fillOpacity: 0.9, color: '#1A1A1A', weight: 1 });
    marker.bindTooltip(tooltipHtml, { direction: 'top', offset: [0, -8] });
    marker.on('click', function() { Card.render(project); MapView.highlightListItem(project.id); });
    marker.addTo(layerGroup);
  },

  drawProject(p, layerGroup) {
    if (!p.origin || !p.destination) return;
    var esc = DataLoader.escapeHtml;
    var isTrans = p._type === 'transmission';
    var status = DataLoader.normalizeStatus(p.status);
    var color = MapView.getColor(status, isTrans);
    var dash = MapView.DASHES[status];
    var w = isTrans ? 3 : 2.5;

    var lineOpts = { color, weight: w, opacity: 0.85 };
    if (dash) lineOpts.dashArray = dash;

    // Use real route geometry if available, otherwise straight line
    var routeGeo = (window._routeGeometry || {})[p.id];
    var line;
    if (routeGeo && routeGeo.features && routeGeo.features.length > 0) {
      var allCoords = [];
      routeGeo.features.forEach(function(feat) {
        var g = feat.geometry;
        if (g.type === 'LineString') {
          allCoords.push(g.coordinates.map(function(c) { return [c[1], c[0]]; }));
        } else if (g.type === 'MultiLineString') {
          g.coordinates.forEach(function(part) {
            allCoords.push(part.map(function(c) { return [c[1], c[0]]; }));
          });
        }
      });
      line = L.polyline(allCoords, lineOpts);
    } else {
      line = L.polyline([[p.origin.lat, p.origin.lng], [p.destination.lat, p.destination.lng]], lineOpts);
    }

    var isPipeline = DataLoader.isPipeline(p);
    var typeLabel = DataLoader.typeLabel(p);
    var nepaStatus = p.permitting ? (p.permitting.nepa_status || 'Not determined') : 'Not determined';
    var isFast41 = p.permitting && p.permitting.fast_41;

    var events = DataLoader.getProjectEvents(p.id);
    var eventCount = events.length;
    var tooltipHtml = '<h4>' + esc(p.name) + '</h4>' +
      '<div class="tooltip-meta">' + esc(typeLabel) + '</div>' +
      '<div class="tooltip-permitting">' +
      'NEPA: ' + esc(nepaStatus) +
      (isFast41 ? ' · FAST-41' : '') +
      (eventCount > 0 ? '<br>' + eventCount + ' permitting event' + (eventCount !== 1 ? 's' : '') + ' documented' : '') +
      '</div>';
    line.bindTooltip(tooltipHtml, { sticky: true, direction: 'top', offset: [0, -10], opacity: 0.95 });

    line.on('click', function() { Card.render(p); MapView.highlightListItem(p.id); });
    line.addTo(layerGroup);
    MapView.markerLookup[p.id] = line;

    var r = isTrans ? 5 : 4;
    MapView.addEndpoint(p.origin.lat, p.origin.lng, color, r, layerGroup, tooltipHtml, p);
    MapView.addEndpoint(p.destination.lat, p.destination.lng, color, r, layerGroup, tooltipHtml, p);
  },

  highlightListItem(id) {
    document.querySelectorAll('.project-list-item').forEach(function(li) {
      li.classList.toggle('active', li.getAttribute('data-id') === id);
    });
  }
};
