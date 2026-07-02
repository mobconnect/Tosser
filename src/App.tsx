/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider } from './components/AuthProvider';
import { LanguageProvider, useLanguage, LANGUAGES } from './components/LanguageContext';
import { ReportForm } from './components/ReportForm';
import { ReportFeed } from './components/ReportFeed';
import { ProfileView } from './components/ProfileView';
import { Leaderboard } from './components/Leaderboard';
import { subscribeToReports, subscribeToUser } from './lib/api';
import { auth, db } from './lib/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { Leaf, Camera, LayoutGrid, GraduationCap, MapPin, User as UserIcon, Trophy, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { COUNTRIES } from './lib/countries';
import { PaypalQrWidget } from './components/PaypalQrWidget';
import { EnvironmentalEmergencyButton } from './components/EnvironmentalEmergencyButton';

function AppContent() {
  const [activeTab, setActiveTab] = useState<'feed' | 'profile' | 'leaderboard'>('feed');
  const [reports, setReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [userPoints, setUserPoints] = useState(0);
  const { language, setLanguage, country, setCountry, t } = useLanguage();
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isCountryMenuOpen, setIsCountryMenuOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

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
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-primary/30 flex flex-col">
      {/* Navigation / Header */}
      <header className="flex flex-col md:flex-row justify-between items-center border-b border-zinc-800 p-8 py-10 gap-6">
        <div className="text-center md:text-left">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white uppercase">{t('tosser')}</h1>
          <p className="text-sm text-zinc-500 mt-2 font-medium">{t('tagline')}</p>
        </div>
        
        <div className="flex flex-col md:items-end gap-3 w-full md:w-auto">
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 self-center md:self-end">
            {/* Environmental Emergency response trigger */}
            <EnvironmentalEmergencyButton />

            {/* Country Selector Selector dropdown */}
            <div className="relative z-40">
              <button
                onClick={() => setIsCountryMenuOpen(!isCountryMenuOpen)}
                className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <MapPin size={13} className="text-primary" />
                <span>{COUNTRIES.find(c => c.code === country)?.flag} {COUNTRIES.find(c => c.code === country)?.name}</span>
              </button>
              
              <AnimatePresence>
                {isCountryMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => { setIsCountryMenuOpen(false); setCountrySearch(''); }} />
                    <motion.div
                      initial={{ opacity: 0, y: 5, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 5, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-64 max-h-80 overflow-hidden bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-20 flex flex-col"
                    >
                      {/* Search Bar inside Country dropdown */}
                      <div className="p-2 border-b border-zinc-800 sticky top-0 bg-zinc-900">
                        <input
                          type="text"
                          placeholder="Search country..."
                          value={countrySearch}
                          onChange={(e) => setCountrySearch(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-xl text-xs text-white outline-none focus:border-primary/50"
                        />
                      </div>
                      
                      {/* Country Options list */}
                      <div className="overflow-y-auto p-2 space-y-1 flex-1 max-h-56">
                        {COUNTRIES.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase())).map((c) => (
                          <button
                            key={c.code}
                            onClick={() => {
                              setCountry(c.code);
                              setIsCountryMenuOpen(false);
                              setCountrySearch('');
                            }}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer",
                              country === c.code 
                                ? "bg-primary/10 text-primary" 
                                : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                            )}
                          >
                            <span className="flex items-center gap-2">
                              <span className="text-base">{c.flag}</span>
                              <span className="truncate max-w-[140px]">{c.name}</span>
                            </span>
                            {country === c.code && <span className="text-[10px] uppercase tracking-widest font-black shrink-0">Active</span>}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Language Selector Selector dropdown */}
            <div className="relative z-40">
              <button
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Globe size={13} className="text-primary" />
                <span>{LANGUAGES.find(l => l.code === language)?.flag} {LANGUAGES.find(l => l.code === language)?.name}</span>
              </button>
              
              <AnimatePresence>
                {isLangMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsLangMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 5, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 5, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-2 z-20 space-y-1"
                    >
                      {LANGUAGES.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setLanguage(lang.code);
                            setIsLangMenuOpen(false);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer",
                            language === lang.code 
                              ? "bg-primary/10 text-primary" 
                              : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                          )}
                        >
                          <span>{lang.flag} {lang.name}</span>
                          {language === lang.code && <span className="text-[10px] uppercase tracking-widest font-black">Active</span>}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <div className="bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 text-[10px] font-bold uppercase rounded-full">
              {reports.length} {t('incidentsLogged')}
            </div>
          </div>

          <div className="flex items-center justify-center md:justify-end gap-6 w-full md:w-auto mt-1 md:mt-0">
            <div className="flex flex-col items-center md:items-end">
               <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">{t('globalScore')}</span>
               <span className="font-bold text-white text-2xl">{userPoints}</span>
            </div>
            <button 
              onClick={() => setActiveTab('profile')}
              className="w-12 h-12 rounded-full border border-zinc-800 overflow-hidden shadow-lg hover:border-primary transition-all p-0.5 cursor-pointer"
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
            { id: 'feed', icon: <LayoutGrid size={22} />, label: t('home') },
            { id: 'leaderboard', icon: <Trophy size={22} />, label: t('leader') },
            { id: 'profile', icon: <UserIcon size={22} />, label: t('profile') },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "p-4 transition-all relative group flex flex-col items-center gap-2 cursor-pointer w-full",
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
              {activeTab === 'leaderboard' && <Leaderboard />}
              {activeTab === 'profile' && <ProfileView />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Footer Ticker */}
      <footer className="h-10 border-t border-zinc-800 bg-zinc-900/50 backdrop-blur-md text-zinc-500 flex items-center overflow-hidden whitespace-nowrap text-[9px] font-bold uppercase tracking-widest">
        <div className="flex space-x-12 animate-marquee">
          <span className="px-4">{t('tickerStop')}</span>
          <span className="px-4 text-white">{t('tickerAction')}</span>
          <span className="px-4">{reports.length} {t('tickerFlagged')}</span>
          <span className="px-4 text-primary">{t('tickerJoin')}</span>
          <span className="px-4 text-white">{t('tickerClean')}</span>
          <span className="px-4">{t('tickerStopLumping')}</span>
          {/* Duplicate for seamless marquee */}
          <span className="px-4">{t('tickerStop')}</span>
          <span className="px-4 text-white">{t('tickerAction')}</span>
          <span className="px-4">{reports.length} {t('tickerFlagged')}</span>
          <span className="px-4 text-primary">{t('tickerJoin')}</span>
          <span className="px-4 text-white">{t('tickerClean')}</span>
          <span className="px-4">{t('tickerStopLumping')}</span>
        </div>
      </footer>

      {/* Mobile Nav */}
      <nav className="md:hidden sticky bottom-0 bg-zinc-900 border-t border-zinc-800 flex justify-around p-5 z-50 rounded-t-3xl shadow-2xl backdrop-blur-xl">
        {[
          { id: 'feed', icon: <LayoutGrid size={22} /> },
          { id: 'leaderboard', icon: <Trophy size={22} /> },
          { id: 'profile', icon: <UserIcon size={22} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "p-2 transition-all rounded-full cursor-pointer",
              activeTab === tab.id ? "text-primary bg-primary/10" : "text-zinc-600"
            )}
          >
            {tab.icon}
          </button>
        ))}
      </nav>

      {/* Floating PayPal Tip Jar QR Code & Offline Indicator Widget */}
      <PaypalQrWidget />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </AuthProvider>
  );
}
