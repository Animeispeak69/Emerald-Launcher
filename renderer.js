const typeButtons = document.getElementById('typeButtons');
const versionsHorizontal = document.getElementById('versionsHorizontal');
const selectedTitle = document.getElementById('selectedTitle');
const detailBody = document.getElementById('detailBody');
const refreshBtn = document.getElementById('refresh');

const msLoginBtn = document.getElementById('msLogin');
const accountsList = document.getElementById('accountsList');

const javaList = document.getElementById('javaList');
const addJavaBtn = document.getElementById('addJavaBtn');

let manifest = null;
let currentType = 'release';
let selectedVersion = null;

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
    launchBtn.textContent = 'Launch (select java & account)';
    launchBtn.onclick = async () => {
      // choose account
      const accounts = await window.api.listAccounts();
      if (!accounts.length) return alert('No signed-in accounts. Sign in with Microsoft first.');
      const idx = parseInt(prompt('Enter account index to use (0..' + (accounts.length - 1) + ')'));
      const account = accounts[idx];
      if (!account) return alert('Invalid account');

      // check ownership
      if (!account.entitlements || account.entitlements.length === 0) {
        const proceed = confirm('This account does not appear to own Minecraft. You can still log in, but launching the game will likely fail. Continue?');
        if (!proceed) return;
      }

      // choose java
      const javas = await window.api.listJavas();
      if (!javas.length) return alert('No Java runtimes configured. Add one in the Java Runtimes area.');
      const jidx = parseInt(prompt('Enter java index to use (0..' + (javas.length - 1) + ')'));
      const javaEntry = javas[jidx];
      if (!javaEntry) return alert('Invalid java selection');

      // choose jar
      const jarPath = prompt('Paste full path to downloaded client jar for this version (download first)');
      if (!jarPath) return alert('Jar required');

      try {
        await window.api.launchJava(javaEntry.path, verJson.id, jarPath, account.mc_profile ? account.mc_profile.name : 'MCUser', account.mc_token);
        alert('Launch requested. Check console for Java output.');
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

// Microsoft auth flows
msLoginBtn.onclick = async () => {
  try {
    const resp = await window.api.startMsDeviceAuth();
    // resp.message contains instructions for user
    alert('Device sign-in started:\n' + resp.message);

    // start polling in background
    const poll = setInterval(async () => {
      try {
        const result = await window.api.pollMsDeviceToken();
        clearInterval(poll);
        alert('Signed in. ownsMinecraft=' + result.ownsMinecraft + (result.account.mc_profile ? '\nProfile: ' + result.account.mc_profile.name : ''));
        renderAccounts();
      } catch (e) {
        // if authorization_pending or slow_down, ignore; otherwise show
        if (e && e.message && (e.message.includes('authorization_pending') || e.message.includes('authorization_pending') || e.message.includes('slow_down'))) {
          // keep polling
        } else {
          // stop and show error
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

// Java manager UI
async function renderJavas() {
  const javas = await window.api.listJavas();
  javaList.innerHTML = '';
  javas.forEach((j, i) => {
    const div = document.createElement('div');
    div.className = 'javaEntry';
    div.innerHTML = `<span>${i}: ${j.name} — ${j.path}</span> <button data-idx="${i}">Remove</button>`;
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
  const name = prompt('Name for this Java runtime (e.g. Java 17, Java 21):') || p;
  await window.api.addJava(name, p);
  renderJavas();
};

// initial
loadManifest();
renderAccounts();
renderJavas();
