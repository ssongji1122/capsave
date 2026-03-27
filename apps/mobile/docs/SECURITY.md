# Security Notes

## API Key Exposure (Known Issue)

The OpenAI API key is currently stored in `app.json > extra.openaiApiKey` and bundled into the client binary. This is a known security risk.

### Current Risk
- Anyone with the app binary can extract the API key
- Unauthorized usage could cause unexpected billing

### Recommended Fix (Future)
- Create a backend proxy (e.g., Cloudflare Worker, Vercel Edge Function)
- Client sends image to proxy → proxy calls OpenAI with server-side key
- Add rate limiting and authentication to the proxy

### Interim Mitigation
- Set strict usage limits on the OpenAI API key via the OpenAI dashboard
- Monitor API usage for anomalies
- Rotate the key regularly
