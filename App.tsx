
import React, { useState, useRef, useEffect } from 'react';
import { GameStage, GameState, DifferenceLocation, UserClick } from './types';
import { GeminiService } from './services/geminiService';
import Button from './components/Button';
import MemeIllustration from './components/MemeIllustration';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    originalImage: null,
    modifiedImage: null,
    differences: [],
    stage: GameStage.UPLOAD,
    error: null,
    userClicks: [],
  });

  const [totalStars, setTotalStars] = useState(0);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'hint', message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const calculateStars = () => {
    const misses = gameState.userClicks.filter(c => c.type === 'miss').length;
    if (misses <= 1) return 3;
    if (misses <= 3) return 2;
    return 1;
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setGameState(prev => ({ ...prev, stage: GameStage.LOADING, error: null, userClicks: [] }));

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      if (!base64) {
        setGameState(prev => ({ ...prev, stage: GameStage.UPLOAD, error: "Failed to read file." }));
        return;
      }

      setGameState(prev => ({ ...prev, originalImage: base64 }));
      
      try {
        const service = new GeminiService();
        const { modifiedImage, differences } = await service.generateGameData(base64);
        
        if (!modifiedImage || (differences.length === 0 && modifiedImage !== base64)) {
          if (differences.length === 0) {
             throw new Error("The AI failed to create detectable differences. Please try again.");
          }
        }

        setGameState(prev => ({
          ...prev,
          modifiedImage,
          differences,
          stage: GameStage.STAGE1_QUESTION
        }));
      } catch (err: any) {
        console.error("Game Generation Error:", err);
        setGameState(prev => ({ 
          ...prev, 
          stage: GameStage.UPLOAD, 
          error: err.message || "The AI had a hiccup! Please try a different image or try again." 
        }));
      }
    };

    reader.onerror = () => {
      setGameState(prev => ({ ...prev, stage: GameStage.UPLOAD, error: "Error reading file from your device." }));
    };

    reader.readAsDataURL(file);
  };

  const checkAnswer = (selected: number) => {
    const correct = gameState.differences.length;
    const adjustedCorrect = correct > 3 ? 3 : correct;

    if (selected === adjustedCorrect) {
      setFeedback({ type: 'success', message: "Spot on! You noticed the changes!" });
      setTimeout(() => {
        setFeedback(null);
        if (correct === 0) {
          setTotalStars(prev => prev + 3);
          setGameState(prev => ({ ...prev, stage: GameStage.RESULT }));
        } else {
          setGameState(prev => ({ ...prev, stage: GameStage.STAGE2_SPOTTING }));
        }
      }, 1500);
    } else {
      setFeedback({ type: 'error', message: `Not quite! Check the modified image again.` });
      setTimeout(() => setFeedback(null), 1500);
    }
  };

  const handleSpotClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    const hitRadius = 10; 
    let hitDiffId: string | null = null;
    let nearMiss = false;
    
    const newDiffs = gameState.differences.map(diff => {
      if (diff.found) return diff;
      const distance = Math.sqrt(Math.pow(clickX - diff.x, 2) + Math.pow(clickY - diff.y, 2));
      
      if (distance < hitRadius) {
        hitDiffId = diff.id;
        return { ...diff, found: true };
      } else if (distance < hitRadius * 2) {
        nearMiss = true;
      }
      return diff;
    });

    const newClick: UserClick = {
      id: Date.now(),
      x: clickX,
      y: clickY,
      type: hitDiffId ? 'hit' : 'miss'
    };

    setGameState(prev => ({
      ...prev,
      differences: newDiffs,
      userClicks: [...prev.userClicks, newClick]
    }));

    if (hitDiffId) {
      const allFound = newDiffs.every(d => d.found);
      if (allFound) {
        setFeedback({ type: 'success', message: "Incredible! You found all the changes!" });
        const starsEarned = calculateStars();
        setTotalStars(prev => prev + starsEarned);
        setTimeout(() => {
          setFeedback(null);
          setGameState(prev => ({ ...prev, stage: GameStage.RESULT }));
        }, 2000);
      }
    } else if (nearMiss) {
       setFeedback({ type: 'hint', message: "Almost there! You clicked right next to it!" });
       setTimeout(() => setFeedback(null), 1000);
    }
  };

  const restart = () => {
    setGameState({
      originalImage: null,
      modifiedImage: null,
      differences: [],
      stage: GameStage.UPLOAD,
      error: null,
      userClicks: [],
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const missesCount = gameState.userClicks.filter(c => c.type === 'miss').length;
  const starsEarned = calculateStars();

  // Dynamic container width based on stage
  const mainMaxWidth = (gameState.stage === GameStage.STAGE1_QUESTION || gameState.stage === GameStage.STAGE2_SPOTTING) 
    ? 'max-w-6xl' 
    : 'max-w-2xl';

  return (
    <div className="min-h-screen bg-[#f7f7f7] text-[#4b4b4b] p-4 flex flex-col items-center select-none overflow-x-hidden">
      {/* Header */}
      <header className={`w-full ${mainMaxWidth} flex items-center justify-between mb-8 pb-4 border-b-2 border-[#e5e5e5] transition-all duration-500`}>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-[#1cb0f6] rounded-xl flex items-center justify-center text-white text-xl font-black shadow-sm">
            <i className="fas fa-search"></i>
          </div>
          <h1 className="text-2xl font-extrabold text-[#1cb0f6] tracking-tight">Spot The Difference</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-white border-2 border-[#e5e5e5] px-3 py-1 rounded-2xl shadow-sm">
             <i className="fas fa-star text-[#ffc800]"></i>
             <span className="font-bold">{totalStars}</span>
          </div>
        </div>
      </header>

      <main className={`w-full ${mainMaxWidth} flex flex-col items-center pb-12 transition-all duration-500`}>
        
        {/* UPLOAD STAGE */}
        {gameState.stage === GameStage.UPLOAD && (
          <div className="bg-white rounded-3xl p-8 border-2 border-[#e5e5e5] shadow-sm w-full text-center">
            <div className="mb-6">
              <div className="w-24 h-24 bg-[#e1f5fe] rounded-full mx-auto flex items-center justify-center text-[#1cb0f6] text-4xl mb-4">
                <i className="fas fa-cloud-upload-alt"></i>
              </div>
              <h2 className="text-2xl font-extrabold mb-2 text-[#3c3c3c]">Create Your Puzzle</h2>
              <p className="text-[#777] font-semibold">Upload an image and the AI will hide clear differences for you to find!</p>
            </div>
            
            {gameState.error && (
              <div className="mb-6 p-4 bg-[#ffdfe0] text-[#ea2b2b] rounded-2xl font-bold border-2 border-[#ffc1c2] flex items-center gap-3 text-left">
                <i className="fas fa-exclamation-circle text-xl flex-shrink-0"></i>
                <span>{gameState.error}</span>
              </div>
            )}

            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload} 
            />
            <Button fullWidth variant="primary" onClick={handleUploadClick}>
              <i className="fas fa-image"></i>
              Choose Image
            </Button>
          </div>
        )}

        {/* LOADING STAGE */}
        {gameState.stage === GameStage.LOADING && (
          <div className="flex flex-col items-center gap-6 mt-12 w-full text-center">
            <div className="w-24 h-24 relative animate-bounce flex items-center justify-center bg-white rounded-full border-4 border-[#1cb0f6] shadow-lg">
                <i className="fas fa-robot text-[#1cb0f6] text-4xl"></i>
            </div>
            <div>
              <h2 className="text-2xl font-extrabold mb-2 text-[#3c3c3c]">Crafting Differences...</h2>
              <p className="text-[#777] font-semibold animate-pulse italic">Using Vision AI to verify and perfect your puzzle.</p>
              <div className="mt-8 w-64 h-3 bg-[#e5e5e5] rounded-full overflow-hidden mx-auto shadow-inner">
                <div className="h-full bg-[#1cb0f6] animate-[shimmer_2s_infinite] w-1/2 rounded-full"></div>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 1: QUESTION */}
        {gameState.stage === GameStage.STAGE1_QUESTION && (
          <div className="w-full">
             <div className="bg-white rounded-3xl p-6 md:p-10 border-2 border-[#e5e5e5] shadow-sm mb-6">
                <h2 className="text-3xl font-extrabold mb-10 text-center text-[#3c3c3c]">How many changes do you see?</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                   <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-xs font-black uppercase tracking-widest text-[#afafaf]">Original Image</span>
                      </div>
                      <div className="relative rounded-2xl overflow-hidden border-2 border-[#e5e5e5] shadow-sm bg-gray-50 aspect-video md:aspect-auto">
                        <img src={gameState.originalImage!} alt="Original" className="w-full h-full object-contain md:h-auto" />
                      </div>
                   </div>
                   <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-xs font-black uppercase tracking-widest text-[#1cb0f6]">Modified Image</span>
                      </div>
                      <div className="relative rounded-2xl overflow-hidden border-4 border-[#1cb0f6] shadow-xl bg-gray-50 aspect-video md:aspect-auto">
                        <img src={gameState.modifiedImage!} alt="Modified" className="w-full h-full object-contain md:h-auto" />
                      </div>
                   </div>
                </div>

                <div className="max-w-xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[0, 1, 2, 3].map(val => (
                    <Button key={val} variant="ghost" className="!text-[#4b4b4b] border-b-4 hover:border-b-0 active:translate-y-1 py-4 text-lg" onClick={() => checkAnswer(val)}>
                      {val === 0 ? "No changes" : val === 1 ? "Exactly 1" : val === 2 ? "2 changes" : "3 changes"}
                    </Button>
                  ))}
                </div>
             </div>
          </div>
        )}

        {/* STAGE 2: SPOTTING */}
        {gameState.stage === GameStage.STAGE2_SPOTTING && (
          <div className="w-full flex flex-col items-center">
             <div className="bg-white rounded-3xl p-6 md:p-8 border-2 border-[#e5e5e5] shadow-sm w-full mb-6">
                <div className="flex justify-between items-center mb-6 px-1">
                   <h2 className="text-2xl font-black text-[#3c3c3c]">Find them all!</h2>
                   <div className="flex gap-2">
                     <div className="bg-[#fff5f5] text-[#ff4b4b] px-4 py-2 rounded-full font-extrabold text-sm border-2 border-[#ffd6d6] shadow-sm flex items-center gap-2">
                        <i className="fas fa-times"></i>
                        Mistakes: {missesCount}
                     </div>
                     <div className="bg-[#e1f5fe] text-[#1cb0f6] px-4 py-2 rounded-full font-extrabold text-sm border-2 border-[#b3e5fc] shadow-sm flex items-center gap-2">
                        <i className="fas fa-bullseye"></i>
                        Found: {gameState.differences.filter(d => d.found).length} / {gameState.differences.length}
                     </div>
                   </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-10">
                  <div className="flex-1 flex flex-col gap-2">
                    <span className="text-[10px] font-bold uppercase text-[#afafaf] tracking-widest bg-[#f7f7f7] px-2 py-0.5 rounded-md self-start">Original Reference</span>
                    <div className="relative rounded-2xl overflow-hidden border-2 border-[#e5e5e5] shadow-sm">
                       <img src={gameState.originalImage!} alt="Original" className="w-full h-auto" />
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col gap-2">
                    <span className="text-[10px] font-bold uppercase text-[#1cb0f6] tracking-widest bg-[#e1f5fe] px-2 py-0.5 rounded-md self-start">Spot Differences Here</span>
                    <div className="relative rounded-2xl overflow-hidden border-4 border-[#1cb0f6] cursor-crosshair group shadow-xl bg-gray-100" onClick={handleSpotClick}>
                       <img src={gameState.modifiedImage!} alt="Modified" className="w-full h-auto pointer-events-none" />
                       
                       {gameState.userClicks.map((click) => (
                          <div 
                            key={click.id} 
                            className={`absolute w-12 h-12 rounded-full flex items-center justify-center border-4 pointer-events-none transform -translate-x-1/2 -translate-y-1/2
                              ${click.type === 'hit' ? 'border-[#58cc02] bg-[#58cc02]/20 scale-100 z-10' : 'border-[#ff4b4b] bg-[#ff4b4b]/10 animate-click-miss z-0'}`}
                            style={{ left: `${click.x}%`, top: `${click.y}%` }}
                          >
                            <i className={`fas ${click.type === 'hit' ? 'fa-check text-[#58cc02]' : 'fa-times text-[#ff4b4b]'} text-xl drop-shadow-sm`}></i>
                          </div>
                       ))}
                    </div>
                  </div>
                </div>
             </div>
          </div>
        )}

        {/* RESULT STAGE */}
        {gameState.stage === GameStage.RESULT && (
          <div className="bg-white rounded-3xl p-8 border-2 border-[#e5e5e5] shadow-sm w-full text-center overflow-hidden">
            <div className="mb-8 relative h-32 flex items-center justify-center">
              <div className="flex justify-center items-center gap-6">
                 {[1, 2, 3].map((s) => {
                   const isEarned = s <= starsEarned;
                   const isLast = s === starsEarned;
                   return (
                     <div key={s} className="relative">
                        <i 
                          className={`fas fa-star text-5xl transition-all duration-300
                            ${isEarned 
                              ? `text-[#ffc800] drop-shadow-xl ${isLast ? 'animate-star-explode' : 'animate-star-fall'}` 
                              : 'text-[#e5e5e5]'}`}
                          style={{ 
                            animationDelay: `${(s - 1) * 500}ms`,
                            animationFillMode: 'both'
                          }}
                        ></i>
                        {isEarned && (
                           <div 
                             className={`absolute inset-0 bg-yellow-400 blur-2xl opacity-0 rounded-full
                               ${isLast ? 'animate-star-glow-final' : 'animate-star-glow'}`}
                             style={{ animationDelay: `${(s - 1) * 500}ms` }}
                           ></div>
                        )}
                     </div>
                   );
                 })}
              </div>
            </div>
            
            <div className="mb-8">
              <h2 className="text-3xl font-extrabold mb-2 text-[#3c3c3c]">
                {starsEarned === 3 ? 'Vision Master!' : starsEarned === 2 ? 'Eagle Eye!' : 'Good Effort!'}
              </h2>
              <p className="text-[#777] font-semibold italic">
                {starsEarned === 3 ? "You missed nothing!" : "Try to be more precise next time!"}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
               <div className="bg-[#f7f7f7] rounded-2xl p-4 border-2 border-[#e5e5e5] shadow-sm">
                  <div className="text-[#afafaf] text-xs font-bold uppercase mb-1">Found</div>
                  <div className="text-2xl font-extrabold text-[#1cb0f6]">{gameState.differences.length}</div>
               </div>
               <div className="bg-[#f7f7f7] rounded-2xl p-4 border-2 border-[#e5e5e5] shadow-sm">
                  <div className="text-[#afafaf] text-xs font-bold uppercase mb-1">Mistakes</div>
                  <div className="text-2xl font-extrabold text-[#ff4b4b]">{missesCount}</div>
               </div>
            </div>

            <Button fullWidth variant="primary" onClick={restart}>
              <i className="fas fa-redo"></i>
              New Game
            </Button>
          </div>
        )}

      </main>

      {/* FEEDBACK OVERLAY */}
      {feedback && (
        <div className={`fixed bottom-0 left-0 w-full p-6 transition-all duration-300 transform translate-y-0 z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] border-t-4 
          ${feedback.type === 'success' ? 'bg-[#d1f1ff] border-[#1cb0f6]' : feedback.type === 'hint' ? 'bg-[#fff9d1] border-[#ffc800]' : 'bg-[#ffdfe0] border-[#ea2b2b]'}`}>
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-sm 
                ${feedback.type === 'success' ? 'bg-[#1cb0f6] text-white' : feedback.type === 'hint' ? 'bg-[#ffc800] text-white' : 'bg-[#ea2b2b] text-white'}`}>
                <i className={feedback.type === 'success' ? 'fas fa-check' : feedback.type === 'hint' ? 'fas fa-lightbulb' : 'fas fa-times'}></i>
              </div>
              <div className={feedback.type === 'success' ? 'text-[#1899d6]' : feedback.type === 'hint' ? 'text-[#9e7c00]' : 'text-[#ea2b2b]'}>
                <h3 className="text-xl font-black">{feedback.type === 'success' ? 'Nice!' : feedback.type === 'hint' ? 'Almost!' : 'Oops!'}</h3>
                <p className="font-bold">{feedback.message}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes click-miss {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes star-fall {
          0% { transform: translateY(-400px) rotate(-45deg) scale(0); opacity: 0; }
          60% { transform: translateY(20px) rotate(10deg) scale(1.1); opacity: 1; }
          80% { transform: translateY(-10px) rotate(-5deg) scale(1); }
          100% { transform: translateY(0) rotate(0) scale(1); opacity: 1; }
        }
        @keyframes star-explode {
          0% { transform: translateY(-400px) scale(0); opacity: 0; }
          40% { transform: translateY(0) scale(1.5); opacity: 1; filter: brightness(2); }
          50% { transform: scale(2); filter: brightness(3); }
          70% { transform: scale(0.8); }
          100% { transform: scale(1.2); opacity: 1; filter: brightness(1); }
        }
        @keyframes star-glow {
          0% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 0.5; transform: scale(1.2); }
          100% { opacity: 0; transform: scale(1.5); }
        }
        @keyframes star-glow-final {
          0% { opacity: 0; transform: scale(0.5); }
          40% { opacity: 1; transform: scale(2.5); background: white; }
          100% { opacity: 0; transform: scale(4); background: yellow; }
        }
        .animate-click-miss {
          animation: click-miss 0.6s ease-out forwards;
        }
        .animate-star-fall {
          animation: star-fall 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        .animate-star-explode {
          animation: star-explode 1s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        .animate-star-glow {
          animation: star-glow 1s ease-out forwards;
        }
        .animate-star-glow-final {
          animation: star-glow-final 1.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default App;
