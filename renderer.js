const typeButtons = document.getElementById('typeButtons');
const versionsHorizontal = document.getElementById('versionsHorizontal');
const selectedTitle = document.getElementById('selectedTitle');
const detailBody = document.getElementById('detailBody');
const refreshBtn = document.getElementById('refresh');

const msLoginBtn = document.getElementById('msLogin');
const accountsList = document.getElementById('accountsList');

const javaList = document.getElementById('javaList');
const addJavaBtn = document.getElementById('addJavaBtn');

const newInstanceBtn = document.getElementById('newInstanceBtn');
const instancesList = document.getElementById('instancesList');

const modSearchInput = document.getElementById('modSearchInput');
const modTypeSelect = document.getElementById('modTypeSelect');
const modSearchBtn = document.getElementById('modSearchBtn');
const modResults = document.getElementById('modResults');

let manifest = null;
let currentType = 'release';
let selectedVersion = null;
let selectedInstance = null;

// Filter checkboxes
const filterLoaders = {
  fabric: document.getElementById('filterFabric'),
  forge: document.getElementById('filterForge'),
  quilt: document.getElementById('filterQuilt')
};

const filterCategories = {
  optimization: document.getElementById('filterOptimization'),
  educational: document.getElementById('filterEducational'),
  utility: document.getElementById('filterUtility'),
  adventure: document.getElementById('filterAdventure'),
  magic: document.getElementById('filterMagic'),
  technology: document.getElementById('filterTechnology')
};

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
  versions.slice(0).reverse().slice(0, 20).forEach((v) => {
    const card = document.createElement('div');
    card.className = 'versionCard';
    card.onclick = () => selectVersion(v);
    card.innerHTML = `<div class="verId">${v.id}</div><div class="verDate">${new Date(v.releaseTime).toLocaleDateString()}</div>`;
    versionsHorizontal.appendChild(card);
  });
}

async function selectVersion(v) {
  selectedVersion = v;
  selectedTitle.textContent = `${v.id} — ${v.type}`;
  detailBody.innerHTML = 'Loading...';
  const verJson = await window.api.getVersionJson(v.url);

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
  }

  detailBody.innerHTML = '';
  detailBody.appendChild(html);
}

refreshBtn.onclick = () => loadManifest();

// Microsoft auth
msLoginBtn.onclick = async () => {
  try {
    const resp = await window.api.startMsDeviceAuth();
    alert('Device sign-in started:\n' + resp.message);
    const poll = setInterval(async () => {
      try {
        const result = await window.api.pollMsDeviceToken();
        clearInterval(poll);
        alert('Signed in. ownsMinecraft=' + result.ownsMinecraft + (result.account.mc_profile ? '\nProfile: ' + result.account.mc_profile.name : ''));
        renderAccounts();
      } catch (e) {
        if (e && e.message && (e.message.includes('authorization_pending') || e.message.includes('slow_down'))) {
          // keep polling
        } else {
          clearInterval(poll);
          alert('Auth error: ' + (e.message || e));
        }
      }
    }, 3000);
  } catch (e) {
    alert('Failed to start device auth: ' + e.message);
  }
};

async function renderAccounts() {
  const accounts = await window.api.listAccounts();
  accountsList.innerHTML = '';
  accounts.forEach((a, i) => {
    const d = document.createElement('div');
    d.className = 'accountEntry';
    d.innerHTML = `<strong>${a.mc_profile ? a.mc_profile.name : a.id}</strong> ${a.mc_profile ? '(owns Minecraft)' : '(no profile)'} <button data-idx="${i}">Logout</button>`;
    d.querySelector('button').onclick = async (e) => {
      await window.api.logoutAccount(a.id);
      renderAccounts();
    };
    accountsList.appendChild(d);
  });
}

// Java manager
async function renderJavas() {
  const javas = await window.api.listJavas();
  javaList.innerHTML = '';
  javas.forEach((j, i) => {
    const div = document.createElement('div');
    div.className = 'javaEntry';
    div.innerHTML = `<span>${i}: ${j.name}</span> <button data-idx="${i}">Remove</button>`;
    div.querySelector('button').onclick = async () => {
      await window.api.removeJava(i);
      renderJavas();
    };
    javaList.appendChild(div);
  });
}

addJavaBtn.onclick = async () => {
  const p = await window.api.selectJavaDialog();
  if (!p) return;
  const name = prompt('Name for this Java runtime (e.g. Java 17):') || p;
  await window.api.addJava(name, p);
  renderJavas();
};

// Instance manager
async function renderInstances() {
  const instances = await window.api.listInstances();
  instancesList.innerHTML = '';
  instances.forEach((inst) => {
    const div = document.createElement('div');
    div.className = 'instanceEntry';
    div.onclick = () => {
      selectedInstance = inst;
      div.parentElement.querySelectorAll('.instanceEntry').forEach(e => e.classList.remove('active'));
      div.classList.add('active');
    };
    div.innerHTML = `<strong>${inst.name}</strong><br/><small>${inst.mcVersion} - ${inst.loader}</small>`;
    instancesList.appendChild(div);
  });
}

newInstanceBtn.onclick = async () => {
  if (!selectedVersion) return alert('Select a Minecraft version first');
  const loader = prompt('Enter loader (fabric/forge/quilt)');
  if (!loader) return;
  const name = prompt('Instance name (optional):') || `${selectedVersion.id}-${loader}`;
  try {
    const inst = await window.api.createInstance(name, selectedVersion.id, loader);
    alert('Instance created: ' + inst.id);
    renderInstances();
  } catch (e) {
    alert('Failed to create instance: ' + e.message);
  }
};

// Modrinth search with filters
modSearchBtn.onclick = async () => {
  const q = modSearchInput.value.trim();
  if (!q) return alert('Enter a search term');

  // Collect selected loaders
  const selectedLoaders = [];
  Object.entries(filterLoaders).forEach(([k, el]) => {
    if (el.checked) selectedLoaders.push(k);
  });

  // Collect selected categories
  const selectedCategories = [];
  Object.entries(filterCategories).forEach(([k, el]) => {
    if (el.checked) selectedCategories.push(k);
  });

  const modType = modTypeSelect.value;
  let searchQuery = q;
  if (modType !== 'mod') {
    searchQuery += ` AND (categories:${modType})`;
  }

  modResults.innerHTML = 'Searching...';
  try {
    const filters = {
      loaders: selectedLoaders,
      categories: selectedCategories
    };
    const res = await window.api.modrinthSearch(searchQuery, filters, 12);
    modResults.innerHTML = '';
    if (!res.hits || !res.hits.length) return modResults.innerHTML = 'No results';

    res.hits.forEach((hit) => {
      const card = document.createElement('div');
      card.className = 'modCard';
      const title = hit.title || hit.slug || hit.name || 'Unknown';
      const desc = hit.description || '';
      const loaders = (hit.loaders || []).join(', ') || 'N/A';
      const categories = (hit.categories || []).join(', ') || 'N/A';
      card.innerHTML = `
        <strong>${title}</strong>
        <div class="modMeta">Loaders: ${loaders}</div>
        <div class="modMeta">Categories: ${categories}</div>
        <div class="modDesc">${desc}</div>
      `;
      const btn = document.createElement('button');
      btn.textContent = 'Add to instance...';
      btn.onclick = async () => {
        if (!selectedInstance) return alert('Select an instance first (left sidebar)');
        try {
          const slug = hit.slug || hit.project_id;
          const project = await window.api.modrinthGetProject(slug);

          let chosen = null;
          for (const verId of project.versions || []) {
            try {
              const v = await window.api.modrinthGetVersion(verId);
              if ((v.game_versions || []).includes(selectedInstance.mcVersion) && (v.loaders || []).includes(selectedInstance.loader)) {
                chosen = v;
                break;
              }
            } catch (e) {}
          }

          if (!chosen) {
            const proceed = confirm(`No matching version for ${selectedInstance.mcVersion}/${selectedInstance.loader}. Fall back to latest?`);
            if (!proceed) return;
            for (const verId of project.versions || []) {
              try {
                const v = await window.api.modrinthGetVersion(verId);
                if ((v.loaders || []).includes(selectedInstance.loader)) {
                  chosen = v;
                  break;
                }
              } catch (e) {}
            }
          }

          if (!chosen) return alert('No suitable version found');

          if (project.project_type === 'modpack') {
            const ok = confirm('This is a modpack. Download all mods?');
            if (!ok) return;
            const downloaded = await window.api.modrinthDownloadModpack(chosen.id, selectedInstance.id);
            alert('Downloaded ' + downloaded.length + ' mods into ' + selectedInstance.id);
            return;
          }

          if (modType === 'shader') {
            const dest = await window.api.modrinthDownloadShader(chosen.id, 0, selectedInstance.id);
            alert('Shader downloaded to instance: ' + selectedInstance.id);
          } else if (modType === 'resourcepack') {
            const dest = await window.api.modrinthDownloadResourcepack(chosen.id, 0, selectedInstance.id);
            alert('Resource pack downloaded to instance: ' + selectedInstance.id);
          } else {
            const dest = await window.api.modrinthDownloadFile(chosen.id, 0, selectedInstance.id);
            alert('Mod downloaded to instance: ' + selectedInstance.id);
          }
        } catch (e) {
          alert('Failed: ' + (e.message || e));
        }
      };
      card.appendChild(btn);
      modResults.appendChild(card);
    });
  } catch (e) {
    modResults.innerHTML = 'Search failed: ' + (e.message || e);
  }
};

// Initial load
loadManifest();
renderAccounts();
renderJavas();
renderInstances();
