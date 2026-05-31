const Anthropic = require('@anthropic-ai/sdk');
const { MCP_TOOLS, executeTool } = require('../mcp/server');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are Curate, an AI subscription manager. Your job is to analyze
the user's ranked watchlist and recommend the optimal 1-2 streaming services
for this month to maximize coverage of their most-wanted content while minimizing cost.

When making recommendations:
1. Always call get_watchlist and get_subscriptions first to understand the user's situation
2. Call analyze_coverage to get weighted scores across all services
3. Weight titles by their rank — rank 1 is their most-wanted content
4. Be direct and specific: name the services, name the titles they cover, name the exact dollar amounts
5. Show your math: "Netflix covers 6/9 titles including your top 3" beats "Netflix is great"
6. Calculate monthly savings vs. their current active subscriptions
7. After delivering your recommendation, ask if they'd like you to apply the changes
8. When applying changes, use activate_subscription and cancel_subscription tools

Be conversational but efficient.`;

function buildSystemPrompt(userId) {
  return `${SYSTEM_PROMPT}

The authenticated user's user_id is "${userId}". Use this exact user_id when calling tools.`;
}

// Run the full agent loop with streaming to a response object
async function runAgentStream(userMessage, conversationHistory = [], res, userId) {
  const messages = [
    ...conversationHistory,
    { role: 'user', content: userMessage }
  ];

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  let continueLoop = true;
  let allMessages = [...messages];

  while (continueLoop) {
    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: buildSystemPrompt(userId),
      tools: MCP_TOOLS,
      messages: allMessages,
      stream: true,
    });

    let currentText = '';
    let currentToolUse = null;
    let toolUses = [];
    let stopReason = null;

    for await (const chunk of response) {
      if (chunk.type === 'content_block_start') {
        if (chunk.content_block.type === 'tool_use') {
          currentToolUse = { id: chunk.content_block.id, name: chunk.content_block.name, input: '' };
        }
      } else if (chunk.type === 'content_block_delta') {
        if (chunk.delta.type === 'text_delta') {
          currentText += chunk.delta.text;
          sendEvent({ type: 'text', text: chunk.delta.text });
        } else if (chunk.delta.type === 'input_json_delta' && currentToolUse) {
          currentToolUse.input += chunk.delta.partial_json;
        }
      } else if (chunk.type === 'content_block_stop') {
        if (currentToolUse) {
          try {
            currentToolUse.parsedInput = JSON.parse(currentToolUse.input || '{}');
          } catch {
            currentToolUse.parsedInput = {};
          }
          toolUses.push(currentToolUse);
          currentToolUse = null;
        }
      } else if (chunk.type === 'message_delta') {
        stopReason = chunk.delta.stop_reason;
      }
    }

    // Build assistant message content
    const assistantContent = [];
    if (currentText) {
      assistantContent.push({ type: 'text', text: currentText });
    }
    for (const tool of toolUses) {
      assistantContent.push({
        type: 'tool_use',
        id: tool.id,
        name: tool.name,
        input: tool.parsedInput,
      });
    }

    allMessages.push({ role: 'assistant', content: assistantContent });

    // Execute tools if needed
    if (stopReason === 'tool_use' && toolUses.length > 0) {
      const toolResults = [];

      for (const tool of toolUses) {
        sendEvent({ type: 'tool_call', name: tool.name, input: tool.parsedInput });

        const result = await executeTool(tool.name, tool.parsedInput);
        sendEvent({ type: 'tool_result', name: tool.name });

        toolResults.push({
          type: 'tool_result',
          tool_use_id: tool.id,
          content: JSON.stringify(result),
        });
      }

      allMessages.push({ role: 'user', content: toolResults });
      // Continue the loop to get the agent's response after tool use
    } else {
      continueLoop = false;
    }
  }

  sendEvent({ type: 'done', history: allMessages });
  res.write('data: [DONE]\n\n');
  res.end();
}

module.exports = { runAgentStream };
