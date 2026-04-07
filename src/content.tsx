import { createRoot } from 'react-dom/client';
import { Overlay } from './Overlay';

const DEBUG_MODE = true;//import.meta.env.DEV; // Tự động false khi build production
const log = (...args: any[]) => { if (DEBUG_MODE) console.log('[Content]', ...args); };

let allSubtitles: any[] = [];
let nextQuizAttemptTime = 30; 
const COOLDOWN = 15; // Thời gian nghỉ (giây) giữa 2 câu hỏi
let scheduledPauseTime = -1;
let quizDataForPause: any = null;
let lastTime = 0;
let currentQuizStartTime = 0;
let currentQuizEndTime = 0;
let isExtensionActive = true;
let lastProcessedSubtitleIndex = -1;

let wordStats: Record<string, number> = {};
let learnedWords: Set<string> = new Set();
const LEARNED_THRESHOLD = 5; // Số lần đúng để tính là đã thuộc

let targetVocabulary: Set<string> = new Set();
let currentLevel: any = "Oxford_5000_Advanced";

const overlayContainer = document.createElement('div');
overlayContainer.id = 'interactive-english-root';
overlayContainer.style.position = 'absolute';
overlayContainer.style.inset = '0';
overlayContainer.style.zIndex = '9999';
overlayContainer.style.display = 'none';

// Ngăn chặn các sự kiện chuột (click) sủi bọt (bubble up) lên player của YouTube
['click', 'mousedown', 'mouseup', 'dblclick', 'contextmenu'].forEach(eventType => {
  overlayContainer.addEventListener(eventType, (e) => {
    e.stopPropagation();
    if (eventType === 'contextmenu') e.preventDefault();
  });
});

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
    lastProcessedSubtitleIndex = -1;
    overlayContainer.style.display = 'none';
  }
});

// Listen for YouTube video navigation (SPA) to clear old data immediately
document.addEventListener('yt-navigate-start', () => {
  log("🔄 Video navigation detected. Cleaning up old data...");
  allSubtitles = [];
  scheduledPauseTime = -1;
  quizDataForPause = null;
  lastProcessedSubtitleIndex = -1;
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

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync') {
    if (changes.vocabLevel) {
      log(`🔄 Vocabulary level changed from ${changes.vocabLevel.oldValue} to ${changes.vocabLevel.newValue}`);
      currentLevel = changes.vocabLevel.newValue;
      targetVocabulary.clear(); // Xóa bộ nhớ cũ
      loadVocabulary(); // Tải lại bộ nhớ với level mới
    }
    
    if (changes.wordStats) {
      log(`🔄 Progress updated or reset.`);
      wordStats = (changes.wordStats.newValue || {}) as Record<string, number>;
      learnedWords.clear();
      for (const [word, count] of Object.entries(wordStats)) {
        if (count >= LEARNED_THRESHOLD) learnedWords.add(word);
      }
      log(`🧠 Now tracking ${learnedWords.size} learned words.`);
    }
  }
});

const loadVocabulary = async () => {
  if (targetVocabulary.size > 0) return;
  try {
    // Lấy cấp độ từ vựng do người dùng chọn và lịch sử học
    const result = await chrome.storage.sync.get(['vocabLevel', 'wordStats']);
    if (result.vocabLevel) {
      currentLevel = result.vocabLevel;
    }
    if (result.wordStats) {
      wordStats = result.wordStats as Record<string, number>;
      // Đưa những từ đạt đủ 5 lần vào danh sách đã thuộc
      for (const [word, count] of Object.entries(wordStats)) {
        if (count >= LEARNED_THRESHOLD) learnedWords.add(word);
      }
      log(`🧠 Loaded ${learnedWords.size} learned words.`);
    }

    const url = chrome.runtime.getURL('oxford_levels.json');
    const response = await fetch(url);
    const data = await response.json();
    if (data && data[currentLevel]) {
      targetVocabulary = new Set(data[currentLevel].map((w: string) => w.toLowerCase()));
      log(`📚 Loaded ${targetVocabulary.size} words for level ${currentLevel}`);
    }
  } catch (e) {
    log("❌ Error loading vocabulary:", e);
  }
};

const init = async () => {
  const video = document.querySelector('video');
  const player = document.querySelector('.html5-video-player');

  if (video && player && !document.getElementById('interactive-english-root')) {
    log("📺 Video Player is ready. Attaching Overlay...");

    showCCNoticeIfNeeded();
    await loadVocabulary();

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
          nextQuizAttemptTime = video.currentTime + COOLDOWN;
          lastProcessedSubtitleIndex = -1;
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
          
          // Lưu lại lịch sử học tập
          if (quizDataForPause && quizDataForPause.answer) {
            const w = quizDataForPause.answer.toLowerCase();
            wordStats[w] = (wordStats[w] || 0) + 1;
            log(`📈 Word "${w}" correct count: ${wordStats[w]}/${LEARNED_THRESHOLD}`);
            
            if (wordStats[w] >= LEARNED_THRESHOLD && !learnedWords.has(w)) {
              learnedWords.add(w);
              log(`🎉 Congratulations! You've mastered the word "${w}"!`);
            }
            chrome.storage.sync.set({ wordStats });
          }

          quizDataForPause = null; // Clean up
          overlayContainer.style.display = 'none';
          scheduledPauseTime = -1; // Hủy lịch dừng video của Replay (nếu có)
          video.play();
        }}
        onSkip={() => {
          log("⏭️ Skipped question! Continuing video.");
          quizDataForPause = null; // Clean up
          overlayContainer.style.display = 'none';
          scheduledPauseTime = -1; // Hủy lịch dừng video của Replay (nếu có)
          video.play();
        }}
        onReplay={() => {
          log("⏪ Replaying audio...");
          // Go back 3 extra seconds (but not less than 0) for better context
          const replayTime = Math.max(0, currentQuizStartTime - 3);
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
        nextQuizAttemptTime = now + COOLDOWN; // Set cooldown after seek
        lastProcessedSubtitleIndex = -1;
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
        nextQuizAttemptTime = now + COOLDOWN;
        return;
      }

      // If no pause is scheduled, check if it's time to look for a new quiz point.
      if (scheduledPauseTime === -1 && now >= nextQuizAttemptTime && allSubtitles.length > 0) {
        // Find the subtitle that is currently playing
        const currentIndex = allSubtitles.findIndex(s => now >= s.start && now <= (s.start + s.dur));

        // Chỉ check những câu phụ đề chưa từng được xử lý
        if (currentIndex !== -1 && currentIndex !== lastProcessedSubtitleIndex) {
          lastProcessedSubtitleIndex = currentIndex;
          log(`🎯 Hunting Mode: Checking subtitle index ${currentIndex}...`);
          
          const prevSub = allSubtitles[currentIndex - 1]?.text || "";
          const currentSubText = allSubtitles[currentIndex].text;
          const nextSub = allSubtitles[currentIndex + 1]?.text || "";

          // Ignore words that are audio labels like [Music], ♪...
          const wordsInCurrent = currentSubText.split(' ').filter((w: string) => w.length > 2 && !w.includes('[') && !w.includes(']') && !w.includes('♪'));
          
          let selectedWord = "";
          
          // Chỉ chọn từ thuộc danh sách từ vựng của level đã chọn (Oxford_3000 / Oxford_5000_Advanced)
          // VÀ CHƯA ĐƯỢC HỌC THUỘC (không nằm trong learnedWords)
          if (targetVocabulary.size > 0) {
            const targetLevelWords = wordsInCurrent.filter((w: string) => {
              const cleanW = w.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"").toLowerCase();
              return targetVocabulary.has(cleanW) && !learnedWords.has(cleanW);
            });
            
            if (targetLevelWords.length > 0) {
              selectedWord = targetLevelWords[Math.floor(Math.random() * targetLevelWords.length)];
            }
          }
          
          if (selectedWord) {
            const cleanAnswer = selectedWord.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"");
            
            // Only replace the word in the current sentence, avoid RegExp to prevent issues with special characters
            const maskedCurrentSubText = currentSubText.replace(selectedWord, "_________");
            const questionWithContext = `${prevSub} ${maskedCurrentSubText} ${nextSub}`.trim();

            log(`❓ Question will be: "${questionWithContext}" (Answer: "${cleanAnswer}")`);

            quizDataForPause = { 
              question: questionWithContext, 
              answer: cleanAnswer,
              dictionary: null // Sẽ được tải ngầm từ API
            };

            // Tải trước dữ liệu từ điển ngầm (Pre-fetch)
            fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${cleanAnswer}`)
              .then(res => res.json())
              .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                  const entry = data[0];
                  
                  let phonetic = entry.phonetic || '';
                  let audioUrl = '';
                  
                  if (entry.phonetics && entry.phonetics.length > 0) {
                    const validPhonetic = entry.phonetics.find((p: any) => p.text) || entry.phonetics[0];
                    phonetic = phonetic || validPhonetic.text || '';
                    
                    const validAudio = entry.phonetics.find((p: any) => p.audio && p.audio.length > 0);
                    if (validAudio) {
                      audioUrl = validAudio.audio;
                    }
                  }
                  
                  const meaning = entry.meanings?.[0]?.definitions?.[0]?.definition || '';
                  const partOfSpeech = entry.meanings?.[0]?.partOfSpeech || '';
                  
                  if (quizDataForPause && quizDataForPause.answer === cleanAnswer) {
                    quizDataForPause.dictionary = { phonetic, audioUrl, meaning, partOfSpeech };
                    log(`📖 Dictionary data loaded for "${cleanAnswer}"`);
                    // Dispatch event to update Overlay if it's already showing
                    window.dispatchEvent(new CustomEvent('UPDATE_DICTIONARY', { detail: quizDataForPause.dictionary }));
                  }
                }
              })
              .catch(err => log("Dictionary fetch error", err));

            currentQuizStartTime = allSubtitles[currentIndex].start;
            currentQuizEndTime = allSubtitles[currentIndex].start + allSubtitles[currentIndex].dur;
            scheduledPauseTime = currentQuizEndTime;
            log(`▶️ Target word found! Video will pause at ${scheduledPauseTime.toFixed(2)}s`);
          } else {
            // Không tìm thấy từ khó -> Bỏ qua, video tiếp tục phát bình thường
            log("⏩ No target word found. Let video play...");
          }
        }
      }
    });
  } else if (!video) {
    setTimeout(init, 1000);
  }
};

init();