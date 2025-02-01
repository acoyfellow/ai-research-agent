# 🤖 AI Research Agent

An intelligent, self-improving research system powered by Cloudflare Workers and OpenAI. This system uses two Durable Objects to recursively generate, verify, and refine AI research responses.

## ✨ Features

- **Iterative Research**: Uses multiple AI passes to refine responses
- **Fact Checking**: Verifies information through a dedicated fact-checking phase
- **Edge Computing**: Built on Cloudflare Workers for global performance
- **Durable Objects**: Maintains consistency across research iterations

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) or [Bun](https://bun.sh/) (latest version)
- [Cloudflare Workers](https://workers.cloudflare.com/) account
- [OpenAI API key](https://platform.openai.com/account/api-keys)

### Installation

1. Clone and install dependencies:
   ```bash
   git clone https://github.com/acoyfellow/ai-research-agent.git
   cd ai-research-agent
   npm install # or bun install
   ```

2. Copy `wrangler.toml.example` to `wrangler.toml` and configure:
   ```toml
   name = "ai-research-Agent"
   main = "src/index.ts"
   compatibility_date = "2024-02-01"

   [vars]
   OPENAI_API_KEY = "your-key-here"
   OPENAI_MODEL = "gpt-4-turbo-preview"
   MAX_ITERATIONS = "5"
   CONFIDENCE_THRESHOLD = "0.9"
   ```

3. Deploy:
   ```bash
   npm run deploy # or bun run deploy
   ```

## 🔧 Usage

Send a POST request to start research:

```bash
curl -X POST https://<your-worker>.workers.dev/start \
  -H "Content-Type: application/json" \
  -d '{"topic": "Explain quantum computing in simple terms"}'
```

### Example Response

```json
{
  "research": "Quantum computing explained in simple terms...",
  "iteration": 2
}
```

## 🔍 How It Works

1. **Initial Research**: ResearchFetcherDO generates the first research pass using OpenAI
2. **Fact Checking**: FactCheckerDO verifies and improves the research
3. **Iteration**: Process repeats until max iterations or confidence threshold is met
4. **Response**: Returns the final refined research

## ⚙️ Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | Your OpenAI API key | Required |
| `OPENAI_MODEL` | OpenAI model to use | gpt-4-turbo-preview |
| `MAX_ITERATIONS` | Maximum research passes | 5 |
| `CONFIDENCE_THRESHOLD` | Required accuracy threshold | 0.9 |

## 🛠️ Development

1. Start local development:
   ```bash
   npm run dev # or bun run dev
   ```

2. Visit `http://localhost:8787` to use the web interface

## 📝 License

MIT License - see [LICENSE](LICENSE) for details

## 🌟 Support

- Star this repo
- Report issues
- Submit PRs
- Share with others

---

Built with ❤️ using Cloudflare Workers and OpenAI

Inspired by [sunil pai @threepointone](https://x.com/threepointone/status/1885119427223707872)