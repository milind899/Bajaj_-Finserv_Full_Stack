"use strict";

const PROFILE = {
  fullName: process.env.FULL_NAME || "Milind Shandilya",
  dob: process.env.DOB_DDMMYYYY || "06122004",
  emailId: process.env.EMAIL_ID || "ms5435@srmist.edu.in",
  collegeRollNumber: process.env.COLLEGE_ROLL_NUMBER || "RA2311003010028",
};

function toUserId(fullName, dob) {
  return `${fullName.toLowerCase().replace(/[^a-z]/g, "")}_${dob}`;
}

function normalizeEntry(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEdge(entry) {
  if (!/^[A-Z]->[A-Z]$/.test(entry)) {
    return false;
  }
  const [parent, child] = entry.split("->");
  return parent !== child;
}

// Build the nested object shape required by the challenge response.
function createHierarchyTree(root, childrenByParent) {
  const children = childrenByParent.get(root) || [];
  const branch = {};

  for (const child of children) {
    branch[child] = createHierarchyTree(child, childrenByParent);
  }

  return branch;
}

// Depth counts nodes on the longest root-to-leaf path.
function longestDepth(node, childrenByParent) {
  const children = childrenByParent.get(node) || [];
  if (!children.length) {
    return 1;
  }

  let best = 0;
  for (const child of children) {
    best = Math.max(best, longestDepth(child, childrenByParent));
  }

  return best + 1;
}

// Traverse one undirected component so disconnected groups stay separate.
function buildComponent(startNode, adjacency) {
  const stack = [startNode];
  const seen = new Set([startNode]);

  while (stack.length) {
    const node = stack.pop();
    const neighbors = adjacency.get(node) || new Set();
    for (const neighbor of neighbors) {
      if (!seen.has(neighbor)) {
        seen.add(neighbor);
        stack.push(neighbor);
      }
    }
  }

  return seen;
}

// Detect directed cycles inside one connected component.
function componentHasCycle(nodes, childrenByParent) {
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

function processHierarchyData(input) {
  const rawEntries = Array.isArray(input) ? input : [];
  const invalidEntries = [];
  const duplicateEdges = [];

  const edgeSeen = new Set();
  const duplicateReported = new Set();
  const parentByChild = new Map();
  const childrenByParent = new Map();
  const allNodes = new Set();
  const nodeFirstSeen = new Map();
  const adjacency = new Map();

  const touchNode = (node, index) => {
    allNodes.add(node);
    if (!nodeFirstSeen.has(node)) {
      nodeFirstSeen.set(node, index);
    }
    if (!adjacency.has(node)) {
      adjacency.set(node, new Set());
    }
  };

  rawEntries.forEach((rawEntry, index) => {
    const entry = normalizeEntry(rawEntry);

    if (!isValidEdge(entry)) {
      invalidEntries.push(entry);
      return;
    }

    if (edgeSeen.has(entry)) {
      if (!duplicateReported.has(entry)) {
        duplicateEdges.push(entry);
        duplicateReported.add(entry);
      }
      return;
    }

    edgeSeen.add(entry);

    const [parent, child] = entry.split("->");

    if (parentByChild.has(child)) {
      return;
    }

    parentByChild.set(child, parent);
    if (!childrenByParent.has(parent)) {
      childrenByParent.set(parent, []);
    }
    childrenByParent.get(parent).push(child);

    touchNode(parent, index);
    touchNode(child, index);
    adjacency.get(parent).add(child);
    adjacency.get(child).add(parent);
  });

  const components = [];
  const consumed = new Set();

  for (const node of allNodes) {
    if (consumed.has(node)) {
      continue;
    }
    const componentNodes = buildComponent(node, adjacency);
    for (const member of componentNodes) {
      consumed.add(member);
    }
    components.push(componentNodes);
  }

  const hierarchies = components
    .map((nodes) => {
      const nodeList = Array.from(nodes);
      const roots = nodeList
        .filter((node) => !parentByChild.has(node))
        .sort((a, b) => a.localeCompare(b));
      const root = roots[0] || nodeList.slice().sort((a, b) => a.localeCompare(b))[0];
      const hasCycle = componentHasCycle(nodes, childrenByParent);
      const order = nodeList.reduce((best, node) => {
        const seenAt = nodeFirstSeen.get(node) ?? Number.MAX_SAFE_INTEGER;
        return Math.min(best, seenAt);
      }, Number.MAX_SAFE_INTEGER);

      if (hasCycle) {
        return {
          order,
          data: {
            root,
            tree: {},
            has_cycle: true,
          },
        };
      }

      const depth = longestDepth(root, childrenByParent);
      return {
        order,
        data: {
          root,
          tree: {
            [root]: createHierarchyTree(root, childrenByParent),
          },
          depth,
        },
      };
    })
    .sort((a, b) => a.order - b.order)
    .map((item) => item.data);

  const nonCyclicHierarchies = hierarchies.filter((item) => !item.has_cycle);
  let largestTreeRoot = null;

  for (const hierarchy of nonCyclicHierarchies) {
    if (!largestTreeRoot) {
      largestTreeRoot = hierarchy.root;
      continue;
    }

    const best = nonCyclicHierarchies.find((item) => item.root === largestTreeRoot);
    if (
      hierarchy.depth > best.depth ||
      (hierarchy.depth === best.depth && hierarchy.root.localeCompare(best.root) < 0)
    ) {
      largestTreeRoot = hierarchy.root;
    }
  }

  return {
    user_id: toUserId(PROFILE.fullName, PROFILE.dob),
    email_id: PROFILE.emailId,
    college_roll_number: PROFILE.collegeRollNumber,
    hierarchies,
    invalid_entries: invalidEntries,
    duplicate_edges: duplicateEdges,
    summary: {
      total_trees: nonCyclicHierarchies.length,
      total_cycles: hierarchies.length - nonCyclicHierarchies.length,
      largest_tree_root: largestTreeRoot,
    },
  };
}

module.exports = {
  PROFILE,
  processHierarchyData,
};
