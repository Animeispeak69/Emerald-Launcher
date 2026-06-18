const typeButtons = document.getElementById('typeButtons');
const versionsHorizontal = document.getElementById('versionsHorizontal');
const selectedTitle = document.getElementById('selectedTitle');
const detailBody = document.getElementById('detailBody');
const refreshBtn = document.getElementById('refresh');
const selectJavaBtn = document.getElementById('selectJava');
const javaPathSpan = document.getElementById('javaPath');

let manifest = null;
let currentType = 'release';
let javaPath = '';

async function loadManifest() {
  manifest = await window.api.getVersionManifest();
  renderTypes();
  renderVersions();
}

function renderTypes() {
  const types = ['release', 'snapshot', 'old_alpha', 'old_beta'];
  typeButtons.innerHTML = '';
  types.forEach((t) => {
    const b = document.createElement('button');
    b.textContent = t;
    b.className = t === currentType ? 'active' : '';
    b.onclick = () => {
      currentType = t;
      renderTypes();
      renderVersions();
    };
    typeButtons.appendChild(b);
  });
}

function renderVersions() {
  versionsHorizontal.innerHTML = '';
  if (!manifest) return;
  const versions = manifest.versions.filter((v) => v.type === currentType);
  versions.slice(0).reverse().forEach((v) => {
    const card = document.createElement('div');
    card.className = 'versionCard';
    card.onclick = () => selectVersion(v);
    card.innerHTML = `<div class="verId">${v.id}</div><div class="verDate">${new Date(v.releaseTime).toLocaleDateString()}</div>`;
    versionsHorizontal.appendChild(card);
  });
}

let selectedVersion = null;
async function selectVersion(v) {
  selectedVersion = v;
  selectedTitle.textContent = `${v.id} — ${v.type}`;
  detailBody.innerHTML = 'Loading...';
  const verJson = await window.api.getVersionJson(v.url);

  // Find client download
  let clientUrl = null;
  if (verJson.downloads && verJson.downloads.client && verJson.downloads.client.url) {
    clientUrl = verJson.downloads.client.url;
  }

  const html = document.createElement('div');
  html.innerHTML = `
    <p><strong>ID:</strong> ${verJson.id}</p>
    <p><strong>Time:</strong> ${verJson.releaseTime}</p>
    <p><strong>Main class:</strong> ${verJson.mainClass || 'N/A'}</p>
    <p><strong>Client:</strong> ${clientUrl ? 'Available' : 'Not available'}</p>
  `;

  if (clientUrl) {
    const dl = document.createElement('button');
    dl.textContent = 'Download client jar';
    dl.onclick = async () => {
      dl.disabled = true;
      dl.textContent = 'Downloading...';
      try {
        const dest = await window.api.downloadClient(verJson.id, clientUrl);
        alert('Downloaded to: ' + dest);
      } catch (e) {
        alert('Download failed: ' + e.message);
      }
      dl.disabled = false;
      dl.textContent = 'Download client jar';
    };
    html.appendChild(dl);

    const launchBtn = document.createElement('button');
    launchBtn.textContent = 'Launch (requires token)';
    launchBtn.onclick = async () => {
      const username = prompt('Minecraft username (or profile name):');
      const token = prompt('Access token (use official login to obtain token):');
      if (!username || !token) return alert('Username and token required');
      // compute jar path
      const jarPath = `${window.processUserData}/${'.emerald/versions'}/${verJson.id}/${verJson.id}.jar`;
      // Instead of computing path in renderer, we'll ask user to select jar if not downloaded
      const confirmed = confirm('If you already downloaded the client jar, press OK to select it; otherwise press Cancel and download first.');
      let jarFilePath = '';
      if (confirmed) {
        // open file dialog via hidden input is not available, so instruct user
        jarFilePath = prompt('Paste full path to jar file:');
      } else {
        return alert('Download the client jar first using "Download client jar"');
      }
      if (!javaPath) return alert('Select Java first');
      try {
        await window.api.launchJava(javaPath, verJson.id, jarFilePath, username, token);
        alert('Launch requested. Check Java output console.');
      } catch (e) {
        alert('Launch failed: ' + e.message);
      }
    };
    html.appendChild(launchBtn);
  }

  detailBody.innerHTML = '';
  detailBody.appendChild(html);
}

refreshBtn.onclick = () => loadManifest();

selectJavaBtn.onclick = async () => {
  const p = await window.api.selectJava();
  if (p) {
    javaPath = p;
    javaPathSpan.textContent = p;
  }
};

// expose userData path for renderer convenience (very small helper)
window.processUserData = (function () {
  try {
    return require('electron').app.getPath('userData');
  } catch (e) {
    return '';
  }
})();

loadManifest();
