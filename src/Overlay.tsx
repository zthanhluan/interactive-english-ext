import { useState, useEffect, useRef } from 'react';

interface QuizData {
  question: string;
  answer: string;
  dictionary?: {
    phonetic: string;
    audioUrl: string;
    meaning: string;
    partOfSpeech: string;
  } | null;
}

export const Overlay = ({ onCorrectAnswer, onSkip, onReplay }: { onCorrectAnswer: () => void, onSkip?: () => void, onReplay?: () => void }) => {
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [input, setInput] = useState('');
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [correctStreak, setCorrectStreak] = useState(0);
  const [showMilestone, setShowMilestone] = useState(false);
  const [revealedAnswer, setRevealedAnswer] = useState(false);
  const [showMeaning, setShowMeaning] = useState(false);
  const currentQuestionRef = useRef<string | null>(null);

  useEffect(() => {
    const handleShow = (e: any) => {
      // Chỉ reset trạng thái nếu đây là một câu hỏi mới hoàn toàn
      if (currentQuestionRef.current !== e.detail.question) {
        setInput('');
        setWrongAttempts(0);
        setShowMilestone(false);
        setRevealedAnswer(false);
        setShowMeaning(false);
        currentQuestionRef.current = e.detail.question;
      }
      setQuiz(e.detail);
    };
    window.addEventListener('SHOW_QUIZ', handleShow);
    return () => window.removeEventListener('SHOW_QUIZ', handleShow);
  }, []);

  useEffect(() => {
    const handleUpdateDictionary = (e: any) => {
      setQuiz(prev => {
        if (prev) {
          return { ...prev, dictionary: e.detail };
        }
        return prev;
      });
    };
    window.addEventListener('UPDATE_DICTIONARY', handleUpdateDictionary);
    return () => window.removeEventListener('UPDATE_DICTIONARY', handleUpdateDictionary);
  }, []);

  const handleSubmit = () => {
    if (revealedAnswer) return;
    if (quiz && input.trim().toLowerCase() === quiz.answer.toLowerCase()) {
      const newStreak = correctStreak + 1;
      setCorrectStreak(newStreak);
      setShowMeaning(true);
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
      setShowMeaning(true);
    }, 2000); // Đợi 2 giây để người xem nhìn thấy đáp án rồi hiện giải nghĩa
  };

  const handleContinueFromMeaning = () => {
    setShowMeaning(false);
    setQuiz(null);
    currentQuestionRef.current = null;
    if (correctStreak === 10 || correctStreak === 50 || correctStreak === 100) {
      setShowMilestone(true);
    } else {
      // Nếu vừa ấn skip, correctStreak bằng 0
      if (correctStreak === 0 && onSkip) {
        onSkip();
      } else {
        onCorrectAnswer();
      }
    }
  };

  const playAudio = () => {
    if (quiz?.dictionary?.audioUrl) {
      new Audio(quiz.dictionary.audioUrl).play();
    } else if (quiz?.answer) {
      // Dự phòng bằng Web Speech API nếu Dictionary không có audio
      const utterance = new SpeechSynthesisUtterance(quiz.answer);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
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
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        style={{
          width: '100%', height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center',
          color: 'white', fontFamily: 'Arial, sans-serif'
        }}
      >
        <h1 style={{ fontSize: 'clamp(28px, 6vw, 48px)', margin: '0 0 20px 0', color: '#FFD700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)', textAlign: 'center' }}>🎉 CONGRATULATIONS! 🎉</h1>
        <p style={{ fontSize: 'clamp(16px, 4vw, 24px)', marginBottom: '40px', textAlign: 'center', maxWidth: '90%' }}>Awesome! You've got <strong>{correctStreak} correct in a row</strong>! 🧠🔥</p>
        
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

  if (showMeaning && quiz) {
    return (
      <div 
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') handleContinueFromMeaning();
        }}
        onKeyUp={(e) => e.stopPropagation()}
        onKeyPress={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        style={{
          width: '100%', height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center',
          color: 'white', fontFamily: 'Arial, sans-serif'
        }}
      >
        <h1 style={{ fontSize: 'clamp(28px, 6vw, 48px)', margin: '0 0 10px 0', color: correctStreak > 0 ? '#4CAF50' : '#FF9800', textShadow: `0 0 10px ${correctStreak > 0 ? 'rgba(76, 175, 80, 0.5)' : 'rgba(255, 152, 0, 0.5)'}`, textAlign: 'center' }}>
          {correctStreak > 0 ? '🎉 Correct!' : '💡 Word Meaning'}
        </h1>
        
        <div style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.1)', 
          padding: '30px 40px', 
          borderRadius: '16px',
          marginTop: '10px',
          textAlign: 'center',
          maxWidth: '80%',
          minWidth: '300px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', marginBottom: '15px' }}>
            <span style={{ fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 'bold', color: '#FFD700', textTransform: 'capitalize' }}>
              {quiz.answer}
            </span>
            <button 
              onClick={playAudio}
              style={{
                background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer',
                padding: '8px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', width: '45px', height: '45px',
                transition: '0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'}
              title="Play Pronunciation"
            >
              🔊
            </button>
          </div>

          {quiz.dictionary ? (
            <>
              <p style={{ fontSize: '20px', color: '#aaa', margin: '0 0 15px 0' }}>
                {quiz.dictionary.phonetic} <span style={{ fontStyle: 'italic', color: '#bbb' }}>({quiz.dictionary.partOfSpeech})</span>
              </p>
              <p style={{ fontSize: 'clamp(18px, 3vw, 24px)', lineHeight: '1.5', margin: 0 }}>
                {quiz.dictionary.meaning}
              </p>
            </>
          ) : (
            <p style={{ fontSize: '18px', color: '#aaa', margin: 0, fontStyle: 'italic' }}>
              No definition found or loading...
            </p>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', marginTop: '25px' }}>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => {
                const url = `https://translate.google.com/?sl=en&tl=vi&text=${encodeURIComponent(quiz.answer)}&op=translate`;
                window.open(url, '_blank');
              }}
              style={{
                padding: '10px 20px', fontSize: '16px', borderRadius: '30px',
                border: '1px solid rgba(255, 255, 255, 0.4)', backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'white',
                cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '8px'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
            >
              🌍 Translate Word
            </button>

            <button
              onClick={() => {
                const fullSentence = quiz.question.replace(/_+/, quiz.answer);
                const url = `https://translate.google.com/?sl=en&tl=vi&text=${encodeURIComponent(fullSentence)}&op=translate`;
                window.open(url, '_blank');
              }}
              style={{
                padding: '10px 20px', fontSize: '16px', borderRadius: '30px',
                border: '1px solid rgba(255, 255, 255, 0.4)', backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'white',
                cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '8px'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
              title="Translate full sentence"
            >
              🌐 Translate Sentence
            </button>
          </div>

          <button
            autoFocus
            onClick={handleContinueFromMeaning}
            style={{
              padding: '12px 35px', fontSize: '20px', borderRadius: '30px',
              border: 'none', backgroundColor: '#2196F3', color: 'white', fontWeight: 'bold',
              cursor: 'pointer', transition: '0.3s', boxShadow: '0 4px 15px rgba(33, 150, 243, 0.4)'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            Continue (Press Enter)
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
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
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

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', width: '100%', maxWidth: '500px' }}>
        
        {/* Primary Action Row: Input & Check */}
        <div style={{ display: 'flex', gap: '10px', width: '100%', justifyContent: 'center', flexWrap: 'wrap', padding: '0 10px', boxSizing: 'border-box' }}>
          <input
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (revealedAnswer) return;
              if (e.key === 'Escape') handleSkip();
              if (e.ctrlKey && e.key === ' ') {
                e.preventDefault();
                if (onReplay) onReplay();
              }
              if (e.key === 'Enter') e.preventDefault();
            }}
            onKeyUp={(e) => {
              e.stopPropagation();
              if (revealedAnswer) return;
              if (e.key === 'Enter') handleSubmit();
            }}
            placeholder="Type answer (Ctrl+Space to replay)"
            disabled={revealedAnswer}
            style={{
              padding: '12px 20px', fontSize: '20px', borderRadius: '30px',
              border: `2px solid ${revealedAnswer ? '#f44336' : '#4CAF50'}`,
              backgroundColor: revealedAnswer ? '#ffebee' : 'white',
              color: revealedAnswer ? '#d32f2f' : 'black',
              fontWeight: revealedAnswer ? 'bold' : 'normal',
              outline: 'none', flex: '1 1 auto', maxWidth: '300px', minWidth: '220px', boxSizing: 'border-box'
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={revealedAnswer}
            style={{
              padding: '10px 25px', fontSize: '16px', borderRadius: '30px',
              border: 'none', backgroundColor: '#4CAF50', color: 'white',
              fontWeight: 'bold', cursor: revealedAnswer ? 'not-allowed' : 'pointer',
              opacity: revealedAnswer ? 0.5 : 1, transition: '0.3s'
            }}
          >
            CHECK
          </button>
        </div>

        {/* Secondary Action Row: Replay, Skip, Help */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={onReplay}
            disabled={revealedAnswer}
            style={{
              padding: '8px 16px', fontSize: '14px', borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.3)', backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'white',
              fontWeight: 'bold', cursor: revealedAnswer ? 'not-allowed' : 'pointer',
              opacity: revealedAnswer ? 0.5 : 1, transition: '0.2s', display: 'flex', alignItems: 'center', gap: '5px'
            }}
            onMouseOver={(e) => !revealedAnswer && (e.currentTarget.style.backgroundColor = 'rgba(33, 150, 243, 0.4)')}
            onMouseOut={(e) => !revealedAnswer && (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)')}
          >
            ⏪ REPLAY
          </button>
          <button
            onClick={handleSkip}
            disabled={revealedAnswer}
            style={{
              padding: '8px 16px', fontSize: '14px', borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.3)', backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'white',
              fontWeight: 'bold', cursor: revealedAnswer ? 'not-allowed' : 'pointer',
              opacity: revealedAnswer ? 0.5 : 1, transition: '0.2s', display: 'flex', alignItems: 'center', gap: '5px'
            }}
            onMouseOver={(e) => !revealedAnswer && (e.currentTarget.style.backgroundColor = 'rgba(244, 67, 54, 0.4)')}
            onMouseOut={(e) => !revealedAnswer && (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)')}
          >
            ⏭️ SKIP
          </button>
          <button
            onClick={() => {
              const fullSentence = quiz.question.replace(/_+/, quiz.answer);
              const url = `https://translate.google.com/?sl=en&tl=vi&text=${encodeURIComponent(fullSentence)}&op=translate`;
              window.open(url, '_blank');
            }}
            disabled={revealedAnswer}
            style={{
              padding: '8px 16px', fontSize: '14px', borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.3)', backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'white',
              fontWeight: 'bold', cursor: revealedAnswer ? 'not-allowed' : 'pointer',
              opacity: revealedAnswer ? 0.5 : 1, transition: '0.2s', display: 'flex', alignItems: 'center', gap: '5px'
            }}
            onMouseOver={(e) => !revealedAnswer && (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)')}
            onMouseOut={(e) => !revealedAnswer && (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)')}
            title="Translate full sentence"
          >
            🌐 HELP
          </button>
        </div>
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