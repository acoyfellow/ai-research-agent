import { Hono } from 'hono';
import uiTemplate from './ui.html';

// Modified main app to use Hono
const app = new Hono<{ Bindings: Env }>();

export interface Env {
  RESEARCH_FETCHER_DO: DurableObjectNamespace;
  FACT_CHECKER_DO: DurableObjectNamespace;
  OPENAI_API_KEY: string;
}

const AI_CONFIG = {
  model: "gpt-4o-mini",
  maxIterations: 2
};

// Utility for handling async operations with logging
const safe = async <T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> => {
  try {
    console.log(`${context} started`)
    const result = await operation()
    console.log(`${context} completed`)
    return result
  } catch (error) {
    console.error(`Error in ${context}:`, error)
    throw error
  }
}

// Clean and simple functions with robust error handling
async function askAI(prompt: string, env: Env) {
  return safe(async () => {
    if (!env.OPENAI_API_KEY) throw new Error('OpenAI API key not configured')

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: AI_CONFIG.model,
        messages: [{ role: "user", content: prompt }]
      })
    })

    const result = await response.json()
    if (!response.ok) throw new Error(`OpenAI API: ${result.error?.message}`)
    return result.choices[0].message.content
  }, 'askAI')
}

export class ResearchFetcherDO {
  constructor(private state: DurableObjectState, private env: Env) { }

  async fetch(request: Request) {
    return safe(async () => {
      const { topic, iteration = 0 } = await request.json()
      if (!topic) throw new Error('No topic provided')

      const research = await askAI(`Research this topic: ${topic}`, this.env)
      return new Response(JSON.stringify({ research, iteration }))
    }, 'ResearchFetcherDO')
  }
}

export class FactCheckerDO {
  constructor(private state: DurableObjectState, private env: Env) { }

  async fetch(request: Request) {
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
          error: error.message,
          stack: error.stack
        }),
        { status: 500 }
      )
    }
  }
}


// Serve the UI
app.get('/', (c) => c.html(uiTemplate))

// Research endpoint
app.post('/start', async (c) => {
  try {
    const body = await c.req.json()
    let currentData = { topic: body.topic, iteration: 0 }

    let iteration = 0
    let finalResult = null

    while (iteration < AI_CONFIG.maxIterations) {
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
      finalResult = await factCheckResponse.json()

      // Prepare for next iteration
      currentData = {
        topic: body.topic,
        research: finalResult.research,
        iteration: iteration + 1
      }

      iteration++
    }

    return c.json(finalResult)
  } catch (error) {
    console.error('Error in /start endpoint:', error)
    return c.json({ error: error.message }, 500)
  }
})

export default app