
import { createServer } from "node:http";

const server = createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    res.writeHead(405);
    res.end(JSON.stringify({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32600, message: "Invalid Request" }
    }));
    return;
  }

  let body = "";

  for await (const chunk of req) {
    body += chunk.toString();
  }

  let request: any;

  try {
    request = JSON.parse(body);
  } catch {
    res.writeHead(400);
    res.end(JSON.stringify({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32700, message: "Parse error" }
    }));
    return;
  }

  if (
    !request ||
    typeof request !== "object" ||
    Array.isArray(request) ||
    request.jsonrpc !== "2.0" ||
    typeof request.method !== "string"
  ) {
    res.writeHead(400);
    res.end(JSON.stringify({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32600, message: "Invalid Request" }
    }));
    return;
  }

  let result;

  if (request.method === "tools/list") {
    result = {
      tools: [
        {
          name: "get_customer_record",
          description: "Retrieve customer information",
          inputSchema: {
            type: "object",
            properties: { customer_id: { type: "string" } },
            required: ["customer_id"]
          }
        },
        {
          name: "admin_reset_key",
          description: "Simulate an administrative key reset",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false
          }
        }
      ]
    };
  } else if (request.method === "tools/call") {
    if (
      !request.params ||
      typeof request.params.name !== "string"
    ) {
      res.writeHead(200);
      res.end(JSON.stringify({
        jsonrpc: "2.0",
        id: request.id ?? null,
        error: { code: -32602, message: "Invalid params" }
      }));
      return;
    }

    result = {
      content: [
        {
          type: "text",
          text: `Successfully executed ${request.params.name}`
        }
      ]
    };
  } else {
    res.writeHead(200);
    res.end(JSON.stringify({
      jsonrpc: "2.0",
      id: request.id ?? null,
      error: { code: -32601, message: "Method not found" }
    }));
    return;
  }

  res.writeHead(200);
  res.end(JSON.stringify({
    jsonrpc: "2.0",
    id: request.id ?? null,
    result
  }));
});

server.listen(4001, "127.0.0.1", () => {
  console.log("Mock MCP server running on port 4001");
});
