import { useState, useEffect } from 'react';

function App() {
  const [level, setLevel] = useState("Oxford_5000_Advanced");
  const [masteredCount, setMasteredCount] = useState(0);

  useEffect(() => {
    chrome.storage.sync.get(['vocabLevel', 'wordStats']).then((result) => {
      if (result.vocabLevel) setLevel(result.vocabLevel as string);
      if (result.wordStats) {
        const stats = result.wordStats as Record<string, number>;
        const count = Object.values(stats).filter(v => v >= 5).length; // 5 là LEARNED_THRESHOLD
        setMasteredCount(count);
      }
    });
  }, []);

  const handleLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLevel = e.target.value;
    setLevel(newLevel);
    chrome.storage.sync.set({ vocabLevel: newLevel });
  };

  const handleResetProgress = () => {
    if (window.confirm("Are you sure you want to reset all your learned words?")) {
      chrome.storage.sync.remove(['wordStats']).then(() => {
        setMasteredCount(0);
      });
    }
  };

  return (
    <div style={{
      padding: '16px',
      width: '100%',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
      boxSizing: 'border-box',
      background: '#282c34',
      color: '#e6e6e6'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '18px' }}>
        <h1 style={{
          fontSize: '22px',
          color: '#61dafb',
          margin: '0 0 5px 0',
          fontWeight: 600
        }}>
          Interactive English
        </h1>
        <p style={{
          fontSize: '14px',
          color: '#abb2bf',
          margin: 0,
          lineHeight: '1.4'
        }}>
          Level up your English on YouTube!
        </p>
      </div>
      
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '18px'
      }}>
        <h2 style={{
          fontSize: '16px', margin: '0 0 10px 0', color: '#98c379',
          fontWeight: 600, borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          paddingBottom: '8px'
        }}>
          How to Use
        </h2>
        <ul style={{ fontSize: '14px', textAlign: 'left', paddingLeft: '20px', margin: '10px 0 0 0', color: '#abb2bf', lineHeight: '1.7' }}>
          <li>Open a YouTube video with subtitles.</li>
          <li>Turn on the <strong>CC</strong> button in the player.</li>
          <li>The video will pause for a fill-in-the-blank quiz!</li>
        </ul>
      </div>

      <div style={{ marginBottom: '18px' }}>
        <label htmlFor="level-select" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#98c379', fontWeight: 600 }}>
          Vocabulary Level
        </label>
        <select 
          id="level-select"
          value={level}
          onChange={handleLevelChange}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '4px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            outline: 'none',
            fontSize: '14px'
          }}
        >
          <option value="Oxford_3000" style={{ color: '#000' }}>Oxford 3000 (Intermediate)</option>
          <option value="Oxford_5000_Advanced" style={{ color: '#000' }}>Oxford 5000 (Advanced)</option>
        </select>
      </div>

      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '18px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: '#abb2bf', fontWeight: 600 }}>Mastered Words:</span>
          <strong style={{ fontSize: '18px', color: '#FFD700' }}>{masteredCount} 🏆</strong>
        </div>
        <button 
          onClick={handleResetProgress}
          style={{
            width: '100%', marginTop: '12px', padding: '8px', fontSize: '12px',
            backgroundColor: 'transparent', border: '1px solid #e06c75', color: '#e06c75',
            borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s', fontWeight: 'bold'
          }}
          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#e06c75'; e.currentTarget.style.color = '#282c34'; }}
          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#e06c75'; }}
        >
          Reset Progress
        </button>
      </div>

      <a 
        href="https://www.buymeacoffee.com/zthanhluan" 
        target="_blank" 
        rel="noopener noreferrer"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
          padding: '12px 16px', fontSize: '14px', borderRadius: '8px',
          backgroundColor: '#e06c75', color: '#282c34', textDecoration: 'none',
          fontWeight: 'bold', width: '100%', boxSizing: 'border-box', whiteSpace: 'nowrap',
          transition: 'opacity 0.2s'
        }}
        onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
        onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
      >
        ☕ Buy me a coffee!
      </a>
    </div>
  )
}

export default App
