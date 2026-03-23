const Choropleth = {
  layer: null,
  BURDEN_COLORS: { low: '#3D5C3D', medium: '#C4A035', high: '#8B2B2B' },

  async init(map) {
    // Create a custom pane below overlayPane (400) and markerPane (600)
    // so project lines and markers always sit on top
    map.createPane('statePermittingPane');
    map.getPane('statePermittingPane').style.zIndex = 350;

    Choropleth.layer = L.layerGroup();
    var esc = DataLoader.escapeHtml;
    try {
      var permittingRaw = await DataLoader.loadJSON('data/state-permitting.json');
      var stateData = permittingRaw.states;
      window._statePermittingData = stateData;

      var statesGeoResponse = await fetch('https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json');
      if (!statesGeoResponse.ok) return;

      var nameToCode = {};
      Object.keys(stateData).forEach(function(code) { nameToCode[stateData[code].name] = code; });

      L.geoJSON(await statesGeoResponse.json(), {
        pane: 'statePermittingPane',
        style: function(feature) {
          var code = nameToCode[feature.properties.name];
          var d = code ? stateData[code] : null;
          var burdenResult = d ? DataLoader.computeBurdenScore(d) : null;
          var fillColor = burdenResult ? Choropleth.BURDEN_COLORS[DataLoader.burdenTier(burdenResult)] : '#8A8A8A';
          return { fillColor: fillColor, fillOpacity: 0.15, color: '#1A1A1A', weight: 0.5, opacity: 0.3 };
        },
        onEachFeature: function(feature, layer) {
          var code = nameToCode[feature.properties.name];
          var d = code ? stateData[code] : null;
          if (!d) {
            // Show TBD for states without data (e.g., California)
            layer.on('click', function(e) { L.DomEvent.stopPropagation(e); });
            layer.bindTooltip(
              '<h4>' + esc(feature.properties.name) + '</h4>' +
              '<div class="state-methodology">Permitting Score TBD</div>',
              { sticky: true, direction: 'auto', className: 'state-tooltip-tbd' }
            );
            return;
          }
          var result = DataLoader.computeBurdenScore(d);
          var tier = DataLoader.burdenTier(result);
          var es = d.endangered_species || {};
          var yn = DataLoader.ynText;
          layer.on('click', function(e) { L.DomEvent.stopPropagation(e); });
          layer.bindTooltip(
            '<h4>' + esc(d.name) + ' — <span style="text-transform:capitalize">' + tier + '</span> (' + result.score + '/' + result.max + ')</h4>' +
            '<div class="state-checklist">' +
            '<span>SEPA: ' + yn(d.sepa.has_sepa) + '</span>' +
            '<span>§404 assumed: ' + yn(d.clean_water.section_404_assumption) + '</span>' +
            '<span>NPDES delegated: ' + yn(d.clean_water.npdes_authority) + '</span>' +
            '<span>SESA: ' + yn(es.has_sesa) + '</span>' +
            '<span>Dashboard: ' + yn(d.dashboard && d.dashboard.has_dashboard) + '</span>' +
            '</div>' +
            '<div class="state-reg-explainers">' +
            '<div><b>SEPA</b> — State environmental review (state-level NEPA equivalent)</div>' +
            '<div><b>§404</b> — Has state assumed Army Corps wetland permitting? No = dual federal-state review</div>' +
            '<div><b>NPDES</b> — Has state assumed EPA water discharge permitting? No = EPA retains authority</div>' +
            '<div><b>SESA</b> — State Endangered Species Act (beyond federal ESA)</div>' +
            '<div><b>Dashboard</b> — Centralized permitting tracker with real-time status</div>' +
            '</div>' +
            '<div class="state-methodology">Score: +1 if state has SEPA, +1 if federal 404 retained, +1 if federal NPDES retained, +1 if state ESA consultation required, +1 if state-designated critical habitat (state law, not federal ESA). Source: FAI Permitting Playbook.</div>',
            { sticky: true, direction: 'auto', className: 'state-tooltip-' + tier }
          );
        }
      }).addTo(Choropleth.layer);
    } catch (err) { console.warn('Failed to load state permitting:', err); }
  }
};
