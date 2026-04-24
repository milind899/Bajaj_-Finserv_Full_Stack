"use strict";

const assert = require("assert");
const { processHierarchyData } = require("../processor");

const sample = processHierarchyData([
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
]);

assert.equal(sample.summary.total_trees, 3);
assert.equal(sample.summary.total_cycles, 1);
assert.equal(sample.summary.largest_tree_root, "A");
assert.deepEqual(sample.invalid_entries, ["hello", "1->2", "A->"]);
assert.deepEqual(sample.duplicate_edges, ["G->H"]);
assert.equal(sample.hierarchies[0].depth, 4);
assert.equal(sample.hierarchies[1].has_cycle, true);

const trimAndMultiParent = processHierarchyData([
  " A->B ",
  "C->B",
  "B->D",
  "A->B",
  "A->A",
  "",
]);

assert.equal(trimAndMultiParent.summary.total_trees, 1);
assert.equal(trimAndMultiParent.summary.total_cycles, 0);
assert.deepEqual(trimAndMultiParent.duplicate_edges, ["A->B"]);
assert.deepEqual(trimAndMultiParent.invalid_entries, ["A->A", ""]);
assert.deepEqual(trimAndMultiParent.hierarchies[0].tree, {
  A: {
    B: {
      D: {},
    },
  },
});

console.log("All tests passed.");
