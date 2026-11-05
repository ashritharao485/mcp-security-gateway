
import { createServer } from "node:http";

const DOWNSTREAM_URL = "http://127.0.0.1:4001";

// Demo tokens for the take-home assignment.
const tokenRoles: Record<string, "admin" | "viewer"> = {
  "admin-demo-token": "admin",
  "viewer-demo-token": "viewer",
};

function jsonRpcError(
  id: string | number | null,
  code: number,
  message: string
) {
  return {
    jsonrpc: "2.0",
    id,
    error: { code, message },
  };
}

const server = createServer(async (req, res) => {
  const sendJson = (status: number, body: unknown) => {
    res.writeHead(status, {
      "Content-Type": "application/json",
    });
    res.end(JSON.stringify(body));
  };

  if (req.method !== "POST") {
    sendJson(405, jsonRpcError(null, -32600, "Invalid Request"));
    return;
  }

  let rawBody = "";

  try {
    for await (const chunk of req) {
      rawBody += chunk.toString();
    }
  } catch {
    sendJson(400, jsonRpcError(null, -32700, "Parse error"));
    return;
  }

  let payload: unknown;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    sendJson(400, jsonRpcError(null, -32700, "Parse error"));
    return;
  }

  // Validate the JSON-RPC request structure.
  if (
    payload === null ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    sendJson(400, jsonRpcError(null, -32600, "Invalid Request"));
    return;
  }

  const rpc = payload as Record<string, unknown>;
  const id = rpc.id;

  if (
    rpc.jsonrpc !== "2.0" ||
    typeof rpc.method !== "string" ||
    (
      id !== undefined &&
      id !== null &&
      typeof id !== "string" &&
      typeof id !== "number"
    )
  ) {
    sendJson(400, jsonRpcError(null, -32600, "Invalid Request"));
    return;
  }

  const requestId = (id ?? null) as string | number | null;

  // Extract role from the Bearer token.
  const authorization = req.headers.authorization ?? "";
  const tokenMatch = /^Bearer\s+(\S+)$/i.exec(authorization);
  const token = tokenMatch?.[1];
  const role = token ? tokenRoles[token] : undefined;

  // Apply tool-level authorization.
  if (rpc.method === "tools/call") {
    const params = rpc.params;

    if (
      params === null ||
      typeof params !== "object" ||
      Array.isArray(params) ||
      typeof (params as Record<string, unknown>).name !== "string"
    ) {
      sendJson(
        400,
        jsonRpcError(requestId, -32602, "Invalid params")
      );
      return;
    }

    const toolName = (params as Record<string, unknown>).name as string;

    if (toolName.startsWith("admin_") && role !== "admin") {
      console.error(`Blocked unauthorized tool call: ${toolName}`);

      sendJson(
        403,
        jsonRpcError(requestId, -32001, "Unauthorized Tool Call")
      );
      return;
    }
  }

  // Forward permitted requests without modifying their JSON body.
  try {
    const downstreamResponse = await fetch(DOWNSTREAM_URL, {
      method: "POST",
      headers: {
        "Content-Type": req.headers["content-type"] ?? "application/json",
      },
      body: rawBody,
    });

    const responseBody = await downstreamResponse.text();

    res.writeHead(downstreamResponse.status, {
      "Content-Type":
        downstreamResponse.headers.get("content-type") ??
        "application/json",
    });

    res.end(responseBody);
  } catch (error) {
    console.error("Downstream request failed:", error);

    sendJson(
      502,
      jsonRpcError(
        requestId,
        -32603,
        "Downstream server unavailable"
      )
    );
  }
});

server.listen(4000, "127.0.0.1", () => {
  console.error("MCP Security Gateway running on port 4000");
});
