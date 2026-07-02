import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { auth } from '../lib/firebase';
import { subscribeToUser, updateUserProfile } from '../lib/api';
import { User, Save, Loader2, User as UserIcon, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';

export const ProfileView: React.FC = () => {
  const [userData, setUserData] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    pronouns: 'they/them',
    identity: 'like',
    paypalLink: '',
  });

  useEffect(() => {
    if (auth.currentUser) {
      const unsubscribe = subscribeToUser(auth.currentUser.uid, (data) => {
        setUserData(data);
        setFormData({
          name: data.name || auth.currentUser?.displayName || '',
          age: data.age?.toString() || '',
          pronouns: data.pronouns || 'they/them',
          identity: data.identity || 'like',
          paypalLink: data.paypalLink || '',
        });
      });
      return () => unsubscribe();
    }
  }, []);

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      await updateUserProfile(auth.currentUser.uid, {
        ...formData,
        age: parseInt(formData.age) || null,
        name: formData.name,
      });
      setIsEditing(false);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!userData) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20">
      <div className="text-center space-y-2 mb-12">
        <h2 className="text-4xl font-bold tracking-tight text-white uppercase">User Profile</h2>
        <p className="text-zinc-500 text-sm">Identity verified. Bio-data updated.</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-8 md:p-12 rounded-3xl shadow-3xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row gap-12 relative z-10">
          <div className="space-y-6 flex flex-col items-center shrink-0">
            <div className="w-40 h-40 rounded-full border border-zinc-800 bg-zinc-950 relative group overflow-hidden shadow-lg">
              <img src={auth.currentUser?.photoURL || ''} className="w-full h-full object-cover" />
            </div>
            
            <div className="bg-zinc-800/20 backdrop-blur-sm border border-zinc-800 p-3 w-full text-center rounded-xl">
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">User ID</p>
              <p className="text-zinc-400 font-mono text-[10px] truncate">{auth.currentUser?.uid}</p>
            </div>

            <button 
              onClick={() => auth.signOut()}
              className="w-full flex items-center justify-center gap-2 py-3 bg-zinc-800/50 hover:bg-red-500/10 border border-zinc-700 hover:border-red-500/50 text-zinc-400 hover:text-red-500 font-bold uppercase text-[10px] rounded-xl transition-all"
            >
              <LogOut size={14} />
              Logout Session
            </button>
          </div>

          <div className="flex-1 space-y-8">
            {!isEditing ? (
              <div className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Alias</p>
                    <p className="text-3xl font-bold text-white tracking-tight">{userData.name || 'Unknown'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Age</p>
                    <p className="text-3xl font-bold text-white tracking-tight">{userData.age || '--'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Designation</p>
                    <p className="text-xl font-bold text-primary tracking-tight">{userData.pronouns || 'N/A'}</p>
                  </div>
                   <div className="space-y-1">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Orientation</p>
                    <div className={cn(
                      "text-xs font-bold uppercase py-1 px-3 rounded-full border inline-block mt-1",
                      userData.identity === 'like' ? "text-primary border-primary/20 bg-primary/10" : "text-red-500 border-red-500/20 bg-red-500/10"
                    )}>
                      {userData.identity === 'like' ? 'LIKE' : userData.identity === 'dislike' ? 'DISLIKE' : 'Undefined'}
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Personalized PayPal Link</p>
                    {userData.paypalLink ? (
                      <a
                        href={userData.paypalLink.startsWith('http') ? userData.paypalLink : (userData.paypalLink.includes('@') ? `https://www.paypal.com/paypalme/` : `https://paypal.me/${userData.paypalLink}`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-bold text-primary hover:underline flex items-center gap-1.5 break-all mt-1"
                      >
                        {userData.paypalLink}
                      </a>
                    ) : (
                      <p className="text-xs text-zinc-500 italic mt-1">No PayPal link or email set yet. Edit profile to add one so other agents can pay or donate to you for picking up rubbish!</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-zinc-950/50 p-6 rounded-2xl border border-zinc-800">
                  <div className="space-y-1 text-center">
                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Likes</p>
                    <p className="text-4xl font-bold text-primary">{userData.totalLikes || 0}</p>
                  </div>
                  <div className="space-y-1 text-center border-l border-zinc-800">
                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Dislikes</p>
                    <p className="text-4xl font-bold text-red-500">{userData.totalDislikes || 0}</p>
                  </div>
                </div>

                <div className="bg-primary/10 backdrop-blur-md p-6 rounded-2xl border border-primary/20">
                   <p className="text-[9px] font-bold text-primary uppercase tracking-widest mb-1">Impact Score</p>
                   <p className="text-5xl font-bold text-white tracking-tighter">{userData.points || 0}</p>
                </div>

                <button 
                  onClick={() => setIsEditing(true)}
                  className="w-full py-4 bg-white text-black font-bold uppercase text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-xl hover:bg-zinc-100"
                >
                  Edit Profile
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2">Alias Name</label>
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-xl focus:border-primary/50 outline-none text-white transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2">Age</label>
                      <input 
                        type="number" 
                        value={formData.age}
                        onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-xl focus:border-primary/50 outline-none text-white transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2">Pronouns</label>
                      <select 
                        value={formData.pronouns}
                        onChange={(e) => setFormData({ ...formData, pronouns: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-xl focus:border-primary/50 outline-none text-white transition-all appearance-none"
                      >
                        <option value="he/him">He/Him</option>
                        <option value="she/her">She/Her</option>
                        <option value="they/them">They/Them</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2 font-mono text-primary">Personalized PayPal Link / Email</label>
                    <input 
                      type="text" 
                      value={formData.paypalLink}
                      onChange={(e) => setFormData({ ...formData, paypalLink: e.target.value })}
                      placeholder="e.g. paypal.me/yourusername or yourpaypalemail@domain.com"
                      className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-xl focus:border-primary/50 outline-none text-white transition-all placeholder-zinc-600 text-xs"
                    />
                    <p className="text-[9px] text-zinc-500 uppercase tracking-wider px-2 leading-relaxed">
                      Enter your PayPal.me link or address. Other agents can pay/donate directly to support your trash pickups!
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2">Bio-Identity</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => setFormData({ ...formData, identity: 'like' })}
                        className={cn(
                          "py-3 rounded-xl border font-bold uppercase text-[10px] transition-all",
                          formData.identity === 'like' ? "bg-primary text-black border-primary" : "bg-transparent text-zinc-500 border-zinc-800"
                        )}
                      >
                        LIKE
                      </button>
                      <button 
                        onClick={() => setFormData({ ...formData, identity: 'dislike' })}
                        className={cn(
                          "py-3 rounded-xl border font-bold uppercase text-[10px] transition-all",
                          formData.identity === 'dislike' ? "bg-red-500 text-white border-red-500" : "bg-transparent text-zinc-500 border-zinc-800"
                        )}
                      >
                        DISLIKE
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                   <button 
                    onClick={() => setIsEditing(false)}
                    className="flex-1 py-3 px-6 bg-zinc-800 text-zinc-400 font-bold uppercase text-[10px] rounded-xl border border-zinc-700 hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={loading}
                    className="flex-[2] py-3 px-6 bg-primary text-black font-bold uppercase text-[10px] rounded-xl transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Save Changes
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
