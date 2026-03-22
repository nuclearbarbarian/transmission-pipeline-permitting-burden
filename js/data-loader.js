const DataLoader = {
  async loadDataFile(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error('Failed to load ' + path);
    const data = await response.json();
    return (data._metadata && data.projects)
      ? { metadata: data._metadata, projects: data.projects }
      : { metadata: null, projects: data };
  },

  async loadJSON(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error('Failed to load ' + path);
    return response.json();
  },

  normalizeStatus(status) {
    if (!status) return 'unknown';
    const s = status.toLowerCase().replace(/\s+/g, '-');
    const map = {
      'under-construction': 'under-construction',
      'construction-pending': 'construction-pending',
      'approved': 'approved', 'approved-preconstruction': 'approved',
      'permitted-preconstruction': 'approved', 'certificated': 'approved',
      'proposed': 'proposed', 'proposed-permitting': 'proposed',
      'proposed-development': 'proposed',
      'announced': 'announced', 'pre-filing': 'pre-filing',
      'operational': 'operational',
    };
    return map[s] || s;
  },

  getOperators(projects) {
    return [...new Set(projects.map(p => p.operator))].sort();
  },

  filterProjects(projects, filters) {
    return projects.filter(p => {
      if (filters.status && filters.status !== 'all' && DataLoader.normalizeStatus(p.status) !== filters.status) return false;
      if (filters.operator && filters.operator !== 'all' && p.operator !== filters.operator) return false;
      if (filters.region && filters.region !== 'all' && p.region !== filters.region) return false;
      if (filters.search) {
        const searchable = [p.name, p.operator, p.docket, p.strategic_context].filter(Boolean).join(' ').toLowerCase();
        if (!searchable.includes(filters.search.toLowerCase())) return false;
      }
      return true;
    });
  },

  computeBurdenScore(d) {
    let s = 0;
    if (d.sepa && d.sepa.has_sepa) s++;
    if (d.clean_water && !d.clean_water.section_404_assumption) s++;
    if (d.clean_water && !d.clean_water.npdes_authority) s++;
    const es = d.endangered_species;
    if (es && es.has_sesa && es.consultation) s++;
    if (es && es.has_sesa && es.critical_habitat) s++;
    return s;
  },

  burdenTier(score) {
    return score <= 1 ? 'low' : score <= 2 ? 'medium' : 'high';
  },

  isPipeline(p) {
    return p._type === 'pipeline';
  },

  typeLabel(p) {
    if (DataLoader.isPipeline(p)) return 'Gas Pipeline';
    return 'Transmission' + (p.technology ? ' (' + p.technology + ')' : '');
  },

  getProjectEvents(id) {
    return (window._permittingEvents || {})[id] || [];
  },

  ynText(v) {
    return v ? 'Yes' : 'No';
  },

  ynHtml(v) {
    return v ? '<span class="permit-yes">Yes</span>' : '<span class="permit-no">No</span>';
  },

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};
