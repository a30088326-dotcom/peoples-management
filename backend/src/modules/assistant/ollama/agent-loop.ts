import { Context } from '../types';
import { OllamaMessage, OllamaToolCall } from './types';
import { ollamaClient } from './client';
import { getOllamaConfig } from './config';
import { getSystemPrompt } from './system-prompt';
import { getPermittedTools, convertToOllamaTool, convertOllamaToolCallToIntent } from './tool-adapter';
import { settings } from '../store';
import { invoke } from '../runtime';
import { db } from '../../../lib/db';
import type { RowDataPacket } from 'mysql2/promise';

export async function planAndRespond(c: Context, conversationId: string, userMessage: string, requestId: string): Promise<any> {
  const config = getOllamaConfig();
  const hrSettings = await settings();
  
  // 1. Get Conversation History
  const [historyRows] = await db.query<RowDataPacket[]>('SELECT role, text FROM hr_assistant_messages WHERE conversation_id = ? ORDER BY at ASC LIMIT 10', [conversationId]);
  
  const messages: OllamaMessage[] = [];
  messages.push({ role: 'system', content: getSystemPrompt(c.employeeId || 'User') });
  
  for (const row of historyRows) {
    if (row.role === 'user') messages.push({ role: 'user', content: row.text });
    else if (row.role === 'assistant') messages.push({ role: 'assistant', content: row.text });
  }
  
  // Add current message if not already added by routes (it is added there, so we just use DB history + this if needed. Wait, routes adds user message before calling understand/plan)
  // Let's assume the current user message is already in history, or we append it here if needed. 
  // Wait, in routes: `await remember(...)` is called BEFORE understand/plan. So it's in the DB.
  // We'll just use the DB history, but let's make sure the latest is at the end.
  
  // 2. Load Allowed Tools
  const permittedTools = getPermittedTools(c, hrSettings);
  const ollamaTools = permittedTools.map(convertToOllamaTool);
  
  let iterations = 0;
  let finalResult: any = null;
  let interpretedAs = '';

  while (iterations < config.maxIterations) {
    iterations++;
    
    // 3. Call Model
    const chatResponse = await ollamaClient.chat({
      model: config.model,
      messages,
      tools: ollamaTools.length > 0 ? ollamaTools : undefined,
    });
    
    const responseMsg = chatResponse.message;
    messages.push(responseMsg);
    
    if (responseMsg.tool_calls && responseMsg.tool_calls.length > 0) {
      // 4. Handle Tool Calls
      for (const toolCall of responseMsg.tool_calls) {
        const intent = convertOllamaToolCallToIntent(toolCall.function.name, toolCall.function.arguments);
        
        try {
          const result = await invoke(c, intent.tool, intent.args, requestId, conversationId);
          finalResult = result;
          const matched = permittedTools.find(t => t.id === intent.tool);
          if (matched) interpretedAs = matched.label;
          
          messages.push({
            role: 'tool',
            content: JSON.stringify({ success: true, ...result }),
          });
        } catch (error: any) {
          messages.push({
            role: 'tool',
            content: JSON.stringify({ success: false, error: error.message }),
          });
        }
      }
    } else {
      // 5. Final Natural Response
      return {
        kind: finalResult?.kind || 'result',
        conversationId,
        result: {
          ...finalResult?.result,
          message: responseMsg.content,
        },
        interpretedAs: interpretedAs || 'natural conversation',
        spellingAdjusted: false,
      };
    }
  }
  
  return {
    kind: finalResult?.kind || 'result',
    conversationId,
    result: {
      ...finalResult?.result,
      message: 'I needed too many steps to complete this request. Please try breaking it down.',
    },
    interpretedAs,
    spellingAdjusted: false,
  };
}
