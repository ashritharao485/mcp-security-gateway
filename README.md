# MCP Security Gateway Proxy

A lightweight HTTP/JSON-RPC security gateway built with Node.js and TypeScript. The gateway sits between an AI agent client and a downstream mock MCP server, enforcing role-based authorization for administrative tool calls.

## Features

- Bearer-token authentication with demo `admin` and `viewer` roles
- JSON-RPC 2.0 request parsing and validation
- Transparent forwarding of `tools/list` requests
- Method-level authorization for `tools/call`
- Blocks unauthorized `admin_` tools with JSON-RPC error `-32001`
- Preserves downstream HTTP response status and JSON body
- Handles malformed JSON and downstream connection failures
- Includes a mock downstream MCP-compatible JSON-RPC endpoint

## Tech Stack

- Node.js
- TypeScript
- HTTP module (`node:http`)
- JSON-RPC 2.0
- Fetch API

## Installation

Requires Node.js 18 or newer.

```bash
npm install
```

## Running the Project

Open two terminals in the project directory.

**Terminal 1 — Start the downstream mock server**

```bash
npx tsx mock-server.ts
```

The mock server listens at `http://127.0.0.1:4001`.

**Terminal 2 — Start the security gateway**

```bash
npx tsx gateway.ts
```

The gateway listens at `http://127.0.0.1:4000`.

## Demo Authentication

For local testing, the gateway recognizes two demonstration tokens:

| Token | Role |
|---|---|
| `admin-demo-token` | admin |
| `viewer-demo-token` | viewer |

These fixed tokens are for demonstration only and are not suitable for production authentication.

## Authorization Rules

| JSON-RPC Method | Tool | Behavior |
|---|---|---|
| `tools/list` | — | Forward to downstream |
| `tools/call` | `get_customer_record` | Forward to downstream |
| `tools/call` | `admin_reset_key` | Admin: forward; viewer: block |

Unauthorized administrative calls return HTTP `403` with:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32001,
    "message": "Unauthorized Tool Call"
  }
}
```

## Testing

Tests performed manually:

1. Viewer calls `admin_reset_key` — rejected with HTTP 403 and JSON-RPC error `-32001`.
2. Admin calls `admin_reset_key` — forwarded successfully.
3. Viewer requests `tools/list` — receives both available tools.
4. Malformed JSON — rejected with HTTP 400.

## Architecture

```text
AI Agent Client
       |
       | HTTP + Bearer Token + JSON-RPC
       v
MCP Security Gateway (Port 4000)
       |
       | Role validation and tool filtering
       |
       +---- Unauthorized admin_ call
       |             |
       |             v
       |      JSON-RPC -32001
       |
       +---- Allowed request
                     |
                     v
        Mock MCP Server (Port 4001)
                     |
                     v
             JSON-RPC Response
```

## Security Notes

This project demonstrates gateway authorization logic rather than production-grade authentication. A production deployment should validate signed access tokens, enforce HTTPS, apply request-size limits, and implement additional protections against malformed or malicious traffic.