import { App } from "@modelcontextprotocol/ext-apps";

const appClient = new App({ name: "KnowhereWidget", version: "1.0.0" });

function renderResults(results: any[]) {
  const appElement = document.getElementById("app");
  if (!appElement) return;

  appElement.innerHTML = "";

  if (!results || results.length === 0) {
    appElement.innerHTML = `<p style="color: #666; font-size: 13px;">No resources found.</p>`;
    return;
  }

  results.forEach(result => {
    const card = document.createElement("div");
    card.className = "result-card";
    
    let titleHtml = result.url 
      ? `<a href="${result.url}" target="_blank">${result.title}</a>`
      : result.title;

    let scoreHtml = '';
    if (result.score) {
      const pct = Math.round(result.score * 100);
      scoreHtml = `<span>Score: ${pct}%</span>`;
    }

    card.innerHTML = `
      <div class="result-title">${titleHtml}</div>
      ${result.aiDescription ? `<div class="result-desc">${result.aiDescription}</div>` : ''}
      <div class="result-meta">
        <span class="tag">${result.type}</span>
        ${scoreHtml}
      </div>
    `;

    appElement.appendChild(card);
  });
}

// Listen for tool results
appClient.ontoolresult = (payload: any) => {
  if (payload.structuredContent?.results) {
    renderResults(payload.structuredContent.results);
  } else if (payload.structuredContent?.content) {
    // For single resource fetch
    renderResults([{
      title: payload.structuredContent.title,
      aiDescription: payload.structuredContent.content,
      type: 'content'
    }]);
  }
};

appClient.connect();
