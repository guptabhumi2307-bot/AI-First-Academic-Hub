/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  BookOpen, 
  Clock, 
  Target, 
  TrendingUp, 
  Zap, 
  CheckCircle2, 
  Sparkles, 
  MessageSquare,
  ChevronRight,
  Plus,
  ArrowUpRight,
  Brain,
  Loader2
} from "lucide-react";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db, isDemoMode } from "../lib/firebase";
import { useFirebase } from "../contexts/FirebaseContext";
import { calculateBurnoutRisk, BurnoutMetrics } from "../lib/metrics";
import { BurnoutMeter } from "./BurnoutMeter";
import { Card } from "./ui/Card";
import { Badge } from "./ui/Badge";

const StatCard = ({ icon: Icon, label, value, trend, color }: any) => (
  <Card className="flex items-center gap-6 group hover:scale-[1.02] transition-all">
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${color}`}>
      <Icon className="w-8 h-8 text-white" />
    </div>
    <div className="flex-1">
      <p className="text-[10px] uppercase font-black tracking-widest text-ink-muted">{label}</p>
      <div className="flex items-end gap-2">
        <h4 className="text-2xl font-black text-ink leading-none">{value}</h4>
        {trend && (
          <span className="text-[10px] font-bold text-green-500 flex items-center">
            <TrendingUp className="w-3 h-3 mr-0.5" /> {trend}
          </span>
        )}
      </div>
    </div>
  </Card>
);

export const Home = ({ onNavigate }: { onNavigate: (tab: string) => void }) => {
  const { user } = useFirebase();
  const [tasks, setTasks] = useState<any[]>([]);
  const [burnoutMetrics, setBurnoutMetrics] = useState<BurnoutMetrics | null>(null);

  useEffect(() => {
    if (!user) return;

    if (isDemoMode) {
      const demoTasks = [
        { priority: 'High' as const, completed: false },
        { priority: 'Medium' as const, completed: false },
        { priority: 'High' as const, completed: true },
        { priority: 'Low' as const, completed: false }
      ];
      setTasks(demoTasks);
      setBurnoutMetrics(calculateBurnoutRisk(demoTasks));
      return;
    }

    const q = query(
      collection(db!, "users", user.uid, "tasks"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => doc.data() as any);
      setTasks(tasksData);
      setBurnoutMetrics(calculateBurnoutRisk(tasksData));
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <div className="space-y-10 pb-20">
      {/* Burnout Monitoring Section */}
      <section className="relative">
        <div className="absolute inset-0 bg-primary/5 rounded-[3rem] blur-3xl -z-10" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          {burnoutMetrics ? (
            <BurnoutMeter metrics={burnoutMetrics} />
          ) : (
            <div className="glass h-[200px] rounded-[2.5rem] flex items-center justify-center border-dashed border-neutral-200">
               <div className="text-center space-y-2">
                  <Loader2 className="w-6 h-6 text-primary/40 animate-spin mx-auto" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-ink-muted">Syncing Biometrics...</p>
               </div>
            </div>
          )}
        </motion.div>
      </section>

      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="flex items-center gap-3 mb-2">
             <span className="px-3 py-1 bg-primary/5 text-primary rounded-full text-[10px] font-black uppercase tracking-widest border border-primary/5">Welcome Back</span>
             <span className="text-[10px] font-bold text-ink-muted uppercase tracking-widest italic flex items-center gap-1 group cursor-pointer hover:text-primary transition-colors">
               Saturday, April 18 <ArrowUpRight className="w-3 h-3" />
             </span>
          </div>
          <h2 className="text-4xl font-black text-ink tracking-tight">How's it going, {user?.displayName?.split(' ')[0] || 'Scholar'}?</h2>
          <p className="text-ink-muted font-light mt-1">
            {burnoutMetrics?.status === 'optimal' 
              ? "You're making great progress! Your cognitive load is optimal." 
              : burnoutMetrics?.status === 'strained'
              ? "You're working hard! Remember to pace yourself for the long haul."
              : "Burnout risk detected. Rio suggests a short break to reboot."}
          </p>
        </motion.div>
        
        <div className="flex gap-4">
           <button onClick={() => onNavigate("Planner")} className="px-6 py-3.5 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
              <Clock className="w-4 h-4" /> Resume Session
           </button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Clock} label="Study Time" value="24.5h" trend="+12%" color="bg-primary" />
        <StatCard icon={CheckCircle2} label="Goals Hit" value="18/20" trend="+5%" color="bg-indigo-500" />
        <StatCard icon={Target} label="Avg Accuracy" value="92%" trend="+2%" color="bg-teal-500" />
        <StatCard icon={Zap} label="Notes Gen" value="42" trend="+18%" color="bg-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Recent Activity & Planner Summary */}
        <div className="lg:col-span-2 space-y-8">
           {/* Daily Schedule Preview */}
           <Card className="relative overflow-hidden">
             <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
             <div className="flex items-center justify-between mb-8 relative z-10">
               <h3 className="text-xl font-bold text-ink flex items-center gap-3">
                 <CalendarIcon className="w-6 h-6 text-primary" /> Next Up Today
               </h3>
               <button onClick={() => onNavigate("Planner")} className="text-primary font-bold text-xs hover:underline flex items-center gap-1">
                 View Planner <ChevronRight className="w-3 h-3" />
               </button>
             </div>

             <div className="space-y-4 relative z-10">
                {[
                  { time: "11:00 AM", task: "Linear Algebra Homework", sub: "Math", status: "Focus Mode" },
                  { time: "02:00 PM", task: "Macroeconomics Reading", sub: "Economics", status: "Upcoming" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-6 p-4 rounded-2xl bg-white/60 hover:bg-white/80 border border-white/40 transition-all cursor-pointer group">
                    <div className="text-center w-20">
                      <p className="text-sm font-black text-ink">{item.time}</p>
                    </div>
                    <div className="h-8 w-[2px] bg-neutral-200 group-hover:bg-primary transition-colors" />
                    <div className="flex-1">
                       <h4 className="text-sm font-bold text-ink">{item.task}</h4>
                       <p className="text-[10px] text-ink-muted font-bold uppercase tracking-widest">{item.sub}</p>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${item.status === "Focus Mode" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-white/60 text-ink-muted border border-white/40"}`}>
                      {item.status}
                    </span>
                  </div>
                ))}
             </div>
           </Card>

           {/* Module Summaries */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Quiz Summary */}
              <Card>
                 <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-ink flex items-center gap-2">
                       <Zap className="w-4 h-4 text-primary" /> Latest Quiz
                    </h3>
                    <span className="text-xs font-black text-primary">High Score</span>
                 </div>
                 <div className="bg-white/40 p-6 rounded-2xl border border-white/60 mb-6 text-center">
                    <p className="text-[10px] text-ink-muted uppercase font-black mb-1">Quantum Mechanics</p>
                    <h4 className="text-4xl font-black text-primary italic">96%</h4>
                 </div>
                 <button onClick={() => onNavigate("Quizzes")} className="w-full py-3 glass text-xs font-bold text-ink-muted hover:text-primary transition-colors flex items-center justify-center gap-2">
                    Retake for Mastery <ArrowUpRight className="w-3 h-3" />
                 </button>
              </Card>

              {/* Resources Summary */}
              <Card>
                 <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-ink flex items-center gap-2">
                       <BookOpen className="w-4 h-4 text-primary" /> Recent Resource
                    </h3>
                 </div>
                 <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/60 border border-white/40 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm text-primary">
                       <BookOpen className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                       <h4 className="text-sm font-bold text-ink truncate">Neurobiology_Lecture_04.pdf</h4>
                       <p className="text-[10px] text-ink-muted font-bold tracking-tight">Added 2 hours ago</p>
                    </div>
                 </div>
                 <button onClick={() => onNavigate("Resources")} className="w-full py-3 glass text-xs font-bold text-ink-muted hover:text-primary transition-colors flex items-center justify-center gap-2">
                    Manage Files <ArrowUpRight className="w-3 h-3" />
                 </button>
              </Card>
           </div>
        </div>

        {/* Right Column: AI Insights & Quick Chat */}
        <div className="space-y-8">
           {/* Rio AI Insights Card */}
           <Card className="bg-gradient-to-br from-primary to-indigo-600 text-white border-none shadow-2xl relative overflow-hidden h-full flex flex-col">
              <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-white/10 rounded-full blur-3xl animate-pulse" />
              <div className="relative z-10 flex-1">
                 <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-8 shadow-xl border border-white/20">
                    <Sparkles className="w-10 h-10 text-white" />
                 </div>
                 <h3 className="text-2xl font-black mb-4 leading-tight italic">Rio's Academic Insights</h3>
                 <p className="text-white/80 text-sm leading-relaxed mb-10 font-medium">
                   "Based on your recent scores in Thermodynamics, focus on Entropy concepts today. You're consistently missing details in heat engine cycles."
                 </p>
                 
                 <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
                       <p className="text-[10px] font-black uppercase text-white/60 tracking-widest mb-2">Smart Recommendation</p>
                       <p className="text-xs font-bold">Generate Smart Notes for Chapter 8?</p>
                       <button onClick={() => onNavigate("Notes")} className="mt-3 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all">
                          Get Started <ChevronRight className="w-3 h-3" />
                       </button>
                    </div>
                 </div>
              </div>
              
              <button onClick={() => onNavigate("AI Chat")} className="w-full py-4 mt-12 bg-white text-primary rounded-2xl font-bold flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-indigo-900/40 relative z-10">
                 <MessageSquare className="w-5 h-5" /> Chat with Rio
              </button>
           </Card>

           {/* Performance Heatmap Mockup */}
           <Card className="space-y-4">
              <h3 className="font-bold text-ink flex items-center gap-2 text-sm">
                 <TrendingUp className="w-4 h-4 text-primary" /> Learning Intensity
              </h3>
              <div className="grid grid-cols-7 gap-1.5 pt-2">
                 {Array.from({ length: 28 }).map((_, i) => (
                   <div 
                      key={i} 
                      className={`h-2.5 rounded-sm ${
                        i % 5 === 0 ? "bg-primary" : 
                        i % 3 === 0 ? "bg-primary/60" : 
                        i % 7 === 0 ? "bg-primary/20" : "bg-white/40"
                      }`} 
                   />
                 ))}
              </div>
              <div className="flex justify-between text-[8px] font-black text-ink-muted uppercase tracking-widest px-1">
                 <span>Past 4 Weeks</span>
                 <span>Peak Growth</span>
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
};

const CalendarIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
  </svg>
);
