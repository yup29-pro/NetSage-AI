import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Network, ShieldCheck, ClipboardCheck, ListChecks, UserCheck, Terminal, Activity, Server, Wifi } from 'lucide-react';
import Dashboard from './Dashboard';

function App() {
  const [showConsole, setShowConsole] = useState(false);

  if (showConsole) {
    return <Dashboard onBack={() => setShowConsole(false)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden font-sans text-slate-900">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-64 -left-64 w-[500px] h-[500px] bg-blue-300 rounded-full blur-3xl opacity-20"
        />
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.15, 0.1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-1/2 -right-64 w-[600px] h-[600px] bg-indigo-300 rounded-full blur-3xl opacity-20"
        />
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>

      {/* Navbar */}
      <nav className="relative z-10 px-8 py-6 flex items-center">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 text-blue-600 font-bold text-2xl"
        >
          <Network size={32} />
          <span>NetSage AI</span>
        </motion.div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center justify-center pt-16 px-4">
        
        {/* Floating Badges */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="absolute top-32 left-10 md:left-32 bg-white/80 backdrop-blur-md p-3 rounded-xl shadow-lg border border-white flex items-center gap-3 z-20"
        >
          <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Secure</p>
            <p className="text-xs text-slate-500">Enterprise Grade</p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="absolute top-48 right-10 md:right-32 bg-white/80 backdrop-blur-md p-4 rounded-xl shadow-lg border border-white z-20 hidden md:block"
        >
          <p className="text-xs font-semibold text-slate-500 mb-2">Network Health</p>
          <div className="flex items-end gap-4">
            <span className="text-2xl font-bold text-blue-600">98%</span>
            <Activity size={24} className="text-blue-400 mb-1" />
          </div>
        </motion.div>

        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-4xl mx-auto"
        >
          <h1 className="text-6xl md:text-8xl font-black text-slate-900 tracking-tight mb-6">
            NetSage <span className="text-blue-600">AI</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 mb-16">
            Diagnose the fault. Confirm the evidence. You approve the fix.
          </p>
        </motion.div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl mb-16">
          {[
            { icon: ClipboardCheck, title: "Evidence-based diagnosis" },
            { icon: ListChecks, title: "Deterministic rule checks" },
            { icon: UserCheck, title: "Human review required" }
          ].map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 * (idx + 1), duration: 0.6 }}
              whileHover={{ y: -5, boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" }}
              className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center transition-all"
            >
              <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-6">
                <feature.icon size={40} strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">{feature.title}</h3>
            </motion.div>
          ))}
        </div>

        {/* Call to Action */}
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowConsole(true)}
          className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-bold text-xl flex items-center gap-4 shadow-[0_10px_40px_-10px_rgba(37,99,235,0.7)] hover:bg-blue-700 transition-colors z-20"
        >
          <div className="bg-blue-500/50 p-2 rounded-lg">
            <Terminal size={24} />
          </div>
          Enter Console
        </motion.button>
        
        {/* Floating Server Elements (Decorative) */}
        <motion.div 
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-20 right-20 text-slate-300 hidden lg:block z-0"
        >
          <Server size={120} strokeWidth={0.5} />
          <Wifi size={40} className="absolute -top-8 -left-4 text-blue-300" />
        </motion.div>

      </main>
    </div>
  );
}

export default App;
