import { createRoot } from 'react-dom/client';
import { Overlay } from './Overlay';

const DEBUG_MODE = import.meta.env.DEV; // Tự động false khi build production
const log = (...args: any[]) => { if (DEBUG_MODE) console.log('[Content]', ...args); };

let allSubtitles: any[] = [];
let nextQuizAttemptTime = 30; 
const INTERVAL = 20; 
let scheduledPauseTime = -1;
let quizDataForPause: any = null;
let lastTime = 0;
let currentQuizStartTime = 0;
let currentQuizEndTime = 0;
let isExtensionActive = true;

const overlayContainer = document.createElement('div');
overlayContainer.id = 'interactive-english-root';
overlayContainer.style.position = 'absolute';
overlayContainer.style.inset = '0';
overlayContainer.style.zIndex = '9999';
overlayContainer.style.display = 'none';

const processSubtitles = (rawText: string) => {
  log("🛠 Parsing received rawText...");
  let subs: any[] = [];
  try {
    const data = JSON.parse(rawText);
    if (data?.events) {
      subs = data.events
        .filter((ev: any) => ev.segs && ev.segs.length > 0)
        .map((ev: any) => ({
          start: ev.tStartMs / 1000,
          dur: (ev.dDurationMs || 0) / 1000,
          text: ev.segs.map((s: any) => s.utf8).join('').replace(/\n/g, ' ').trim()
        }));
    }
  } catch (e) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(rawText, "text/xml");
    const nodes = Array.from(xmlDoc.getElementsByTagName("text")).length > 0 
                  ? Array.from(xmlDoc.getElementsByTagName("text")) 
                  : Array.from(xmlDoc.getElementsByTagName("p"));
    subs = nodes.map(node => ({
      start: parseFloat(node.getAttribute("start") || (parseFloat(node.getAttribute("t") || "0") / 1000).toString()),
      dur: parseFloat(node.getAttribute("dur") || (parseFloat(node.getAttribute("d") || "0") / 1000).toString()),
      text: (node.textContent || "").replace(/&amp;/g, '&').replace(/&#39;/g, "'").trim()
    }));
  }
  const result = subs.filter(s => s.text.length > 5);
  log(`✅ Parsing complete. Found ${result.length} valid sentences.`);
  return result;
};

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "SUBTITLES_CAPTURED") {
    log("📬 Received message from Background! Updating subtitles for the current video.");
    allSubtitles = processSubtitles(message.payload);
    
    // Reset all timers based on the current time of the new video
    const video = document.querySelector('video');
    const currentTime = video ? video.currentTime : 0;
    
    nextQuizAttemptTime = currentTime + 30;
    scheduledPauseTime = -1;
    quizDataForPause = null;
    lastTime = currentTime;
    overlayContainer.style.display = 'none';
  }
});

// Listen for YouTube video navigation (SPA) to clear old data immediately
document.addEventListener('yt-navigate-start', () => {
  log("🔄 Video navigation detected. Cleaning up old data...");
  allSubtitles = [];
  scheduledPauseTime = -1;
  quizDataForPause = null;
  overlayContainer.style.display = 'none';
});

const showCCNoticeIfNeeded = () => {
  const player = document.querySelector('.html5-video-player');
  const ccButton = document.querySelector('.ytp-subtitles-button');
  
  if (player && ccButton && ccButton.getAttribute('aria-pressed') === 'false') {
    // Prevent displaying multiple duplicate notices at the same time
    if (document.getElementById('ie-cc-notice')) return;

    const notice = document.createElement('div');
    notice.id = 'ie-cc-notice';
    notice.innerText = "💡 Please turn on Subtitles (CC) for Interactive English to work!";
    notice.style.position = 'absolute';
    notice.style.top = '10%';
    notice.style.left = '50%';
    notice.style.transform = 'translate(-50%, -50%)';
    notice.style.backgroundColor = 'rgba(255, 152, 0, 0.9)';
    notice.style.color = '#fff';
    notice.style.padding = '12px 24px';
    notice.style.borderRadius = '8px';
    notice.style.zIndex = '9999';
    notice.style.fontSize = '18px';
    notice.style.fontWeight = 'bold';
    notice.style.pointerEvents = 'none';

    player.appendChild(notice);
    setTimeout(() => notice.remove(), 8000);
  }
};

// Listen for video loaded event to re-check subtitle status
document.addEventListener('yt-navigate-finish', () => {
  setTimeout(showCCNoticeIfNeeded, 2000); // Wait 2s for YouTube to update the CC button UI
});

const init = async () => {
  const video = document.querySelector('video');
  const player = document.querySelector('.html5-video-player');

  if (video && player && !document.getElementById('interactive-english-root')) {
    log("📺 Video Player is ready. Attaching Overlay...");

    showCCNoticeIfNeeded();

    // Add Toggle extension button integrated directly into YouTube's control bar
    const rightControls = document.querySelector('.ytp-right-controls');
    if (rightControls && !document.getElementById('ie-toggle-btn')) {
      const toggleBtn = document.createElement('button');
      toggleBtn.id = 'ie-toggle-btn';
      toggleBtn.className = 'ytp-button';
      toggleBtn.style.width = 'auto';
      toggleBtn.style.padding = '0 10px';
      toggleBtn.style.fontSize = '14px';
      toggleBtn.style.fontWeight = 'bold';
      toggleBtn.style.display = 'inline-flex';
      toggleBtn.style.alignItems = 'center';
      toggleBtn.style.color = '#4CAF50'; // Green when ON
      toggleBtn.innerHTML = '🧠 ON';
      toggleBtn.title = 'Toggle Interactive English';

      toggleBtn.onclick = () => {
        isExtensionActive = !isExtensionActive;
        toggleBtn.innerHTML = isExtensionActive ? '🧠 ON' : '💤 OFF';
        toggleBtn.style.color = isExtensionActive ? '#4CAF50' : '#f44336'; // Red when OFF
        
        if (!isExtensionActive) {
          scheduledPauseTime = -1;
          quizDataForPause = null;
          log("💤 Question feature paused.");
        } else {
          nextQuizAttemptTime = video.currentTime + 10;
          log("🧠 Question feature resumed.");
        }
      };
      rightControls.insertBefore(toggleBtn, rightControls.firstChild);
    }

    player.appendChild(overlayContainer);
    const root = createRoot(overlayContainer);
    
    root.render(
      <Overlay 
        onCorrectAnswer={() => {
          log("🔓 Correct answer! Continuing video.");
          overlayContainer.style.display = 'none';
          video.play();
        }}
        onSkip={() => {
          log("⏭️ Skipped question! Continuing video.");
          overlayContainer.style.display = 'none';
          video.play();
        }}
        onReplay={() => {
          log("⏪ Replaying audio...");
          // Go back 1 extra second (but not less than 0) for better context
          const replayTime = Math.max(0, currentQuizStartTime - 1);
          video.currentTime = replayTime;
          // Set lastTime to avoid triggering the seek detection logic
          lastTime = replayTime; 
          scheduledPauseTime = currentQuizEndTime;
          video.play();
        }}
      />
    );

    video.addEventListener('timeupdate', () => {
      if (!isExtensionActive) return; // If toggled off, do nothing

      const now = video.currentTime;

      // Reset if user seeks (jumps more than 2 seconds)
      if (Math.abs(now - lastTime) > 2) {
        log("🔍 Seek detected. Resetting pause schedule.");
        scheduledPauseTime = -1;
        quizDataForPause = null;
        nextQuizAttemptTime = now + 10; // Check for a quiz point 10s from new position
      }
      lastTime = now;

      // If a pause is scheduled and we've reached the time, pause and show quiz.
      if (scheduledPauseTime !== -1 && now >= scheduledPauseTime) {
        video.pause();
        
        if (quizDataForPause) {
          window.dispatchEvent(new CustomEvent('SHOW_QUIZ', { detail: quizDataForPause }));
          overlayContainer.style.display = 'block';
        }

        // Reset for the next cycle
        scheduledPauseTime = -1;
        quizDataForPause = null;
        nextQuizAttemptTime = now + INTERVAL;
        return;
      }

      // If no pause is scheduled, check if it's time to look for a new quiz point.
      if (scheduledPauseTime === -1 && now >= nextQuizAttemptTime && allSubtitles.length > 0) {
        // Check subtitle density in the recent INTERVAL (30s)
        const recentSubs = allSubtitles.filter(s => s.start >= now - INTERVAL && s.start <= now);
        const recentText = recentSubs.map(s => s.text).join(' ');
        const validRecentWords = recentText.split(' ').filter((w: string) => w.length > 2 && !w.includes('[') && !w.includes(']') && !w.includes('♪'));

        if (validRecentWords.length < 10) {
          log(`⏩ Recent segment was mostly music/silence (only ${validRecentWords.length} valid words in ${INTERVAL}s). Delaying quiz by 10s.`);
          nextQuizAttemptTime = now + 10;
          return;
        }

        // Find the subtitle that is currently playing
        const currentIndex = allSubtitles.findIndex(s => now >= s.start && now <= (s.start + s.dur));

        if (currentIndex !== -1) {
          log(`🎯 Reached ${nextQuizAttemptTime}s mark. Will pause at the end of the current sentence.`);
          
          const prevSub = allSubtitles[currentIndex - 1]?.text || "";
          const currentSubText = allSubtitles[currentIndex].text;
          const nextSub = allSubtitles[currentIndex + 1]?.text || "";

          // Ignore words that are audio labels like [Music], ♪...
          const wordsInCurrent = currentSubText.split(' ').filter((w: string) => w.length > 2 && !w.includes('[') && !w.includes(']') && !w.includes('♪'));
          const longestWord = wordsInCurrent.reduce((a: string, b: string) => a.length >= b.length ? a : b, "");
          
          if (longestWord) {
            const cleanAnswer = longestWord.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"");
            
            // Only replace the word in the current sentence, avoid RegExp to prevent issues with special characters
            const maskedCurrentSubText = currentSubText.replace(longestWord, "_________");
            const questionWithContext = `${prevSub} ${maskedCurrentSubText} ${nextSub}`.trim();

            log(`❓ Question will be: "${questionWithContext}" (Answer: "${cleanAnswer}")`);

            quizDataForPause = { 
              question: questionWithContext, 
              answer: cleanAnswer 
            };

            currentQuizStartTime = allSubtitles[currentIndex].start;
            currentQuizEndTime = allSubtitles[currentIndex].start + allSubtitles[currentIndex].dur;
            scheduledPauseTime = currentQuizEndTime;
            log(`▶️ Video will pause at ${scheduledPauseTime.toFixed(2)}s`);
          } else {
            nextQuizAttemptTime = now + 5;
          }
        }
      }
    });
  } else if (!video) {
    setTimeout(init, 1000);
  }
};

init();