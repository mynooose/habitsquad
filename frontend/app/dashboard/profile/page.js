'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Camera, Loader2, Check, User, Calendar, Mail, Clock, Zap, Edit2, X } from 'lucide-react';
import { getLevel, LEVELS } from '@/lib/utils';
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
  const [isEditing, setIsEditing] = useState(false);
  const [showLevels, setShowLevels] = useState(false);
  const [originalData, setOriginalData] = useState(null);

  useEffect(() => {
    api.getMe().then(({ user: u }) => {
      const data = {
        name: u.name || '',
        avatar: u.avatar || '',
        dob: u.dob ? u.dob.split('T')[0] : '',
        gender: u.gender || '',
        bio: u.bio || '',
        dailyEmail: u.dailyEmailEnabled || false,
      };
      setName(data.name);
      setAvatar(data.avatar);
      setDob(data.dob);
      setGender(data.gender);
      setBio(data.bio);
      setDailyEmail(data.dailyEmail);
      setOriginalData(data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const cancelEdit = () => {
    if (originalData) {
      setName(originalData.name);
      setAvatar(originalData.avatar);
      setDob(originalData.dob);
      setGender(originalData.gender);
      setBio(originalData.bio);
      setDailyEmail(originalData.dailyEmail);
    }
    setIsEditing(false);
    setError('');
  };

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
      setOriginalData({ name: name.trim(), avatar, dob, gender, bio: bio.trim(), dailyEmail });
      setIsEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
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
        <Link href="/dashboard" className="p-2 rounded-lg hover:bg-[var(--card-bg)] text-muted hover:text-primary"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="text-muted text-sm">Manage your account details</p>
        </div>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="btn-primary px-4 py-2 text-sm font-semibold flex items-center gap-2">
            <Edit2 className="w-4 h-4" /> Edit Profile
          </button>
        )}
        {saved && !isEditing && (
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-green-500/15 text-green-500 text-sm font-medium">
            <Check className="w-4 h-4" /> Saved
          </div>
        )}
      </div>

      {error && <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      {/* Avatar */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative mb-3">
          {avatar ? (
            <img src={avatar} alt="Avatar" className="w-24 h-24 rounded-full bg-[var(--card-bg-hover)] object-cover" />
          ) : (
            <div className="w-24 h-24 rounded-full gradient-accent flex items-center justify-center text-3xl font-bold text-white">
              {name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
          {isEditing && (
            <button onClick={() => setShowAvatars(!showAvatars)}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center hover:bg-brand-600 transition-colors shadow-lg">
              <Camera className="w-4 h-4 text-white" />
            </button>
          )}
        </div>
        <p className="text-lg font-semibold">{name}</p>
        <p className="text-sm text-muted">{user?.email}</p>
        {memberSince && (
          <div className="flex items-center gap-1 mt-1 text-xs text-muted">
            <Clock className="w-3 h-3" /> Member since {memberSince}
          </div>
        )}

        {/* Level & XP */}
        {(() => {
          const lvl = getLevel(user?.totalXp || 0);
          return (
            <div className="mt-4 p-4 rounded-xl glass-card w-full max-w-xs">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/15 flex items-center justify-center text-lg font-black text-yellow-400">{lvl.level}</div>
                <div>
                  <p className={cn('font-bold', lvl.color)}>{lvl.name}</p>
                  <p className="text-xs text-muted">{user?.totalXp || 0} XP</p>
                </div>
              </div>
              <div className="h-2 rounded-full bg-[var(--card-bg-hover)] overflow-hidden">
                <div className="h-full rounded-full bg-yellow-500 transition-all" style={{ width: `${lvl.progress}%` }} />
              </div>
              <p className="text-xs text-muted mt-1">{lvl.nextLevelXp ? `${lvl.nextLevelXp - lvl.currentXp} XP to next level` : 'Max level!'}</p>
              <button type="button" onClick={() => setShowLevels(v => !v)} className="mt-3 text-xs text-brand-500 hover:underline">
                {showLevels ? 'Hide levels' : 'View all levels'}
              </button>
              {showLevels && (
                <div className="mt-3 pt-3 border-t border-[var(--card-border)] space-y-1.5">
                  {LEVELS.map(l => {
                    const isCurrent = l.level === lvl.level;
                    const isUnlocked = (user?.totalXp || 0) >= l.xp;
                    return (
                      <div key={l.level} className={cn('flex items-center justify-between text-xs py-1 px-2 rounded-lg', isCurrent && 'bg-yellow-500/10')}>
                        <div className="flex items-center gap-2">
                          <span className={cn('w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px]', isUnlocked ? 'bg-yellow-500/20 text-yellow-400' : 'bg-[var(--card-bg-hover)] text-muted')}>
                            {l.level}
                          </span>
                          <span className={cn('font-medium', isUnlocked ? l.color : 'text-muted')}>{l.name}</span>
                          {isCurrent && <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-semibold">You</span>}
                        </div>
                        <span className={cn('tabular-nums', isUnlocked ? 'text-primary' : 'text-muted')}>{l.xp} XP</span>
                      </div>
                    );
                  })}
                  <p className="text-[11px] text-muted pt-2">Complete a task to earn XP equal to its weightage.</p>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Avatar picker */}
      {showAvatars && isEditing && (
        <div className="mb-6 p-4 rounded-xl glass-card">
          <p className="text-sm font-medium mb-3">Choose an avatar</p>

          {/* Upload custom photo */}
          <label className="block mb-4 p-4 rounded-xl border-2 border-dashed border-[var(--input-border)] hover:border-brand-500 cursor-pointer text-center transition-colors">
            <Camera className="w-6 h-6 mx-auto mb-1 text-muted" />
            <p className="text-sm text-muted">Upload your own photo</p>
            <p className="text-xs text-muted">JPG, PNG — max 20MB</p>
            <input type="file" accept="image/*" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 20 * 1024 * 1024) { setError('Image must be under 20MB'); return; }
              const reader = new FileReader();
              reader.onloadend = async () => {
                try {
                  const { url } = await api.uploadImage(reader.result, 'avatars');
                  setAvatar(url);
                  setShowAvatars(false);
                } catch (err) {
                  setError(err.message || 'Upload failed');
                }
              };
              reader.readAsDataURL(file);
            }} className="hidden" />
          </label>

          {/* Preset avatars */}
          <p className="text-xs text-muted mb-2">Or pick a preset</p>
          <div className="grid grid-cols-6 gap-3">
            {AVATARS.map((url, i) => (
              <button key={i} onClick={() => { setAvatar(url); setShowAvatars(false); }}
                className={cn('w-full aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-105',
                  avatar === url ? 'border-brand-500' : 'border-transparent')}>
                <img src={url} alt={`Avatar ${i + 1}`} className="w-full h-full bg-[var(--card-bg-hover)]" />
              </button>
            ))}
            <button onClick={() => { setAvatar(''); setShowAvatars(false); }}
              className={cn('w-full aspect-square rounded-xl border-2 flex items-center justify-center bg-[var(--card-bg-hover)] text-muted hover:scale-105 transition-all',
                !avatar ? 'border-brand-500' : 'border-transparent')}>
              <User className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* Form - read-only or editable */}
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-2 text-muted">Full Name</label>
          {isEditing ? (
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={50}
              className="w-full px-4 py-3 rounded-xl bg-[var(--card-bg)] border border-[var(--input-border)] focus:outline-none focus:border-brand-500" />
          ) : (
            <div className="px-4 py-3 rounded-xl glass-card">{name || <span className="text-muted">—</span>}</div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-muted">Email</label>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl glass-card text-muted">
            <Mail className="w-4 h-4" />
            {user?.email}
          </div>
          {isEditing && <p className="text-xs text-muted mt-1">Email cannot be changed</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-muted">Date of Birth</label>
          {isEditing ? (
            <input type="date" value={dob} onChange={(e) => setDob(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[var(--card-bg)] border border-[var(--input-border)] focus:outline-none focus:border-brand-500" />
          ) : (
            <div className="px-4 py-3 rounded-xl glass-card">{dob ? new Date(dob + 'T12:00:00').toLocaleDateString() : <span className="text-muted">Not set</span>}</div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-muted">Gender</label>
          {isEditing ? (
            <div className="flex flex-wrap gap-2">
              {GENDERS.map(g => (
                <button key={g} type="button" onClick={() => setGender(gender === g ? '' : g)}
                  className={cn('px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                    gender === g ? 'bg-brand-500 text-white' : 'bg-[var(--card-bg)] text-muted hover:text-primary')}>
                  {g}
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-3 rounded-xl glass-card">{gender || <span className="text-muted">Not set</span>}</div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-muted">Bio</label>
          {isEditing ? (
            <>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself..." rows={3} maxLength={200}
                className="w-full px-4 py-3 rounded-xl bg-[var(--card-bg)] border border-[var(--input-border)] placeholder-[var(--foreground-muted)] focus:outline-none focus:border-brand-500 resize-none" />
              <p className="text-xs text-muted mt-1">{bio.length}/200</p>
            </>
          ) : (
            <div className="px-4 py-3 rounded-xl glass-card min-h-[56px]">{bio || <span className="text-muted">No bio yet</span>}</div>
          )}
        </div>

        {/* Daily Email Notification */}
        <div className="flex items-center justify-between p-4 rounded-xl glass-card">
          <div>
            <p className="font-medium flex items-center gap-2">
              <Mail className="w-4 h-4 text-brand-400" /> Daily Email Reminder
            </p>
            <p className="text-sm text-muted">Get your planned tasks emailed every day at 7:00 AM</p>
          </div>
          <button type="button" disabled={!isEditing} onClick={() => setDailyEmail(!dailyEmail)}
            className={cn('w-12 h-7 rounded-full transition-colors relative disabled:opacity-60', dailyEmail ? 'bg-brand-500' : 'bg-gray-300 dark:bg-white/10')}>
            <div className={cn('w-5 h-5 rounded-full bg-white absolute top-1 transition-transform', dailyEmail ? 'translate-x-6' : 'translate-x-1')} />
          </button>
        </div>

        {isEditing && (
          <div className="flex gap-3 pt-4">
            <button onClick={cancelEdit} className="flex-1 py-3 rounded-xl bg-[var(--card-bg)] text-primary font-medium hover:bg-[var(--card-bg-hover)] flex items-center justify-center gap-2">
              <X className="w-4 h-4" /> Cancel
            </button>
            <button onClick={handleSave} disabled={saving || !name.trim()}
              className="flex-1 py-3 rounded-xl btn-primary font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Check className="w-4 h-4" /> Save Changes</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
