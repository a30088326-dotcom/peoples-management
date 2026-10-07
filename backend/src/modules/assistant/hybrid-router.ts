import { Context } from './types';
import { understand } from './intent';
import { invoke } from './runtime';
import { getOllamaConfig } from './ollama/config';
import { ollamaClient } from './ollama/client';
import { planAndRespond } from './ollama/agent-loop';
import { tools } from './tools';

export async function routeMessage(c: Context, conversationId: string, message: string, requestId: string, selectedEmployeeId?: string) {
  const config = getOllamaConfig();
  
  // 1. Try deterministic first for fast-path? The prompt says:
  // "Check deterministic fast-path where appropriate"
  // Let's see if deterministic strictly matches something. Wait, if deterministic matches loosely, it might hijack natural requests.
  // "If Ollama is offline/unavailable..., fall back to current deterministic engine."
  // "Do NOT remove existing intent engine... keep as fallback, fast path, recovery mode".
  
  const deterministicIntent = understand(message, selectedEmployeeId);
  
  // If Ollama is ON, we should probably prefer Ollama for natural language, unless it's a direct command like "requests.pending".
  // Actually, understand() returns null if it doesn't understand. 
  // Wait, understand() uses regex and might aggressively match things like "approve the first one" -> "requests.resolve".
  // Let's use deterministic IF understand() returns an intent, AND Ollama is off or unavailable.
  // Wait, if understand() is too aggressive, it might intercept complex queries. But understand() was built for this.
  // The user says: "Transform: User Message -> Deterministic Intent Matching -> Tool INTO: User Message -> LOCAL AI PLANNER -> Tool".
  // "while preserving the existing deterministic intent engine as a FALLBACK."
  // So:
  
  let useOllama = config.enabled;
  if (useOllama) {
    useOllama = await ollamaClient.isAvailable();
  }

  if (useOllama) {
    try {
      return await planAndRespond(c, conversationId, message, requestId);
    } catch (e: any) {
      console.error('Ollama Planner Error:', e);
      // Fallback to deterministic
    }
  }

  // Deterministic Fallback
  if (!deterministicIntent) {
    return { 
      kind: 'result', 
      conversationId, 
      result: { message: 'I need a little more detail. Do you want to apply for leave, mark attendance, check a balance, or another HR task? Type "What can you do?" for commands available to your account. Nothing has been changed.' } 
    };
  }

  const reply = await invoke(c, deterministicIntent.tool, deterministicIntent.args, requestId, conversationId);
  const matched = tools.find(tool => tool.id === deterministicIntent.tool);
  return { ...reply, interpretedAs: deterministicIntent.interpretedAs || matched?.label, spellingAdjusted: Boolean(deterministicIntent.corrected) };
}
