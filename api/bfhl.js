"use strict";

const { processHierarchyData } = require("../processor");

module.exports = (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};

  if (!Array.isArray(body.data)) {
    return res.status(400).json({
      error: "Request body must be JSON with a data array.",
      example: { data: ["A->B", "A->C", "B->D"] },
    });
  }

  return res.status(200).json(processHierarchyData(body.data));
};
