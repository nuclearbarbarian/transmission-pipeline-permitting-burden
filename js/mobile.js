/* Mobile layout module — additive layer, no changes to existing JS files
   (except card.js which gets progressive disclosure wrappers) */
'use strict';

const MobileDrawer = {
  sidebar: null,
  state: 'collapsed',
  startY: 0,
  currentY: 0,
  touchMoved: false,
  cardExpanded: false,

  init() {
    if (window.innerWidth > 768) return;
    window._isMobile = true;

    MobileDrawer.sidebar = document.getElementById('sidebar');
    if (!MobileDrawer.sidebar) return;

    MobileDrawer.sidebar.classList.add('drawer--collapsed');

    // FIX #3 (visual density): Uncheck choropleth on mobile for cleaner first impression
    var permCb = document.getElementById('layer-state-permitting');
    if (permCb && permCb.checked) {
      permCb.checked = false;
      permCb.dispatchEvent(new Event('change'));
    }

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
        MobileDrawer.currentY = e.touches[0].clientY;
        MobileDrawer.touchMoved = false;
      }, { passive: true });

      handle.addEventListener('touchmove', function(e) {
        MobileDrawer.currentY = e.touches[0].clientY;
        MobileDrawer.touchMoved = true;
      }, { passive: true });

      handle.addEventListener('touchend', function(e) {
        if (!MobileDrawer.touchMoved) return;
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

    // Wrap Card.render for mobile enhancements
    if (typeof Card !== 'undefined') {
      var _origRender = Card.render;
      Card.render = function(project) {
        _origRender.call(Card, project);
        if (window._isMobile && project) {
          MobileDrawer.setState('collapsed');
          MobileDrawer.removeBackdrop();
          MobileDrawer.showBackdrop();
          MobileDrawer.cardExpanded = false;
          var card = document.getElementById('detail-card');
          if (card) {
            card.classList.remove('card--expanded');
            MobileDrawer.addCardGrip(card);
            MobileDrawer.addCardAttribution(card);
            MobileDrawer.addCardSwipe(card);
          }
          // FIX #2: Push history state so back button closes card
          history.pushState({ cardOpen: true }, '');
        }
      };
    }

    // FIX #2: Back button closes card
    window.addEventListener('popstate', function(e) {
      if (window._isMobile) {
        var card = document.getElementById('detail-card');
        if (card && card.style.display !== 'none') {
          card.style.display = 'none';
          MobileDrawer.removeBackdrop();
        }
      }
    });

    // Wrap MapView.drawProject for better touch targets
    if (typeof MapView !== 'undefined') {
      var _origDraw = MapView.drawProject;
      MapView.drawProject = function(p, layerGroup) {
        _origDraw.call(MapView, p, layerGroup);
        var line = MapView.markerLookup[p.id];
        if (line && line.unbindTooltip) line.unbindTooltip();

        // Invisible wider hit line for touch targets
        if (line && line.getLatLngs) {
          var hitLine = L.polyline(line.getLatLngs(), {
            weight: 30, opacity: 0, interactive: true
          });
          hitLine.on('click', function() {
            Card.render(p);
            if (typeof MapView.highlightListItem === 'function') MapView.highlightListItem(p.id);
          });
          hitLine.addTo(layerGroup);
        }
      };

      // Larger endpoint markers on mobile
      var _origEndpoint = MapView.addEndpoint;
      MapView.addEndpoint = function(lat, lng, color, radius, layerGroup, tooltipHtml, project) {
        _origEndpoint.call(MapView, lat, lng, color, Math.max(radius, 12), layerGroup, tooltipHtml, project);
      };
    }

    // Convert choropleth/capacity sticky tooltips to tap popups
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

  fixOverlayLayers() {
    setTimeout(function() {
      [Choropleth, typeof CapacityNeed !== 'undefined' ? CapacityNeed : null].forEach(function(mod) {
        if (!mod || !mod.layer) return;
        mod.layer.eachLayer(function(layer) {
          if (layer.eachLayer) {
            layer.eachLayer(function(fl) {
              if (fl.getTooltip && fl.getTooltip()) {
                var content = fl.getTooltip().getContent();
                fl.unbindTooltip();
                fl.off('click');
                fl.bindPopup(content, { maxWidth: 280, className: 'mobile-overlay-popup' });
              }
            });
          }
        });
      });
    }, 500);
  },

  // Add grip bar to card for swipe affordance
  addCardGrip(card) {
    if (card.querySelector('.card-grip')) return;
    var grip = document.createElement('div');
    grip.className = 'card-grip';
    card.insertBefore(grip, card.firstChild);
  },

  // Add attribution footer for screenshots
  addCardAttribution(card) {
    if (card.querySelector('.card-attribution')) return;
    var attr = document.createElement('div');
    attr.className = 'card-attribution';
    attr.textContent = 'Transmission & Pipeline Permitting Burden · thefai.org';
    card.appendChild(attr);
  },

  // Swipe-to-dismiss and swipe-to-expand on detail card
  addCardSwipe(card) {
    if (card._swipeAttached) return;
    card._swipeAttached = true;
    var startY = 0, currY = 0, moved = false;

    card.addEventListener('touchstart', function(e) {
      startY = e.touches[0].clientY;
      currY = startY;
      moved = false;
    }, { passive: true });

    card.addEventListener('touchmove', function(e) {
      currY = e.touches[0].clientY;
      moved = true;
    }, { passive: true });

    card.addEventListener('touchend', function(e) {
      if (!moved) return;
      var delta = currY - startY;
      if (delta > 100) {
        // Swipe down: dismiss card
        card.style.display = 'none';
        MobileDrawer.removeBackdrop();
        if (history.state && history.state.cardOpen) history.back();
      } else if (delta < -80 && !MobileDrawer.cardExpanded) {
        // Swipe up: expand card to full height
        card.classList.add('card--expanded');
        MobileDrawer.cardExpanded = true;
      } else if (delta > 80 && MobileDrawer.cardExpanded) {
        // Swipe down from expanded: collapse to half-sheet
        card.classList.remove('card--expanded');
        MobileDrawer.cardExpanded = false;
      }
    }, { passive: true });
  },

  setState(state) {
    MobileDrawer.state = state;
    MobileDrawer.sidebar.classList.remove('drawer--collapsed', 'drawer--peek', 'drawer--full');
    MobileDrawer.sidebar.classList.add('drawer--' + state);
    var btn = document.getElementById('mobile-filter-btn');
    if (btn) btn.textContent = state === 'collapsed' ? 'Filters' : 'Close';
  },

  showBackdrop() {
    var backdrop = document.createElement('div');
    backdrop.className = 'mobile-card-backdrop';
    backdrop.addEventListener('click', function() {
      var card = document.getElementById('detail-card');
      if (card) card.style.display = 'none';
      MobileDrawer.removeBackdrop();
      if (history.state && history.state.cardOpen) history.back();
    });
    document.body.appendChild(backdrop);
  },

  removeBackdrop() {
    document.querySelectorAll('.mobile-card-backdrop').forEach(function(b) { b.remove(); });
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
