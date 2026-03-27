import { getRecommendation, normalizeSecretValue } from "./ai";
import { validateLabel } from "./engine";

interface Env {
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  AI_MODE?: string;
}

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      ...(init.headers || {})
    }
  });
}

async function readBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return json({}, { status: 204 });
    }

    if (request.method === "POST" && url.pathname === "/api/recommend") {
      const payload = await readBody(request);
      return json(await getRecommendation(payload, env));
    }

    if (request.method === "POST" && url.pathname === "/api/validate") {
      const payload = await readBody(request);
      return json(validateLabel(payload));
    }

    if (request.method === "GET" && url.pathname === "/api/health") {
      const normalizedApiKey = normalizeSecretValue(env.OPENAI_API_KEY);

      return json({
        status: "ok",
        service: "smart-labeling-worker",
        aiMode: (env.AI_MODE || "auto").toLowerCase(),
        aiReady: Boolean(normalizedApiKey),
        aiKeyLength: normalizedApiKey.length
      });
    }

    return json(
      {
        message: "Not Found"
      },
      { status: 404 }
    );
  }
};
