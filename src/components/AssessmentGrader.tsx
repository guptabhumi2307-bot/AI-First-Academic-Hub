/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  FileText, 
  Settings, 
  Brain, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  Save, 
  RefreshCw,
  Trophy,
  MessageSquare,
  Sparkles,
  Zap,
  ArrowRight
} from "lucide-react";
import { getGeminiModel } from "../lib/gemini";
import { Card } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { useFirebase } from "../contexts/FirebaseContext";

export const AssessmentGrader = () => {
  const { profile } = useFirebase();
  const [criteria, setCriteria] = useState("Clarity, Depth of Explanation, Accuracy of Facts, Creative Synthesis");
  const [studentAnswer, setStudentAnswer] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedFeedback, setEditedFeedback] = useState("");
  const [editedScore, setEditedScore] = useState(0);

  const studentSubjects = profile?.subjects || ["Quantum Mechanics", "Neural Biology", "Organic Chemistry"];
  const subjectsList = studentSubjects.join(", ");

  const evaluateSubmission = async () => {
    if (!studentAnswer || !criteria) return;
    
    setIsEvaluating(true);
    setEditMode(false);
    
    const model = getGeminiModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are an expert academic evaluator. Analyze the following open-ended student submission based STRICTLY on the teacher's criteria.
      
      STUDENT SUBJECTS SCOPE: [${subjectsList}]
      TEACHER'S CRITERIA: "${criteria}"
      STUDENT SUBMISSION: "${studentAnswer}"

      TASK:
      1. Evaluate the submission against each criterion.
      2. Provide a numerical score (0-100).
      3. Give constructive, professional feedback.
      4. If the submission is outside the subjects scope, flag it as "UNSUPPORTED".

      RETURN JSON:
      {
        "score": number, 
        "feedback": "...", 
        "criterionAnalysis": [{"criterion": "...", "rating": "Low/Mid/High", "comment": "..."}],
        "isSupported": boolean, 
        "rejectionReason": "..." (only if isSupported is false)
      }
    `;

    try {
      const result = await model.generateContent(prompt);
      const text = result.text || "{}";
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const data = JSON.parse(cleaned);
      
      setEvaluation(data);
      setEditedFeedback(data.feedback);
      setEditedScore(data.score);
    } catch (error) {
       console.error("Evaluation failed:", error);
       alert("Neural assessment link failed. Check your API configuration.");
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleManualSave = () => {
    if (!evaluation) return;
    setEvaluation({
      ...evaluation,
      feedback: editedFeedback,
      score: editedScore
    });
    setEditMode(false);
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Configuration Pane */}
        <div className="lg:col-span-12">
          <Card className="p-8 bg-white border-2 border-neutral-100 rounded-[2.5rem] shadow-xl relative overflow-hidden">
             <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: `linear-gradient(#primary 1px, transparent 1px), linear-gradient(90deg, #primary 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
             
             <div className="relative z-10 flex flex-col md:flex-row gap-10">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Settings className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-[10px] font-black uppercase text-ink-muted tracking-widest">Grading Criteria Matrix</h4>
                  </div>
                  <textarea 
                    className="w-full h-24 bg-neutral-50 border-2 border-neutral-100 rounded-2xl p-4 text-sm font-bold text-ink outline-none focus:border-indigo-600 transition-all resize-none"
                    placeholder="Specify the focus areas (e.g. Logic, Formatting, Accuracy)..."
                    value={criteria}
                    onChange={(e) => setCriteria(e.target.value)}
                  />
                  <p className="text-[10px] text-neutral-400 font-medium italic">REO will use this matrix to calibrate its neural evaluation engine.</p>
                </div>
                <div className="w-[1px] bg-neutral-100 hidden md:block" />
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-[10px] font-black uppercase text-ink-muted tracking-widest">Student Submission</h4>
                  </div>
                  <textarea 
                    className="w-full h-48 bg-neutral-50 border-2 border-neutral-100 rounded-2xl p-6 text-sm font-medium leading-relaxed text-ink outline-none focus:border-indigo-600 transition-all resize-none shadow-inner"
                    placeholder="Paste the student's response or answer here..."
                    value={studentAnswer}
                    onChange={(e) => setStudentAnswer(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <button 
                      onClick={evaluateSubmission}
                      disabled={isEvaluating || !studentAnswer}
                      className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-3 shadow-xl shadow-indigo-100"
                    >
                      {isEvaluating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                      {isEvaluating ? "Analyzing Logic..." : "Verify Submission"}
                    </button>
                  </div>
                </div>
             </div>
          </Card>
        </div>

        {/* Evaluation Output */}
        <AnimatePresence>
          {evaluation && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="lg:col-span-12"
            >
              {!evaluation.isSupported ? (
                <Card className="p-10 bg-rose-50 border-2 border-rose-100 rounded-[2.5rem] flex flex-col items-center justify-center text-center space-y-4">
                  <AlertCircle className="w-16 h-16 text-rose-500" />
                  <h3 className="text-2xl font-black text-rose-900 italic">Scope Deviation Detected</h3>
                  <p className="text-rose-700 max-w-md font-medium">{evaluation.rejectionReason || "This submission falls outside your authorized subject scope."}</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                  {/* Score Card */}
                  <div className="md:col-span-4">
                    <Card className="p-10 bg-neutral-900 border-none rounded-[3rem] text-white shadow-2xl h-full flex flex-col items-center justify-center text-center relative overflow-hidden group">
                       <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity"><Trophy className="w-24 h-24" /></div>
                       <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-6 text-white/40">Evaluation Mastery</p>
                       
                       <div className="relative mb-8">
                          {editMode ? (
                            <div className="flex flex-col items-center gap-2">
                              <input 
                                type="number" 
                                className="w-24 bg-white/10 border border-white/20 rounded-xl text-4xl font-black text-center p-2 outline-none"
                                value={editedScore}
                                onChange={(e) => setEditedScore(Number(e.target.value))}
                                min="0" max="100"
                              />
                              <span className="text-[10px] font-black text-white/40">/ 100</span>
                            </div>
                          ) : (
                            <div className="relative">
                               <svg className="w-40 h-40 transform -rotate-90">
                                  <circle className="text-white/5" strokeWidth="6" fill="transparent" r="70" cx="80" cy="80" />
                                  <circle 
                                    className="text-primary transition-all duration-1000" 
                                    strokeWidth="6" 
                                    strokeDasharray={439.6} 
                                    strokeDashoffset={439.6 - (439.6 * evaluation.score) / 100} 
                                    strokeLinecap="round" 
                                    stroke="currentColor" 
                                    fill="transparent" 
                                    r="70" 
                                    cx="80" 
                                    cy="80" 
                                  />
                               </svg>
                               <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-5xl font-black italic tracking-tighter">{evaluation.score}</span>
                               </div>
                            </div>
                          )}
                       </div>

                       <div className="w-full space-y-4">
                          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/30 border-b border-white/10 pb-2">
                            <span>Status</span>
                            <span className="text-primary italic">{evaluation.score >= 90 ? 'REO Gold' : evaluation.score >= 70 ? 'Competent' : 'Developing'}</span>
                          </div>
                          {editMode ? (
                            <button onClick={handleManualSave} className="w-full py-3 bg-white text-neutral-900 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2">
                              <Save className="w-4 h-4" /> Save Adjustments
                            </button>
                          ) : (
                            <button onClick={() => setEditMode(true)} className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 border border-white/10">
                              <Edit3 className="w-4 h-4" /> Edit Assessment
                            </button>
                          )}
                       </div>
                    </Card>
                  </div>

                  {/* Feedback & Criterion Breakdown */}
                  <div className="md:col-span-8 space-y-8">
                    <Card className="p-8 md:p-10 bg-white border border-neutral-100 rounded-[3rem] shadow-xl relative overflow-hidden">
                       <div className="flex items-center gap-3 mb-6">
                          <MessageSquare className="w-5 h-5 text-indigo-600" />
                          <h4 className="text-[11px] font-black text-ink uppercase tracking-widest">Constructive Insight</h4>
                       </div>
                       
                       {editMode ? (
                         <textarea 
                           className="w-full h-32 bg-neutral-50 border-2 border-neutral-100 rounded-2xl p-4 text-sm font-medium text-ink outline-none focus:border-indigo-600 transition-all resize-none"
                           value={editedFeedback}
                           onChange={(e) => setEditedFeedback(e.target.value)}
                         />
                       ) : (
                         <p className="text-lg font-medium text-ink leading-relaxed italic border-l-4 border-indigo-100 pl-6">
                            "{evaluation.feedback}"
                         </p>
                       )}

                       <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {evaluation.criterionAnalysis?.map((item: any, i: number) => (
                            <div key={i} className="p-5 bg-neutral-50 border border-neutral-100 rounded-2xl space-y-2">
                               <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-black uppercase text-ink tracking-tight">{item.criterion}</span>
                                  <Badge className={`text-[8px] uppercase font-black border-none ${
                                    item.rating === 'High' ? 'bg-emerald-100 text-emerald-600' :
                                    item.rating === 'Mid' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'
                                  }`}>{item.rating}</Badge>
                               </div>
                               <p className="text-xs text-ink-muted font-medium italic">"{item.comment}"</p>
                            </div>
                          ))}
                       </div>

                       <div className="mt-10 flex flex-wrap gap-4">
                          <button 
                            onClick={evaluateSubmission}
                            className="flex-1 px-8 py-4 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-100 transition-all flex items-center justify-center gap-3"
                          >
                             <RefreshCw className="w-4 h-4" /> Re-sync with AI Analysis
                          </button>
                          <button className="flex-1 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-xl shadow-emerald-100 flex items-center justify-center gap-3">
                             <CheckCircle2 className="w-4 h-4" /> Commit to Record
                          </button>
                       </div>
                    </Card>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
