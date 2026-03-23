/* Mobile layout module — additive layer, no changes to existing JS files */
'use strict';

const MobileDrawer = {
  sidebar: null,
  state: 'collapsed',
  startY: 0,
  currentY: 0,
  touchMoved: false,

  init() {
    if (window.innerWidth > 768) return;
    window._isMobile = true;

    MobileDrawer.sidebar = document.getElementById('sidebar');
    if (!MobileDrawer.sidebar) return;

    MobileDrawer.sidebar.classList.add('drawer--collapsed');

    // Drawer handle buttons
    var filterBtn = document.getElementById('mobile-filter-btn');
    if (filterBtn) {
      filterBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (MobileDrawer.state === 'collapsed') {
          MobileDrawer.setState('peek');
        } else {
          MobileDrawer.setState('collapsed');
        }
      });
    }

    // Sync results count
    var desktopCount = document.getElementById('results-count');
    var mobileCount = document.getElementById('mobile-results-count');
    if (desktopCount && mobileCount) {
      var observer = new MutationObserver(function() {
        mobileCount.textContent = desktopCount.textContent;
      });
      observer.observe(desktopCount, { childList: true, characterData: true, subtree: true });
      mobileCount.textContent = desktopCount.textContent;
    }

    // Touch gestures on drawer handle
    var handle = document.getElementById('mobile-drawer-handle');
    if (handle) {
      handle.addEventListener('touchstart', function(e) {
        MobileDrawer.startY = e.touches[0].clientY;
        MobileDrawer.currentY = e.touches[0].clientY; // FIX #3: reset to prevent stale value
        MobileDrawer.touchMoved = false;
      }, { passive: true });

      handle.addEventListener('touchmove', function(e) {
        MobileDrawer.currentY = e.touches[0].clientY;
        MobileDrawer.touchMoved = true;
      }, { passive: true });

      handle.addEventListener('touchend', function(e) {
        if (!MobileDrawer.touchMoved) return; // FIX #3: ignore taps (no movement)
        var deltaY = MobileDrawer.currentY - MobileDrawer.startY;
        if (deltaY < -50) {
          if (MobileDrawer.state === 'collapsed') MobileDrawer.setState('peek');
          else if (MobileDrawer.state === 'peek') MobileDrawer.setState('full');
        } else if (deltaY > 50) {
          if (MobileDrawer.state === 'full') MobileDrawer.setState('peek');
          else if (MobileDrawer.state === 'peek') MobileDrawer.setState('collapsed');
        }
      }, { passive: true });
    }

    // Project list items: collapse drawer on tap
    MobileDrawer.sidebar.addEventListener('click', function(e) {
      if (e.target.closest('.project-list-item')) {
        MobileDrawer.setState('collapsed');
      }
    });

    // Wrap Card.render to collapse drawer and manage backdrop
    if (typeof Card !== 'undefined') {
      var _origRender = Card.render;
      Card.render = function(project) {
        _origRender.call(Card, project);
        if (window._isMobile && project) {
          MobileDrawer.setState('collapsed');
          // FIX #1: Always remove old backdrop first, then create fresh one
          MobileDrawer.removeBackdrop();
          MobileDrawer.showBackdrop();
        }
      };
    }

    // FIX #4: Wrap MapView.drawProject to increase tap targets on mobile
    if (typeof MapView !== 'undefined') {
      var _origDraw = MapView.drawProject;
      MapView.drawProject = function(p, layerGroup) {
        _origDraw.call(MapView, p, layerGroup);
        var line = MapView.markerLookup[p.id];
        // Suppress tooltips on mobile — taps go straight to card
        if (line && line.unbindTooltip) line.unbindTooltip();

        // Add invisible wider hit line for touch targets
        if (line && line.getLatLngs) {
          var hitLine = L.polyline(line.getLatLngs(), {
            weight: 20, opacity: 0, interactive: true
          });
          hitLine.on('click', function() {
            Card.render(p);
            if (typeof MapView.highlightListItem === 'function') MapView.highlightListItem(p.id);
          });
          hitLine.addTo(layerGroup);
        }
      };

      // Also suppress tooltips on endpoint markers by wrapping addEndpoint
      var _origEndpoint = MapView.addEndpoint;
      MapView.addEndpoint = function(lat, lng, color, radius, layerGroup, tooltipHtml, project) {
        // Increase marker radius on mobile for better tap targets
        _origEndpoint.call(MapView, lat, lng, color, Math.max(radius, 8), layerGroup, tooltipHtml, project);
      };
    }

    // FIX #2: Convert choropleth and capacity need sticky tooltips to popups on mobile
    MobileDrawer.fixOverlayLayers();

    // Handle orientation change
    var resizeTimer;
    window.addEventListener('resize', function() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function() {
        if (window.innerWidth > 768) {
          window._isMobile = false;
          if (MobileDrawer.sidebar) {
            MobileDrawer.sidebar.classList.remove('drawer--collapsed', 'drawer--peek', 'drawer--full');
          }
        } else {
          window._isMobile = true;
          MobileDrawer.state = 'collapsed';
          if (MobileDrawer.sidebar &&
              !MobileDrawer.sidebar.classList.contains('drawer--collapsed') &&
              !MobileDrawer.sidebar.classList.contains('drawer--peek') &&
              !MobileDrawer.sidebar.classList.contains('drawer--full')) {
            MobileDrawer.sidebar.classList.add('drawer--collapsed');
          }
        }
      }, 250);
    });
  },

  // FIX #2: Replace sticky tooltips with tap-to-popup on overlay layers
  fixOverlayLayers() {
    // Wait for layers to be initialized, then patch
    setTimeout(function() {
      // Patch choropleth layer
      if (typeof Choropleth !== 'undefined' && Choropleth.layer) {
        Choropleth.layer.eachLayer(function(layer) {
          if (layer.eachLayer) {
            // It's a GeoJSON layer group
            layer.eachLayer(function(featureLayer) {
              if (featureLayer.getTooltip && featureLayer.getTooltip()) {
                var tooltipContent = featureLayer.getTooltip().getContent();
                featureLayer.unbindTooltip();
                featureLayer.off('click'); // Remove the stopPropagation handler
                featureLayer.bindPopup(tooltipContent, {
                  maxWidth: 280,
                  className: 'mobile-overlay-popup'
                });
              }
            });
          }
        });
      }

      // Patch capacity need layer
      if (typeof CapacityNeed !== 'undefined' && CapacityNeed.layer) {
        CapacityNeed.layer.eachLayer(function(layer) {
          if (layer.eachLayer) {
            layer.eachLayer(function(featureLayer) {
              if (featureLayer.getTooltip && featureLayer.getTooltip()) {
                var tooltipContent = featureLayer.getTooltip().getContent();
                featureLayer.unbindTooltip();
                featureLayer.off('click');
                featureLayer.bindPopup(tooltipContent, {
                  maxWidth: 280,
                  className: 'mobile-overlay-popup'
                });
              }
            });
          }
        });
      }
    }, 500); // Wait for choropleth/capacity layers to finish loading
  },

  setState(state) {
    MobileDrawer.state = state;
    MobileDrawer.sidebar.classList.remove('drawer--collapsed', 'drawer--peek', 'drawer--full');
    MobileDrawer.sidebar.classList.add('drawer--' + state);
    var btn = document.getElementById('mobile-filter-btn');
    if (btn) btn.textContent = state === 'collapsed' ? 'Filters' : 'Close';
  },

  // FIX #1: Simplified backdrop — always remove old, create fresh
  showBackdrop() {
    var backdrop = document.createElement('div');
    backdrop.className = 'mobile-card-backdrop';
    backdrop.addEventListener('click', function() {
      var card = document.getElementById('detail-card');
      if (card) card.style.display = 'none';
      MobileDrawer.removeBackdrop();
    });
    document.body.appendChild(backdrop);
  },

  removeBackdrop() {
    var backdrops = document.querySelectorAll('.mobile-card-backdrop');
    backdrops.forEach(function(b) { b.remove(); });
  }
};

// Initialize after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(MobileDrawer.init, 100);
  });
} else {
  setTimeout(MobileDrawer.init, 100);
}
