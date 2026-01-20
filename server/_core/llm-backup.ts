import { ENV } from "./env";
import { getActiveLlmConfig } from "../db-config";
import { decrypt } from "../encryption";
// 导入代理组件，确保已通过 pnpm add undici 安装
import { ProxyAgent, setGlobalDispatcher } from 'undici';

// --- 1. 代理与安全配置 ---
if (process.env.NODE_ENV !== 'production') {
  const proxyAgent = new ProxyAgent('http://127.0.0.1:7890');
  setGlobalDispatcher(proxyAgent);
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  console.log("[LLM] Proxy: Global 7890 proxy enabled, SSL verification disabled.");
}

// --- 2. 类型定义 ---
export type Role = "system" | "user" | "assistant" | "tool" | "function";
export type TextContent = { type: "text"; text: string };
export type ImageContent = { type: "image_url"; image_url: { url: string; detail?: "auto" | "low" | "high" } };
export type FileContent = { type: "file_url"; file_url: { url: string; mime_type?: string } };
export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: { name: string; description?: string; parameters?: Record<string, unknown> };
};

export type ToolChoice = "none" | "auto" | "required" | { name: string } | { type: "function"; function: { name: string } };

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: any;
  output_schema?: any;
  responseFormat?: any;
  response_format?: any;
  temperature?: number;
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: { role: Role; content: string; tool_calls?: any[] };
    finish_reason: string | null;
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
};

// --- 3. 辅助转换函数 ---
const ensureArray = (value: any): any[] => (Array.isArray(value) ? value : [value]);

const normalizeContentToText = (content: MessageContent | MessageContent[]): string => {
  const parts = ensureArray(content);
  return parts
    .map(p => (typeof p === "string" ? p : (p as any).text || ""))
    .join("\n");
};

// 【新增】辅助函数：剥离 Markdown 的 JSON 标签
const stripMarkdownJson = (text: string): string => {
  return text
    .replace(/```json\n?/gi, "") // 移除开头的 ```json
    .replace(/```\n?/g, "")     // 移除结尾的 ```
    .trim();
};

const normalizeMessageForOpenAI = (message: Message) => {
  const { role, name, tool_call_id, content } = message;
  if (role === "tool" || role === "function") {
    return {
      role,
      name,
      tool_call_id,
      content: normalizeContentToText(content),
    };
  }
  return { role, name, content: normalizeContentToText(content) };
};

// --- 4. 核心逻辑函数 ---
export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const { messages, max_tokens } = params;

  let activeConfig: any = null;
  let model = "gpt-4o-mini";
  let apiKey = ENV.llmApiKey || ENV.forgeApiKey;
  let maxTokens = 4096;
  let temperature = 0.7;

  try {
    activeConfig = await getActiveLlmConfig();
    if (activeConfig) {
      model = activeConfig.model || model;
      if (activeConfig.apiKey) {
        apiKey = decrypt(activeConfig.apiKey);
      }
      if (activeConfig.maxTokens) {
        maxTokens = activeConfig.maxTokens;
      }
      if (activeConfig.temperature !== null) {
        temperature = activeConfig.temperature / 100;
      }
    }
  } catch (error) {
    console.warn("[LLM] Failed to load DB config, using default values.");
  }

  if (!apiKey) {
    throw new Error("LLM API Key is not configured.");
  }

  // ==========================================================
  // 场景 A: Google AI Studio 原生协议
  // ==========================================================
  if (activeConfig?.provider === "google_ai") {
    const cleanModel = model.replace(/^models\//, "");
    const googleUrl = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`;

    const systemMsg = messages.find(m => m.role === "system");
    const chatHistory = messages.filter(m => m.role !== "system");

    const googleBody: any = {
      contents: chatHistory.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: normalizeContentToText(m.content) }]
      })),
      generationConfig: {
        temperature: temperature,
        maxOutputTokens: max_tokens || maxTokens,
        topP: 0.95,
        // 关键：强制要求 JSON 输出
        responseMimeType: "application/json",
      }
    };

    if (systemMsg) {
      googleBody.system_instruction = {
        parts: [{ text: normalizeContentToText(systemMsg.content) }]
      };
    }

    console.log(`[LLM] Calling Google AI Studio: ${cleanModel}`);

    const response = await fetch(googleUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(googleBody),
    });

    if (!response.ok) {
      throw new Error(`Google API Error: ${response.status} ${await response.text()}`);
    }

    const gJson = await response.json();

    // 【核心改动】获取原始文本并剥离 Markdown 标签
    let rawText = "";
    if (gJson.candidates?.[0]?.content?.parts) {
      rawText = gJson.candidates[0].content.parts
        .map((p: any) => p.text || "")
        .join("");
    }

    // 自动清洗结果，确保返回的是纯净的 JSON 字符串
    const outText = stripMarkdownJson(rawText);

    return {
      id: `google-${Date.now()}`,
      created: Math.floor(Date.now() / 1000),
      model: model,
      choices: [{
        index: 0,
        message: { role: "assistant", content: outText },
        finish_reason: "stop"
      }],
      usage: {
        prompt_tokens: gJson.usageMetadata?.promptTokenCount || 0,
        completion_tokens: gJson.usageMetadata?.candidatesTokenCount || 0,
        total_tokens: gJson.usageMetadata?.totalTokenCount || 0,
      }
    } as InvokeResult;
  }

  // ==========================================================
  // 场景 B: OpenAI / 兼容协议
  // ==========================================================
  const payload: any = {
    model: model,
    messages: messages.map(normalizeMessageForOpenAI),
    max_tokens: max_tokens || maxTokens,
    temperature: temperature,
  };

  if (model.includes("gemini") && activeConfig?.provider !== "google_ai") {
    payload.thinking = { "budget_tokens": 128 };
  }

  let apiUrl = "https://forge.manus.im/v1/chat/completions";
  if (activeConfig?.endpoint) {
    apiUrl = `${activeConfig.endpoint.replace(/\/$/, "")}/v1/chat/completions`;
  } else if (ENV.forgeApiUrl) {
    apiUrl = `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`;
  }

  console.log(`[LLM] Calling OpenAI Compatible API: ${model} via ${apiUrl}`);

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${await response.text()}`);
  }

  return (await response.json()) as InvokeResult;
}
