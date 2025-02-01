import { Hono } from 'hono';
import OpenAI from 'openai';

// ==========================================
// Types & Interfaces
// ==========================================
export interface Env {
  RESEARCH_FETCHER_DO: DurableObjectNamespace;
  FACT_CHECKER_DO: DurableObjectNamespace;
  OPENAI_API_KEY: string;
  OPENAI_MODEL: string;
  MAX_ITERATIONS: number;
  CONFIDENCE_THRESHOLD: number;
  TIMEOUT_MS: number;
}

interface ResearchData {
  topic: string;
  research?: string;
  iteration: number;
}

interface ResearchResponse {
  research: string;
  iteration: number;
  confidence: number;
}

interface AIResponse {
  content: string;
  error?: string;
}

// ==========================================
// Utility Functions
// ==========================================
type SafeOperation<T> = () => Promise<T>;

const safe = async <T>(
  operation: SafeOperation<T>,
  context: string
): Promise<T> => {
  try {
    console.log(`${context} started`);
    const result = await operation();
    console.log(`${context} completed`);
    return result;
  } catch (error) {
    console.error(`Error in ${context}:`, error instanceof Error ? error.message : error);
    throw error;
  }
};

async function askAI(prompt: string, env: Env): Promise<AIResponse> {
  return safe(async () => {
    if (!env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY
    });

    try {
      const response = await openai.chat.completions.create({
        model: env.OPENAI_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1000
      });

      return {
        content: response.choices[0].message.content || ''
      };
    } catch (error) {
      return {
        content: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }, 'askAI');
}

// ==========================================
// Durable Objects
// ==========================================
export class ResearchFetcherDO {
  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env
  ) { }

  async fetch(request: Request): Promise<Response> {
    return safe(async () => {
      const { topic, iteration = 0 } = await request.json() as {
        topic: string;
        iteration?: number;
      };

      if (!topic) {
        return new Response(
          JSON.stringify({ error: 'No topic provided' }),
          { status: 400 }
        );
      }

      const research = await askAI(`Research this topic: ${topic}`, this.env);
      return new Response(
        JSON.stringify({ research, iteration }),
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }, 'ResearchFetcherDO');
  }
}

export class FactCheckerDO {
  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env
  ) { }

  async fetch(request: Request): Promise<Response> {
    try {
      const body = await request.json() as { research: string, iteration?: number };
      console.log('FactCheckerDO received:', body)

      console.log('Calling OpenAI for fact check...')
      const refined = await askAI(`Verify and improve: ${body.research}`, this.env);
      console.log('Fact check received from OpenAI')

      return new Response(JSON.stringify({
        research: refined,
        iteration: (body.iteration || 0) + 1
      }));
    } catch (error) {
      console.error('Error in FactCheckerDO:', error)
      return new Response(
        JSON.stringify({
          error: (error as Error).message,
          stack: (error as Error).stack
        }),
        { status: 500 }
      )
    }
  }
}

// ==========================================
// UI Template
// ==========================================
const uiTemplate = `
  <!DOCTYPE html>
  <html lang="en">

  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Research Agent</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>

  <body class="bg-gray-100 p-4">
    <div class="max-w-2xl mx-auto">
      <h1 class="text-3xl font-bold mb-4">AI Research Agent</h1>

      <div class="bg-white rounded-lg shadow p-4">
        <textarea id="topic" class="w-full p-2 border rounded mb-4 h-32"
          placeholder="Enter your research topic..."></textarea>
        <button onclick="startResearch()" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          Research
        </button>
      </div>

      <div id="result" class="mt-4 bg-white rounded-lg shadow p-4 hidden">
        <h2 class="font-bold mb-2">Results:</h2>
        <div id="content" class="prose whitespace-break-spaces"></div>
      </div>
    </div>

    <script>
      async function startResearch() {
        const topic = document.getElementById('topic').value;
        const resultDiv = document.getElementById('result');
        const contentDiv = document.getElementById('content');

        resultDiv.classList.remove('hidden');
        contentDiv.innerHTML = 'Researching...';

        try {
          const response = await fetch('/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic })
          });
          const data = await response.json();
          contentDiv.innerHTML = data.research;
        } catch (error) {
          contentDiv.innerHTML = 'Error: ' + error.message;
        }
      }
    </script>
  </body>

  </html>
`;

// ==========================================
// App Configuration & Routes
// ==========================================
const app = new Hono<{ Bindings: Env }>();

// Serve the UI
app.get('/', (c) => c.html(uiTemplate));

// Research endpoint
app.post('/start', async (c) => {
  try {
    const body = await c.req.json();
    let currentData = { topic: body.topic, iteration: 0 };

    const config = {
      maxIterations: parseInt(c.env.MAX_ITERATIONS.toString() || "5"),
      confidenceThreshold: parseFloat(c.env.CONFIDENCE_THRESHOLD.toString() || "0.9")
    };

    let iteration = 0;
    let finalResult = null;

    while (iteration < config.maxIterations) {
      // Get DO instances
      const researcher = c.env.RESEARCH_FETCHER_DO.get(
        c.env.RESEARCH_FETCHER_DO.newUniqueId()
      )
      const factChecker = c.env.FACT_CHECKER_DO.get(
        c.env.FACT_CHECKER_DO.newUniqueId()
      )

      // Research phase
      const researchResponse = await researcher.fetch(new Request(c.req.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentData)
      }))
      const researchData = await researchResponse.json()

      // Fact check phase
      const factCheckResponse = await factChecker.fetch(new Request(c.req.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(researchData)
      }))
      finalResult = await factCheckResponse.json() as ResearchResponse;

      // Prepare for next iteration
      currentData = {
        topic: body.topic,
        research: finalResult.research,
        iteration: iteration + 1
      } as ResearchData;

      // Optional: Add confidence check
      if (finalResult?.confidence >= config.confidenceThreshold) {
        break;
      }

      iteration++;
    }

    return c.json(finalResult)
  } catch (error) {
    console.error('Error in /start endpoint:', error)
    return c.json({ error: (error as Error).message }, 500)
  }
})

export default app