/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider } from './components/AuthProvider';
import { ReportForm } from './components/ReportForm';
import { ReportFeed } from './components/ReportFeed';
import { ProfileView } from './components/ProfileView';
import { subscribeToReports, subscribeToUser } from './lib/api';
import { auth, db } from './lib/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { Leaf, Camera, LayoutGrid, GraduationCap, MapPin, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

export default function App() {
  const [activeTab, setActiveTab] = useState<'feed' | 'profile'>('feed');
  const [reports, setReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [userPoints, setUserPoints] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeToReports((data) => {
      setReports(data);
      setLoadingReports(false);
    });
    
    let userUnsub: any;
    if (auth.currentUser) {
       userUnsub = onSnapshot(doc(db, 'users', auth.currentUser.uid), (doc) => {
         if (doc.exists()) {
           setUserPoints(doc.data().points || 0);
         }
       });
    }

    return () => {
      unsubscribe();
      if (userUnsub) userUnsub();
    };
  }, []);

  return (
    <AuthProvider>
      <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-primary/30 flex flex-col">
        {/* Navigation / Header */}
        <header className="flex flex-col md:flex-row justify-between items-center border-b border-zinc-800 p-8 py-10 gap-6">
          <div className="text-center md:text-left">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white uppercase">Tosser</h1>
            <p className="text-sm text-zinc-500 mt-2 font-medium">The Environmental Resistance. Swiping for shift.</p>
          </div>
          
          <div className="flex flex-col md:items-end gap-3">
            <div className="bg-primary/10 border border-primary/20 text-primary px-3 py-1 text-[10px] font-bold uppercase rounded-full inline-block self-center md:self-end">
              {reports.length} Incidents Logged
            </div>
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center md:items-end">
                 <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Global Score</span>
                 <span className="font-bold text-white text-2xl">{userPoints}</span>
              </div>
              <button 
                onClick={() => setActiveTab('profile')}
                className="w-12 h-12 rounded-full border border-zinc-800 overflow-hidden shadow-lg hover:border-primary transition-all p-0.5"
              >
                <img src={auth.currentUser?.photoURL || ''} alt="User" className="w-full h-full object-cover rounded-full" />
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Side Nav for desktop */}
          <nav className="hidden md:flex flex-col border-r border-zinc-800 w-24 items-center py-10 gap-10 bg-zinc-950/50">
            {[
              { id: 'feed', icon: <LayoutGrid size={22} />, label: 'Home' },
              { id: 'profile', icon: <UserIcon size={22} />, label: 'Profile' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "p-4 transition-all relative group flex flex-col items-center gap-2",
                  activeTab === tab.id ? "text-primary" : "text-zinc-600 hover:text-white"
                )}
              >
                {tab.icon}
                <span className="text-[9px] font-bold uppercase tracking-wider opacity-60">
                  {tab.label}
                </span>
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute right-0 top-1/4 bottom-1/4 w-1 bg-primary rounded-l-full" 
                  />
                )}
              </button>
            ))}
          </nav>

          <main className="flex-1 overflow-y-auto p-6 md:p-12">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'feed' && <ReportFeed reports={reports} loading={loadingReports} />}
                {activeTab === 'profile' && <ProfileView />}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        {/* Footer Ticker */}
        <footer className="h-10 border-t border-zinc-800 bg-zinc-900/50 backdrop-blur-md text-zinc-500 flex items-center overflow-hidden whitespace-nowrap text-[9px] font-bold uppercase tracking-widest">
          <div className="flex space-x-12 animate-marquee">
            <span className="px-4">Stop The Toss</span>
            <span className="px-4 text-white">Action = Impact</span>
            <span className="px-4">{reports.length} Flagged</span>
            <span className="px-4 text-primary">Join the resistance</span>
            <span className="px-4 text-white">Keep it clean</span>
            <span className="px-4">Stop Lumping It</span>
            {/* Duplicate for seamless marquee */}
            <span className="px-4">Stop The Toss</span>
            <span className="px-4 text-white">Action = Impact</span>
            <span className="px-4">{reports.length} Flagged</span>
            <span className="px-4 text-primary">Join the resistance</span>
            <span className="px-4 text-white">Keep it clean</span>
            <span className="px-4">Stop Lumping It</span>
          </div>
        </footer>

        {/* Mobile Nav */}
        <nav className="md:hidden sticky bottom-0 bg-zinc-900 border-t border-zinc-800 flex justify-around p-5 z-50 rounded-t-3xl shadow-2xl backdrop-blur-xl">
          {[
            { id: 'feed', icon: <LayoutGrid size={22} /> },
            { id: 'profile', icon: <UserIcon size={22} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "p-2 transition-all rounded-full",
                activeTab === tab.id ? "text-primary bg-primary/10" : "text-zinc-600"
              )}
            >
              {tab.icon}
            </button>
          ))}
        </nav>
      </div>
    </AuthProvider>
  );
}
