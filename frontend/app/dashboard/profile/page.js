'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Camera, Loader2, Check, User, Calendar, Mail, Clock, Zap } from 'lucide-react';
import { getLevel } from '@/lib/utils';
import { cn } from '@/lib/utils';

const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

const AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Max',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Bella',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Mia',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Rocky',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Daisy',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Buddy',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Coco',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Oscar',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Ruby',
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, checkAuth } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [bio, setBio] = useState('');
  const [dailyEmail, setDailyEmail] = useState(false);
  const [showAvatars, setShowAvatars] = useState(false);

  useEffect(() => {
    api.getMe().then(({ user: u }) => {
      setName(u.name || '');
      setAvatar(u.avatar || '');
      setDob(u.dob ? u.dob.split('T')[0] : '');
      setGender(u.gender || '');
      setBio(u.bio || '');
      setDailyEmail(u.dailyEmailEnabled || false);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.updateProfile({
        name: name.trim(),
        avatar: avatar || null,
        dob: dob || null,
        gender: gender || null,
        bio: bio.trim() || null,
        dailyEmailEnabled: dailyEmail,
      });
      await checkAuth();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;
  }

  const memberSince = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '';

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard" className="p-2 rounded-lg hover:bg-surface-100 text-zinc-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="text-zinc-400 text-sm">Manage your account details</p>
        </div>
      </div>

      {error && <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      {/* Avatar */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative mb-3">
          {avatar ? (
            <img src={avatar} alt="Avatar" className="w-24 h-24 rounded-full bg-surface-200 object-cover" />
          ) : (
            <div className="w-24 h-24 rounded-full gradient-accent flex items-center justify-center text-3xl font-bold text-white">
              {name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
          <button onClick={() => setShowAvatars(!showAvatars)}
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center hover:bg-brand-600 transition-colors">
            <Camera className="w-4 h-4 text-white" />
          </button>
        </div>
        <p className="text-lg font-semibold">{name}</p>
        <p className="text-sm text-zinc-500">{user?.email}</p>
        {memberSince && (
          <div className="flex items-center gap-1 mt-1 text-xs text-zinc-600">
            <Clock className="w-3 h-3" /> Member since {memberSince}
          </div>
        )}

        {/* Level & XP */}
        {(() => {
          const lvl = getLevel(user?.totalXp || 0);
          return (
            <div className="mt-4 p-4 rounded-xl bg-surface-100 border border-white/5 w-full max-w-xs">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/15 flex items-center justify-center text-lg font-black text-yellow-400">{lvl.level}</div>
                <div>
                  <p className={cn('font-bold', lvl.color)}>{lvl.name}</p>
                  <p className="text-xs text-zinc-500">{user?.totalXp || 0} XP</p>
                </div>
              </div>
              <div className="h-2 rounded-full bg-surface-200 overflow-hidden">
                <div className="h-full rounded-full bg-yellow-500 transition-all" style={{ width: `${lvl.progress}%` }} />
              </div>
              <p className="text-xs text-zinc-600 mt-1">{lvl.nextLevelXp ? `${lvl.nextLevelXp - lvl.currentXp} XP to next level` : 'Max level!'}</p>
            </div>
          );
        })()}
      </div>

      {/* Avatar picker */}
      {showAvatars && (
        <div className="mb-6 p-4 rounded-xl bg-surface-100 border border-white/5">
          <p className="text-sm font-medium mb-3">Choose an avatar</p>

          {/* Upload custom photo */}
          <label className="block mb-4 p-4 rounded-xl border-2 border-dashed border-white/10 hover:border-brand-500 cursor-pointer text-center transition-colors">
            <Camera className="w-6 h-6 mx-auto mb-1 text-zinc-500" />
            <p className="text-sm text-zinc-400">Upload your own photo</p>
            <p className="text-xs text-zinc-600">JPG, PNG — max 2MB</p>
            <input type="file" accept="image/*" onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 2 * 1024 * 1024) { alert('Image must be under 2MB'); return; }
              const reader = new FileReader();
              reader.onloadend = () => { setAvatar(reader.result); setShowAvatars(false); };
              reader.readAsDataURL(file);
            }} className="hidden" />
          </label>

          {/* Preset avatars */}
          <p className="text-xs text-zinc-500 mb-2">Or pick a preset</p>
          <div className="grid grid-cols-6 gap-3">
            {AVATARS.map((url, i) => (
              <button key={i} onClick={() => { setAvatar(url); setShowAvatars(false); }}
                className={cn('w-full aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-105',
                  avatar === url ? 'border-brand-500' : 'border-transparent')}>
                <img src={url} alt={`Avatar ${i + 1}`} className="w-full h-full bg-surface-200" />
              </button>
            ))}
            <button onClick={() => { setAvatar(''); setShowAvatars(false); }}
              className={cn('w-full aspect-square rounded-xl border-2 flex items-center justify-center bg-surface-200 text-zinc-500 hover:scale-105 transition-all',
                !avatar ? 'border-brand-500' : 'border-transparent')}>
              <User className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-2">Full Name *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={50}
            className="w-full px-4 py-3 rounded-xl bg-surface-100 border border-white/10 focus:outline-none focus:border-brand-500" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Email</label>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-100 border border-white/5 text-zinc-500">
            <Mail className="w-4 h-4" />
            {user?.email}
          </div>
          <p className="text-xs text-zinc-600 mt-1">Email cannot be changed</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Date of Birth</label>
          <input type="date" value={dob} onChange={(e) => setDob(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-surface-100 border border-white/10 focus:outline-none focus:border-brand-500 text-white [color-scheme:dark]" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Gender</label>
          <div className="flex flex-wrap gap-2">
            {GENDERS.map(g => (
              <button key={g} type="button" onClick={() => setGender(gender === g ? '' : g)}
                className={cn('px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                  gender === g ? 'bg-brand-500 text-white' : 'bg-surface-100 text-zinc-400 hover:text-white')}>
                {g}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself..." rows={3} maxLength={200}
            className="w-full px-4 py-3 rounded-xl bg-surface-100 border border-white/10 placeholder-zinc-600 focus:outline-none focus:border-brand-500 resize-none" />
          <p className="text-xs text-zinc-600 mt-1">{bio.length}/200</p>
        </div>

        {/* Daily Email Notification */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-surface-100 border border-white/5">
          <div>
            <p className="font-medium flex items-center gap-2">
              <Mail className="w-4 h-4 text-brand-400" /> Daily Email Reminder
            </p>
            <p className="text-sm text-zinc-500">Get your planned tasks emailed every day at 7:00 AM</p>
          </div>
          <button type="button" onClick={() => setDailyEmail(!dailyEmail)}
            className={cn('w-12 h-7 rounded-full transition-colors relative', dailyEmail ? 'bg-brand-500' : 'bg-surface-300')}>
            <div className={cn('w-5 h-5 rounded-full bg-white absolute top-1 transition-transform', dailyEmail ? 'translate-x-6' : 'translate-x-1')} />
          </button>
        </div>

        <div className="flex gap-3 pt-4">
          <Link href="/dashboard" className="flex-1 py-3 rounded-xl bg-surface-100 text-white font-medium text-center hover:bg-surface-200">Cancel</Link>
          <button onClick={handleSave} disabled={saving || !name.trim()}
            className="flex-1 py-3 rounded-xl gradient-brand text-white font-medium flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : saved ? <><Check className="w-5 h-5" /> Saved!</> : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}
