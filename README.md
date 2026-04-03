# Interactive English Extension 🧠📺

Level up your English on YouTube! This Chrome Extension automatically pauses YouTube videos and gives you fill-in-the-blank quizzes based on the closed captions (CC).

## ✨ Features

- **Automatic Subtitle Processing:** Silently intercepts YouTube's subtitle API to generate learning material on the fly.
- **Smart Pausing:** Analyzes subtitle density and pauses the video at appropriate times to ask questions.
- **Fill-in-the-Blank Quizzes:** Challenges you to type the missing word from the currently spoken sentence.
- **Gamification & Streaks:** Keeps track of your correct answer streak and rewards you with celebratory milestones (10, 50, 100 in a row).
- **In-Player Controls:** Toggle the extension ON/OFF directly from the YouTube player control bar.
- **Debug Mode:** Easy to toggle console logs for development.

## 🛠️ Tech Stack

- React
- TypeScript
- Vite
- CRXJS Vite Plugin

## 🚀 Installation & Development

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd interactive-english-ext
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run in development mode:**
   ```bash
   npm run dev
   ```
   *This will generate a `dist` folder that updates automatically as you save files.*

4. **Load into Chrome:**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable **Developer mode** (top right corner).
   - Click **Load unpacked** and select the `dist` folder generated in step 3.

5. **Build for production:**
   ```bash
   npm run build
   ```
   *This will compile and minify the files into the `dist` folder, ready to be zipped and uploaded to the Chrome Web Store.*

## 💡 How to Use

1. Open any YouTube video that has subtitles available.
2. Turn on the **CC** button in the YouTube player.
3. Make sure the extension is toggled **ON** (look for the 🧠 icon in the YouTube controls).
4. Watch the video. It will pause periodically and prompt you to fill in the blank!
