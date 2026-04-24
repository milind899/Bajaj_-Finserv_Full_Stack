const nodeInput = document.getElementById("nodeInput");
const submitButton = document.getElementById("submitButton");
const sampleButton = document.getElementById("sampleButton");
const copyButton = document.getElementById("copyButton");
const statusText = document.getElementById("statusText");
const responseState = document.getElementById("responseState");
const responseStamp = document.getElementById("responseStamp");
const summaryStrip = document.getElementById("summaryStrip");
const hierarchies = document.getElementById("hierarchies");
const invalidEntries = document.getElementById("invalidEntries");
const duplicateEdges = document.getElementById("duplicateEdges");
const rawJson = document.getElementById("rawJson");
const profileStatus = document.getElementById("profileStatus");
const entryCount = document.getElementById("entryCount");

const sampleInput = [
  "A->B",
  "A->C",
  "B->D",
  "C->E",
  "E->F",
  "X->Y",
  "Y->Z",
  "Z->X",
  "P->Q",
  "Q->R",
  "G->H",
  "G->H",
  "G->I",
  "hello",
  "1->2",
  "A->",
].join("\n");

function formatNow() {
  return new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function parseInput(value) {
  return value
    .split(/\n|,/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function refreshEntryCount() {
  entryCount.textContent = String(parseInput(nodeInput.value).length);
}

function createList(items, emptyText) {
  if (!items.length) {
    return `<li class="empty-pill">${emptyText}</li>`;
  }

  return items.map((item) => `<li>${item}</li>`).join("");
}

function renderTreeNode([label, children]) {
  const childEntries = Object.entries(children || {});
  return `
    <li>
      <span class="tree-node-label">${label}</span>
      ${
        childEntries.length
          ? `<ul>${childEntries.map(renderTreeNode).join("")}</ul>`
          : ""
      }
    </li>
  `;
}

function renderHierarchies(items) {
  if (!items.length) {
    hierarchies.innerHTML = `
      <article class="hierarchy-card">
        <h3>No hierarchies yet</h3>
        <p class="hero-copy" style="margin-top: 10px; color: #55606d;">
          Submit a payload to render the processed hierarchy objects here.
        </p>
      </article>
    `;
    return;
  }

  hierarchies.innerHTML = items
    .map((item, index) => {
      const treeMarkup = item.has_cycle
        ? `<div class="tree-shell"><strong>Cycle detected.</strong> Tree output is intentionally empty for cyclic groups.</div>`
        : `<div class="tree-shell"><ul class="tree-list">${Object.entries(item.tree)
            .map(renderTreeNode)
            .join("")}</ul></div>`;

      return `
        <article class="hierarchy-card">
          <h3>Hierarchy ${index + 1}: root ${item.root}</h3>
          <div class="hierarchy-meta">
            <span class="chip">root ${item.root}</span>
            ${
              item.depth
                ? `<span class="chip">depth ${item.depth}</span>`
                : ""
            }
            ${
              item.has_cycle
                ? `<span class="chip chip-cycle">cycle detected</span>`
                : `<span class="chip">valid tree</span>`
            }
          </div>
          ${treeMarkup}
        </article>
      `;
    })
    .join("");
}

function renderSummary(summary) {
  const entries = [
    ["Total trees", summary.total_trees],
    ["Total cycles", summary.total_cycles],
    ["Largest tree root", summary.largest_tree_root || "-"],
  ];

  summaryStrip.innerHTML = entries
    .map(
      ([label, value]) => `
        <div class="summary-card">
          <strong>${label}</strong>
          <span>${value}</span>
        </div>
      `
    )
    .join("");
}

function renderResponse(payload) {
  renderSummary(payload.summary);
  renderHierarchies(payload.hierarchies);
  invalidEntries.innerHTML = createList(payload.invalid_entries, "No invalid entries");
  duplicateEdges.innerHTML = createList(payload.duplicate_edges, "No duplicate edges");
  rawJson.textContent = JSON.stringify(payload, null, 2);
}

function setResponseMeta(stateText, stampText) {
  responseState.textContent = stateText;
  responseStamp.textContent = stampText;
}

async function fetchProfile() {
  try {
    const response = await fetch("/profile");
    const profile = await response.json();
    profileStatus.textContent = `${profile.fullName} verified`;
  } catch (_error) {
    profileStatus.textContent = "Profile check unavailable";
  }
}

async function submitData() {
  const data = parseInput(nodeInput.value);
  statusText.textContent = "Submitting";
  submitButton.disabled = true;
  setResponseMeta("Running analysis", `Requested ${formatNow()}`);

  try {
    const response = await fetch("/bfhl", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "API request failed");
    }

    renderResponse(payload);
    statusText.textContent = "Success";
    setResponseMeta("Response verified", `Updated ${formatNow()}`);
  } catch (error) {
    statusText.textContent = "Failed";
    setResponseMeta("Request failed", `Error at ${formatNow()}`);
    rawJson.textContent = JSON.stringify({ error: error.message }, null, 2);
  } finally {
    submitButton.disabled = false;
  }
}

nodeInput.addEventListener("input", refreshEntryCount);

sampleButton.addEventListener("click", () => {
  nodeInput.value = sampleInput;
  refreshEntryCount();
  setResponseMeta("Sample loaded", "Ready for submission");
});

copyButton.addEventListener("click", async () => {
  if (!rawJson.textContent) {
    return;
  }

  await navigator.clipboard.writeText(rawJson.textContent);
  statusText.textContent = "Copied";
  setResponseMeta("JSON copied", `Copied ${formatNow()}`);
});

submitButton.addEventListener("click", submitData);

renderResponse({
  hierarchies: [],
  invalid_entries: [],
  duplicate_edges: [],
  summary: {
    total_trees: 0,
    total_cycles: 0,
    largest_tree_root: "",
  },
});

refreshEntryCount();
setResponseMeta("Awaiting request", "No request yet");
fetchProfile();
