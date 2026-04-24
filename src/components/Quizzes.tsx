/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GoogleGenAI, Type } from "@google/genai";
import { isDemoMode } from "../lib/firebase";
import { 
  Plus, 
  HelpCircle, 
  Trophy, 
  Clock, 
  ChevronRight, 
  Star,
  Play,
  RotateCcw,
  BarChart3,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  Loader2,
  Check,
  X
} from "lucide-react";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`glass rounded-[2rem] p-6 border-white/40 shadow-sm ${className}`}>
    {children}
  </div>
);

const quizList = [
  { id: 1, title: "Quantum Mechanics Fundamentals", subject: "Physics", questions: 20, difficulty: "Expert", score: "85%", time: "15 mins" },
  { id: 2, title: "Cell Structure & Function", subject: "Biology", questions: 15, difficulty: "Medium", score: null, time: "10 mins" },
  { id: 3, title: "Macroeconomics Principles", subject: "Economics", questions: 25, difficulty: "Hard", score: "72%", time: "20 mins" },
  { id: 4, title: "Linear Algebra Vectors", subject: "Math", questions: 10, difficulty: "Medium", score: null, time: "8 mins" },
];

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
}

export const Quizzes = () => {
  const [activeQuiz, setActiveQuiz] = useState<Question[] | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("Medium");
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const handleGenerateQuiz = async (topic: string, difficulty: string = "Medium") => {
    setIsGenerating(true);
    setIsTopicModalOpen(false);
    try {
      // Use Gemini for both modes if possible, as Gemini API key is provided by environment
      const prompt = `You are an expert educator. Generate a high-quality, 5-question multiple-choice quiz about "${topic}".
      The difficulty level should be: ${difficulty}.
      Ensure the questions are DEEPLY relevant to the subject matter.
      - If Beginner: Focus on fundamental definitions and core concepts.
      - If Intermediate: Include conceptual understanding and basic applications.
      - If Advanced/Expert: Include complex problem solving, theoretical nuances, and edge cases.

      Each question must have:
      1. A clear, unambiguous question.
      2. Four distinct options (A, B, C, D).
      3. Exactly one correct answer (index 0-3).
      
      Respond only with the JSON data.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [{ text: prompt }]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { 
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                correctAnswer: { type: Type.INTEGER }
              },
              required: ["question", "options", "correctAnswer"]
            }
          }
        }
      });

      const text = response.text;
      const data = JSON.parse(text || "[]");
      
      if (data && Array.isArray(data) && data.length > 0) {
        setActiveQuiz(data);
      } else {
        throw new Error("Invalid quiz data format");
      }
      setCurrentQuestionIndex(0);
      setScore(0);
      setQuizFinished(false);
      setSelectedOption(null);
    } catch (error) {
      console.error("Quiz Generation failed:", error);
      // Fallback for extreme cases or if quota hit
      if (isDemoMode) {
        const fallbackQuiz: Question[] = [
          { 
            question: `Which of the following describes the core principle of "${topic}"?`, 
            options: ["The fundamental interaction", "The secondary observable", "A peripheral component", "A negligible factor"],
            correctAnswer: 0
          },
          { 
            question: `In what context is "${topic}" most commonly analyzed?`, 
            options: ["Theoretical modeling", "Random observation", "Decorative arts", "Manual labor"],
            correctAnswer: 0
          }
        ];
        setActiveQuiz(fallbackQuiz);
        setCurrentQuestionIndex(0);
        setScore(0);
        setQuizFinished(false);
        setSelectedOption(null);
      } else {
        alert("Rio had trouble architecting your quiz. Please try a different topic or check your connection.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswer = (optionIndex: number) => {
    if (selectedOption !== null) return;
    
    setSelectedOption(optionIndex);
    if (optionIndex === activeQuiz![currentQuestionIndex].correctAnswer) {
      setScore(prev => prev + 1);
    }

    setTimeout(() => {
      if (currentQuestionIndex < activeQuiz!.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedOption(null);
      } else {
        setQuizFinished(true);
      }
    }, 1500);
  };
  if (activeQuiz && !quizFinished) {
    const q = activeQuiz[currentQuestionIndex];
    return (
      <div className="max-w-3xl mx-auto space-y-10">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setActiveQuiz(null)}
            className="flex items-center gap-2 text-ink-muted hover:text-primary transition-colors font-bold text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Exit Quiz
          </button>
          <div className="flex items-center gap-4">
             <p className="text-[10px] font-black uppercase tracking-widest text-ink-muted">Question {currentQuestionIndex + 1} of {activeQuiz.length}</p>
             <div className="w-32 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${((currentQuestionIndex + 1) / activeQuiz.length) * 100}%` }}
                   className="h-full bg-primary"
                />
             </div>
          </div>
        </div>

        <Card className="p-10 text-center space-y-8 bg-white border-2 border-primary/10">
           <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto">
             <HelpCircle className="w-8 h-8" />
           </div>
           <h3 className="text-2xl font-black text-ink tracking-tight leading-tight">{q.question}</h3>
        </Card>

        <div className="grid grid-cols-1 gap-4">
          {q.options.map((option, i) => (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              className={`p-6 rounded-2xl border-2 transition-all text-left flex items-center justify-between group ${
                selectedOption === i 
                  ? (i === q.correctAnswer ? "bg-emerald-500/10 border-emerald-500 text-emerald-700" : "bg-red-500/10 border-red-500 text-red-700")
                  : selectedOption !== null && i === q.correctAnswer
                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-700"
                    : "glass border-white/60 hover:border-primary/40 hover:bg-white/40"
              }`}
            >
              <span className="font-bold">{option}</span>
              {selectedOption === i && (
                i === q.correctAnswer ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />
              )}
              {selectedOption !== null && i === q.correctAnswer && <Check className="w-5 h-5" />}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (activeQuiz && quizFinished) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-8">
        <motion.div 
           initial={{ scale: 0.8, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           className="w-32 h-32 bg-primary/10 rounded-[3rem] flex items-center justify-center text-primary mx-auto mb-10 border-4 border-white shadow-2xl"
        >
          <Trophy className="w-16 h-16" />
        </motion.div>
        <div className="space-y-4">
          <h2 className="text-4xl font-black text-ink tracking-tight italic">Quiz Completed!</h2>
          <p className="text-ink-muted">You've successfully analyzed your knowledge on <span className="text-primary font-bold">"{selectedTopic}"</span></p>
        </div>
        
        <div className="grid grid-cols-3 gap-6">
           <Card className="text-center py-8">
              <p className="text-[10px] font-black uppercase text-ink-muted tracking-widest mb-1">Score</p>
              <h4 className="text-3xl font-black text-primary italic">{Math.round((score / activeQuiz.length) * 100)}%</h4>
           </Card>
           <Card className="text-center py-8">
              <p className="text-[10px] font-black uppercase text-ink-muted tracking-widest mb-1">Correct</p>
              <h4 className="text-3xl font-black text-emerald-600 italic">{score}/{activeQuiz.length}</h4>
           </Card>
           <Card className="text-center py-8">
              <p className="text-[10px] font-black uppercase text-ink-muted tracking-widest mb-1">XP Earned</p>
              <h4 className="text-3xl font-black text-amber-500 italic">+{score * 20}</h4>
           </Card>
        </div>

        <div className="flex gap-4 pt-10">
          <button onClick={() => setActiveQuiz(null)} className="flex-1 py-4 glass border-white/60 font-bold rounded-2xl hover:bg-white/40 transition-all">Back to Library</button>
          <button onClick={() => handleGenerateQuiz(selectedTopic)} className="flex-1 py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all">Retake Quiz</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Topic Modal */}
      <AnimatePresence>
        {isTopicModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-ink/20 backdrop-blur-sm"
              onClick={() => setIsTopicModalOpen(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass p-10 rounded-[3rem] w-full max-w-lg relative z-10 shadow-3xl bg-white border-2 border-primary/10"
            >
              <h3 className="text-2xl font-black text-ink mb-6 tracking-tight">Generate New Quiz</h3>
              <p className="text-sm text-ink-muted mb-8 font-light leading-relaxed">Describe a subject, paste some text, or just name a topic. Rio will architect a custom assessment for you.</p>
                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase text-ink-muted tracking-widest px-1">Difficulty Level</p>
                  <div className="grid grid-cols-3 gap-3">
                    {["Beginner", "Medium", "Advanced"].map((d) => (
                      <button 
                        key={d}
                        onClick={() => setSelectedDifficulty(d)}
                        className={`py-3 rounded-xl border-2 transition-all font-bold text-xs ${
                          selectedDifficulty === d 
                            ? "border-primary bg-primary/5 text-primary" 
                            : "border-neutral-100 bg-neutral-50 text-ink-muted hover:border-primary/20"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <input 
                    type="text" 
                    autoFocus
                    value={selectedTopic}
                    onChange={(e) => setSelectedTopic(e.target.value)}
                    placeholder="e.g. Organic Chemistry, Photosynthesis..."
                    className="w-full h-16 bg-neutral-50 border border-neutral-100 rounded-2xl px-6 outline-none focus:ring-4 ring-primary/10 focus:border-primary transition-all font-bold"
                  />
                  <button 
                    onClick={() => handleGenerateQuiz(selectedTopic, selectedDifficulty)}
                    disabled={!selectedTopic.trim()}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    Generate with Rio
                  </button>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h2 className="text-4xl font-bold text-ink tracking-tight">Quizzes</h2>
          <p className="text-ink-muted font-light mt-1">Test your knowledge and track your academic progress.</p>
        </motion.div>
        
        <div className="flex items-center gap-3">
          <button 
             onClick={() => setIsTopicModalOpen(true)}
             disabled={isGenerating}
             className="px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {isGenerating ? "Rio is Architecting..." : "Generate Quiz"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Stats Section */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-gradient-to-br from-indigo-500 to-primary text-white border-none text-center py-10 relative overflow-hidden">
             <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-white/10 rounded-full blur-3xl" />
             <div className="w-20 h-20 rounded-[2rem] bg-white/20 flex items-center justify-center mx-auto mb-6 shadow-xl backdrop-blur-md">
                <Trophy className="w-10 h-10 text-white" />
             </div>
             <p className="text-[10px] uppercase font-bold tracking-widest text-white/70 mb-1">Average Score</p>
             <h3 className="text-5xl font-black mb-6 italic">92%</h3>
             <div className="flex items-center justify-center gap-2 text-xs font-bold bg-white/10 py-2 rounded-xl mx-6">
                <Star className="w-4 h-4 fill-current" /> Top 5% Globally
             </div>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-600 via-primary to-purple-700 text-white border-none shadow-xl shadow-primary/30 space-y-4">
             <h4 className="font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-white/80" /> Daily Activity
             </h4>
             <div className="flex items-end justify-between h-20 pt-4">
                {[40, 70, 45, 90, 65, 80, 50].map((v, i) => (
                  <div key={i} className="w-3 bg-white/20 rounded-t-lg relative group">
                     <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${v}%` }}
                        className="absolute bottom-0 w-full bg-white rounded-t-lg group-hover:bg-indigo-200 transition-colors"
                     />
                  </div>
                ))}
             </div>
             <div className="flex justify-between text-[8px] font-bold text-white/60 uppercase">
                <span>Mon</span>
                <span>Sun</span>
             </div>
          </Card>

          <Card className="p-0 overflow-hidden relative bg-gradient-to-br from-indigo-600 via-primary to-purple-700 text-white border-none shadow-xl shadow-primary/30">
             <div className="p-6 bg-white/10 border-b border-white/10">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                   <Sparkles className="w-4 h-4 text-white" /> AI Tip
                </h4>
             </div>
             <div className="p-6">
                <p className="text-xs text-white/80 leading-relaxed font-light">
                   Taking quizzes multiple times with different questions helps solidify your understanding of core concepts.
                </p>
             </div>
          </Card>
        </div>

        {/* Quiz List */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-4">
              <button className="text-xs font-bold text-primary border-b-2 border-primary pb-1">All Quizzes</button>
              <button className="text-xs font-bold text-ink-muted hover:text-ink transition-colors pb-1">Retake</button>
              <button className="text-xs font-bold text-ink-muted hover:text-ink transition-colors pb-1">Completed</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quizList.map((quiz, i) => (
              <motion.div
                key={quiz.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass p-8 rounded-[2.5rem] hover:shadow-xl transition-all group relative border-white/60"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <HelpCircle className="w-6 h-6" />
                  </div>
                  {quiz.score ? (
                    <div className="bg-green-500/10 text-green-600 px-3 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1.5 border border-green-500/10">
                      <CheckCircle2 className="w-3.5 h-3.5" /> score: {quiz.score}
                    </div>
                  ) : (
                    <div className="bg-primary/10 text-primary px-3 py-1 rounded-xl text-[10px] font-bold border border-primary/10">
                      New
                    </div>
                  )}
                </div>

                <div className="space-y-2 mb-8">
                  <h4 className="text-lg font-bold text-ink leading-tight group-hover:text-primary transition-colors">{quiz.title}</h4>
                  <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">{quiz.subject} • {quiz.questions} Questions</p>
                </div>

                  <div className="flex items-center justify-between pt-6 border-t border-white/20">
                    <div className="flex items-center gap-4">
                       <div className="flex items-center gap-1.5 text-ink-muted">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold uppercase">{quiz.time}</span>
                       </div>
                       <span className="text-[10px] font-bold text-primary uppercase bg-primary/10 px-2 py-0.5 rounded-md">
                          {quiz.difficulty}
                       </span>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedTopic(quiz.title);
                        setSelectedDifficulty(quiz.difficulty === "Expert" ? "Advanced" : quiz.difficulty);
                        handleGenerateQuiz(quiz.title, quiz.difficulty === "Expert" ? "Advanced" : quiz.difficulty);
                      }}
                      className="w-10 h-10 rounded-xl bg-white border border-neutral-100 shadow-md flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all focus:outline-none focus:ring-2 ring-primary/20"
                    >
                      {quiz.score ? <RotateCcw className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                    </button>
                  </div>
              </motion.div>
            ))}
          </div>

          <Card className="p-8 bg-white/40 border border-white/60 flex flex-col md:flex-row items-center justify-between gap-6">
             <div className="flex items-center gap-6">
               <div className="w-16 h-16 rounded-[1.5rem] glass flex items-center justify-center text-primary shadow-lg border-white/60">
                 <Trophy className="w-8 h-8" />
               </div>
               <div>
                  <h3 className="text-xl font-bold text-ink">Leaderboard</h3>
                  <p className="text-xs text-ink-muted">See how you rank against other scholars in Physics.</p>
               </div>
             </div>
             <button className="px-8 py-3 glass text-primary font-bold rounded-2xl border-primary/20 hover:bg-primary/5 transition-all">
               View Rankings
             </button>
          </Card>
        </div>
      </div>
    </div>
  );
};
