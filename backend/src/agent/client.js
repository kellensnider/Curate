/**
 * Anthropic client factory — provider-agnostic.
 *
 * Returns a Claude client plus the model id to use, choosing between:
 *   - Google Cloud Vertex AI  (when CLAUDE_PROVIDER=vertex)
 *   - the direct Anthropic API (default / fallback)
 *
 * Both SDKs expose an identical `client.messages.create(...)` surface, so the
 * agent loop in index.js does not care which one it gets.
 *
 * DEMO SAFETY: if Vertex is requested but its SDK/config is missing, we log a
 * warning and fall back to the Anthropic API instead of throwing — the live
 * agent can never go dark on stage because of a Vertex misconfig.
 */

let cached = null;

function createClient() {
  if (cached) return cached;

  const provider = (process.env.CLAUDE_PROVIDER || 'anthropic').toLowerCase();

  if (provider === 'vertex') {
    try {
      // Lazily required so a missing optional dep doesn't break the Anthropic path.
      const { AnthropicVertex } = require('@anthropic-ai/vertex-sdk');
      // Claude Sonnet 4.6 on Vertex supports the `global` endpoint, which avoids
      // per-region model-availability issues — see Model Garden page.
      const region = process.env.VERTEX_REGION || 'global';
      const projectId = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
      if (!projectId) throw new Error('GCP_PROJECT_ID (or GOOGLE_CLOUD_PROJECT) is not set');

      // Auth uses Application Default Credentials (the Cloud Run service
      // account in prod, or `gcloud auth application-default login` locally).
      const client = new AnthropicVertex({ region, projectId });
      // On Vertex the AnthropicVertex SDK takes the short model name.
      const model = process.env.VERTEX_MODEL || 'claude-sonnet-4-6';
      console.error(`[curate-agent] provider=vertex region=${region} project=${projectId} model=${model}`);
      cached = { client, model, provider: 'vertex' };
      return cached;
    } catch (err) {
      console.error(`[curate-agent] Vertex init failed (${err.message}) — falling back to Anthropic API`);
    }
  }

  cached = createAnthropicClient();
  return cached;
}

// The direct Anthropic API client — also used as the runtime fallback if a
// Vertex *call* fails (e.g. ADC not set up yet, API not enabled). Building this
// is cheap and synchronous, so the agent can swap to it mid-session.
function createAnthropicClient() {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
  console.error(`[curate-agent] provider=anthropic model=${model}`);
  return { client, model, provider: 'anthropic' };
}

module.exports = { createClient, createAnthropicClient };
