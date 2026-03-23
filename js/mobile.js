/* Mobile layout module — additive layer, no changes to existing JS files */
'use strict';

const MobileDrawer = {
  sidebar: null,
  state: 'collapsed',
  startY: 0,
  currentY: 0,

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
      }, { passive: true });

      handle.addEventListener('touchend', function(e) {
        var deltaY = MobileDrawer.currentY - MobileDrawer.startY;
        if (deltaY < -50) {
          // Swiped up
          if (MobileDrawer.state === 'collapsed') MobileDrawer.setState('peek');
          else if (MobileDrawer.state === 'peek') MobileDrawer.setState('full');
        } else if (deltaY > 50) {
          // Swiped down
          if (MobileDrawer.state === 'full') MobileDrawer.setState('peek');
          else if (MobileDrawer.state === 'peek') MobileDrawer.setState('collapsed');
        }
      }, { passive: true });

      handle.addEventListener('touchmove', function(e) {
        MobileDrawer.currentY = e.touches[0].clientY;
      }, { passive: true });
    }

    // Project list items: collapse drawer on tap
    MobileDrawer.sidebar.addEventListener('click', function(e) {
      if (e.target.closest('.project-list-item')) {
        MobileDrawer.setState('collapsed');
      }
    });

    // Wrap Card.render to collapse drawer when card opens
    if (typeof Card !== 'undefined') {
      var _origRender = Card.render;
      Card.render = function(project) {
        _origRender.call(Card, project);
        if (window._isMobile && project) {
          MobileDrawer.setState('collapsed');
          MobileDrawer.showBackdrop();
        }
      };
    }

    // Suppress tooltips on mobile — taps go straight to card
    if (typeof MapView !== 'undefined') {
      var _origDraw = MapView.drawProject;
      MapView.drawProject = function(p, layerGroup) {
        _origDraw.call(MapView, p, layerGroup);
        var line = MapView.markerLookup[p.id];
        if (line && line.unbindTooltip) line.unbindTooltip();
      };
    }

    // Handle orientation change
    var resizeTimer;
    window.addEventListener('resize', function() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function() {
        if (window.innerWidth > 768) {
          window._isMobile = false;
          MobileDrawer.sidebar.classList.remove('drawer--collapsed', 'drawer--peek', 'drawer--full');
        } else {
          window._isMobile = true;
          if (!MobileDrawer.sidebar.classList.contains('drawer--collapsed') &&
              !MobileDrawer.sidebar.classList.contains('drawer--peek') &&
              !MobileDrawer.sidebar.classList.contains('drawer--full')) {
            MobileDrawer.sidebar.classList.add('drawer--collapsed');
          }
        }
      }, 250);
    });
  },

  setState(state) {
    MobileDrawer.state = state;
    MobileDrawer.sidebar.classList.remove('drawer--collapsed', 'drawer--peek', 'drawer--full');
    MobileDrawer.sidebar.classList.add('drawer--' + state);
    // Update filter button text
    var btn = document.getElementById('mobile-filter-btn');
    if (btn) btn.textContent = state === 'collapsed' ? 'Filters' : 'Close';
  },

  showBackdrop() {
    if (document.querySelector('.mobile-card-backdrop')) return;
    var backdrop = document.createElement('div');
    backdrop.className = 'mobile-card-backdrop';
    backdrop.addEventListener('click', function() {
      var card = document.getElementById('detail-card');
      if (card) card.style.display = 'none';
      MobileDrawer.removeBackdrop();
    });
    document.body.appendChild(backdrop);

    // Also remove backdrop when card is closed via X button
    var card = document.getElementById('detail-card');
    if (card) {
      var closeBtn = card.querySelector('.detail-card-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', function() {
          MobileDrawer.removeBackdrop();
        }, { once: true });
      }
    }
  },

  removeBackdrop() {
    var backdrop = document.querySelector('.mobile-card-backdrop');
    if (backdrop) backdrop.remove();
  }
};

// Initialize after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    // Delay slightly to ensure app.js has initialized
    setTimeout(MobileDrawer.init, 100);
  });
} else {
  setTimeout(MobileDrawer.init, 100);
}
