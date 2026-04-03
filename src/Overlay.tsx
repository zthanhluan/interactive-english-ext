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
  const [revealedAnswer, setRevealedAnswer] = useState(false);

  useEffect(() => {
    const handleShow = (e: any) => {
      setQuiz(e.detail);
      setInput('');
      setWrongAttempts(0);
      setShowMilestone(false);
      setRevealedAnswer(false);
    };
    window.addEventListener('SHOW_QUIZ', handleShow);
    return () => window.removeEventListener('SHOW_QUIZ', handleShow);
  }, []);

  const handleSubmit = () => {
    if (revealedAnswer) return;
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
    if (!quiz || revealedAnswer) return;
    setRevealedAnswer(true);
    setInput(quiz.answer); // Tự động điền đáp án đúng
    setCorrectStreak(0);

    setTimeout(() => {
      setRevealedAnswer(false);
      setQuiz(null);
      if (onSkip) {
        onSkip();
      } else {
        onCorrectAnswer();
      }
    }, 3000); // Đợi 3 giây trước khi tiếp tục
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
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center',
          color: 'white', fontFamily: 'Arial, sans-serif'
        }}
      >
        <h1 style={{ fontSize: 'clamp(28px, 6vw, 48px)', margin: '0 0 20px 0', color: '#FFD700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)', textAlign: 'center' }}>🎉 CHÚC MỪNG! 🎉</h1>
        <p style={{ fontSize: 'clamp(16px, 4vw, 24px)', marginBottom: '40px', textAlign: 'center', maxWidth: '90%' }}>Tuyệt vời! Bạn đã trả lời đúng <strong>{correctStreak} câu liên tiếp</strong>! 🧠🔥</p>
        
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
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      style={{
        width: '100%', height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(5px)',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        color: 'white', fontFamily: 'Arial, sans-serif'
      }}
    >
      <div style={{ maxWidth: '95%', textAlign: 'center', marginBottom: '30px' }}>
        <p style={{ fontSize: 'clamp(14px, 3vw, 18px)', opacity: 0.8, marginBottom: '10px' }}>LISTEN & FILL THE BLANK</p>
        <h2 style={{ fontSize: 'clamp(18px, 4vw, 28px)', lineHeight: '1.4' }}>"{quiz.question}"</h2>
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '95%' }}>
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (revealedAnswer) return;
            if (e.key === 'Enter') handleSubmit();
            if (e.key === 'Escape') handleSkip();
            if (e.ctrlKey && e.key === ' ') {
              e.preventDefault();
              if (onReplay) onReplay();
            }
          }}
          placeholder="Type answer (Ctrl+Space to replay)"
          disabled={revealedAnswer}
          style={{
            padding: '12px 20px', fontSize: '20px', borderRadius: '30px',
            border: `2px solid ${revealedAnswer ? '#f44336' : '#4CAF50'}`,
            backgroundColor: revealedAnswer ? '#ffebee' : 'white',
            color: revealedAnswer ? '#d32f2f' : 'black',
            fontWeight: revealedAnswer ? 'bold' : 'normal',
            outline: 'none', width: '100%', maxWidth: '350px', minWidth: '200px', boxSizing: 'border-box'
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={revealedAnswer}
          style={{
            padding: '10px 20px', fontSize: '16px', borderRadius: '30px',
            border: 'none', backgroundColor: '#4CAF50', color: 'white',
            fontWeight: 'bold', cursor: revealedAnswer ? 'not-allowed' : 'pointer',
            opacity: revealedAnswer ? 0.5 : 1, transition: '0.3s'
          }}
        >
          CHECK
        </button>
        <button
          onClick={onReplay}
          disabled={revealedAnswer}
          style={{
            padding: '10px 20px', fontSize: '16px', borderRadius: '30px',
            border: 'none', backgroundColor: '#2196F3', color: 'white',
            fontWeight: 'bold', cursor: revealedAnswer ? 'not-allowed' : 'pointer',
            opacity: revealedAnswer ? 0.5 : 1, transition: '0.3s'
          }}
        >
          REPLAY
        </button>
        <button
          onClick={handleSkip}
          disabled={revealedAnswer}
          style={{
            padding: '10px 20px', fontSize: '16px', borderRadius: '30px',
            border: 'none', backgroundColor: '#f44336', color: 'white',
            fontWeight: 'bold', cursor: revealedAnswer ? 'not-allowed' : 'pointer',
            opacity: revealedAnswer ? 0.5 : 1, transition: '0.3s'
          }}
        >
          SKIP
        </button>
      </div>

      <p style={{ marginTop: '20px', color: revealedAnswer ? '#f44336' : '#ffeb3b', fontSize: 'clamp(16px, 4vw, 24px)', letterSpacing: '4px', minHeight: '35px', visibility: (wrongAttempts > 0 || revealedAnswer) ? 'visible' : 'hidden', textAlign: 'center', maxWidth: '95%' }}>
        {revealedAnswer ? (
          <><span style={{letterSpacing: 'normal'}}>❌ The correct answer is:</span> <strong style={{ letterSpacing: 'normal' }}>{quiz.answer}</strong></>
        ) : (
          <>💡 Hint: <strong>{generateHint()}</strong> <span style={{fontSize: '16px', letterSpacing: 'normal', opacity: 0.8}}>(length: {quiz.answer.length})</span></>
        )}
      </p>
    </div>
  );
};