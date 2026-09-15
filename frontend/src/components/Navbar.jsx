import React, { useState, useEffect } from 'react';
import { Sparkles, AlertTriangle, Github, User, LayoutGrid } from 'lucide-react';
import TozoMascot from './TozoMascot';
import { getCurrentUser } from '../services/auth';


export default function Navbar({ backendStatus, activeTab = 'home', onTabChange, onReset }) {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
    const handleStorageChange = () => {
      setCurrentUser(getCurrentUser());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const isOnline = backendStatus && backendStatus.status === 'healthy';
  const aiEnabled = backendStatus?.ai_enabled;

  return (
    <header className="border-b border-slate-800/80 bg-dusk-base/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center space-x-6">
          <div 
            onClick={() => {
              if (onReset) onReset();
              if (onTabChange) onTabChange('home');
            }}
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

          {/* Navigation Tabs: Home vs My Space */}
          <nav className="hidden md:flex items-center space-x-1 bg-dusk-surface/80 p-1 rounded-2xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => onTabChange && onTabChange('home')}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'home'
                  ? 'bg-amber-collar text-dusk-base shadow-sm font-extrabold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Explore</span>
            </button>

            <button
              onClick={() => onTabChange && onTabChange('myspace')}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'myspace'
                  ? 'bg-amber-collar text-dusk-base shadow-sm font-extrabold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {currentUser?.avatar_url ? (
                <img src={currentUser.avatar_url} alt="Profile" className="w-4 h-4 rounded-full border border-dusk-base shrink-0" />
              ) : (
                <User className="w-3.5 h-3.5" />
              )}
              <span>My Space</span>
              {currentUser && (
                <span className="w-2 h-2 rounded-full bg-moss-trail animate-pulse" />
              )}
            </button>
          </nav>
        </div>

        {/* Right Status Indicators & My Space Mobile CTA */}
        <div className="flex items-center space-x-3">
          {/* Mobile Navigation Button */}
          <button
            onClick={() => onTabChange && onTabChange(activeTab === 'myspace' ? 'home' : 'myspace')}
            className="md:hidden px-3 py-1.5 rounded-xl text-xs font-bold bg-dusk-surface border border-slate-700 text-amber-collar flex items-center space-x-1.5"
          >
            {currentUser?.avatar_url ? (
              <img src={currentUser.avatar_url} alt="Profile" className="w-4 h-4 rounded-full" />
            ) : (
              <User className="w-3.5 h-3.5" />
            )}
            <span>{activeTab === 'myspace' ? 'Explore' : 'My Space'}</span>
          </button>

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
            href="https://github.com/Amrit-raj50/Tozo"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl text-slate-400 hover:text-amber-collar hover:bg-slate-800/80 transition-colors"
            title="GitHub Repository"
          >
            <Github className="w-5 h-5" />
          </a>
        </div>
      </div>
    </header>
  );
}
