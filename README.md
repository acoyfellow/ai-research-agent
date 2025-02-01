# 🤖 AI Research Assistant

An intelligent, self-improving research system powered by Cloudflare Workers and OpenAI. This system uses two Durable Objects to recursively generate, verify, and refine AI research responses.

## ✨ Features

- **Self-Improving Responses**: Iteratively refines research through multiple passes
- **Fact Checking**: Automatically verifies and corrects information
- **Scalable Architecture**: Built on Cloudflare's edge network
- **Real-time Processing**: Get immediate responses while refinement happens in background
- **Durable Objects**: Maintains state and consistency across iterations

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (latest version)
- [Cloudflare Workers](https://workers.cloudflare.com/) account
- [OpenAI API key](https://platform.openai.com/account/api-keys)

### Installation

1. Install Wrangler:
   ```bash
   bun install -g wrangler
   ```

2. Create a new project:
   ```bash
   wrangler generate ai-research-assistant
   cd ai-research-assistant
   ```

3. Configure your `wrangler.toml`:
   ```toml
   name = "ai-research-assistant"
   main = "src/index.ts"
   compatibility_date = "2025-02-01"

   [vars]
   OPENAI_API_KEY = "your-openai-api-key"

   [[durable_objects]]
   bindings = [
     { name = "RESEARCH_FETCHER_DO", class_name = "ResearchFetcherDO" },
     { name = "FACT_CHECKER_DO", class_name = "FactCheckerDO" }
   ]
   ```

4. Deploy your worker:
   ```bash
   bun install
   bun run deploy
   ```

## 🔧 Usage

Send a POST request to your worker's endpoint:

```bash
curl -X POST https://<your-worker>.workers.dev/start \
  -H "Content-Type: application/json" \
  -d '{"topic": "Explain quantum computing in simple terms"}'
```

### Example Response

```json
{
  "status": "success",
  "research": {
    "summary": "...",
    "iterations": 3,
    "confidence_score": 0.95
  }
}
```

## 🔍 How It Works

1. **ResearchFetcherDO**: Generates initial research using OpenAI
2. **FactCheckerDO**: Verifies and refines the research
3. **Iteration Loop**: Continues refinement until confidence threshold is met
4. **Final Response**: Returns the most accurate and refined version

## 📊 Monitoring

Monitor your worker's performance:

```bash
wrangler tail
```

## ⚙️ Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `MAX_ITERATIONS` | Maximum refinement loops | 5 |
| `CONFIDENCE_THRESHOLD` | Required accuracy score | 0.9 |
| `TIMEOUT_MS` | Maximum processing time | 30000 |

## 🛠️ Development

1. Clone the repository
2. Install dependencies: `bun install`
3. Start local development: `bun run dev`
4. Run tests: `bun test`

## 📝 License

MIT License - see [LICENSE](LICENSE) for details

## 🤝 Contributing

Contributions welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## 🌟 Support

- Star this repo
- Report issues
- Submit PRs
- Share with others

---

Built with ❤️ using Cloudflare Workers and OpenAI
 
