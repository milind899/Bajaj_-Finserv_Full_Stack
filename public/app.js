const nodeInput = document.getElementById("nodeInput");
const submitButton = document.getElementById("submitButton");
const copyButton = document.getElementById("copyButton");
const statusText = document.getElementById("statusText");
const hierarchies = document.getElementById("hierarchies");
const invalidEntries = document.getElementById("invalidEntries");
const duplicateEdges = document.getElementById("duplicateEdges");
const rawJson = document.getElementById("rawJson");
const profileStatus = document.getElementById("profileStatus");
const totalTrees = document.getElementById("totalTrees");
const totalCycles = document.getElementById("totalCycles");
const largestTreeRoot = document.getElementById("largestTreeRoot");
const identityUserId = document.getElementById("identityUserId");
const identityEmail = document.getElementById("identityEmail");
const identityRoll = document.getElementById("identityRoll");
const rawJsonDetails = document.getElementById("rawJsonDetails");
const exampleButtons = Array.from(document.querySelectorAll("[data-preset]"));

function parseInput(value) {
  return value
    .split(/\n|,/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function createPills(items, variant, emptyText) {
  if (!items.length) {
    return `<span class="pill pill-neutral">${emptyText}</span>`;
  }

  return items
    .map((item) => `<span class="pill ${variant}">${item}</span>`)
    .join("");
}

function renderTreeBranch([label, children], isRoot = false) {
  const branchClass = isRoot ? "tree-node" : "tree-node tree-node-default";
  const childEntries = Object.entries(children || {});

  return `
    <li>
      <span class="${branchClass}">${label}</span>
      ${
        childEntries.length
          ? `<ul>${childEntries.map((entry) => renderTreeBranch(entry)).join("")}</ul>`
          : ""
      }
    </li>
  `;
}

function renderCycleVisual(root) {
  return `
    <div class="cycle-visual">
      <span class="cycle-node">${root}</span>
      <span class="cycle-arrow">↻</span>
      <span class="cycle-node">cycle</span>
      <span class="cycle-note">cyclic group detected</span>
    </div>
  `;
}

function renderHierarchies(items) {
  if (!items.length) {
    hierarchies.innerHTML = `
      <article class="hierarchy-card">
        <div class="hierarchy-head">
          <span class="badge badge-root">No data</span>
        </div>
        <div class="cycle-note">Run the analyser to render tree hierarchies here.</div>
      </article>
    `;
    return;
  }

  hierarchies.innerHTML = items
    .map((item) => {
      if (item.has_cycle) {
        return `
          <article class="hierarchy-card">
            <div class="hierarchy-head">
              <span class="badge badge-root">Root: ${item.root}</span>
              <span class="badge badge-cycle">↻ cycle</span>
            </div>
            ${renderCycleVisual(item.root)}
          </article>
        `;
      }

      return `
        <article class="hierarchy-card">
          <div class="hierarchy-head">
            <span class="badge badge-root">Root: ${item.root}</span>
            <span class="badge badge-depth">depth ${item.depth}</span>
          </div>
          <div class="tree-stage">
            <ul class="tree-list">${Object.entries(item.tree)
              .map((entry) => renderTreeBranch(entry, true))
              .join("")}</ul>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderSummary(summary) {
  totalTrees.textContent = String(summary.total_trees);
  totalCycles.textContent = String(summary.total_cycles);
  largestTreeRoot.textContent = summary.largest_tree_root || "-";
}

function renderResponse(payload) {
  renderSummary(payload.summary);
  renderHierarchies(payload.hierarchies);
  invalidEntries.innerHTML = createPills(payload.invalid_entries, "pill-invalid", "No invalid entries");
  duplicateEdges.innerHTML = createPills(payload.duplicate_edges, "pill-duplicate", "No duplicate edges");
  rawJson.textContent = JSON.stringify(payload, null, 2);
}

function updateIdentity(profile) {
  identityUserId.textContent = `${profile.fullName.toLowerCase().replace(/[^a-z]/g, "")}_${profile.dob}`;
  identityEmail.textContent = profile.emailId;
  identityRoll.textContent = profile.collegeRollNumber;
  profileStatus.textContent = "Verified";
}

async function fetchProfile() {
  try {
    const response = await fetch("/profile");
    const profile = await response.json();
    updateIdentity(profile);
  } catch (_error) {
    profileStatus.textContent = "Unavailable";
  }
}

async function submitData() {
  const data = parseInput(nodeInput.value);
  statusText.textContent = "Running";

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
    statusText.textContent = "Ready";
  } catch (error) {
    statusText.textContent = "Failed";
    rawJson.textContent = JSON.stringify({ error: error.message }, null, 2);
    rawJsonDetails.open = true;
  }
}

exampleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    nodeInput.value = button.dataset.preset;
  });
});

submitButton.addEventListener("click", submitData);

copyButton.addEventListener("click", async (event) => {
  event.preventDefault();
  if (!rawJson.textContent) {
    return;
  }

  await navigator.clipboard.writeText(rawJson.textContent);
  statusText.textContent = "Copied";
});

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

fetchProfile();
