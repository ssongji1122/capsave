// Single source of truth for AI model configuration.
// All server routes and test fixtures must reference this constant.
// Never hardcode the model string anywhere else.
export const AI_MODEL = 'gemini-2.5-flash';
export const AI_MODEL_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent`;
