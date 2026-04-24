const nodeInput = document.getElementById("nodeInput");
const submitButton = document.getElementById("submitButton");
const submitLabel = document.getElementById("submitLabel");
const copyButton = document.getElementById("copyButton");
const loadSampleButton = document.getElementById("loadSampleButton");
const clearInputButton = document.getElementById("clearInputButton");
const statusText = document.getElementById("statusText");
const errorBanner = document.getElementById("errorBanner");
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
const validationSummary = document.getElementById("validationSummary");
const validationTokens = document.getElementById("validationTokens");

const officialSampleInput = `{
  "data": ["A->B", "A->C", "B->D"]
}`;

let latestArtifacts = {
  cycleMembersByRoot: {},
};

function splitRawTokens(value) {
  return value
    .split(/\n|,/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function normalizeInput(value) {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function extractEntries(value) {
  const trimmed = normalizeInput(value);

  if (!trimmed) {
    return {
      tokens: [],
      mode: "plain",
      error: "",
    };
  }

  const looksLikeJson =
    trimmed.startsWith("{") ||
    trimmed.startsWith("[") ||
    trimmed.includes('"data"') ||
    trimmed.includes("'data'");

  if (looksLikeJson) {
    try {
      const parsed = JSON.parse(trimmed);
      const tokens = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.data)
          ? parsed.data
          : null;

      if (!tokens) {
        return {
          tokens: [],
          mode: "json",
          error: 'JSON input must be an array or an object with a "data" array.',
        };
      }

      return {
        tokens: tokens
          .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
          .filter((entry) => entry.length > 0),
        mode: "json",
        error: "",
      };
    } catch (_error) {
      return {
        tokens: [],
        mode: "json",
        error: "Invalid JSON input.",
      };
    }
  }

  return {
    tokens: splitRawTokens(trimmed),
    mode: "plain",
    error: "",
  };
}

function isValidToken(token) {
  return /^[A-Z]->[A-Z]$/.test(token) && token[0] !== token[3];
}

function setLoadingState(isLoading) {
  submitButton.disabled = isLoading;
  submitLabel.textContent = isLoading ? "Analysing" : "Analyse";
}

function setError(message) {
  if (!message) {
    errorBanner.hidden = true;
    errorBanner.textContent = "";
    return;
  }

  errorBanner.hidden = false;
  errorBanner.textContent = message;
}

function getApiErrorMessage(payload, fallback) {
  if (!payload) {
    return fallback;
  }

  if (typeof payload.error === "string") {
    return payload.error;
  }

  if (payload.error && typeof payload.error.message === "string") {
    return payload.error.message;
  }

  return fallback;
}

function renderValidation() {
  const { tokens, mode, error } = extractEntries(nodeInput.value);
  const validCount = tokens.filter(isValidToken).length;
  const invalidCount = tokens.length - validCount;

  validationSummary.textContent = error
    ? error
    : `${validCount} valid / ${invalidCount} invalid${mode === "json" ? " | json" : ""}`;

  if (error) {
    validationTokens.innerHTML = `<span class="validation-token validation-token-invalid">${error}</span>`;
    return;
  }

  if (!tokens.length) {
    validationTokens.innerHTML = '<span class="pill pill-neutral">Enter edges to validate</span>';
    return;
  }

  validationTokens.innerHTML = tokens
    .map((token) => {
      const valid = isValidToken(token);
      return `<span class="validation-token ${valid ? "validation-token-valid" : "validation-token-invalid"}">${token}</span>`;
    })
    .join("");
}

function createPills(items, variant, emptyText) {
  if (!items.length) {
    return `<span class="pill pill-neutral">${emptyText}</span>`;
  }

  return items
    .map((item) => `<span class="pill ${variant}">${item}</span>`)
    .join("");
}

function detectCycleInComponent(nodes, childrenByParent) {
  const visiting = new Set();
  const visited = new Set();

  function dfs(node) {
    if (visiting.has(node)) {
      return true;
    }

    if (visited.has(node)) {
      return false;
    }

    visiting.add(node);
    const children = childrenByParent.get(node) || [];
    for (const child of children) {
      if (nodes.has(child) && dfs(child)) {
        return true;
      }
    }
    visiting.delete(node);
    visited.add(node);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node) && dfs(node)) {
      return true;
    }
  }

  return false;
}

function deriveArtifacts(tokens) {
  const edgeSeen = new Set();
  const parentByChild = new Map();
  const childrenByParent = new Map();
  const adjacency = new Map();
  const allNodes = new Set();
  const cycleMembersByRoot = {};

  const touchNode = (node) => {
    allNodes.add(node);
    if (!adjacency.has(node)) {
      adjacency.set(node, new Set());
    }
  };

  tokens.forEach((token) => {
    if (!isValidToken(token)) {
      return;
    }

    if (edgeSeen.has(token)) {
      return;
    }
    edgeSeen.add(token);

    const [parent, child] = token.split("->");
    if (parentByChild.has(child)) {
      return;
    }

    parentByChild.set(child, parent);
    if (!childrenByParent.has(parent)) {
      childrenByParent.set(parent, []);
    }
    childrenByParent.get(parent).push(child);

    touchNode(parent);
    touchNode(child);
    adjacency.get(parent).add(child);
    adjacency.get(child).add(parent);
  });

  const seen = new Set();

  for (const start of allNodes) {
    if (seen.has(start)) {
      continue;
    }

    const stack = [start];
    const component = new Set([start]);
    seen.add(start);

    while (stack.length) {
      const node = stack.pop();
      const neighbors = adjacency.get(node) || new Set();
      for (const neighbor of neighbors) {
        if (!seen.has(neighbor)) {
          seen.add(neighbor);
          component.add(neighbor);
          stack.push(neighbor);
        }
      }
    }

    const members = Array.from(component).sort((a, b) => a.localeCompare(b));
    const roots = members.filter((node) => !parentByChild.has(node));
    const root = (roots.length ? roots.sort((a, b) => a.localeCompare(b)) : members)[0];
    if (detectCycleInComponent(component, childrenByParent)) {
      cycleMembersByRoot[root] = members;
    }
  }

  return {
    cycleMembersByRoot,
  };
}

function renderTreeBranch([label, children], state, isRoot = false) {
  const branchClass = isRoot ? "tree-node tree-node-root" : "tree-node tree-node-default";
  const childEntries = Object.entries(children || {});
  const nodeIndex = state.index;
  state.index += 1;

  if (!childEntries.length) {
    return `
      <li>
        <span class="${branchClass}" style="--i:${nodeIndex}">${label}</span>
      </li>
    `;
  }

  return `
    <li>
      <details class="tree-branch" open>
        <summary>
          <span class="branch-toggle">[${isRoot ? "-" : "+"}]</span>
          <span class="${branchClass}" style="--i:${nodeIndex}">${label}</span>
          <span class="branch-meta">${childEntries.length} child${childEntries.length === 1 ? "" : "ren"}</span>
        </summary>
        <ul>${childEntries.map((entry) => renderTreeBranch(entry, state)).join("")}</ul>
      </details>
    </li>
  `;
}

function renderCycleVisual(root, startIndex, members) {
  const orderedMembers = (members && members.length ? members : [root, "cycle"]).slice();

  return `
    <div class="cycle-visual">
      ${orderedMembers
        .map(
          (member, index) => `
            <span class="cycle-node" style="--i:${startIndex + index}">${member}</span>
            ${
              index < orderedMembers.length - 1
                ? '<span class="cycle-arrow">&rarr;</span>'
                : '<span class="cycle-arrow">&#8635;</span>'
            }
          `
        )
        .join("")}
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

  hierarchies.innerHTML =
    items
      .map((item) => {
        if (item.has_cycle) {
          const members = latestArtifacts.cycleMembersByRoot[item.root] || [item.root];
          return `
            <article class="hierarchy-card">
              <div class="hierarchy-head">
                <span class="badge badge-root">Root: ${item.root}</span>
                <span class="badge badge-cycle">&#8635; cycle</span>
              </div>
              ${renderCycleVisual(item.root, 0, members)}
            </article>
          `;
        }

        const state = { index: 0 };

        return `
          <article class="hierarchy-card">
            <div class="hierarchy-head">
              <span class="badge badge-root">Root: ${item.root}</span>
              <span class="badge badge-depth">depth ${item.depth}</span>
            </div>
            <div class="tree-stage">
              <ul class="tree-list">${Object.entries(item.tree)
                .map((entry) => renderTreeBranch(entry, state, true))
                .join("")}</ul>
            </div>
          </article>
        `;
      })
      .join("") +
    (items.length === 1
      ? `
        <article class="hierarchy-card hierarchy-card-note">
          <div class="hierarchy-note">No other hierarchies detected.</div>
        </article>
      `
      : "");
}

function renderSummary(summary) {
  totalTrees.textContent = String(summary.total_trees);
  totalCycles.textContent = String(summary.total_cycles);
  largestTreeRoot.textContent = summary.largest_tree_root || "-";
}

function renderResponse(payload) {
  setError("");
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
  const parsedInput = extractEntries(nodeInput.value);
  const data = parsedInput.tokens;
  const startedAt = performance.now();
  latestArtifacts = deriveArtifacts(data);
  statusText.textContent = "RUNNING";
  setLoadingState(true);

  if (parsedInput.error) {
    statusText.textContent = "FAILED";
    setError(parsedInput.error);
    rawJson.textContent = JSON.stringify({ error: parsedInput.error }, null, 2);
    rawJsonDetails.open = true;
    setLoadingState(false);
    return;
  }

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
      throw new Error(getApiErrorMessage(payload, "API request failed"));
    }

    renderResponse(payload);
    const elapsed = Math.round(performance.now() - startedAt);
    statusText.textContent = `READY | ${elapsed}ms`;
  } catch (error) {
    statusText.textContent = "FAILED";
    setError(error.message);
    rawJson.textContent = JSON.stringify({ error: error.message }, null, 2);
    rawJsonDetails.open = true;
  } finally {
    setLoadingState(false);
  }
}

exampleButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    nodeInput.value = button.dataset.preset;
    renderValidation();
    await submitData();
  });
});

loadSampleButton.addEventListener("click", () => {
  nodeInput.value = officialSampleInput;
  renderValidation();
});

clearInputButton.addEventListener("click", () => {
  nodeInput.value = "";
  renderValidation();
  setError("");
  statusText.textContent = "Ready";
});

nodeInput.addEventListener("input", renderValidation);
submitButton.addEventListener("click", submitData);

copyButton.addEventListener("click", async (event) => {
  event.preventDefault();
  if (!rawJson.textContent) {
    return;
  }

  await navigator.clipboard.writeText(rawJson.textContent);
  if (!statusText.textContent.startsWith("READY")) {
    statusText.textContent = "COPIED";
  }
});

renderResponse({
  hierarchies: [],
  invalid_entries: [],
  duplicate_edges: [],
  summary: {
    total_trees: 0,
    total_cycles: 0,
    largest_tree_root: null,
  },
});

renderValidation();
setLoadingState(false);
fetchProfile();
