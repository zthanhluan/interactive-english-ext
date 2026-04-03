import { useState, useEffect } from 'react';

interface QuizData {
  question: string;
  answer: string;
}

export const Overlay = ({ onCorrectAnswer, onSkip, onReplay }: { onCorrectAnswer: () => void, onSkip?: () => void, onReplay?: () => void }) => {
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [input, setInput] = useState('');
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [correctStreak, setCorrectStreak] = useState(0);
  const [showMilestone, setShowMilestone] = useState(false);

  useEffect(() => {
    const handleShow = (e: any) => {
      setQuiz(e.detail);
      setInput('');
      setWrongAttempts(0);
      setShowMilestone(false);
    };
    window.addEventListener('SHOW_QUIZ', handleShow);
    return () => window.removeEventListener('SHOW_QUIZ', handleShow);
  }, []);

  const handleSubmit = () => {
    if (quiz && input.trim().toLowerCase() === quiz.answer.toLowerCase()) {
      setQuiz(null);
      const newStreak = correctStreak + 1;
      setCorrectStreak(newStreak);

      if (newStreak === 10 || newStreak === 50 || newStreak === 100) {
        setShowMilestone(true);
      } else {
        onCorrectAnswer();
      }
    } else {
      setWrongAttempts(prev => prev + 1);
      setCorrectStreak(0); // Reset streak on wrong guess
    }
  };

  const handleSkip = () => {
    setQuiz(null);
    setCorrectStreak(0);
    if (onSkip) {
      onSkip();
    } else {
      onCorrectAnswer();
    }
  };

  const handleContinue = () => {
    setShowMilestone(false);
    onCorrectAnswer(); // Allow video to continue when the milestone screen is closed
  };

  if (showMilestone) {
    return (
      <div 
        onKeyDown={(e) => e.stopPropagation()}
        onKeyUp={(e) => e.stopPropagation()}
        onKeyPress={(e) => e.stopPropagation()}
        style={{
          width: '100%', height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center',
          color: 'white', fontFamily: 'Arial, sans-serif'
        }}
      >
        <h1 style={{ fontSize: '48px', margin: '0 0 20px 0', color: '#FFD700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}>🎉 CHÚC MỪNG! 🎉</h1>
        <p style={{ fontSize: '24px', marginBottom: '40px' }}>Tuyệt vời! Bạn đã trả lời đúng <strong>{correctStreak} câu liên tiếp</strong>! 🧠🔥</p>
        
        <div style={{ display: 'flex', gap: '20px', flexDirection: 'column', alignItems: 'center' }}>
          <a 
            href="https://www.buymeacoffee.com/zthanhluan" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              padding: '15px 40px', fontSize: '20px', borderRadius: '40px',
              backgroundColor: '#FF813F', color: 'white', textDecoration: 'none',
              fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px',
              boxShadow: '0 6px 20px rgba(255, 129, 63, 0.4)', transition: 'transform 0.2s'
            }}
          >
            ☕ Love this tool? Buy me a coffee!
          </a>
          
          <button
            onClick={handleContinue}
            style={{
              padding: '10px 25px', fontSize: '18px', borderRadius: '30px', marginTop: '15px',
              border: '2px solid rgba(255,255,255,0.5)', backgroundColor: 'transparent', color: 'white',
              cursor: 'pointer', transition: '0.3s'
            }}
          >
        Continue learning
          </button>
        </div>
      </div>
    );
  }

  if (!quiz) return null;

  const generateHint = () => {
    const ans = quiz.answer;
    const len = ans.length;
    let hintArr = Array(len).fill('_');

    if (wrongAttempts >= 1) hintArr[0] = ans[0];
    if (wrongAttempts >= 2 && len > 1) hintArr[len - 1] = ans[len - 1];
    if (wrongAttempts >= 3 && len > 2) {
      const mid = Math.floor(len / 2);
      hintArr[mid] = ans[mid];
    }
    
    // Show additional characters that the user entered in the correct position
    for (let i = 0; i < len; i++) {
      if (input[i] && input[i].toLowerCase() === ans[i].toLowerCase()) {
        hintArr[i] = ans[i];
      }
    }

    return hintArr.join(' ');
  };

  return (
    <div 
      onKeyDown={(e) => e.stopPropagation()}
      onKeyUp={(e) => e.stopPropagation()}
      onKeyPress={(e) => e.stopPropagation()}
      style={{
        width: '100%', height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(5px)',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        color: 'white', fontFamily: 'Arial, sans-serif'
      }}
    >
      <div style={{ maxWidth: '80%', textAlign: 'center', marginBottom: '30px' }}>
        <p style={{ fontSize: '18px', opacity: 0.8, marginBottom: '10px' }}>LISTEN & FILL THE BLANK</p>
        <h2 style={{ fontSize: '28px', lineHeight: '1.4' }}>"{quiz.question}"</h2>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') handleSubmit();
            if (e.key === 'Escape') handleSkip();
            if (e.ctrlKey && e.key === ' ') {
              e.preventDefault();
              if (onReplay) onReplay();
            }
          }}
          placeholder="Type answer (Ctrl+Space to replay)"
          style={{
            padding: '12px 20px', fontSize: '20px', borderRadius: '30px',
            border: '2px solid #4CAF50', backgroundColor: 'white', color: 'black',
            outline: 'none', width: '350px'
          }}
        />
        <button
          onClick={handleSubmit}
          style={{
            padding: '12px 30px', fontSize: '18px', borderRadius: '30px',
            border: 'none', backgroundColor: '#4CAF50', color: 'white',
            fontWeight: 'bold', cursor: 'pointer', transition: '0.3s'
          }}
        >
          CHECK
        </button>
        <button
          onClick={onReplay}
          style={{
            padding: '12px 30px', fontSize: '18px', borderRadius: '30px',
            border: 'none', backgroundColor: '#2196F3', color: 'white',
            fontWeight: 'bold', cursor: 'pointer', transition: '0.3s'
          }}
        >
          REPLAY
        </button>
        <button
          onClick={handleSkip}
          style={{
            padding: '12px 30px', fontSize: '18px', borderRadius: '30px',
            border: 'none', backgroundColor: '#f44336', color: 'white',
            fontWeight: 'bold', cursor: 'pointer', transition: '0.3s'
          }}
        >
          SKIP
        </button>
      </div>

      <p style={{ marginTop: '20px', color: '#ffeb3b', fontSize: '24px', letterSpacing: '4px', minHeight: '35px', visibility: wrongAttempts > 0 ? 'visible' : 'hidden' }}>
        💡 Hint: <strong>{generateHint()}</strong> <span style={{fontSize: '16px', letterSpacing: 'normal', opacity: 0.8}}>(length: {quiz.answer.length})</span>
      </p>
    </div>
  );
};