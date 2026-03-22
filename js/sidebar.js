const Sidebar = {
  renderList(projects, onSelect) {
    var listEl = document.getElementById('project-list');
    var countEl = document.getElementById('results-count');
    var esc = DataLoader.escapeHtml;

    countEl.textContent = projects.length + ' project' + (projects.length !== 1 ? 's' : '');

    listEl.innerHTML = projects.map(function(p) {
      var isPipeline = DataLoader.isPipeline(p);
      var capacityStr = isPipeline
        ? (p.capacity_bcfd ? p.capacity_bcfd + ' Bcf/d' : null)
        : (p.capacity_mw ? p.capacity_mw.toLocaleString() + ' MW' : null);
      var meta = [p.operator, p.docket, capacityStr, p.length_miles ? p.length_miles + ' mi' : null].filter(Boolean).join(' · ');
      var typeClass = isPipeline ? 'pipeline' : 'transmission';
      var typeLabel = isPipeline ? 'GAS' : 'TRANS';

      return '<li class="project-list-item" tabindex="0" role="button" data-id="' + p.id + '">' +
        '<span class="item-name"><span class="item-type-badge item-type-badge--' + typeClass + '">' + typeLabel + '</span> ' + esc(p.name) + '</span>' +
        '<span class="item-meta">' + esc(meta) + '</span></li>';
    }).join('');

    listEl.querySelectorAll('.project-list-item').forEach(function(el) {
      function selectProject() {
        var project = projects.find(function(p) { return p.id === el.getAttribute('data-id'); });
        if (project) {
          listEl.querySelectorAll('.project-list-item').forEach(function(li) { li.classList.remove('active'); });
          el.classList.add('active');
          onSelect(project);
        }
      }
      el.addEventListener('click', selectProject);
      el.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectProject(); }
      });
    });
  }
};
