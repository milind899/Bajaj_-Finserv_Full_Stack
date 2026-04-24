"use strict";

const { processHierarchyData } = require("../processor");

function sendError(res, statusCode, code, message, details) {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details: details || null,
    },
  });
}

function parseBody(body) {
  if (typeof body === "string") {
    return JSON.parse(body || "{}");
  }

  return body || {};
}

function validatePayload(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false,
      code: "INVALID_BODY",
      message: 'Request body must be a JSON object with a "data" array.',
    };
  }

  if (!Array.isArray(body.data)) {
    return {
      ok: false,
      code: "INVALID_DATA_FIELD",
      message: 'Request body must include a "data" array.',
    };
  }

  return { ok: true };
}

module.exports = (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return sendError(res, 405, "METHOD_NOT_ALLOWED", "Only POST is supported on /bfhl.");
  }

  let body;

  try {
    body = parseBody(req.body);
  } catch (error) {
    return sendError(res, 400, "INVALID_JSON", "Invalid JSON body.", error.message);
  }

  const validation = validatePayload(body);
  if (!validation.ok) {
    return sendError(res, 400, validation.code, validation.message, {
      example: { data: ["A->B", "A->C", "B->D"] },
    });
  }

  return res.status(200).json(processHierarchyData(body.data));
};
