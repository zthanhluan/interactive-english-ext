// src/background.ts

const DEBUG_MODE = import.meta.env.DEV; // Tự động false khi build production
const log = (...args: any[]) => { if (DEBUG_MODE) console.log('[Background]', ...args); };
const warn = (...args: any[]) => { if (DEBUG_MODE) console.warn('[Background]', ...args); };
const err = (...args: any[]) => { if (DEBUG_MODE) console.error('[Background]', ...args); };

log("🕵️ Background Worker is ready!");
// Listen for outgoing requests containing YouTube's subtitle API path
chrome.webRequest.onCompleted.addListener(
  async (details) => {
    // If request is successful and url contains 'api/timedtext'
    if (details.statusCode === 200 && details.url.includes('api/timedtext')) {
      log("🎯 Caught YouTube subtitle request:", details.url);

      try {
        // Silently refetch the exact URL from the Background environment (where CORS is not restricted)
        const response = await fetch(details.url);
        const rawText = await response.text();

        log("📄 Raw data caught (first 30 chars):", rawText.substring(0, 30));

        if (details.tabId >= 0) {
          // Send this raw data to the Content Script (React UI) for processing
          chrome.tabs.sendMessage(details.tabId, {
            type: "SUBTITLES_CAPTURED",
            payload: rawText
          });
        } else {
          warn(`⚠️ Skipped sending message due to invalid tabId: ${details.tabId}`);
        }
        
      } catch (error) {
        err("❌ Error fetching data:", error);
      }
    }
  },
  { urls: ["*://*.youtube.com/api/timedtext*"] } // Only watch these URLs
);