import React from "react";
import { motion } from "framer-motion";
import { Ship, Truck, Globe, Zap } from "lucide-react";

export const LogisticsLoader = ({ message = "Initializing Ozmae System..." }: { message?: string }) => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950 overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px] animate-pulse delay-700" />
      </div>

      <div className="relative flex flex-col items-center">
        {/* Central Core */}
        <div className="relative mb-12">
          <motion.div
            animate={{ 
              rotate: 360,
              scale: [1, 1.1, 1],
            }}
            transition={{ 
              rotate: { duration: 20, repeat: Infinity, ease: "linear" },
              scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }
            }}
            className="h-32 w-32 rounded-full border border-accent/30 flex items-center justify-center bg-slate-900/50 backdrop-blur-xl shadow-2xl shadow-accent/20"
          >
            <Globe className="h-16 w-16 text-accent animate-pulse" />
          </motion.div>

          {/* Orbiting Elements */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute inset-x-[-40px] inset-y-[-40px]"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 p-2 bg-slate-800 rounded-lg border border-accent/40 shadow-lg">
              <Ship className="h-5 w-5 text-accent" />
            </div>
          </motion.div>

          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            className="absolute inset-x-[-65px] inset-y-[-65px]"
          >
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 p-2 bg-slate-800 rounded-lg border border-indigo-400/40 shadow-lg">
              <Truck className="h-5 w-5 text-indigo-400" />
            </div>
          </motion.div>
        </div>

        {/* Text and Progress */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3 justify-center"
          >
            <Zap className="h-4 w-4 text-accent animate-bounce" />
            <h2 className="text-xl font-black text-white uppercase tracking-[0.2em]">{message}</h2>
          </motion.div>
          
          <div className="w-64 h-1.5 bg-slate-800 rounded-full overflow-hidden relative border border-white/5">
            <motion.div
              initial={{ left: "-100%" }}
              animate={{ left: "100%" }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-accent to-transparent"
            />
          </div>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pt-2"
          >
            Synchronizing Global Nodes...
          </motion.p>
        </div>
      </div>
    </div>
  );
};
