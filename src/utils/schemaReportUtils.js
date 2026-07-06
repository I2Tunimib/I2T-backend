const labels = {
  personalData: "Personal Data",
  quasiIdentifiers: "Quasi-Identifiers",
  nonPersonalData: "Non-Personal Data",
  anonymousData: "Anonymous Data"
};

export const buildHtmlReport = (data) => {
  const { tableName, datasetId, tableId, graphSnapshot, graphData, metrics, schemaData, showCompliance } = data;

  const schema = Array.isArray(schemaData) ? (schemaData[0] || {}) : (schemaData || {});
  const cleanStr = (str) => (str ? String(str).trim().replace(/^\uFEFF/, '') : '');
  const columnEntries = Object.entries(schema.columns).filter(([key]) => key.startsWith('th'));

  const compliance = schema?.compliance;
  const isGDPRCompliant = compliance.status === 'yesGDPR';
  const complianceHtml = compliance ? `
    <div 
      class="section" 
      style="background: ${isGDPRCompliant ? '#fff5f5' : '#f0fff4'};
      padding: 20px;
      border-radius: 6px;
      border-width: 1px;
      border-style: solid;
      border-color: ${compliance.status === 'yesGDPR' ? '#feb2b2' : '#9ae6b4'};
      margin-bottom: 30px;"
    >
      <h2 style="margin-top: 0; border: none; color: ${isGDPRCompliant ? '#c53030' : '#2f855a'};">Compliance Summary</h2>
      <p style="margin: 5px 0;"><strong>Status:</strong> ${isGDPRCompliant ? 'GDPR compliant' : 'GDPR NON-complaint'}</p>
      <p style="margin: 5px 0;"><strong>Confidence score:</strong> ${(compliance.score * 100).toFixed(0)}%</p>
      <p style="margin: 10px 0 0 0;"><strong>Reasoning:</strong> ${compliance.reasoning}</p>
    </div>
  ` : '';

  const currentLegendHtml = showCompliance ? `
    <div class="legend-item"><span class="dot" style="background-color: crimson;"></span> Personal Data</div>
    <div class="legend-item"><span class="dot" style="background-color: orange;"></span> Quasi Identifier</div>
    <div class="legend-item"><span class="dot" style="background-color: teal;"></span> Non-Personal Data</div>
    <div class="legend-item"><span class="dot" style="background-color: green;"></span> Anonymous Data</div>
  ` : `
    <div class="legend-item"><span class="dot dot-subject"></span> Subject</div>
    <div class="legend-item"><span class="dot dot-entity"></span> Entity</div>
    <div class="legend-item"><span class="dot dot-literal"></span> Literal</div>
  `;

  const nodesHtml = columnEntries.map(([key, th]) => {
    if (!th) return '';

    const label = th.label || key;
    const metadata = th.metadata || [];
    const types = metadata.flatMap((m) => m?.type ?? []);

    const outgoing = (graphData?.links || []).filter((l) => l && cleanStr(l.source) === cleanStr(label));
    const incoming = (graphData?.links || []).filter((l) => l && cleanStr(l.target) === cleanStr(label));
    const totalPropertiesCount = outgoing.length + incoming.length;

    const index = key.replace('th', '');
    const typeListId = `node-types-${index}`;
    const typeBtnId = `node-types-btn-${index}`;
    const propListId = `node-props-${index}`;
    const propBtnId = `node-props-btn-${index}`;

    const typesListHtml = types.length > 0
      ? `<ul style="margin: 4px 0; padding-left: 20px;">
          ${types.map((t) => `<li>${t?.name || 'Unknown'} (<strong>${t?.id || '-'}</strong>)</li>`).join('')}
         </ul>`
      : `<p style="margin: 4px 0; padding-left: 20px; color: #718096; font-style: italic;">No types</p>`;

    const outgoingHtml = outgoing.length > 0
      ? `<p style="margin: 2px 0; font-size: 13px; font-weight: bold;">Outgoing Relations:</p>
        <ul style="margin: 0 0 6px 0; padding-left: 20px;">
          ${outgoing.map((l) => `<li>&rarr; ${l?.target || 'N/A'} (<strong>${l?.propID || '-'}</strong> ${l?.label ? `- ${l.label}` : ''})</li>`).join('')}
        </ul>`
      : `<p style="margin: 2px 0; font-size: 13px; font-weight: bold;">Outgoing Relations: <span style="color: #718096; font-weight: normal; font-style: italic; margin-left: 5px;">None</span></p>`;

    const incomingHtml = incoming.length > 0
      ? `<p style="margin: 2px 0; font-size: 13px; font-weight: bold;">Incoming Relations:</p>
        <ul style="margin: 0; padding-left: 20px;">
          ${incoming.map((l) => `<li>&larr; ${l?.source || 'N/A'} (<strong>${l?.propID || '-'}</strong> ${l?.label ? `- ${l.label}` : ''})</li>`).join('')}
        </ul>`
      : `<p style="margin: 2px 0; font-size: 13px; font-weight: bold;">Incoming Relations: <span style="color: #718096; font-weight: normal; font-style: italic; margin-left: 5px;">None</span></p>`;

    const getComplianceDescription = (th) => {
      return `
        <div style="margin: 10px 0; padding: 12px; background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 14px;">
          <p style="margin: 0;">
            This column contains <strong>${labels[th.gdprClassification]}</strong> and is <strong>${th.gdprStatus === "yesGDPR" ? "GDPR compliant" : "GDPR non-compliant"}</strong> 
            with a confidence score of <strong>${Math.round((th.gdprScore ?? 0) * 100)}%</strong>.
           </p>
         </div>
      `;
    };

    return `
      <div style="border-bottom: 1px solid #edf2f7; padding: 12px 0;">
        <h4 style="margin: 0 0 8px 0; color: #3182ce;">Column: ${label}</h4>
        <p style="margin: 2px 0; font-size: 14px;"><strong>Kind:</strong> ${th?.kind || '-'}</p>
        <p style="margin: 2px 0; font-size: 14px;"><strong>Role:</strong> ${th?.role || '-'}</p>
        <p style="margin: 2px 0; font-size: 14px;">
          <strong>${th?.kind === "literal" ? "Datatype:" : "Semantic Class:"}</strong> ${th?.datatype || '-'}
        </p>

        <div style="margin-top: 8px; font-size: 14px">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span><strong>Types (${types.length})</strong></span>
            ${types.length > 0 ? `<span id="${typeBtnId}" class="action-link" onclick="toggleSection('${typeListId}', '${typeBtnId}')">Show list</span>` : ''}
          </div>
          <div id="${typeListId}" class="collapsible-content">${typesListHtml}</div>
        </div>

        <div style="margin-top: 2px; font-size: 14px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span><strong>Properties (${totalPropertiesCount})</strong></span>
            ${totalPropertiesCount > 0 ? `<span id="${propBtnId}" class="action-link" onclick="toggleSection('${propListId}', '${propBtnId}')">Show list</span>` : ''}
          </div>
          <div id="${propListId}" class="collapsible-content">
            <div style="margin-top: 4px; padding-left: 10px;">
              ${outgoingHtml}
              <div style="margin-top: 6px;"></div> 
              ${incomingHtml}
            </div>
          </div>
        </div>
        ${getComplianceDescription(th)} 
      </div>
    `;
  }).join('');

  const relationsMap = {};

  columnEntries.forEach(([_, th]) => {
    if (!th || !th.label) return;
    const sourceLabel = cleanStr(th.label);

    (th.metadata || []).forEach((m) => {
      if (!m) return;
      (m.property || []).forEach((p) => {
        if (!p || !p.obj) return;
        const targetLabel = cleanStr(p.obj);
        const pairKey = `${sourceLabel}->${targetLabel}`;

        if (!relationsMap[pairKey]) {
          relationsMap[pairKey] = { source: sourceLabel, target: targetLabel, properties: [] };
        }
        if (!relationsMap[pairKey].properties.some((prop) => prop.id === p.id)) {
          relationsMap[pairKey].properties.push({
            id: p.id || 'N/A',
            name: p.name || 'Unknown'
          });
        }
      });
    });
  });

  const linksHtml = Object.values(relationsMap).map((rel) => {
    const propertiesList = rel.properties
      .map((p) => `<li style="margin: 4px 0;"><strong>${p.id}</strong> - ${p.name}</li>`)
      .join('');

    return `
      <div style="border-bottom: 1px solid #edf2f7; padding: 12px 0;">
        <h4 style="margin: 0 0 8px 0;  color: #3182ce;">Relation: ${rel.source} &rarr; ${rel.target}</h4>
        <ul style="margin: 4px 0; padding-left: 20px; font-size: 14px; list-style-type: disc;">
          ${propertiesList}
        </ul>
      </div>
    `;
  }).join('');

  const metricsHtml = (metrics || []).map((m) => {
    if (!m) return '';
    if (m.name === 'Roles Distribution' && Array.isArray(m.value)) {
      const rolesList = m.value.map((r) => `<li><strong>${r?.role || 'N/A'}:</strong> ${r?.count || 0}</li>`).join('');
      return `
        <div style="border-bottom: 1px solid #edf2f7; padding: 12px 0;">
          <h4 style="margin: 0 0 4px 0; font-size: 14px;">${m.name}</h4>
          <ul style="margin: 4px 0 6px 0; padding-left: 20px; font-size: 14px; list-style-type: disc;">${rolesList}</ul>
          <p style="margin: 4px 0 0 0; color: #718096; font-size: 13px;"><em>${m.description || ''}</em></p>
        </div>
      `;
    }

    return `
      <div style="border-bottom: 1px solid #edf2f7; padding: 12px 0;">
        <h4 style="margin: 0 0 4px 0; font-size: 14px;">${m.name || 'Metric'}: <span style="color: #2d3748; font-weight: normal;">${m.value ?? '-'}</span></h4>
        <p style="margin: 0; color: #718096; font-size: 13px;"><em>${m.description || ''}</em></p>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>Schema Report - ${tableName || 'Report'}</title>
      <style>
        body { font-family: Roboto, sans-serif; margin: 40px; color: #2d3748; line-height: 1.6; background-color: #f7fafc; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        h1 { color: #1a365d; border-bottom: 3px solid #2b6cb0; padding-bottom: 10px; margin-top: 0; }
        h2 { color: #1a365d; margin-top: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; }
        .meta-box { background: #ebf8ff; border-left: 4px solid #3182ce; padding: 15px; border-radius: 4px; margin-bottom: 30px; }
        .section { margin-bottom: 40px; }
        .graph-container { text-align: center; padding: 30px; border: 1px solid #cbd5e0; border-radius: 8px; }
        .graph-wrapper-rel { position: relative; display: inline-block; max-width: 100%; }
        .graph-img { max-width: 100%; height: auto; }
        .legend-floating-box { position: absolute; top: 8px; left: 0; z-index: 10; display: flex; flex-direction: column; gap: 4px; padding: 16px; border-radius: 6px; border: 1px solid #cbd5e0; box-shadow: 0 2px 4px rgba(0,0,0,0.05); text-align: left; }
        .legend-title { font-weight: bold; margin: 0 0 4px 0; }
        .legend-item { display: flex; align-items: center; gap: 6px; }
        .dot { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }
        .dot-subject { background-color: #2ecc71; }
        .dot-entity { background-color: #3498db; }
        .dot-literal { background-color: #e67e22; }
        .action-link { color: #a0aec0; cursor: pointer; font-size: 13px; font-weight: 400; user-select: none; transition: color 0.2s ease; }
        .action-link:hover { color: #4a5568; text-decoration: underline; }
        .collapsible-content { display: none; overflow: hidden; margin-top: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Schema Report</h1>
        <div class="meta-box">
          <p style="margin: 0;"><strong>Table Name:</strong> ${tableName || 'N/A'}</p>
          <p style="margin: 5px 0 0 0;"><strong>Dataset ID:</strong> ${datasetId || '-'} | <strong>Table ID:</strong> ${tableId || '-'}</p>
          <p style="margin: 5px 0 0 0; font-size: 12px; color: #4a5568;"><em>Generated on: ${new Date().toLocaleString()}</em></p>
        </div>
        ${complianceHtml}
        <div class="section graph-container">
          <h2 style="margin-top: 0; border: none;">Schema Graph Visualization</h2>
          <div class="graph-wrapper-rel">
            <div class="legend-floating-box">
              <p class="legend-title">${showCompliance ? "Compliance Legend" : "Legend"}</p>
              ${currentLegendHtml}
            </div>
            ${graphSnapshot
              ? `<img class="graph-img" src="${graphSnapshot}" alt="Schema Graph" />`
              : '<p style="color: #e53e3e; font-weight: bold; padding: 40px; background: white; border-radius: 6px;">Schema Graph snapshot not available. Please open the Graph View tab before exporting.</p>'
            }
          </div>
        </div>

        <div class="section" style="background: #fff; padding: 20px; border-radius: 6px; border: 1px solid #e2e8f0;">
          <h2>Columns (${columnEntries.length})</h2>
          ${nodesHtml || '<p>No semantic nodes found.</p>'}
        </div>
        
        <div class="section" style="background: #fff; padding: 20px; border-radius: 6px; border: 1px solid #e2e8f0;">
          <h2>Relations (${Object.keys(relationsMap).length})</h2>
          ${linksHtml || '<p>No semantic relations found.</p>'}
        </div>
        
        <div class="section" style="background: #fff; padding: 20px; border-radius: 6px; border: 1px solid #e2e8f0;">
          <h2>Graph Structural Metrics</h2>
          ${metricsHtml || '<p>No graph metrics available.</p>'}
        </div>
      </div>

      <script>
        function toggleSection(contentId, elementId) {
          var content = document.getElementById(contentId);
          var element = document.getElementById(elementId);
          if (content.style.display === "block") {
            content.style.display = "none";
            element.innerText = "Show list";
          } else {
            content.style.display = "block";
            element.innerText = "Hide list";
          }
        }
      </script>
    </body>
    </html>
  `;
};

export const buildMarkdownReport = (data) => {
  const { tableName, datasetId, tableId, graphSnapshot, graphData, metrics, schemaData, showCompliance } = data;
  const schema = Array.isArray(schemaData) ? (schemaData[0].columns || {}) : (schemaData || {});
  const cleanStr = (str) => (str ? String(str).trim().replace(/^\uFEFF/, '') : '');
  const columnEntries = Object.entries(schema).filter(([key]) => key.startsWith('th'));

  let md = `# Schema Report - ${tableName || 'Report'}\n\n`;
  md += `**Table Name:** ${tableName || 'N/A'}  \n`;
  md += `**Dataset ID:** ${datasetId || '-'} | **Table ID:** ${tableId || '-'}  \n`;
  md += `*Generated on: ${new Date().toLocaleString()}*\n\n`;

  if (schema.compliance) {
    const isCompliant = schema.compliance.status === 'yesGDPR';
    md += `## Compliance Summary\n\n`;
    md += `**Status:** ${isCompliant ? 'GDPR compliant' : 'GDPR NON-compliant'}  \n`;
    md += `**Confidence score:** ${(schema.compliance.score * 100).toFixed(0)}%  \n`;
    md += `**Reasoning:** ${schema.compliance.reasoning}\n\n`;
  }

  md += `## Schema Graph Visualization\n\n`;
  md += `### Legend\n\n`;

  const items = showCompliance
    ? [
      { color: 'crimson', text: 'Personal Data' },
      { color: 'orange', text: 'Quasi-Identifier' },
      { color: 'teal', text: 'Non-Personal Data' },
      { color: 'green', text: 'Anonymous Data' }
    ]
    : [
      { color: '#2ecc71', text: 'Subject' },
      { color: '#3498db', text: 'Entity' },
      { color: '#e67e22', text: 'Literal' }
    ];

  items.forEach(item => {
    md += `<div style="display: flex; align-items: center; margin-bottom: 5px;">
    <span style="height: 12px; width: 12px; background-color: ${item.color}; border-radius: 50%; display: inline-block; margin-right: 8px;"></span>
    ${item.text}
  </div>\n`;
  });

  md += `\n`;
  if (graphSnapshot) {
    md += `![Schema Graph](${graphSnapshot})\n\n`;
  } else {
    md += `> Schema Graph snapshot not available.\n\n`;
  }

  md += `## Columns (${columnEntries.length})\n\n`;
  columnEntries.forEach(([key, th]) => {
    console.log("TH", th);
    const label = th.label || key;
    const types = (th.metadata || []).flatMap((m) => m?.type ?? []);
    const outgoing = (graphData?.links || []).filter((l) => l && cleanStr(l.source) === cleanStr(label));
    const incoming = (graphData?.links || []).filter((l) => l && cleanStr(l.target) === cleanStr(label));

    md += `### Column: ${label}\n`;
    md += `- **Kind:** ${th?.kind || '-'}\n`;
    md += `- **Role:** ${th?.role || '-'}\n`;
    md += `- **${th?.kind === "literal" ? "Datatype" : "Semantic Class"}:** ${th?.datatype || '-'}\n\n`;

    md += `**Types:**\n${types.length > 0 ? types.map(t => `- ${t.name} (${t.id})`).join('\n') : "None"}\n\n`;

    md += `**Outgoing Relations:**\n${outgoing.length > 0 ? outgoing.map(l => `- → ${l.target} (${l.propID})`).join('\n') : "None"}\n\n`;
    md += `**Incoming Relations:**\n${incoming.length > 0 ? incoming.map(l => `- ← ${l.source} (${l.propID})`).join('\n') : "None"}\n\n`;

    const gdprDesc = `This column contains **${labels[th.gdprClassification] || 'n/a'}** and is **${th.gdprStatus === "yesGDPR" ? "GDPR compliant" : "GDPR NON-compliant"}** 
    with a confidence score of ${Math.round((th.gdprScore ?? 0) * 100)}%.`;
    md += `${gdprDesc}\n\n`;
  });

  md += `## Graph Structural Metrics\n\n`;
  md += `| Metric | Value | Description |\n`;
  md += `| :--- | :--- | :--- |\n`;

  metrics.forEach((m) => {
    if (!m) return;
    const valueDisplay = (m.name === 'Roles Distribution' && Array.isArray(m.value))
      ? m.value.map(r => `${r.role}: ${r.count}`).join(', ')
      : (m.value ?? '-');
    const description = (m.description || '').replace(/\n/g, ' ');
    md += `| **${m.name || 'Metric'}** | ${valueDisplay} | ${description} |\n`;
  });
  md += `\n`;

  return md;
};
