# AI for Dealer 🦾

**Ironman AI — Your intelligent dealer assistant.**

An AI-powered chat interface built for dealers, sales professionals, and anyone who needs a sharp, witty co-pilot for their daily operations. Think Tony Stark meets your CRM.

## Features

- **🤖 Ironman AI Chat** — Full-featured chat interface with arc reactor aesthetics
- **📊 Deal Intelligence** — Get insights on deals, inventory, customers, and strategy
- **🎯 Smart Suggestions** — Quick prompts to jumpstart your workflow
- **🌗 Dark Theme** — Easy on the eyes, hard on the competition
- **📱 Responsive** — Works on desktop and mobile
- **💾 Persistent Conversations** — Chat history saved across sessions
- **📋 Multi-Conversation Sidebar** — Switch between chats, delete old ones
- **🔒 Secure Backend** — Gateway token configurable via env vars, never in code

## Getting Started

### Option 1: GitHub Pages

1. Enable GitHub Pages for this repo (Settings → Pages → deploy from `main` branch, `/docs` folder or root)
2. Visit the published URL
3. Start chatting!

> **Note:** Without a connected backend, the chat uses built-in fallback responses. See below to connect to your own AI backend.

### Option 2: Local Development

```bash
# Clone the repo
git clone git@github.com:priclist/ai-for-dealer-.git
cd ai-for-dealer-

# Open in browser
open index.html
```

## Connecting to Ironman (Backend)

For the full Ironman experience — where you're talking to me directly — you'll need to connect the chat to an OpenClaw Gateway instance.

### Using the Backend Adapter (Recommended)

1. Copy the environment template and configure:

```bash
cp .env.example .env
# Edit .env with your Gateway URL and token
```

2. Install dependencies and start:

```bash
node adapter-server.js
```

The adapter runs on `http://127.0.0.1:3101` and bridges your chat to the Gateway.

### Using OpenClaw Hooks (Alternative)

1. Enable webhook hooks in your `openclaw.json`:

```json5
{
  hooks: {
    enabled: true,
    token: "your-secret-token",
    path: "/hooks",
    mappings: [
      {
        match: { path: "ai-dealer-chat" },
        action: "agent",
        agentId: "main",
        deliver: true,
      },
    ],
  },
}
```

2. Expose your gateway (via [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/), ngrok, or binding to a public interface)
3. Set the hook URL in the chat:

```html
<script>
  window.OPENCLAW_HOOK_URL = 'https://your-tunnel-url/hooks/ai-dealer-chat';
  window.OPENCLAW_HOOK_TOKEN = 'your-secret-token';
</script>
```

## Tech Stack

- **Frontend:** Vanilla HTML, CSS, JavaScript — zero dependencies
- **Backend:** OpenClaw Gateway (optional, for live AI responses)
- **Theme:** Tony Stark / Ironman — because if you're gonna do something, do it with style

## License

MIT — Go build something awesome.

---

_Built with 🦾 by Ironman & friends_
