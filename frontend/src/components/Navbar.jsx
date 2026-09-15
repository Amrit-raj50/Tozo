import React from 'react';
import { Sparkles, AlertTriangle, Github, Compass } from 'lucide-react';
import TozoMascot from './TozoMascot';

export default function Navbar({ backendStatus, onReset }) {
  const isOnline = backendStatus && backendStatus.status === 'healthy';
  const aiEnabled = backendStatus?.ai_enabled;

  return (
    <header className="border-b border-slate-800/80 bg-dusk-base/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <div 
          onClick={onReset}
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-2xl bg-amber-collar/15 border border-amber-collar/30 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
            <TozoMascot pose="paw" className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-xl text-cream-text font-display tracking-tight">Tozo</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-collar/15 text-amber-collar border border-amber-collar/30">
                Companion
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">AI Repo Analyzer &amp; Trail Guide</p>
          </div>
        </div>

        {/* Status Indicators & External Link */}
        <div className="flex items-center space-x-3">
          {isOnline ? (
            aiEnabled ? (
              <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
                <Sparkles className="w-3.5 h-3.5 text-amber-collar" />
                <span className="hidden sm:inline">AI Engine</span>
                <span>Active</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20" title="API_KEY is not configured. Running free static analysis.">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Static Only</span>
              </div>
            )
          ) : (
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-amber-collar animate-pulse" />
              <span>Connecting...</span>
            </div>
          )}

          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl text-slate-400 hover:text-amber-collar hover:bg-slate-800/80 transition-colors"
            title="GitHub"
          >
            <Github className="w-5 h-5" />
          </a>
        </div>
      </div>
    </header>
  );
}
