import React, { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Leaf, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        // Ensure user doc exists
        const userRef = doc(db, 'users', u.uid);
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
          await setDoc(userRef, {
            uid: u.uid,
            name: u.displayName,
            email: u.email,
            photoURL: u.photoURL,
            points: 0,
            age: null,
            pronouns: 'they/them',
            identity: 'like',
            totalLikes: 0,
            totalDislikes: 0,
            joinedAt: serverTimestamp(),
          });
        }
        setUser(u);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white">
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-16 h-16 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center mb-6"
        >
          <Leaf size={32} className="text-primary" />
        </motion.div>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500 animate-pulse">Initializing Interface</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-zinc-900/50 backdrop-blur-xl p-10 rounded-[3rem] border border-zinc-800 shadow-2xl text-center relative overflow-hidden"
        >
          <div className="w-20 h-20 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-8 border border-primary/20">
            <Leaf size={40} />
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-white mb-2 uppercase">Tosser</h1>
          <p className="text-zinc-500 text-sm mb-10 font-medium">
            "Spot the neglected, save the planet."
          </p>
          <button
            onClick={login}
            className="w-full flex items-center justify-center gap-3 bg-primary text-black py-4 px-6 rounded-2xl hover:bg-primary/90 transition-all font-bold uppercase text-base shadow-xl"
          >
            <LogIn size={20} />
            Continue with Google
          </button>
          <div className="mt-10 pt-8 border-t border-zinc-800/50 text-[9px] font-medium text-zinc-600 uppercase tracking-widest leading-relaxed">
            Protect the planet. Be truthful. Be bold.
          </div>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
};
