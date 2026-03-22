const CapacityNeed = {
  layer: null,
  RISK_COLORS: {
    critical: '#8B2B2B',
    high: '#C4A035',
    moderate: '#9C9788',
    lower: '#3D5C3D'
  },
  RISK_OPACITY: {
    critical: 0.35,
    high: 0.25,
    moderate: 0.15,
    lower: 0.10
  },

  async init(map) {
    map.createPane('capacityNeedPane');
    map.getPane('capacityNeedPane').style.zIndex = 300;

    CapacityNeed.layer = L.layerGroup();
    var esc = DataLoader.escapeHtml;

    try {
      var needData = await DataLoader.loadJSON('data/capacity-need.json');
      var regions = needData.regions;

      var geoResponse = await fetch('data/geometry/nerc-regions.geojson');
      if (!geoResponse.ok) {
        console.warn('Failed to load NERC region boundaries');
        var cb = document.getElementById('layer-capacity-need');
        if (cb) { cb.disabled = true; cb.parentElement.style.opacity = '0.4'; }
        return;
      }
      var geoData = await geoResponse.json();

      L.geoJSON(geoData, {
        pane: 'capacityNeedPane',
        style: function(feature) {
          var code = feature.properties.NERC;
          var region = regions[code];
          if (!region) return { fillOpacity: 0, stroke: false };
          var tier = region.risk_tier;
          return {
            fillColor: CapacityNeed.RISK_COLORS[tier] || '#8A8A8A',
            fillOpacity: CapacityNeed.RISK_OPACITY[tier] || 0.1,
            color: '#1A1A1A',
            weight: 1,
            opacity: 0.4
          };
        },
        onEachFeature: function(feature, layer) {
          var code = feature.properties.NERC;
          var region = regions[code];

          layer.on('click', function(e) { L.DomEvent.stopPropagation(e); });

          if (!region) {
            layer.bindTooltip(
              '<h4>' + esc(feature.properties.NERC_Label) + '</h4>' +
              '<div class="state-methodology">Capacity need data not available</div>',
              { sticky: true, direction: 'auto', className: 'capacity-tooltip-moderate' }
            );
            return;
          }

          var tier = region.risk_tier;
          var tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
          var drivers = region.key_drivers.map(function(d) { return '• ' + esc(d); }).join('<br>');

          layer.bindTooltip(
            '<h4>' + esc(region.name) + '</h4>' +
            '<div class="capacity-tier capacity-tier--' + tier + '">' + tierLabel + ' Need</div>' +
            '<div style="font-family:var(--font-mono);font-size:8px;color:var(--color-gray-70);margin-bottom:4px;">Composite assessment (not a direct NERC rating). NERC risk: ' + esc(region.nerc_risk) + '.</div>' +
            '<div class="capacity-details">' +
            '<div class="capacity-row"><span>Reserve margin:</span> ' + esc(region.reserve_margin_status) + '</div>' +
            '<div class="capacity-row"><span>Peak demand growth:</span> ' + region.peak_demand_growth_pct + '% (' + (region.peak_demand_growth_base_year || '2025') + '–' + (region.peak_demand_growth_end_year || '2034') + ', NERC LTRA)</div>' +
            '<div class="capacity-row"><span>Data center load share (2030):</span> ~' + region.dc_load_share_2030_pct + '%</div>' +
            '<div class="capacity-row"><span>At-risk year:</span> ' + region.at_risk_year + '</div>' +
            '<div class="capacity-drivers"><span>Key drivers:</span><br>' + drivers + '</div>' +
            '</div>' +
            '<div class="state-methodology">Sources: NERC LTRA 2025, EPRI Powering Intelligence (Feb 2026), DOE Speed to Power</div>',
            { sticky: true, direction: 'auto', className: 'capacity-tooltip-' + tier }
          );
        }
      }).addTo(CapacityNeed.layer);
    } catch (err) { console.warn('Failed to load capacity need data:', err); }
  }
};
