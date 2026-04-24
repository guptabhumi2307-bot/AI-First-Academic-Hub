import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Save, 
  ChevronRight, 
  Brain, 
  CheckCircle2, 
  Circle, 
  HelpCircle,
  FileText,
  Zap,
  ArrowLeft,
  X
} from "lucide-react";
import { GoogleGenAI, Type } from "@google/genai";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, isDemoMode } from "../lib/firebase";
import { useFirebase } from "../contexts/FirebaseContext";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type QuestionType = "multiple-choice" | "true-false" | "short-answer";

interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
}

interface Quiz {
  title: string;
  description: string;
  questions: Question[];
}

export const QuizBuilder = () => {
  const { user } = useFirebase();
  const [quiz, setQuiz] = useState<Quiz>({
    title: "",
    description: "",
    questions: []
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationTopic, setGenerationTopic] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const addQuestion = (type: QuestionType) => {
    const newQuestion: Question = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      question: "",
      options: type === "multiple-choice" ? ["", "", "", ""] : undefined,
      correctAnswer: type === "true-false" ? "True" : ""
    };
    setQuiz(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
  };

  const removeQuestion = (id: string) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== id)
    }));
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.map(q => q.id === id ? { ...q, ...updates } : q)
    }));
  };

  const handleGenerateAI = async () => {
    if (!generationTopic) return;
    setIsGenerating(true);

    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not configured.");
      }

      const prompt = `
        System: You are an expert academic assessment designer. Create high-quality, pedagogically sound quiz questions. Ensure a mix of multiple-choice (with 4 options), true-false, and short-answer types.
        
        Task: Generate a comprehensive quiz about: ${generationTopic}. Include 5 questions total.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING, enum: ["multiple-choice", "true-false", "short-answer"] },
                    question: { type: Type.STRING },
                    options: { 
                      type: Type.ARRAY, 
                      items: { type: Type.STRING },
                      description: "For multiple-choice questions only. Provide 4 options."
                    },
                    correctAnswer: { type: Type.STRING },
                    explanation: { type: Type.STRING }
                  },
                  required: ["type", "question", "correctAnswer"]
                }
              }
            },
            required: ["questions"]
          }
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("AI returned an empty response.");
      }

      const data = JSON.parse(text);
      const newQuestions = data.questions.map((q: any) => ({
        ...q,
        id: Math.random().toString(36).substr(2, 9)
      }));

      setQuiz(prev => ({
        ...prev,
        title: prev.title || data.title || "",
        description: prev.description || data.description || "",
        questions: [...prev.questions, ...newQuestions]
      }));
      setGenerationTopic("");
    } catch (error: any) {
      console.error("AI Generation failed:", error);
      const errorMessage = error.message || "Unknown error";
      
      if (isDemoMode) {
         console.warn("Falling back to mock data due to error:", errorMessage);
         const mockQuestions: Question[] = [
           { 
             id: "mock1", 
             type: "multiple-choice", 
             question: "What is the primary function of neural synapses?", 
             options: ["Information transmission", "Energy storage", "Structural support", "Waste removal"],
             correctAnswer: "Information transmission",
             explanation: "Synapses are the junction points where neurons communicate with each other."
           },
           {
             id: "mock2",
             type: "true-false",
             question: "The brain consumes roughly 20% of the body's total energy.",
             correctAnswer: "True",
             explanation: "Despite its small size, the brain is highly metabolically active."
           }
         ];
         setQuiz(prev => ({
           ...prev,
           questions: [...prev.questions, ...mockQuestions]
         }));
      } else {
        alert(`Rio encountered an error: ${errorMessage}. Please try again.`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveQuiz = async () => {
    if (!quiz.title || quiz.questions.length === 0 || !user) {
      alert("Please provide a title and at least one question.");
      return;
    }

    setIsSaving(true);
    try {
      if (!isDemoMode) {
        await addDoc(collection(db!, "users", user.uid, "quizzes"), {
          ...quiz,
          createdAt: serverTimestamp(),
          teacherId: user.uid
        });
      }
      alert("Quiz saved successfully!");
      setQuiz({ title: "", description: "", questions: [] });
    } catch (error) {
      console.error("Save failed:", error);
      alert("Failed to save quiz. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-10 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black text-ink tracking-tight">Quiz Builder</h2>
          <p className="text-ink-muted font-light mt-1">Design assessments with AI-powered neural insights.</p>
        </div>
        <div className="flex items-center gap-4">
           <button 
             onClick={handleSaveQuiz}
             disabled={isSaving || quiz.questions.length === 0}
             className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-50"
           >
             {isSaving ? "Saving..." : (
               <>
                 <Save className="w-5 h-5" />
                 Publish Quiz
               </>
             )}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        {/* Creation Workspace */}
        <div className="xl:col-span-2 space-y-8">
          <div className="glass p-8 rounded-[2.5rem] border-white/60 shadow-xl space-y-6">
            <div className="space-y-4">
              <input 
                type="text"
                value={quiz.title}
                onChange={(e) => setQuiz(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Quiz Title (e.g., Biology Midterm)"
                className="w-full text-2xl font-black text-ink bg-transparent border-none outline-none focus:ring-0 placeholder:text-neutral-200"
              />
              <textarea 
                value={quiz.description}
                onChange={(e) => setQuiz(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Add a description or instructions..."
                className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-indigo-100 outline-none transition-all resize-none custom-scrollbar"
              />
            </div>

            <div className="space-y-6 pt-6 border-t border-neutral-100">
              <AnimatePresence>
                {quiz.questions.map((q, index) => (
                  <motion.div 
                    key={q.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-6 rounded-3xl bg-neutral-50/50 border border-neutral-100 relative group"
                  >
                    <button 
                      onClick={() => removeQuestion(q.id)}
                      className="absolute top-4 right-4 p-2 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="flex gap-4">
                       <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                         {index + 1}
                       </div>
                       <div className="flex-1 space-y-4">
                         <div className="flex items-center gap-4">
                           <span className="text-[10px] font-black uppercase text-indigo-600 tracking-widest bg-indigo-50 px-2 py-0.5 rounded">
                             {q.type.replace("-", " ")}
                           </span>
                         </div>
                         <input 
                           type="text"
                           value={q.question}
                           onChange={(e) => updateQuestion(q.id, { question: e.target.value })}
                           placeholder="Enter your question here..."
                           className="w-full font-bold text-ink bg-transparent border-none outline-none focus:ring-0 placeholder:text-neutral-300"
                         />

                         {q.type === "multiple-choice" && (
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                             {q.options?.map((opt, optIndex) => (
                               <div key={optIndex} className="flex items-center gap-2 group/opt">
                                 <button 
                                   onClick={() => updateQuestion(q.id, { correctAnswer: opt })}
                                   className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${q.correctAnswer === opt ? "bg-indigo-600 border-indigo-600 text-white" : "border-neutral-200 group-hover/opt:border-indigo-300"}`}
                                 >
                                   {q.correctAnswer === opt && <CheckCircle2 className="w-3 h-3" />}
                                 </button>
                                 <input 
                                   type="text"
                                   value={opt}
                                   onChange={(e) => {
                                     const newOpts = [...(q.options || [])];
                                     newOpts[optIndex] = e.target.value;
                                     updateQuestion(q.id, { options: newOpts });
                                   }}
                                   placeholder={`Option ${optIndex + 1}`}
                                   className="flex-1 text-sm bg-white border border-neutral-100 rounded-xl px-4 py-2 outline-none focus:border-indigo-200"
                                 />
                               </div>
                             ))}
                           </div>
                         )}

                         {q.type === "true-false" && (
                           <div className="flex gap-4 pt-2">
                             {["True", "False"].map((opt) => (
                               <button
                                 key={opt}
                                 onClick={() => updateQuestion(q.id, { correctAnswer: opt })}
                                 className={`px-6 py-2 rounded-xl text-sm font-bold border transition-all ${q.correctAnswer === opt ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-neutral-100 text-ink-muted hover:border-indigo-200"}`}
                               >
                                 {opt}
                               </button>
                             ))}
                           </div>
                         )}

                         {q.type === "short-answer" && (
                            <div className="pt-2">
                              <input 
                                type="text"
                                value={q.correctAnswer}
                                onChange={(e) => updateQuestion(q.id, { correctAnswer: e.target.value })}
                                placeholder="Expected answer..."
                                className="w-full text-sm bg-white border border-neutral-100 rounded-xl px-4 py-2 outline-none focus:border-indigo-200"
                              />
                            </div>
                         )}
                       </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {quiz.questions.length === 0 && (
                <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 text-neutral-300">
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-neutral-100 flex items-center justify-center">
                    <HelpCircle className="w-10 h-10" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold">Your canvas is empty.</p>
                    <p className="text-xs font-light">Start adding questions manually or use Rio AI for a neural bootstrap.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-4 pt-6">
              <button 
                onClick={() => addQuestion("multiple-choice")}
                className="flex items-center gap-2 px-6 py-3 bg-neutral-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-2xl text-xs font-bold transition-all"
              >
                <Plus className="w-4 h-4" /> Add MCW
              </button>
              <button 
                onClick={() => addQuestion("true-false")}
                className="flex items-center gap-2 px-6 py-3 bg-neutral-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-2xl text-xs font-bold transition-all"
              >
                <Plus className="w-4 h-4" /> Add True/False
              </button>
              <button 
                onClick={() => addQuestion("short-answer")}
                className="flex items-center gap-2 px-6 py-3 bg-neutral-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-2xl text-xs font-bold transition-all"
              >
                <Plus className="w-4 h-4" /> Add Short Answer
              </button>
            </div>
          </div>
        </div>

        {/* AI Assistant Sidebar */}
        <div className="space-y-8">
          <div className="glass p-8 rounded-[2.5rem] border-white/60 bg-indigo-600 text-white shadow-xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                 <Brain className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">AI Quiz Assistant</h3>
            </div>
            <p className="text-xs text-white/80 leading-relaxed font-light">
              Describe your topic or paste course material, and Rio will architect a balanced assessment for you.
            </p>
            
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {["Mitosis", "Ethics", "Newton's Laws", "Civil War"].map(topic => (
                  <button 
                    key={topic}
                    onClick={() => setGenerationTopic(topic)}
                    className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[10px] font-bold border border-white/10 transition-all"
                  >
                    {topic}
                  </button>
                ))}
              </div>
              
              <textarea 
                value={generationTopic}
                onChange={(e) => setGenerationTopic(e.target.value)}
                placeholder="Topic: Evolutionary Biology - Focus on natural selection..."
                className="w-full h-32 bg-white/10 border border-white/20 rounded-2xl p-4 text-xs font-medium placeholder:text-white/40 focus:bg-white/20 outline-none transition-all resize-none custom-scrollbar"
              />
              <button 
                onClick={handleGenerateAI}
                disabled={isGenerating || !generationTopic}
                className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 hover:scale-105 transition-all disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    Architecting...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Questions
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="glass p-8 rounded-[2.5rem] border-white/60 shadow-xl space-y-4">
             <div className="flex items-center gap-3 text-emerald-600">
               <Zap className="w-5 h-5" />
               <h4 className="font-bold">Architect's Advice</h4>
             </div>
             <p className="text-xs text-ink-muted leading-relaxed italic">
               "A mix of question types ensures better cognitive testing. Try using AI for Multiple Choice and manually adding focused Short Answer questions."
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};
