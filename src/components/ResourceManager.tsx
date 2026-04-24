/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { collection, query, onSnapshot, addDoc, serverTimestamp, orderBy, where } from "firebase/firestore";
import { db, isDemoMode } from "../lib/firebase";
import { useFirebase } from "../contexts/FirebaseContext";
import { motion, AnimatePresence } from "motion/react";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
import { 
  FileText, 
  Search, 
  Upload, 
  MoreVertical, 
  Filter, 
  Clock, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  FileCode,
  Folder,
  CheckCircle2,
  Bookmark,
  Loader2,
  ClipboardList,
  MessageSquare
} from "lucide-react";

interface Resource {
  id: string;
  title: string;
  type: "PDF" | "DOCX" | "QUIZ" | "FOLDER";
  subject: string;
  time: string;
  size?: string;
  isBookmarked?: boolean;
  insight?: {
    summary: string;
    topics: string[];
    difficulty: string;
  };
}

const resources: Resource[] = [
  { id: "1", title: "Organic Chemistry Notes", type: "PDF", subject: "Chemistry", time: "10 mins ago", size: "1.2 MB" },
  { id: "2", title: "History of Biology", type: "PDF", subject: "Biology", time: "1 hour ago", size: "335 KB" },
  { id: "3", title: "Differential Equations Guide", type: "PDF", subject: "Math", time: "3 days ago", size: "2.5 MB" },
  { id: "4", title: "Data Science Cheat Sheet", type: "PDF", subject: "Data Science", time: "1 week ago", size: "926 KB" },
  { id: "5", title: "Chemistry Flashcards", type: "QUIZ", subject: "Chemistry", time: "2 weeks ago", size: "584 KB", isBookmarked: true },
  { id: "6", title: "Math Practice Problems", type: "DOCX", subject: "Math", time: "2 weeks ago", size: "507 KB" },
];

const Tag = ({ children, color = "primary" }: { children: React.ReactNode; color?: string }) => (
  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
    color === "primary" ? "bg-primary/5 text-primary border border-primary/10" : "bg-white/40 text-neutral-500 border border-white/60"
  }`}>
    {children}
  </span>
);

export const ResourceManager = () => {
  const { user } = useFirebase();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("Home");
  const [localResources, setLocalResources] = useState<Resource[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [resourceQuestion, setResourceQuestion] = useState("");
  const [resourceAnswer, setResourceAnswer] = useState("");
  const [isAsking, setIsAsking] = useState(false);

  const askAboutResource = async () => {
    if (!selectedResource || !resourceQuestion.trim()) return;
    setIsAsking(true);
    setResourceAnswer("");
    try {
      if (isDemoMode) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        setResourceAnswer("Based on the document metadata, this resource focuses heavily on neural architectures and backpropagation algorithms. Would you like a deeper explanation of any specific part?");
        return;
      }

      const prompt = `Context: This is a study resource titled "${selectedResource.title}". Summary: ${selectedResource.insight?.summary}. User Question: ${resourceQuestion}`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ text: prompt }]
      });

      setResourceAnswer(response.text || "Rio is slightly confused by the depth of this document. Try rephrasing!");
    } catch (error) {
      console.error("Resource Q&A failed:", error);
    } finally {
      setIsAsking(false);
    }
  };

  useEffect(() => {
    if (!user || isDemoMode) {
      if (isDemoMode) {
        setLocalResources(resources); // Fallback to initial dummy data in demo mode
      }
      return;
    }

    const q = query(
      collection(db!, "users", user.uid, "resources"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const resourcesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        time: doc.data().createdAt?.toDate() ? doc.data().createdAt.toDate().toLocaleDateString() : "Just now"
      })) as Resource[];
      setLocalResources(resourcesData);
    });

    return () => unsubscribe();
  }, [user]);

  const filteredResources = localResources.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === "Home" || 
                            r.subject === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!user || !file) return;

    setIsUploading(true);
    try {
      // 1. Read file as base64 for Gemini
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.readAsDataURL(file);
      });
      const base64 = await base64Promise;

      // 2. Get AI Insight
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { text: `Analyze this study resource: ${file.name}. Provide a brief summary, key topics, and estimated difficulty level.` },
            { inlineData: { mimeType: file.type || "application/pdf", data: base64 } }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              topic: { type: Type.ARRAY, items: { type: Type.STRING } },
              difficulty: { type: Type.STRING, enum: ["Beginner", "Intermediate", "Advanced"] }
            },
            required: ["summary", "topic", "difficulty"]
          }
        }
      });
      
      const insightText = response.text;
      let insight = { summary: "No summary available", topics: [], difficulty: "Unknown" };
      try {
        const parsed = JSON.parse(insightText || "{}");
        insight = {
          summary: parsed.summary || "No summary",
          topics: parsed.topic || [],
          difficulty: parsed.difficulty || "Unknown"
        };
      } catch (e) {
        console.warn("AI parse failed", insightText);
      }

      const type = file.type.includes("pdf") ? "PDF" : 
                   file.type.includes("word") || file.name.endsWith(".docx") ? "DOCX" : "PDF";

      if (isDemoMode) {
        setLocalResources(prev => [{
          id: Math.random().toString(36).substr(2, 9),
          title: file.name,
          type: type as any,
          subject: activeCategory === "Home" ? "General" : activeCategory,
          size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          time: "Just now",
          isBookmarked: false,
          insight
        }, ...prev]);
        alert(`Rio analyzed your file! Summary: ${insight.summary}`);
        return;
      }

      await addDoc(collection(db!, "users", user.uid, "resources"), {
        title: file.name,
        type: type,
        subject: activeCategory === "Home" ? "General" : activeCategory,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        isBookmarked: false,
        createdAt: serverTimestamp(),
        insight
      });
      alert(`Resource "${file.name}" indexed and analyzed by Rio!`);
    } catch (error) {
      console.error("Upload/Analysis Error:", error);
      alert("Failed to sync or analyze resource. Rio might be busy!");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h2 className="text-4xl font-bold text-ink tracking-tight">Resource Manager</h2>
          <p className="text-ink-muted font-light mt-1">Organize and manage your study resources effectively.</p>
        </motion.div>
        
        <div className="flex items-center gap-3">
          <div className="glass px-4 py-2.5 rounded-2xl flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-ink">9:51 PM</span>
            </div>
            <div className="h-4 w-[1px] bg-neutral-200" />
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-ink">35min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search resources..." 
            className="w-full glass rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all border-none"
          />
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:flex-none h-[52px]">
            <input 
              type="file" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              onChange={handleUpload}
              disabled={isUploading}
            />
            <button 
              className="w-full h-full px-6 py-3.5 rounded-2xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {isUploading ? "Indexing..." : "Upload Resource"}
            </button>
          </div>
        </div>
      </div>

      {/* Categories / Filters */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
        {["Home", "Chemistry", "Biology", "Math", "Data Science", "History"].map((cat) => (
          <button 
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
              activeCategory === cat 
                ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                : "glass text-ink-muted border-white/50 hover:border-primary/30"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredResources.map((r, i) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass p-6 rounded-[2rem] hover:shadow-xl transition-all group border-white/60"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  {r.type === "QUIZ" ? <FileCode className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                </div>
                <div>
                  <h4 className="font-bold text-ink leading-tight group-hover:text-primary transition-colors">{r.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold text-ink-muted uppercase">{r.type}</span>
                    <span className="text-[10px] text-neutral-300">•</span>
                    <span className="text-[10px] font-medium text-ink-muted">{r.size || "Folder"}</span>
                  </div>
                </div>
              </div>
              <button className="p-2 hover:bg-white/40 rounded-lg text-ink-muted transition-colors">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between mt-6">
              <div className="flex gap-2">
                <Tag>{r.subject}</Tag>
                {r.isBookmarked && <Tag color="secondary"><Bookmark className="w-3 h-3" /> Bookmarked</Tag>}
              </div>
              <div className="flex items-center gap-2">
                 <button 
                  onClick={() => setSelectedResource(r)}
                  className="p-2 glass border-white/60 text-primary hover:bg-primary hover:text-white transition-all rounded-xl"
                  title="Ask Rio about this document"
                 >
                    <MessageSquare className="w-4 h-4" />
                 </button>
                 <span className="text-[10px] font-bold text-ink-muted">{r.time}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Resource Q&A Modal */}
      <AnimatePresence>
        {selectedResource && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedResource(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl glass p-10 rounded-[3rem] border-white/60 shadow-2xl space-y-8"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/20">
                    <FileText className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-ink">{selectedResource.title}</h3>
                    <p className="text-[10px] uppercase font-black tracking-widest text-primary">Semantic Resource Query</p>
                  </div>
                </div>
                <button onClick={() => setSelectedResource(null)} className="p-3 glass hover:bg-neutral-100 rounded-2xl text-ink-muted transition-all">
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-5 bg-white/40 rounded-2xl border border-white/60">
                   <p className="text-[10px] uppercase font-black text-ink-muted mb-2 tracking-widest">Document Insight</p>
                   <p className="text-sm text-ink leading-relaxed font-medium italic">"{selectedResource.insight?.summary || "No automated summary available yet. Scanning complete."}"</p>
                </div>

                <div className="space-y-4">
                   <div className="relative">
                      <input 
                        type="text" 
                        value={resourceQuestion}
                        onChange={(e) => setResourceQuestion(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && askAboutResource()}
                        placeholder={`Ask Rio about ${selectedResource.title}...`}
                        className="w-full glass bg-white focus:bg-white rounded-2xl py-4 pl-5 pr-16 text-sm border-none shadow-sm focus:ring-2 ring-primary/20 transition-all font-medium"
                      />
                      <button 
                        onClick={askAboutResource}
                        disabled={isAsking || !resourceQuestion.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 disabled:opacity-50 hover:scale-105 transition-all"
                      >
                         {isAsking ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
                      </button>
                   </div>
                </div>

                {resourceAnswer && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 bg-primary/5 rounded-3xl border border-primary/10 space-y-3"
                  >
                    <div className="flex items-center gap-2">
                       <CheckCircle2 className="w-4 h-4 text-primary" />
                       <span className="text-[10px] font-black uppercase text-primary tracking-widest">Rio's Analysis</span>
                    </div>
                    <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{resourceAnswer}</p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Status Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-5xl glass-dark rounded-3xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 z-40 border-white/10 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 text-white">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold">7 resources selected</span>
          </div>
          <button className="text-xs font-bold text-white/60 hover:text-white transition-colors">Clear</button>
          <div className="h-4 w-[1px] bg-white/10 mx-2" />
          <button className="p-2 text-white/60 hover:text-red-400 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/60 group-hover:bg-white/20">
              <ChevronLeft className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-white px-3">Page 1 of 3</span>
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/60 group-hover:bg-white/20">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
