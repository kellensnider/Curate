#!/usr/bin/env node
/**
 * Vertex auth/connectivity check — verifies the agent's two providers
 * independently of the full app.
 *
 *   npm run vertex:check
 *
 * 1. Attempts a tiny Claude call through Vertex AI (uses ADC).
 * 2. Attempts the same through the Anthropic API (the runtime fallback).
 *
 * Exit code is 0 as long as at least one provider works, so this can gate a
 * demo. A Vertex failure prints the underlying reason (e.g. missing ADC, API
 * not enabled) so you know exactly what to finish in gcloud.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function tryVertex() {
  try {
    const { AnthropicVertex } = require('@anthropic-ai/vertex-sdk');
    const region = process.env.VERTEX_REGION || 'global';
    const projectId = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
    const model = process.env.VERTEX_MODEL || 'claude-sonnet-4-6';
    if (!projectId) return { ok: false, why: 'GCP_PROJECT_ID not set' };

    const client = new AnthropicVertex({ region, projectId });
    const msg = await client.messages.create({
      model,
      max_tokens: 32,
      messages: [{ role: 'user', content: 'Reply with exactly: vertex-ok' }],
    });
    return { ok: true, text: msg.content?.[0]?.text?.trim(), region, projectId, model };
  } catch (err) {
    return { ok: false, why: err.message };
  }
}

async function tryAnthropic() {
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
    if (!process.env.ANTHROPIC_API_KEY) return { ok: false, why: 'ANTHROPIC_API_KEY not set' };
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model,
      max_tokens: 32,
      messages: [{ role: 'user', content: 'Reply with exactly: anthropic-ok' }],
    });
    return { ok: true, text: msg.content?.[0]?.text?.trim(), model };
  } catch (err) {
    return { ok: false, why: err.message };
  }
}

(async () => {
  console.log('— Vertex AI —');
  const v = await tryVertex();
  if (v.ok) console.log(`  ✓ ${v.region}/${v.model} → "${v.text}"`);
  else console.log(`  ✗ ${v.why}`);

  console.log('— Anthropic API (fallback) —');
  const a = await tryAnthropic();
  if (a.ok) console.log(`  ✓ ${a.model} → "${a.text}"`);
  else console.log(`  ✗ ${a.why}`);

  const provider = v.ok ? 'vertex' : a.ok ? 'anthropic (fallback)' : 'NONE';
  console.log(`\nEffective agent provider: ${provider}`);
  process.exit(v.ok || a.ok ? 0 : 1);
})();
