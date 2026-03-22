// Tooltip handler for [data-tip] elements — supports mouse and keyboard
(function() {
  var popup = null;

  var hideTimer = null;
  var isHtml = false;

  function showTip(el) {
    if (!el) return;
    clearTimeout(hideTimer);
    if (!popup) {
      popup = document.createElement('div');
      popup.className = 'tip-popup';
      popup.setAttribute('role', 'tooltip');
      document.body.appendChild(popup);
      popup.addEventListener('mouseenter', function() { clearTimeout(hideTimer); });
      popup.addEventListener('mouseleave', function() { hideTip(); });
    }
    var htmlTip = el.getAttribute('data-tip-html');
    if (htmlTip) {
      popup.innerHTML = htmlTip;
      popup.style.pointerEvents = 'auto';
      isHtml = true;
    } else {
      popup.textContent = el.getAttribute('data-tip');
      popup.style.pointerEvents = 'none';
      isHtml = false;
    }
    popup.style.display = 'block';
    var rect = el.getBoundingClientRect();
    var popW = popup.offsetWidth;
    var popH = popup.offsetHeight;
    var left = Math.max(4, Math.min(rect.left, window.innerWidth - popW - 4));
    var top = rect.top - popH - 4;
    if (top < 4) top = rect.bottom + 4;
    popup.style.left = left + 'px';
    popup.style.top = top + 'px';
  }

  function hideTip() {
    if (popup) popup.style.display = 'none';
  }

  function delayedHide() {
    hideTimer = setTimeout(hideTip, 200);
  }

  // Mouse events
  document.addEventListener('mouseover', function(e) {
    var el = e.target.closest('[data-tip]') || e.target.closest('[data-tip-html]');
    showTip(el);
  });
  document.addEventListener('mouseout', function(e) {
    var el = e.target.closest('[data-tip]') || e.target.closest('[data-tip-html]');
    if (el) {
      if (isHtml) delayedHide();
      else hideTip();
    }
  });

  // Keyboard events — make [data-tip] elements focusable
  document.addEventListener('focusin', function(e) { showTip(e.target.closest('[data-tip]') || e.target.closest('[data-tip-html]')); });
  document.addEventListener('focusout', function(e) { if (e.target.closest('[data-tip]') || e.target.closest('[data-tip-html]')) delayedHide(); });

  // Add tabindex to all [data-tip] elements when card renders
  var observer = new MutationObserver(function() {
    document.querySelectorAll('[data-tip]:not([tabindex]), [data-tip-html]:not([tabindex])').forEach(function(el) {
      el.setAttribute('tabindex', '0');
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();

const Card = {
  render(project) {
    var cardEl = document.getElementById('detail-card');
    if (!project) { cardEl.style.display = 'none'; return; }

    cardEl.style.display = 'block';
    var esc = DataLoader.escapeHtml;
    var isPipeline = DataLoader.isPipeline(project);
    var typeLabel = DataLoader.typeLabel(project);
    var statusClass = 'status-badge--' + DataLoader.normalizeStatus(project.status);

    var rows = [
      ['Operator', project.operator],
      ['Docket', project.docket || '—'],
      ['Status', '<span class="status-badge ' + statusClass + '">' + (project.status || '').replace(/-/g, ' ') + '</span>'],
      ['Target', project.in_service_year || '—'],
      ['Length', project.length_miles ? project.length_miles.toLocaleString() + ' mi' : '—'],
      ['States', project.states ? project.states.join(', ') : '—'],
    ];

    if (isPipeline) {
      rows.push(['Capacity', project.capacity_bcfd ? project.capacity_bcfd + ' Bcf/d' : '—']);
      rows.push([project.capex_estimated ? 'CAPEX [EST]' : 'CAPEX', project.capex_mm ? '$' + project.capex_mm.toLocaleString() + 'M' : '—']);
    } else {
      rows.push(['Capacity', project.capacity_mw ? project.capacity_mw.toLocaleString() + ' MW' : '—']);
      rows.push(['Voltage', project.voltage_kv ? project.voltage_kv + ' kV' : '—']);
    }

    // Permitting section
    var permHtml = '<div class="detail-section"><h2 class="detail-section-heading">Permitting</h2>';
    var nepaStatus = project.permitting ? (project.permitting.nepa_status || null) : null;
    var isFast41 = project.permitting && project.permitting.fast_41;

    permHtml += '<div style="margin-bottom:var(--space-xs);font-family:var(--font-mono);font-size:10px;">' +
      'NEPA: <strong>' + (nepaStatus ? esc(nepaStatus) : 'Not determined') + '</strong>' +
      (isFast41 ? ' · <span style="color:var(--color-green);font-weight:bold;">FAST-41</span>' : '') + '</div>';

    // Progress bar + benchmarks
    var nepa = window._nepaContext;
    if (nepa && nepa.benchmarks && nepaStatus) {
      var stageMap = { completed: 4, rod_issued: 4, feis_published: 3, deis_published: 2, EIS: 2, noi_published: 1, pending: 0, 'pre-filing': 0, pre_noi: 0 };
      var activeStage = nepaStatus in stageMap ? stageMap[nepaStatus] : -1;
      var stageLabels = ['Pre-NOI', 'NOI', 'DEIS', 'FEIS', 'ROD'];
      var stageTips = [
        'Pre-Notice of Intent: Project is in scoping or pre-filing. The lead agency has not yet formally announced its intent to prepare an EIS.',
        'Notice of Intent: The lead agency has published a Notice of Intent in the Federal Register, formally beginning the NEPA review process and opening public scoping.',
        'Draft EIS: The Draft Environmental Impact Statement has been published for public comment, typically a 45-90 day review period.',
        'Final EIS: The Final EIS has been published, incorporating public comments. A 30-day waiting period follows before the Record of Decision.',
        'Record of Decision: The lead agency has issued its final decision, completing the NEPA process. The project may proceed to construction (subject to other permits).'
      ];

      if (activeStage >= 0) {
        permHtml += '<div class="nepa-progress">';
        permHtml += stageLabels.map(function(label, i) {
          var cls = 'nepa-stage' + (i < activeStage ? ' nepa-stage--done' : i === activeStage ? ' nepa-stage--active' : '');
          return '<div class="' + cls + ' has-tip" data-tip="' + esc(stageTips[i]) + '"><span class="nepa-stage-dot"></span><span class="nepa-stage-label">' + label + '</span></div>';
        }).join('');
        permHtml += '</div>';
      }

      var bench = nepa.benchmarks[isPipeline ? 'energy_fossil' : 'energy_renewable'];
      var statutoryYears = nepa.benchmarks.statutory_target_years;

      // Calculate actual project EIS duration from events
      var projEvents = DataLoader.getProjectEvents(project.id);
      var noiDate = null, rodDate = null;
      projEvents.forEach(function(ev) {
        var d = ev.date;
        if (!d) return;
        var desc = (ev.description || '').toLowerCase();
        var type = ev.type || '';
        if (!noiDate && (desc.indexOf('notice of intent') > -1 || desc.indexOf('noi') > -1 || desc.indexOf('notice of scoping') > -1) && (type === 'nepa_eis' || type === 'nepa_ea')) {
          noiDate = d;
        }
        if (desc.indexOf('record of decision') > -1 || desc.indexOf('rod') > -1 || desc.indexOf('certificate') > -1 || desc.indexOf('presidential permit') > -1) {
          if (!rodDate || d > rodDate) rodDate = d;
        }
      });

      var actualYears = null;
      if (noiDate && rodDate && rodDate > noiDate) {
        var ms = new Date(rodDate) - new Date(noiDate);
        actualYears = Math.round(ms / (365.25 * 24 * 60 * 60 * 1000) * 10) / 10;
      }

      permHtml += '<div class="nepa-benchmarks">';

      // Typical EIS duration (benchmark)
      permHtml += '<div class="nepa-bench-row"><span class="nepa-bench-label has-tip" data-tip="Median time from Notice of Intent to Record of Decision across ' + bench.count + ' completed Environmental Impact Statements in the ' + esc(bench.description) + ' category (CEQ data, FEIS published 2010-2024). Note: this is a broad category benchmark, not project-type-specific. Only 2 completed FERC pipeline EISs exist in the dataset. Source: Hochman/FAI NEPA EIS Dashboard.">Typical EIS duration (' + bench.count + ' reviews)</span><span class="nepa-bench-value">' + bench.median_years + ' years</span></div>';

      // This project's actual duration (below typical) — always show
      if (actualYears !== null) {
        var durationColor = actualYears <= statutoryYears ? 'var(--color-green)' : 'var(--color-red)';
        permHtml += '<div class="nepa-bench-row"><span class="nepa-bench-label has-tip" data-tip="Calculated from earliest NOI/scoping event (' + noiDate.substring(0,7) + ') to latest ROD/certificate event (' + rodDate.substring(0,7) + ') in this project\'s permitting timeline.">This project\'s EIS duration</span><span class="nepa-bench-value" style="color:' + durationColor + '">' + actualYears + ' years</span></div>';
      } else if (noiDate && !rodDate) {
        var elapsed = Math.round((new Date() - new Date(noiDate)) / (365.25 * 24 * 60 * 60 * 1000) * 10) / 10;
        permHtml += '<div class="nepa-bench-row"><span class="nepa-bench-label has-tip" data-tip="Time since earliest NOI/scoping event (' + noiDate.substring(0,7) + '). Review is still in progress.">Time in EIS review (ongoing)</span><span class="nepa-bench-value">' + elapsed + ' years</span></div>';
      } else {
        permHtml += '<div class="nepa-bench-row"><span class="nepa-bench-label has-tip" data-tip="No NOI or ROD events found in this project\'s permitting timeline. Duration cannot be calculated.">This project\'s EIS duration</span><span class="nepa-bench-value" style="color:var(--color-warm-gray)">n/a</span></div>';
      }

      // Congressional deadline
      permHtml += '<div class="nepa-bench-row"><span class="nepa-bench-label has-tip" data-tip="Maximum time allowed from Notice of Intent to Record of Decision under the FAST-41 permitting framework (Title 41 of the FAST Act, 2015) and the Fiscal Responsibility Act of 2023. Most EIS reviews historically exceed this target.">Congressional deadline (FAST-41 / FRA)</span><span class="nepa-bench-value">' + statutoryYears + ' years</span></div>';

      // Exceeded deadline (below congressional) — always show
      if (actualYears !== null && actualYears > statutoryYears) {
        var overDeadline = Math.round((actualYears - statutoryYears) * 10) / 10;
        permHtml += '<div class="nepa-bench-row"><span class="nepa-bench-label">Exceeded congressional deadline by</span><span class="nepa-bench-value" style="color:var(--color-red)">' + overDeadline + ' years</span></div>';
      } else if (actualYears !== null && actualYears <= statutoryYears) {
        permHtml += '<div class="nepa-bench-row"><span class="nepa-bench-label">Exceeded congressional deadline by</span><span class="nepa-bench-value" style="color:var(--color-green)">did not exceed</span></div>';
      } else {
        permHtml += '<div class="nepa-bench-row"><span class="nepa-bench-label">Exceeded congressional deadline by</span><span class="nepa-bench-value" style="color:var(--color-warm-gray)">n/a</span></div>';
      }

      permHtml += '</div>';
    }

    // Permitting events timeline
    var events = DataLoader.getProjectEvents(project.id);
    if (events.length > 0) {
      var sorted = events.slice().sort(function(a, b) { return a.date < b.date ? 1 : -1; });
      permHtml += '<details class="collapsible-section" style="margin-top:var(--space-sm);">' +
        '<summary class="detail-section-heading collapsible-toggle">Timeline (' + events.length + ' events)</summary>' +
        '<div class="permitting-timeline">';
      sorted.forEach(function(ev) {
        var dateStr = ev.date ? ev.date.substring(0, 7) : '—';
        var srcTag = ev.source_type !== 'government' ? ' <span class="gap-label">[' + ev.source_type + ']</span>' : '';
        var estTag = ev.date_note ? ' <span class="detail-confidence-note">' + esc(ev.date_note) + '</span>' : '';
        var srcLink = ev.source_url
          ? ' <a href="' + esc(ev.source_url) + '" target="_blank" rel="noopener" class="timeline-source-link">[source]</a>'
          : '';
        permHtml += '<div class="timeline-event">' +
          '<span class="timeline-date">' + dateStr + '</span> ' +
          '<span class="timeline-desc">' + esc(ev.description) + '</span>' +
          srcTag + srcLink + estTag + '</div>';
      });
      permHtml += '</div></details>';
    } else {
      permHtml += '<div style="margin-top:var(--space-sm);font-family:var(--font-mono);font-size:10px;">' +
        'Permitting events: <span class="gap-label">[GAP]</span><br>' +
        '<span class="detail-confidence-note">No documented permitting events</span></div>';
    }

    permHtml += '</div>';

    // State permitting cross-reference
    var statePermHtml = '';
    var stateData = window._statePermittingData;
    if (stateData && project.states && project.states.length > 0) {
      statePermHtml = '<details class="collapsible-section detail-section"><summary class="detail-section-heading collapsible-toggle">State Permitting</summary>';
      var stateEvents = events.filter(function(ev) { return ev.state; });

      project.states.forEach(function(code) {
        var st = stateData[code];
        if (!st) {
          statePermHtml += '<div class="permitting-state-block"><strong>' + esc(code) + '</strong>: No data</div>';
          return;
        }
        var es = st.endangered_species || {};
        var yn = DataLoader.ynHtml;

        statePermHtml += '<div class="permitting-state-block"><strong>' + esc(st.name) + '</strong>' +
          '<div class="permitting-checklist" style="display:flex;gap:8px;flex-wrap:wrap;margin:2px 0;">' +
          '<span>SEPA: ' + yn(st.sepa.has_sepa) + '</span>' +
          '<span>404: ' + yn(st.clean_water.section_404_assumption) + '</span>' +
          '<span>NPDES: ' + yn(st.clean_water.npdes_authority) + '</span>' +
          '<span>SESA: ' + yn(es.has_sesa) + '</span>' +
          '</div>';

        // Find events matching this state
        var matching = stateEvents.filter(function(ev) { return ev.state === code; });
        if (matching.length > 0) {
          matching.forEach(function(ev) {
            var dateStr = ev.date ? ev.date.substring(0, 7) : '';
            var srcLink = ev.source_url
              ? ' <a href="' + esc(ev.source_url) + '" target="_blank" rel="noopener" class="timeline-source-link">[source]</a>'
              : '';
            statePermHtml += '<div class="state-event-flag">' + dateStr + ' ' + esc(ev.description) + srcLink + '</div>';
          });
        }
        statePermHtml += '</div>';
      });
      statePermHtml += '</details>';
    }

    // Sources
    var sourcesHtml = (project.sources || []).map(function(s) {
      var text = s.name;
      if (s.docket) text += ' (' + s.docket + ')';
      if (s.date) text += ', ' + s.date;
      if (s.source_type && s.source_type !== 'government') text += ' [' + s.source_type + ']';
      if (s.source_url) {
        return '<li><a href="' + esc(s.source_url) + '" target="_blank" rel="noopener" class="timeline-source-link">' + esc(text) + '</a></li>';
      }
      return '<li>' + esc(text) + '</li>';
    }).join('');

    var confidenceClass = 'confidence-badge--' + (project.data_confidence || 'low');

    cardEl.innerHTML =
      '<div class="detail-card-actions"><button class="detail-card-print" id="detail-card-print" aria-label="Print project card">&#9113;</button><button class="detail-card-close" id="detail-card-close" aria-label="Close project card">&times;</button></div>' +
      '<h3>' + esc(project.name) + '</h3>' +
      '<div class="detail-card-type">' + esc(typeLabel) + '</div>' +
      '<table class="detail-table"><tbody>' + rows.map(function(r) { return '<tr><th>' + r[0] + '</th><td>' + r[1] + '</td></tr>'; }).join('') + '</tbody></table>' +
      permHtml +
      statePermHtml +
      '<div class="detail-section">' +
      (sourcesHtml ? '<h2 class="detail-section-heading">Sources</h2><ul class="detail-sources">' + sourcesHtml + '</ul>' : '') +
      '<div style="margin-top:4px;">Data Confidence: <span class="confidence-badge has-tip ' + confidenceClass + '"' +
      ' data-tip="' + esc(project.confidence_note || '') + '"' +
      '>' + (project.data_confidence || '—') + '</span></div></div>';

    document.getElementById('detail-card-close').addEventListener('click', function() {
      cardEl.style.display = 'none';
    });
    var printBtn = document.getElementById('detail-card-print');
    if (printBtn) {
      printBtn.addEventListener('click', function() {
        var printWin = window.open('', '_blank', 'width=700,height=900');
        printWin.document.write('<html><head><title>' + esc(project.name) + '</title>' +
          '<style>body{font-family:Georgia,serif;font-size:12px;padding:24px;max-width:640px;margin:0 auto;}' +
          'h3{font-size:18px;margin-bottom:4px;}table{width:100%;border-collapse:collapse;margin:12px 0;}' +
          'th,td{text-align:left;padding:4px 8px;border-bottom:1px solid #ccc;}th{font-weight:bold;width:120px;}' +
          'h2{font-size:13px;text-transform:uppercase;letter-spacing:0.05em;margin-top:16px;border-bottom:1px solid #000;padding-bottom:4px;}' +
          'ul{margin:4px 0;padding-left:16px;}li{margin-bottom:2px;}a{color:#2B4B6F;}' +
          '.timeline-event{margin-bottom:6px;font-size:11px;}.timeline-date{font-weight:bold;}</style></head><body>');
        printWin.document.write(cardEl.innerHTML.replace(/<button[^>]*>.*?<\/button>/g, ''));
        printWin.document.write('</body></html>');
        printWin.document.close();
        printWin.print();
      });
    }
  }
};
