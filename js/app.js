(async function () {
  'use strict';

  // Initialize map
  MapView.init();

  // Load project data
  var pipelineProjects = [], transmissionProjects = [];
  try {
    var results = await Promise.all([
      DataLoader.loadDataFile('data/proposed-pipelines.json?v=3'),
      DataLoader.loadDataFile('data/proposed-transmission.json?v=3'),
    ]);
    pipelineProjects = results[0].projects;
    transmissionProjects = results[1].projects;
  } catch (err) {
    console.error('Failed to load data:', err);
    document.getElementById('results-count').textContent = 'Error loading data';
    var mapEl = document.getElementById('map');
    var banner = document.createElement('div');
    banner.className = 'error-banner';
    banner.innerHTML = '<strong>Data failed to load.</strong> Check your connection and reload the page.';
    mapEl.parentNode.insertBefore(banner, mapEl);
    return;
  }

  pipelineProjects.forEach(function(p) { p._type = 'pipeline'; });
  transmissionProjects.forEach(function(p) { p._type = 'transmission'; });

  // Derive "last updated" from data metadata (use oldest access_date to be conservative)
  var accessDates = [results[0].metadata, results[1].metadata]
    .filter(function(m) { return m && m.access_date; })
    .map(function(m) { return m.access_date; });
  if (accessDates.length > 0) {
    accessDates.sort();
    document.getElementById('last-updated').textContent = 'Last updated: ' + accessDates[0];
  }

  // Load supplementary data in parallel (no dependencies between these)
  var [nepaResult, transEventsResult, pipeEventsResult, geoIndexResult, choroplethResult, capacityNeedResult] = await Promise.allSettled([
    DataLoader.loadJSON('data/nepa-eis-context.json'),
    DataLoader.loadJSON('data/permitting-events-transmission.json'),
    DataLoader.loadJSON('data/permitting-events-pipelines.json'),
    DataLoader.loadJSON('data/geometry/index.json'),
    Choropleth.init(MapView.instance),
    CapacityNeed.init(MapView.instance),
  ]);

  window._nepaContext = nepaResult.status === 'fulfilled' ? nepaResult.value : null;

  window._permittingEvents = {};
  if (transEventsResult.status === 'fulfilled') Object.assign(window._permittingEvents, transEventsResult.value.events || {});
  if (pipeEventsResult.status === 'fulfilled') Object.assign(window._permittingEvents, pipeEventsResult.value.events || {});

  // Load route geometries (depends on index)
  window._routeGeometry = {};
  var countEl = document.getElementById('results-count');
  if (geoIndexResult.status === 'fulfilled') {
    var geoIndex = geoIndexResult.value;
    var geoKeys = Object.keys(geoIndex);
    countEl.textContent = 'Loading routes (0/' + geoKeys.length + ')...';
    var loaded = 0;
    var geoResults = await Promise.allSettled(geoKeys.map(function(id) {
      return DataLoader.loadJSON(geoIndex[id] + '?v=5').then(function(geojson) {
        loaded++;
        countEl.textContent = 'Loading routes (' + loaded + '/' + geoKeys.length + ')...';
        return { id: id, geojson: geojson };
      });
    }));
    geoResults.forEach(function(r) {
      if (r.status === 'fulfilled') window._routeGeometry[r.value.id] = r.value.geojson;
    });
  }

  // Populate operator filter
  var allProjects = pipelineProjects.concat(transmissionProjects);
  var operatorSelect = document.getElementById('filter-operator');
  DataLoader.getOperators(allProjects).forEach(function(op) {
    var option = document.createElement('option');
    option.value = op; option.textContent = op;
    operatorSelect.appendChild(option);
  });

  // Render
  function getFilters() {
    return {
      status: document.getElementById('filter-status').value,
      operator: document.getElementById('filter-operator').value,
      region: document.getElementById('filter-region').value,
      search: document.getElementById('filter-search').value,
    };
  }

  function renderProjects() {
    MapView.pipelineLayer.clearLayers();
    MapView.transmissionLayer.clearLayers();
    MapView.markerLookup = {};
    var filters = getFilters();
    var visibleProjects = [];

    if (document.getElementById('layer-pipeline-proposed').checked) {
      var f = DataLoader.filterProjects(pipelineProjects, filters);
      f.forEach(function(p) { MapView.drawProject(p, MapView.pipelineLayer); });
      visibleProjects = visibleProjects.concat(f);
    }
    if (document.getElementById('layer-transmission-proposed').checked) {
      var f = DataLoader.filterProjects(transmissionProjects, filters);
      f.forEach(function(p) { MapView.drawProject(p, MapView.transmissionLayer); });
      visibleProjects = visibleProjects.concat(f);
    }

    visibleProjects.sort(function(a, b) { return a._type !== b._type ? (a._type === 'pipeline' ? -1 : 1) : a.name.localeCompare(b.name); });
    Sidebar.renderList(visibleProjects, function(project) {
      Card.render(project);
      MapView.highlightListItem(project.id);
      var line = MapView.markerLookup[project.id];
      if (line && line.getBounds) {
        MapView.instance.fitBounds(line.getBounds().pad(0.3));
      } else if (project.origin && project.destination) {
        MapView.instance.fitBounds(L.latLngBounds([project.origin.lat, project.origin.lng], [project.destination.lat, project.destination.lng]).pad(0.3));
      }
    });
  }

  // Wire filters
  ['filter-status', 'filter-operator', 'filter-region'].forEach(function(id) {
    document.getElementById(id).addEventListener('change', renderProjects);
  });

  // Debounce search input (150ms)
  var searchTimer = null;
  document.getElementById('filter-search').addEventListener('input', function() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(renderProjects, 150);
  });

  // Add state permitting layer by default (checkbox is checked)
  if (Choropleth.layer) MapView.instance.addLayer(Choropleth.layer);

  // Layer toggles
  [['layer-pipeline-proposed', MapView.pipelineLayer, true],
   ['layer-transmission-proposed', MapView.transmissionLayer, true],
   ['layer-state-permitting', Choropleth.layer, false],
   ['layer-capacity-need', CapacityNeed.layer, false],
  ].forEach(function(cfg) {
    document.getElementById(cfg[0]).addEventListener('change', function(e) {
      e.target.checked ? MapView.instance.addLayer(cfg[1]) : MapView.instance.removeLayer(cfg[1]);
      if (cfg[2]) renderProjects();

      // Mutual exclusion: state permitting and capacity need
      var exclusive = { 'layer-state-permitting': 'layer-capacity-need', 'layer-capacity-need': 'layer-state-permitting' };
      if (e.target.checked && exclusive[cfg[0]]) {
        var otherId = exclusive[cfg[0]];
        var otherCb = document.getElementById(otherId);
        if (otherCb && otherCb.checked) {
          otherCb.checked = false;
          otherCb.dispatchEvent(new Event('change'));
        }
      }

      // Show/hide overlay legends
      var capLegend = document.getElementById('capacity-legend');
      var permLegend = document.getElementById('permitting-legend');
      var capCb = document.getElementById('layer-capacity-need');
      var permCb = document.getElementById('layer-state-permitting');
      if (capLegend) capLegend.style.display = (capCb && capCb.checked) ? 'block' : 'none';
      if (permLegend) permLegend.style.display = (permCb && permCb.checked) ? 'block' : 'none';
    });
  });

  renderProjects();
})();
