/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GoogleGenAI, Type } from "@google/genai";
import { isDemoMode } from "../lib/firebase";
import { 
  Upload, 
  FileText, 
  Sparkles, 
  Zap, 
  CheckCircle2, 
  Type as TypeIcon, 
  FileCheck, 
  RotateCcw,
  Copy,
  Download,
  Share2,
  Highlighter,
  Layout,
  Layers,
  FileSearch,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mic,
  MicOff,
  CircleStop,
  Clock
} from "lucide-react";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`glass rounded-[2rem] p-8 border-white/60 shadow-xl ${className}`}>
    {children}
  </div>
);

export const SmartNotes = () => {
  const [activeStyle, setActiveStyle] = useState("Detailed");
  const [isFlipped, setIsFlipped] = useState(false);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedNotes, setGeneratedNotes] = useState<any>(null);
  const [flashcards, setFlashcards] = useState<{ question: string; answer: string }[]>([]);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const generateFlashcards = async () => {
    if (!generatedNotes || isGeneratingFlashcards) return;
    setIsGeneratingFlashcards(true);
    try {
      const hasKey = !!process.env.GEMINI_API_KEY;

      if (!hasKey && isDemoMode) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        setFlashcards([
          { question: "What is active learning?", answer: "Strategic engagement that increases student retention by 40%." },
          { question: "Define Metacognition.", answer: "The awareness and understanding of one's own thought processes." },
          { question: "What does Scaffolding help with?", answer: "Transitioning learners from dependence to autonomy." }
        ]);
        return;
      }

      if (!hasKey) {
        throw new Error("Gemini API Key is missing.");
      }

      const contextForFlashcards = `
        Title: ${generatedNotes.title}
        Definition: ${generatedNotes.definition}
        Key Points: ${generatedNotes.keyPoints?.join(", ") || ""}
        Sections: ${generatedNotes.sections?.map((s: any) => `${s.heading}: ${s.content}`).join(" | ") || ""}
        Terms: ${generatedNotes.terms?.map((t: any) => `${t.term}: ${t.definition}`).join("; ") || ""}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ text: `Analyze these study notes and generate 5 highly relevant conceptual flashcards that test the user's understanding of key principles and terminology.
        
        Notes Context:
        ${contextForFlashcards}
        
        Requirements:
        1. Focus on higher-order thinking questions (Why/How) rather than just simple definitions.
        2. Ensure answers are concise but academically rigorous.
        3. Respond strictly with a JSON array of objects having "question" and "answer" properties.` }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                answer: { type: Type.STRING }
              },
              required: ["question", "answer"]
            }
          }
        }
      });
      const text = response.text;
      if (!text) throw new Error("Empty AI response");
      const data = JSON.parse(text);
      setFlashcards(data);
      setCurrentFlashcardIndex(0);
      setIsFlipped(false);
    } catch (error) {
      console.error("Flashcard generation failed:", error);
      alert("Rio couldn't generate flashcards. Please ensure your notes are generated first.");
    } finally {
      setIsGeneratingFlashcards(false);
    }
  };
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/wav" });
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(",")[1];
          setAudioBase64(base64);
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      console.error("Recording failed:", err);
      alert("Microphone access denied or error occurred.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const handleGenerate = async () => {
    if ((!input.trim() && !audioBase64) || isGenerating) return;

    setIsGenerating(true);
    try {
      // Prioritize Real AI if key exists, otherwise check demo mode
      const hasKey = !!process.env.GEMINI_API_KEY;

      if (!hasKey && isDemoMode) {
        // Simulation for Demo Mode
        await new Promise(resolve => setTimeout(resolve, 2000));
        const demoNotes = {
          title: input ? `Analysis: ${input.split(' ').slice(0, 5).join(' ')}...` : "Simulation: Advanced Pedagogy",
          definition: input ? `An AI-synthesized overview based on your input: "${input.substring(0, 50)}..."` : "A synthesized overview of educational strategies and instructional design.",
          sections: [
            { heading: "Foundational Concepts", content: "Active learning is a method of learning in which students are actively or experientially involved in the learning process and where there are different levels of active learning, depending on student involvement." },
            { heading: "Instructional Scaffolding", content: "Instructional scaffolding is a process through which a teacher adds support for students in order to enhance learning and aid in the mastery of tasks." }
          ],
          keyPoints: [
            "Active learning increases student engagement by 40%.",
            "Scaffolding helps transition learners from dependence to autonomy.",
            "Metacognition is the awareness and understanding of one's own thought processes."
          ],
          formula: "Efficiency = (Knowledge * Retention) / Time",
          actionItems: ["Review specific sections in text", "Cross-reference with lecture audio"],
          deadlines: ["Weekly Quiz: Friday", "Project Draft: Two weeks"],
          terms: [
            { term: "Heuristic", definition: "A mental shortcut that allows people to solve problems quickly." },
            { term: "Cognitive Load", definition: "The amount of information that working memory can hold at once." }
          ]
        };
        setGeneratedNotes(demoNotes);
        setIsGenerating(false);
        return;
      }

      if (!hasKey) {
        throw new Error("Gemini API Key is missing. Please add it to your environment.");
      }

      const parts: any[] = [
        { text: `You are an elite academic synthesizer. Analyze the provided study material and generate a high-rigor structured study guide.
        
        Style: ${activeStyle === "Detailed" ? "Comprehensive, prioritizing deep mechanics and 'Why' explanations" : "Concise, prioritizing high-impact 'What' facts and speed-reading structures"}.
        
        Material to analyze:
        ${input ? `TEXT INPUT: "${input}"\n` : ""}
        ${audioBase64 ? "AUDIO INPUT: (Attached audio transcript/recording)\n" : ""}

        Required Output Structure:
        1. title: A professional academic title.
        2. definition: A 1-2 sentence core definition of the subject.
        3. sections: An array of { heading, content } objects providing structured, logical breakdowns of the content.
        4. keyPoints: An array of high-impact factual takeaways.
        5. formula: The most important symbolic representation or "Golden Rule".
        6. actionItems: An array of tasks (e.g., "Practice problem set 4").
        7. deadlines: Any mentioned dates or timeframes.
        8. terms: Array of { term, definition } for key vocabulary.

        Instructions for Maximum Rigor:
        - Identify specific academic branches and use domain-specific terminology.
        - Explain relationships between concepts in the sections content.
        - Ensure action items are practical and derived from the context.` }
      ];

      if (audioBase64) {
        parts.push({
          inlineData: {
            mimeType: "audio/wav",
            data: audioBase64
          }
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              definition: { type: Type.STRING },
              sections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    heading: { type: Type.STRING },
                    content: { type: Type.STRING }
                  },
                  required: ["heading", "content"]
                }
              },
              keyPoints: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              formula: { type: Type.STRING },
              actionItems: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              deadlines: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              terms: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    term: { type: Type.STRING },
                    definition: { type: Type.STRING }
                  }
                }
              }
            },
            required: ["title", "definition", "keyPoints", "sections"]
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("Empty AI response");
      const data = JSON.parse(text);
      setGeneratedNotes(data);
    } catch (error) {
      console.error("Notes Generation failed:", error);
      alert("Rio had an issue synthesizing your notes. Please check your material and try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <h2 className="text-4xl font-black text-ink tracking-tight">Smart Notes Generator</h2>
        <p className="text-ink-muted font-light">Create concise, intelligent notes from any study material in seconds.</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Column: Input & Analysis */}
        <div className="space-y-8">
          {/* Upload Section */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> Input Material
              </h3>
              <div className="flex items-center gap-2">
                {isRecording ? (
                  <motion.button 
                    animate={{ 
                      scale: [1, 1.05, 1],
                      boxShadow: ["0 0 0px rgba(239, 68, 68, 0)", "0 0 20px rgba(239, 68, 68, 0.4)", "0 0 0px rgba(239, 68, 68, 0)"]
                    }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    onClick={stopRecording}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg border border-white/20"
                  >
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    Stop Recording
                  </motion.button>
                ) : (
                  <button 
                    onClick={startRecording}
                    className="flex items-center gap-2 px-4 py-2 bg-[#151619] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg border border-white/10 hover:bg-black transition-all group"
                  >
                    <Mic className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" /> 
                    Record Lecture
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-4 mb-6">
              {audioBase64 && !isRecording && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between mb-4 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500 text-white rounded-lg flex items-center justify-center">
                      <Mic className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-900">Audio Lecture Captured</p>
                      <p className="text-[10px] text-emerald-600 font-medium">Ready for AI processing</p>
                    </div>
                  </div>
                  <button onClick={() => setAudioBase64(null)} className="text-emerald-400 hover:text-emerald-600">
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              <textarea 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste text OR Record a lecture above... Rio will merge both contexts into your notes."
                className="w-full h-48 bg-white/20 border border-white/60 rounded-[1.5rem] p-6 text-sm text-ink outline-none focus:ring-4 ring-primary/10 transition-all resize-none font-light leading-relaxed"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button 
                onClick={handleGenerate}
                disabled={isGenerating || (!input.trim() && !audioBase64)}
                className={`flex-1 min-w-[140px] px-6 py-3.5 rounded-2xl font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition-all ${
                  isGenerating ? "bg-neutral-100 text-neutral-400" : "bg-primary text-white shadow-primary/30 hover:scale-105 active:scale-95"
                }`}
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isGenerating ? "Rio is Synthesizing..." : "Process with Rio AI"}
              </button>
              <button 
                 onClick={() => { setInput(""); setGeneratedNotes(null); setAudioBase64(null); }}
                 className="px-6 py-3.5 border border-white/60 text-ink font-bold rounded-2xl hover:bg-white/40 transition-all font-black text-xs uppercase tracking-widest"
              >
                Reset
              </button>
            </div>
          </Card>

          {/* Highlighted Terms */}
          <Card className={generatedNotes ? "opacity-100" : "opacity-50 pointer-events-none"}>
            <h3 className="text-lg font-bold text-ink mb-6 flex items-center gap-2">
              <Highlighter className="w-5 h-5 text-primary" /> Key Concepts Extracted
            </h3>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(generatedNotes?.terms || [{ term: "Analysis Pending", definition: "Rio is waiting for input..." }]).map((item: any, i: number) => (
                  <motion.div 
                    key={i} 
                    whileHover={{ scale: 1.05 }}
                    className="group relative"
                  >
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-neutral-100 shadow-sm text-xs font-bold text-ink hover:border-primary transition-colors cursor-pointer">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      {item.term}
                    </div>
                    <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-ink text-white text-[10px] rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-2xl">
                      <p className="font-black uppercase text-primary mb-1 tracking-widest">Definition</p>
                      {item.definition}
                      <div className="absolute top-full left-4 border-8 border-transparent border-t-ink" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Results & Tools */}
        <div className="space-y-8">
          {/* Output Card */}
          <Card className="p-0 border-primary/20 overflow-hidden">
            <div className="p-8 border-b border-primary/10 bg-primary/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30">
                  <FileCheck className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-primary">Generated Notes</h3>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2.5 rounded-xl hover:bg-primary/10 text-primary transition-colors"><Copy className="w-5 h-5" /></button>
                <button className="p-2.5 rounded-xl hover:bg-primary/10 text-primary transition-colors"><Download className="w-5 h-5" /></button>
                <button className="p-2.5 rounded-xl hover:bg-primary/10 text-primary transition-colors"><Share2 className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="p-8 space-y-8 min-h-[400px]">
              <AnimatePresence mode="wait">
                {!generatedNotes && !isGenerating ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center h-full text-center space-y-4 py-20"
                  >
                    <BookOpen className="w-16 h-16 text-neutral-200" />
                    <p className="text-sm text-ink-muted font-light italic">Waiting for input material...</p>
                  </motion.div>
                ) : isGenerating ? (
                   <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center h-full space-y-6 py-20"
                  >
                    <div className="relative">
                      <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                      <Sparkles className="w-8 h-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                    </div>
                    <p className="text-sm font-bold text-primary animate-bounce">Rio is synthesizing knowledge...</p>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                  >
                    <h4 className="text-2xl font-black text-ink tracking-tight italic">{generatedNotes.title}</h4>
                    <div className="space-y-8">
                      <div className="flex gap-4 p-5 bg-primary/5 rounded-[1.5rem] border border-primary/10">
                        <Sparkles className="w-6 h-6 text-primary shrink-0" />
                        <p className="text-sm text-ink leading-relaxed">
                          <strong className="text-primary tracking-tight font-black uppercase text-[10px] block mb-1">Executive Summary</strong> 
                          {generatedNotes.definition}
                        </p>
                      </div>

                      {/* Structured Sections */}
                      {generatedNotes.sections?.map((section: any, i: number) => (
                        <div key={i} className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-[1px] bg-neutral-200" />
                            <h5 className="font-black text-[11px] uppercase tracking-[0.2em] text-primary">{section.heading}</h5>
                            <div className="flex-1 h-[1px] bg-neutral-100" />
                          </div>
                          <p className="text-sm text-ink-muted leading-relaxed font-light pl-4 border-l border-neutral-100">
                            {section.content}
                          </p>
                        </div>
                      ))}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <p className="text-sm font-bold text-ink uppercase tracking-widest text-[10px] flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Key Takeaways
                          </p>
                          <ul className="space-y-3 pl-2">
                            {generatedNotes.keyPoints.map((p: string, i: number) => (
                              <li key={i} className="flex gap-3 text-xs text-ink-muted leading-relaxed items-start group">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary/30 group-hover:bg-primary transition-colors mt-1.5 shrink-0" />
                                {p}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* AI Extracted Actions */}
                        <div className="space-y-4">
                          {generatedNotes.actionItems?.length > 0 && (
                            <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-100">
                              <p className="text-[10px] font-black uppercase text-ink-muted tracking-[0.2em] mb-4">Study Plan</p>
                              <ul className="space-y-3">
                                {generatedNotes.actionItems.map((task: string, i: number) => (
                                  <li key={i} className="text-[11px] font-bold text-ink flex items-center gap-3 group cursor-pointer">
                                    <div className="w-5 h-5 rounded-lg border-2 border-neutral-200 group-hover:border-primary group-hover:bg-primary/5 flex items-center justify-center transition-all">
                                      <CheckCircle2 className="w-3 h-3 text-transparent group-hover:text-primary" />
                                    </div>
                                    {task}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {generatedNotes.deadlines?.length > 0 && (
                            <div className="p-5 bg-rose-50/50 rounded-2xl border border-rose-100/50">
                              <p className="text-[10px] font-black uppercase text-rose-600 tracking-[0.2em] mb-4">Milestones</p>
                              <ul className="space-y-3">
                                {generatedNotes.deadlines.map((date: string, i: number) => (
                                  <li key={i} className="text-[11px] font-bold text-rose-900 flex items-center gap-3">
                                    <Clock className="w-4 h-4 text-rose-400" /> {date}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>

                      {generatedNotes.formula && (
                        <div className="glass p-6 rounded-2xl border-white/60 bg-primary/5">
                          <p className="text-xs font-black text-primary uppercase tracking-widest mb-2">Technical Core</p>
                          <p className="text-lg font-bold text-ink font-mono">{generatedNotes.formula}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Card>

          {/* Style Selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={() => setActiveStyle("Detailed")}
              className={`p-6 rounded-[2rem] border-2 transition-all text-left space-y-2 relative overflow-hidden group ${
                activeStyle === "Detailed" 
                  ? "bg-gradient-to-br from-indigo-600 via-primary to-purple-700 border-none shadow-xl shadow-primary/30 text-white" 
                  : "glass border-white/60 hover:border-primary/30"
              }`}
            >
              <div className={`p-3 rounded-xl w-fit transition-colors ${activeStyle === "Detailed" ? "bg-white/20 text-white" : "bg-indigo-50/60 text-ink-muted border border-indigo-100/50"}`}>
                <Layout className="w-6 h-6 animate-pulse" />
              </div>
              <p className={`font-bold transition-colors ${activeStyle === "Detailed" ? "text-white" : "text-ink"}`}>Detailed Notes</p>
              <p className={`text-xs transition-colors ${activeStyle === "Detailed" ? "text-white/80" : "text-ink-muted"}`}>In-depth and structured content with evidence.</p>
            </button>
            <button 
              onClick={() => setActiveStyle("Quick")}
              className={`p-6 rounded-[2rem] border-2 transition-all text-left space-y-2 relative overflow-hidden group ${
                activeStyle === "Quick" 
                  ? "bg-gradient-to-br from-indigo-600 via-primary to-purple-700 border-none shadow-xl shadow-primary/30 text-white" 
                  : "glass border-white/60 hover:border-primary/30"
              }`}
            >
              <div className={`p-3 rounded-xl w-fit transition-colors ${activeStyle === "Quick" ? "bg-white/20 text-white" : "bg-indigo-50/60 text-ink-muted border border-indigo-100/50"}`}>
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <p className={`font-bold transition-colors ${activeStyle === "Quick" ? "text-white" : "text-ink"}`}>Quick Summary</p>
              <p className={`text-xs transition-colors ${activeStyle === "Quick" ? "text-white/80" : "text-ink-muted"}`}>Short and concise overview for quick review.</p>
            </button>
          </div>

          {/* Flashcards Preview */}
          <Card className="bg-white/40 border border-white/60">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" /> Flashcards
              </h3>
              <button 
                onClick={generateFlashcards}
                disabled={!generatedNotes || isGeneratingFlashcards}
                className="px-4 py-2 bg-primary text-white text-[10px] font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                {isGeneratingFlashcards ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {isGeneratingFlashcards ? "Generating..." : flashcards.length > 0 ? "Regenerate" : "Create Flashcards"}
              </button>
            </div>
            
            <div className="perspective-1000">
              {flashcards.length > 0 ? (
                <motion.div
                  key={currentFlashcardIndex}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <motion.div
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
                    onClick={() => setIsFlipped(!isFlipped)}
                    style={{ transformStyle: "preserve-3d" }}
                    className="w-full h-48 relative cursor-pointer"
                  >
                    {/* Front */}
                    <div 
                      className="absolute inset-0 backface-hidden glass bg-white flex flex-col items-center justify-center p-8 rounded-[2rem] text-center"
                    >
                      <p className="text-[10px] uppercase font-bold text-primary mb-2 tracking-widest">Question</p>
                      <p className="text-lg font-bold text-ink leading-tight">{flashcards[currentFlashcardIndex].question}</p>
                    </div>
                    {/* Back */}
                    <div 
                      className="absolute inset-0 backface-hidden glass bg-primary text-white flex flex-col items-center justify-center p-8 rounded-[2rem] text-center"
                      style={{ transform: "rotateY(180deg)" }}
                    >
                      <p className="text-[10px] uppercase font-bold text-white/60 mb-2 tracking-widest">Answer</p>
                      <p className="text-sm font-medium leading-relaxed">{flashcards[currentFlashcardIndex].answer}</p>
                    </div>
                  </motion.div>
                </motion.div>
              ) : (
                <div className="w-full h-48 border-2 border-dashed border-neutral-200 rounded-[2rem] flex flex-col items-center justify-center text-center p-8 text-neutral-400">
                   <Sparkles className="w-8 h-8 mb-2 opacity-30" />
                   <p className="text-xs font-medium">Generate notes first, then create flashcards to test your knowledge.</p>
                </div>
              )}
            </div>
            
            {flashcards.length > 0 && (
              <div className="flex items-center justify-center gap-6 mt-6">
                <button 
                  onClick={() => {
                    setCurrentFlashcardIndex(prev => (prev > 0 ? prev - 1 : flashcards.length - 1));
                    setIsFlipped(false);
                  }}
                  className="p-2 text-ink-muted hover:text-primary transition-colors focus:ring-2 ring-primary/20 rounded-lg"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest group" onClick={() => setIsFlipped(!isFlipped)}>
                  <RotateCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" /> Flip Card
                </button>
                <button 
                  onClick={() => {
                    setCurrentFlashcardIndex(prev => (prev < flashcards.length - 1 ? prev + 1 : 0));
                    setIsFlipped(false);
                  }}
                  className="p-2 text-ink-muted hover:text-primary transition-colors focus:ring-2 ring-primary/20 rounded-lg"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            )}
            
            {flashcards.length > 0 && (
              <p className="text-center text-[10px] font-black text-ink-muted uppercase tracking-widest mt-4">
                Card {currentFlashcardIndex + 1} of {flashcards.length}
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
