import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QrCode, X, ArrowRight, CheckCircle2, CloudLightning, RefreshCw, Sparkles, ShieldCheck } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { updateUserProfile } from '../lib/api';
import { useLanguage } from './LanguageContext';
import { cn } from '../lib/utils';
import QRCode from 'qrcode';

export const PaypalQrWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [paypalInput, setPaypalInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { t } = useLanguage();

  // Listen to connectivity status to demonstrate offline capability
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Subscribe to logged-in user's profile
  useEffect(() => {
    let unsubscribe: any;
    if (auth.currentUser) {
      unsubscribe = onSnapshot(doc(db, 'users', auth.currentUser.uid), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setUserProfile(data);
          setPaypalInput(data.paypalLink || '');
        }
      });
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Compute initials for QR center badge (matches the "JB" initials in the uploaded image)
  const getInitials = () => {
    if (userProfile?.name) {
      const parts = userProfile.name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (auth.currentUser?.displayName) {
      const parts = auth.currentUser.displayName.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return parts[0].slice(0, 2).toUpperCase();
    }
    return 'JB'; // Default initials matching the user's specific image layout
  };

  const paypalTarget = userProfile?.paypalLink || 'jessieleighbright@gmail.com';

  const getPaypalLink = () => {
    const clean = paypalTarget.trim();
    if (!clean) return 'https://paypal.me/jessieleighbright';
    if (clean.startsWith('http')) return clean;
    if (clean.includes('@')) {
      return `https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=${encodeURIComponent(clean)}&currency_code=USD`;
    }
    return `https://paypal.me/${clean}`;
  };

  // Generate the QR Code dynamically
  useEffect(() => {
    const targetLink = getPaypalLink();
    QRCode.toDataURL(targetLink, {
      margin: 1,
      width: 420,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((url) => {
        setQrCodeUrl(url);
      })
      .catch((err) => {
        console.error('Failed to generate PayPal QR Code', err);
      });
  }, [paypalTarget]);

  const handleSavePaypal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setIsSaving(true);
    try {
      await updateUserProfile(auth.currentUser.uid, {
        paypalLink: paypalInput.trim(),
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating PayPal link:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed bottom-24 left-6 md:bottom-16 md:left-6 z-50">
      {/* Floating Trigger Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2.5 p-3.5 rounded-full shadow-[0_4px_24px_rgba(163,230,53,0.15)] bg-zinc-950 border text-primary transition-all cursor-pointer hover:scale-105 active:scale-95 group select-none",
          isOpen ? "border-zinc-750 text-zinc-400" : "border-primary/80 hover:border-primary"
        )}
        layoutId="paypal-qr-trigger"
      >
        <QrCode size={18} className="animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline-block pr-1">
          {isOpen ? 'Close' : 'My Tip Jar'}
        </span>
        
        {/* Connection status badge (Green pulsing dot) */}
        <span className="flex h-1.5 w-1.5 relative">
          <span className={cn(
            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
            isOnline ? "bg-emerald-400" : "bg-amber-400"
          )}></span>
          <span className={cn(
            "relative inline-flex rounded-full h-1.5 w-1.5",
            isOnline ? "bg-emerald-500" : "bg-amber-500"
          )}></span>
        </span>
      </motion.button>

      {/* Expanded QR Modal Card */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Click-out backdrop */}
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setIsOpen(false)} />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="absolute bottom-16 left-0 w-80 bg-zinc-950 border-2 border-primary/50 rounded-[2.5rem] p-6 shadow-2xl z-50 text-center space-y-5 overflow-hidden"
              style={{
                boxShadow: '0 10px 40px -10px rgba(163,230,53,0.15), 0 0 1px 1px rgba(163,230,53,0.2)'
              }}
            >
              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full border border-zinc-800 transition-all cursor-pointer"
              >
                <X size={14} />
              </button>

              {/* Offline mode status panel (black and green background style) */}
              <div className="bg-emerald-950/20 border border-emerald-500/20 p-2.5 rounded-2xl flex items-center justify-between text-left">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="text-primary shrink-0" size={16} />
                  <div>
                    <p className="text-[9px] font-extrabold text-white uppercase tracking-wider">
                      Offline Mode Active
                    </p>
                    <p className="text-[8px] text-zinc-500 font-mono uppercase mt-0.5">
                      {isOnline ? 'Fully synchronized' : 'Cached - auto-syncs on reconnect'}
                    </p>
                  </div>
                </div>
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider",
                  isOnline ? "bg-primary/10 text-primary border border-primary/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                )}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>

              {/* Poster Body inspired by Uploaded Image */}
              <div className="space-y-4">
                {/* Header text from image */}
                <p className="text-zinc-400 text-[13px] font-bold tracking-[0.15em] uppercase font-sans">
                  Just be you
                </p>

                {/* Tip jar badge from image */}
                <div className="inline-block px-5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-2xl">
                  <span className="text-white text-base font-extrabold tracking-tight">
                    Tip jar
                  </span>
                </div>

                {/* QR Code Canvas Frame */}
                <div className="relative bg-white p-4 rounded-3xl inline-block shadow-lg border-2 border-zinc-900 mx-auto">
                  {qrCodeUrl ? (
                    <div className="relative">
                      <img src={qrCodeUrl} alt="PayPal QR Code" className="w-44 h-44 block rounded-lg" />
                      
                      {/* Signature Custom Initials Centered Badge (replicates the 'JB' blue circle) */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-[#0070ba] border-2 border-white flex items-center justify-center shadow-md select-none">
                          <span className="text-white text-[11px] font-black font-sans tracking-tight">
                            {getInitials()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-44 h-44 flex items-center justify-center text-zinc-400 text-xs font-mono">
                      Generating...
                    </div>
                  )}
                </div>

                {/* PayPal Styled Logo Brand Text */}
                <div className="flex items-center justify-center gap-0.5 font-sans font-black text-white text-lg tracking-tight select-none">
                  <span className="text-[#003087]">Pay</span>
                  <span className="text-[#0079c1]">Pal</span>
                </div>

                {/* Scan. Pay. Go. Text from Image */}
                <p className="text-zinc-300 text-sm font-extrabold tracking-wide font-sans">
                  Scan. Pay. Go.
                </p>
              </div>

              {/* PayPal settings form drawer inside QR Card */}
              <div className="border-t border-zinc-800/80 pt-4 text-left">
                {!isEditing ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[8px] font-extrabold text-zinc-500 uppercase tracking-widest">
                        Linked PayPal Link
                      </p>
                      <p className="text-[10px] text-zinc-300 font-mono truncate max-w-[180px]">
                        {userProfile?.paypalLink || 'jessieleighbright@gmail.com'}
                      </p>
                    </div>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Update
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSavePaypal} className="space-y-2">
                    <label className="text-[8px] font-extrabold text-zinc-500 uppercase tracking-widest block">
                      PayPal Link or Email
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        required
                        value={paypalInput}
                        onChange={(e) => setPaypalInput(e.target.value)}
                        placeholder="e.g. paypal.me/yourusername"
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-[10px] text-white outline-none focus:border-primary/50 font-mono"
                      />
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="px-3 bg-primary text-black font-extrabold text-[9px] uppercase tracking-wider rounded-xl transition-all hover:bg-primary/90 flex items-center justify-center cursor-pointer min-w-[50px]"
                      >
                        {isSaving ? '...' : 'Save'}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="text-[9px] text-zinc-500 hover:text-zinc-300 font-bold uppercase tracking-wider block"
                    >
                      Cancel
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
