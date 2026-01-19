import { ENV } from "./env";
import { getActiveLlmConfig } from "../db-config";
import { decrypt } from "../encryption";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4";
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  // If there's only text content, collapse to a single string for compatibility
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text,
    };
  }

  return {
    role,
    name,
    content: contentParts,
  };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }

    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }

    return {
      type: "function",
      function: { name: tools[0].function.name },
    };
  }

  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name },
    };
  }

  return toolChoice;
};

const resolveApiUrl = async () => {
  // Try to get active LLM configuration from database first
  try {
    const activeConfig = await getActiveLlmConfig();
    if (activeConfig?.endpoint && (activeConfig.provider === "custom" || activeConfig.provider === "azure_openai")) {
      // Use /v1/chat/completions for both custom and Azure providers
      return `${activeConfig.endpoint.replace(/\/$/, "")}/v1/chat/completions`;
    }
  } catch (error) {
    console.warn("Failed to get active LLM config, falling back to env variables:", error);
  }

  // Fallback to environment variables
  return ENV.llmApiUrl && ENV.llmApiUrl.trim().length > 0
    ? `${ENV.llmApiUrl.replace(/\/$/, "")}/v1/chat/completions`
    : ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
      ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
      : "https://forge.manus.im/v1/chat/completions";
};

const assertApiKey = async () => {
  // Try to get active LLM configuration from database first
  try {
    const activeConfig = await getActiveLlmConfig();
    if (activeConfig?.apiKey) {
      return; // API key exists in database config
    }
  } catch (error) {
    console.warn("Failed to get active LLM config, checking env variables:", error);
  }

  // Fallback to environment variables
  if (!ENV.llmApiKey && !ENV.forgeApiKey) {
    throw new Error("LLM_API_KEY or BUILT_IN_FORGE_API_KEY is not configured");
  }
};

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  await assertApiKey();

  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
  } = params;

  // Initialize with fallback defaults (environment variables)
  let activeModel = ENV.llmModel; // From .env LLM_MODEL or default "gemini-3-flash-preview"
  let activeApiKey = ENV.llmApiKey || ENV.forgeApiKey;
  let activeMaxTokens = 32768; // Fallback: ~24k words max response length
  let activeTemperature = 0.7; // Fallback: 0.0 = deterministic, 1.0 = creative
  let configSource = "env-default"; // Track where config came from

  // Load actual LLM configuration from database (MySQL llm_configurations table)
  // This overrides the fallbacks above with your configured settings
  // (e.g., Gemini-3-Flash, temperature 0.5, etc.)
  try {
    const dbConfig = await getActiveLlmConfig();
    if (dbConfig) {
      activeModel = dbConfig.model; // Your configured model (e.g., "gemini-3-flash-preview")
      configSource = "database";
      if (dbConfig.apiKey) {
        activeApiKey = decrypt(dbConfig.apiKey);
      }
      if (dbConfig.maxTokens) {
        // maxTokens = Maximum response length in tokens
        // 1 token ≈ 0.75 words, so 4000 tokens ≈ 3000 words
        // Prevents runaway responses and controls API costs
        activeMaxTokens = dbConfig.maxTokens;
      }
      if (dbConfig.temperature !== null) {
        // temperature = Randomness/creativity level (0.0 to 1.0)
        // 0.0 = Always picks most likely response (deterministic)
        // 0.5 = Balanced between predictable and creative
        // 1.0 = Maximum creativity/randomness
        // Database stores 0-100, convert to 0.0-1.0 for API
        activeTemperature = dbConfig.temperature / 100;
      }
    }
  } catch (error) {
    console.warn("[LLM] Failed to load database config, falling back to .env defaults:", error);
    configSource = "env-fallback";
  }

  const payload: Record<string, unknown> = {
    model: activeModel,
    messages: messages.map(normalizeMessage),
    max_tokens: activeMaxTokens,
    temperature: activeTemperature,
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }

  // DISABLED: 'thinking' parameter was causing 400 errors with Laisky API
  // if (model.includes("gemini")) {
  //   payload.thinking = {
  //     "budget_tokens": 128
  //   };
  // }

  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }

  const apiUrl = await resolveApiUrl();
  // Log sanitized request metadata for observability (no full content to avoid spills)
  const messagePreview = messages.map((m, idx) => {
    const text = Array.isArray(m.content)
      ? m.content.map((c: any) => (typeof c === "string" ? c : c.text || "")).join(" ")
      : typeof m.content === "string"
        ? m.content
        : (m.content as any).text || "";
    return {
      idx,
      role: m.role,
      preview: text?.slice(0, 180),
      length: text?.length || 0,
    };
  });
  console.log('[LLM] invoke', {
    url: apiUrl,
    model: activeModel,
    configSource, // NEW: Track where the config came from
    messages: messages.length,
    tools: tools?.length || 0,
    maxTokens: activeMaxTokens,
    temperature: activeTemperature,
    previews: messagePreview,
  });

  // Create abort controller for timeout (Gemini can be slower, use longer timeout)
  const controller = new AbortController();
  const timeoutMs = 180000; // 3 minutes for Gemini models with large context
  const timeoutId = setTimeout(() => {
    console.error('[LLM] Request timeout after', timeoutMs, 'ms');
    controller.abort();
  }, timeoutMs);

  try {
    const startTime = Date.now();
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${activeApiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const fetchDuration = Date.now() - startTime;
    console.log('[LLM] Response received in', fetchDuration, 'ms');

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `LLM invoke failed: ${response.status} ${response.statusText} – ${errorText}`
      );
    }

    return (await response.json()) as InvokeResult;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`LLM request timed out after ${timeoutMs}ms. The model may be overloaded or the context is too large.`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
