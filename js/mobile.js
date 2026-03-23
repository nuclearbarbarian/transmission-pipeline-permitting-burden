/* Mobile layout module — additive layer, no changes to existing JS files */
'use strict';

var MobileDrawer = {
  sidebar: null,
  state: 'collapsed',
  startY: 0,
  currentY: 0,
  touchMoved: false,
  cardExpanded: false,
  _cardHistoryPushed: false,
  _toastShown: false,
  _scrimHintShown: false,

  init: function() {
    if (window.innerWidth > 768) return;
    window._isMobile = true;

    MobileDrawer.sidebar = document.getElementById('sidebar');
    if (!MobileDrawer.sidebar) return;

    MobileDrawer.sidebar.classList.add('drawer--collapsed');

    // Uncheck choropleth on mobile for cleaner first impression
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
      new MutationObserver(function() {
        mobileCount.textContent = desktopCount.textContent;
      }).observe(desktopCount, { childList: true, characterData: true, subtree: true });
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

      handle.addEventListener('touchend', function() {
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

    // Prevent map from receiving touch/scroll events when interacting with drawer
    if (typeof L !== 'undefined' && L.DomEvent) {
      L.DomEvent.disableScrollPropagation(MobileDrawer.sidebar);
      L.DomEvent.disableClickPropagation(MobileDrawer.sidebar);
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
            card.scrollTop = 0;
            MobileDrawer.addCardGrip(card);
            MobileDrawer.reorderCardContent(card);
            MobileDrawer.addCardAttribution(card);
            MobileDrawer.addCardSwipe(card);
          }
          // FIX: Use replaceState if card already open, pushState if not
          if (MobileDrawer._cardHistoryPushed) {
            history.replaceState({ cardOpen: true }, '');
          } else {
            history.pushState({ cardOpen: true }, '');
            MobileDrawer._cardHistoryPushed = true;
          }
        }
      };

      // FIX: Wrap close button handler to also clean up scrim/history
      var _origClose = Card._closeCard;
      if (typeof _origClose === 'function') {
        Card._closeCard = function() {
          _origClose.call(Card);
          if (window._isMobile) {
            MobileDrawer.removeBackdrop();
            MobileDrawer.popCardHistory();
          }
        };
      }
    }

    // Back button closes card
    window.addEventListener('popstate', function() {
      if (window._isMobile) {
        var card = document.getElementById('detail-card');
        if (card && card.style.display !== 'none') {
          card.style.display = 'none';
          MobileDrawer.removeBackdrop();
        }
        MobileDrawer._cardHistoryPushed = false;
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

    // Convert overlay tooltips to popups — with retry
    MobileDrawer.fixOverlayLayers();

    // Re-fix overlays when layer checkboxes are toggled
    ['layer-state-permitting', 'layer-capacity-need'].forEach(function(id) {
      var cb = document.getElementById(id);
      if (cb) {
        cb.addEventListener('change', function() {
          if (cb.checked && window._isMobile) {
            setTimeout(function() { MobileDrawer.fixOverlayLayers(); }, 300);
          }
        });
      }
    });

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

    // Collapse filters section into <details> on mobile for less scroll
    MobileDrawer.collapseFiltersSection();

    // Onboarding toast — show once on first load
    if (!MobileDrawer._toastShown) {
      MobileDrawer._toastShown = true;
      setTimeout(function() {
        MobileDrawer.showToast('Tap a project line to see details', 4000);
      }, 1500);
    }
  },

  fixOverlayLayers: function() {
    // Retry up to 5 times at 500ms intervals until layers are populated
    var attempts = 0;
    var maxAttempts = 5;
    function tryFix() {
      var fixed = 0;
      [typeof Choropleth !== 'undefined' ? Choropleth : null,
       typeof CapacityNeed !== 'undefined' ? CapacityNeed : null].forEach(function(mod) {
        if (!mod || !mod.layer) return;
        mod.layer.eachLayer(function(layer) {
          if (layer.eachLayer) {
            layer.eachLayer(function(fl) {
              if (fl.getTooltip && fl.getTooltip()) {
                var content = fl.getTooltip().getContent();
                fl.unbindTooltip();
                fl.off('click');
                fl.bindPopup(content, { maxWidth: 280, className: 'mobile-overlay-popup' });
                fixed++;
              }
            });
          }
        });
      });
      attempts++;
      if (fixed === 0 && attempts < maxAttempts) {
        setTimeout(tryFix, 500);
      }
    }
    setTimeout(tryFix, 500);
  },

  addCardGrip: function(card) {
    if (card.querySelector('.card-grip')) return;
    var grip = document.createElement('div');
    grip.className = 'card-grip';
    card.insertBefore(grip, card.firstChild);
  },

  addCardAttribution: function(card) {
    if (card.querySelector('.card-attribution')) return;
    var attr = document.createElement('div');
    attr.className = 'card-attribution';
    attr.textContent = 'Transmission & Pipeline Permitting Burden \u00b7 thefai.org';
    card.appendChild(attr);
  },

  // FIX: Swipe only from grip bar or when scrollTop === 0
  addCardSwipe: function(card) {
    if (card._swipeAttached) return;
    card._swipeAttached = true;
    var startY = 0, currY = 0, moved = false, startedFromGrip = false, startScrollTop = 0;

    card.addEventListener('touchstart', function(e) {
      startY = e.touches[0].clientY;
      currY = startY;
      moved = false;
      startedFromGrip = !!(e.target.closest && e.target.closest('.card-grip'));
      startScrollTop = card.scrollTop;
    }, { passive: true });

    card.addEventListener('touchmove', function(e) {
      currY = e.touches[0].clientY;
      moved = true;
    }, { passive: true });

    card.addEventListener('touchend', function() {
      if (!moved) return;
      var delta = currY - startY;

      // Swipe down to dismiss: only if started from grip OR card is scrolled to top
      if (delta > 100 && (startedFromGrip || startScrollTop === 0)) {
        card.style.display = 'none';
        MobileDrawer.removeBackdrop();
        MobileDrawer.popCardHistory();
      }
      // Swipe up to expand: only if started from grip OR card is scrolled to top
      else if (delta < -80 && !MobileDrawer.cardExpanded && (startedFromGrip || startScrollTop === 0)) {
        card.classList.add('card--expanded');
        MobileDrawer.cardExpanded = true;
      }
      // Swipe down from expanded to half: only if started from grip OR scrolled to top
      else if (delta > 80 && MobileDrawer.cardExpanded && (startedFromGrip || startScrollTop === 0)) {
        card.classList.remove('card--expanded');
        MobileDrawer.cardExpanded = false;
      }
    }, { passive: true });
  },

  popCardHistory: function() {
    if (MobileDrawer._cardHistoryPushed) {
      MobileDrawer._cardHistoryPushed = false;
      if (history.state && history.state.cardOpen) history.back();
    }
  },

  setState: function(state) {
    MobileDrawer.state = state;
    MobileDrawer.sidebar.classList.remove('drawer--collapsed', 'drawer--peek', 'drawer--full');
    MobileDrawer.sidebar.classList.add('drawer--' + state);
    var btn = document.getElementById('mobile-filter-btn');
    if (btn) btn.textContent = state === 'collapsed' ? 'Filters' : 'Close';

    // Disable map dragging/zooming when drawer is open so touches go to drawer
    if (typeof MapView !== 'undefined' && MapView.instance) {
      if (state === 'collapsed') {
        MapView.instance.dragging.enable();
        MapView.instance.touchZoom.enable();
      } else {
        MapView.instance.dragging.disable();
        MapView.instance.touchZoom.disable();
      }
    }
  },

  showBackdrop: function() {
    var backdrop = document.createElement('div');
    backdrop.className = 'mobile-card-backdrop';

    // Scrim hint — show "Tap map to close" on first card open only
    if (!MobileDrawer._scrimHintShown) {
      MobileDrawer._scrimHintShown = true;
      var hint = document.createElement('div');
      hint.className = 'scrim-hint';
      hint.textContent = 'Tap here to close';
      backdrop.appendChild(hint);
      setTimeout(function() { hint.classList.add('scrim-hint--fade'); }, 2500);
      setTimeout(function() { if (hint.parentNode) hint.remove(); }, 3200);
    }

    backdrop.addEventListener('click', function() {
      var card = document.getElementById('detail-card');
      if (card) card.style.display = 'none';
      MobileDrawer.removeBackdrop();
      MobileDrawer.popCardHistory();
    });
    document.body.appendChild(backdrop);
  },

  removeBackdrop: function() {
    document.querySelectorAll('.mobile-card-backdrop').forEach(function(b) { b.remove(); });
  },

  showToast: function(message, duration) {
    var toast = document.createElement('div');
    toast.className = 'mobile-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    // Trigger animation
    requestAnimationFrame(function() { toast.classList.add('mobile-toast--visible'); });
    setTimeout(function() {
      toast.classList.remove('mobile-toast--visible');
      setTimeout(function() { if (toast.parentNode) toast.remove(); }, 300);
    }, duration || 3000);
  },

  // Collapse filters into a <details> element on mobile
  collapseFiltersSection: function() {
    var sections = MobileDrawer.sidebar.querySelectorAll('.sidebar-section');
    // Second section is Filters (first is Layers)
    if (sections.length >= 2) {
      var filtersSection = sections[1];
      var heading = filtersSection.querySelector('h2');
      if (heading && heading.textContent.trim() === 'Filters') {
        var details = document.createElement('details');
        var summary = document.createElement('summary');
        summary.textContent = 'Filters';
        summary.className = 'mobile-filters-summary';
        details.appendChild(summary);
        // Move all filter groups into the details
        var groups = filtersSection.querySelectorAll('.filter-group');
        groups.forEach(function(g) { details.appendChild(g); });
        heading.replaceWith(details);
      }
    }
  },

  // Reorder card content on mobile: move NEPA section above detail table
  reorderCardContent: function(card) {
    var nepaSection = card.querySelector('.nepa-progress');
    var detailTable = card.querySelector('.detail-table');
    if (nepaSection && detailTable && nepaSection.compareDocumentPosition(detailTable) & Node.DOCUMENT_POSITION_PRECEDING) {
      // NEPA is after table — move it before
      detailTable.parentNode.insertBefore(nepaSection, detailTable);
    }
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
