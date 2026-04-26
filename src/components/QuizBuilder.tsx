import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Save, 
  Brain, 
  CheckCircle2, 
  HelpCircle,
  Zap,
  ListChecks,
  Trash,
  Clock,
  Circle
} from "lucide-react";
import { collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db, isDemoMode } from "../lib/firebase";
import { useFirebase } from "../contexts/FirebaseContext";
import { getGeminiModel } from "../lib/gemini";

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
  const [publishedQuizzes, setPublishedQuizzes] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<"builder" | "published">("builder");

  // Fetch teacher's published quizzes
  useEffect(() => {
    if (!user || isDemoMode) return;

    const q = query(
      collection(db!, "quizzes"),
      where("teacherId", "==", user.uid),
      orderBy("publishedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPublishedQuizzes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [user]);

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
        System: You are Rio, the Neural Academic Architect. You specialize in designing high-quality, pedagogically sound assessments that target critical thinking and neural retention.
        
        Task: Create a comprehensive quiz about "${generationTopic}". 
        Include exactly 5 questions of various types:
        - Multiple Choice (4 distinct, challenging options)
        - True/False
        - Short Answer (focused on specific facts or concepts)
        
        Ensure that the questions follow a logical difficulty progression.
        
        Your output should be a single JSON object with this structure:
        {
          "title": "A descriptive quiz title",
          "description": "Short instructions for the student",
          "questions": [
            {
              "type": "multiple-choice" | "true-false" | "short-answer",
              "question": "Clear, concise question text",
              "options": ["Option A", "Option B", "Option C", "Option D"], // Only for multiple-choice
              "correctAnswer": "The exact correct answer (must match one of the options for MC, or specify True/False)",
              "explanation": "A deep pedagogical insight explain why this answer is correct"
            }
          ]
        }
      `;

      const model = getGeminiModel({
        model: "gemini-3-flash-preview",
      });

      const response = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
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
        await addDoc(collection(db!, "quizzes"), {
          ...quiz,
          teacherId: user.uid,
          teacherName: user.displayName || "Scholar",
          publishedAt: serverTimestamp(),
        });
      }
      alert("Quiz published successfully! Students can now see and attempt it.");
      setQuiz({ title: "", description: "", questions: [] });
      setActiveView("published");
    } catch (error) {
      console.error("Save failed:", error);
      alert("Failed to publish quiz. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!window.confirm("Are you sure you want to delete this quiz? Students will no longer be able to attempt it.")) return;
    
    try {
      if (!isDemoMode) {
        await deleteDoc(doc(db!, "quizzes", quizId));
      } else {
        setPublishedQuizzes(prev => prev.filter(q => q.id !== quizId));
      }
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete quiz.");
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-ink tracking-tight flex items-center gap-3">
            <ListChecks className="w-10 h-10 text-indigo-600" />
            Quiz Engine
          </h2>
          <p className="text-ink-muted font-light mt-1">Design and manage assessments with Rio's neural insights.</p>
        </div>
        <div className="flex items-center gap-2 p-1.5 bg-neutral-100 rounded-2xl">
           <button 
             onClick={() => setActiveView("builder")}
             className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeView === "builder" ? "bg-white text-indigo-600 shadow-sm" : "text-ink-muted hover:text-ink"}`}
           >
             Creator
           </button>
           <button 
             onClick={() => setActiveView("published")}
             className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeView === "published" ? "bg-white text-indigo-600 shadow-sm" : "text-ink-muted hover:text-ink"}`}
           >
             Published ({publishedQuizzes.length})
           </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeView === "builder" ? (
          <motion.div 
            key="builder"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
          >
        {/* Creation Workspace */}
        <div className="lg:col-span-8 space-y-6">
          <div className="glass p-6 md:p-10 rounded-[3rem] border-white/60 shadow-xl space-y-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-indigo-600 tracking-widest ml-1">Assessment Identity</label>
                <input 
                  type="text"
                  value={quiz.title}
                  onChange={(e) => setQuiz(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Quantum Mechanics Foundation"
                  className="w-full text-3xl font-black text-ink bg-white/50 border border-neutral-100 rounded-2xl px-6 py-4 outline-none focus:ring-4 ring-indigo-50 transition-all placeholder:text-neutral-300"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest ml-1">Core Instructions</label>
                <textarea 
                  value={quiz.description}
                  onChange={(e) => setQuiz(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What should students know before starting?"
                  className="w-full bg-white/50 border border-neutral-100 rounded-2xl p-6 text-sm font-medium focus:ring-4 ring-indigo-50 outline-none transition-all resize-none h-24 custom-scrollbar"
                />
              </div>
            </div>

            <div className="space-y-6 pt-8 border-t border-neutral-100">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-black uppercase text-ink tracking-widest">Question Stack ({quiz.questions.length})</h4>
              </div>

              <div className="space-y-6">
                <AnimatePresence mode="popLayout">
                  {quiz.questions.map((q, index) => (
                    <motion.div 
                      key={q.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-6 md:p-8 rounded-[2rem] bg-white border border-neutral-100 shadow-sm relative group"
                    >
                      <button 
                        onClick={() => removeQuestion(q.id)}
                        className="absolute top-6 right-6 p-2 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all md:opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="flex flex-col md:flex-row gap-6">
                         <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm shrink-0">
                           {index + 1}
                         </div>
                         <div className="flex-1 space-y-6">
                           <div className="flex items-center gap-3">
                             <span className="text-[10px] font-black uppercase text-indigo-600 tracking-widest bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                               {q.type.replace("-", " ")}
                             </span>
                           </div>
                           
                           <div className="space-y-2">
                             <label className="text-[9px] font-black uppercase text-neutral-400 tracking-widest">Inquiry</label>
                             <input 
                               type="text"
                               value={q.question}
                               onChange={(e) => updateQuestion(q.id, { question: e.target.value })}
                               placeholder="What is the question?"
                               className="w-full text-lg font-bold text-ink bg-transparent border-b-2 border-neutral-50 border-dashed outline-none focus:border-indigo-200 transition-all placeholder:text-neutral-200 py-2"
                             />
                           </div>

                           {q.type === "multiple-choice" && (
                             <div className="space-y-3">
                               <label className="text-[9px] font-black uppercase text-neutral-400 tracking-widest">Options</label>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 {q.options?.map((opt, optIndex) => (
                                   <div key={optIndex} className="flex items-center gap-3 group/opt relative">
                                     <button 
                                       onClick={() => updateQuestion(q.id, { correctAnswer: opt })}
                                       className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${q.correctAnswer === opt ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-200" : "border-neutral-100 bg-neutral-50 group-hover/opt:border-indigo-200"}`}
                                     >
                                       {q.correctAnswer === opt && <CheckCircle2 className="w-3.5 h-3.5" />}
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
                                       className={`flex-1 text-sm bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 outline-none transition-all ${q.correctAnswer === opt ? "ring-2 ring-emerald-100 border-emerald-200" : "focus:border-indigo-200 focus:bg-white"}`}
                                     />
                                   </div>
                                 ))}
                               </div>
                             </div>
                           )}

                           {q.type === "true-false" && (
                             <div className="space-y-3">
                               <label className="text-[9px] font-black uppercase text-neutral-400 tracking-widest">Correct Response</label>
                               <div className="flex gap-4">
                                 {["True", "False"].map((opt) => (
                                   <button
                                     key={opt}
                                     onClick={() => updateQuestion(q.id, { correctAnswer: opt })}
                                     className={`flex-1 md:flex-none px-10 py-3 rounded-2xl text-sm font-bold border transition-all ${q.correctAnswer === opt ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100" : "bg-neutral-50 border-neutral-100 text-ink-muted hover:border-indigo-200"}`}
                                   >
                                     {opt}
                                   </button>
                                 ))}
                               </div>
                             </div>
                           )}

                           {q.type === "short-answer" && (
                              <div className="space-y-3">
                                <label className="text-[9px] font-black uppercase text-neutral-400 tracking-widest">Validated Answer</label>
                                <input 
                                  type="text"
                                  value={q.correctAnswer}
                                  onChange={(e) => updateQuestion(q.id, { correctAnswer: e.target.value })}
                                  placeholder="What answer should Rio look for?"
                                  className="w-full text-sm bg-neutral-50 border border-neutral-100 rounded-xl px-6 py-3 outline-none focus:ring-4 ring-indigo-50 focus:bg-white transition-all"
                                />
                              </div>
                           )}
                         </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {quiz.questions.length === 0 && (
                <div className="py-24 flex flex-col items-center justify-center text-center space-y-6">
                  <div className="w-24 h-24 rounded-full bg-neutral-50 border border-dashed border-neutral-200 flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-neutral-200" />
                  </div>
                  <div className="space-y-2 max-w-xs">
                    <h3 className="text-xl font-bold text-ink">Empty Canvas</h3>
                    <p className="text-sm text-ink-muted font-light">Create questions manually using the tools below or let Rio assist you.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-8 border-t border-neutral-100">
              <button 
                onClick={() => addQuestion("multiple-choice")}
                className="flex items-center gap-3 px-6 py-4 bg-white hover:bg-indigo-50 text-ink border border-neutral-100 hover:border-indigo-100 rounded-[1.5rem] text-sm font-bold transition-all shadow-sm hover:shadow-md"
              >
                <Plus className="w-5 h-5 text-indigo-500" /> Multiple Choice
              </button>
              <button 
                onClick={() => addQuestion("true-false")}
                className="flex items-center gap-3 px-6 py-4 bg-white hover:bg-indigo-50 text-ink border border-neutral-100 hover:border-indigo-100 rounded-[1.5rem] text-sm font-bold transition-all shadow-sm hover:shadow-md"
              >
                <Plus className="w-5 h-5 text-indigo-500" /> True / False
              </button>
              <button 
                onClick={() => addQuestion("short-answer")}
                className="flex items-center gap-3 px-6 py-4 bg-white hover:bg-indigo-50 text-ink border border-neutral-100 hover:border-indigo-100 rounded-[1.5rem] text-sm font-bold transition-all shadow-sm hover:shadow-md"
              >
                <Plus className="w-5 h-5 text-indigo-500" /> Short Answer
              </button>
            </div>
            <div className="flex items-center justify-end pt-4">
                <button 
                  onClick={handleSaveQuiz}
                  disabled={isSaving || quiz.questions.length === 0}
                  className="px-10 py-5 bg-indigo-600 text-white rounded-[2rem] font-bold shadow-2xl shadow-indigo-600/30 flex items-center gap-3 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSaving ? <LoaderSpinner /> : <Save className="w-6 h-6" />}
                  Publish Assessment
                </button>
              </div>
            </div>
          </div>

          {/* Rio AI Sidebar */}
            <div className="lg:col-span-4 lg:sticky lg:top-28 space-y-6">
              <div className="glass p-8 rounded-[3rem] border-white/60 bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
                <div className="relative z-10 space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                       <Brain className="w-8 h-8 text-indigo-100" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black italic tracking-tight">Rio Assistant</h3>
                      <p className="text-[10px] uppercase font-black tracking-widest text-indigo-200">Neural Quiz Engine</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="relative">
                        <textarea 
                          value={generationTopic}
                          onChange={(e) => setGenerationTopic(e.target.value)}
                          placeholder="Topic: Organic Chemistry - Focus on Alkanes and Alkenes..."
                          className="w-full h-40 bg-white/10 border border-white/10 rounded-3xl p-6 text-sm font-medium placeholder:text-white/30 focus:bg-white/15 outline-none transition-all resize-none custom-scrollbar"
                        />
                        {isGenerating && (
                          <div className="absolute inset-0 bg-indigo-900/40 backdrop-blur-sm rounded-3xl flex items-center justify-center">
                             <div className="flex flex-col items-center gap-3">
                               <LoaderSpinner />
                               <span className="text-xs font-black uppercase tracking-widest"> Rio is thinking...</span>
                             </div>
                          </div>
                        )}
                      </div>

                      <button 
                        onClick={handleGenerateAI}
                        disabled={isGenerating || !generationTopic}
                        className="w-full py-5 bg-white text-indigo-700 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-900/40 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                      >
                        <Sparkles className="w-4 h-4" />
                        Architect Questions
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="published"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            className="space-y-6"
          >
            {publishedQuizzes.length === 0 ? (
              <div className="py-32 flex flex-col items-center justify-center text-center space-y-4">
                 <div className="w-20 h-20 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-300">
                    <HelpCircle className="w-10 h-10" />
                 </div>
                 <p className="font-bold text-ink-muted">No quizzes published yet.</p>
                 <button onClick={() => setActiveView("builder")} className="text-sm text-indigo-600 font-bold hover:underline">Start Creating</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {publishedQuizzes.map((quiz) => (
                  <motion.div 
                    layout
                    key={quiz.id} 
                    className="glass p-8 rounded-[2.5rem] border-white/60 shadow-lg group relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-6">
                       <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <ListChecks className="w-6 h-6" />
                       </div>
                       <button 
                         onClick={() => handleDeleteQuiz(quiz.id)}
                         className="p-2 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                       >
                         <Trash className="w-4 h-4" />
                       </button>
                    </div>
                    <h3 className="text-xl font-bold text-ink mb-2 line-clamp-1">{quiz.title}</h3>
                    <p className="text-xs text-ink-muted line-clamp-2 mb-6 font-light">{quiz.description || "No description provided."}</p>
                    
                    <div className="flex items-center justify-between pt-6 border-t border-neutral-100">
                       <div className="flex items-center gap-2 text-xs font-black uppercase text-indigo-600 tracking-widest">
                          <HelpCircle className="w-3.5 h-3.5" /> {quiz.questions?.length || 0} Questions
                       </div>
                       <div className="flex items-center gap-2 text-ink-muted">
                          <Clock className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest">
                             {quiz.publishedAt?.toDate?.()?.toLocaleDateString() || "Today"}
                          </span>
                       </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const LoaderSpinner = () => (
  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
);
