'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Camera, Loader2, Check, User, Calendar, Mail, Clock, Zap, Edit2, X, Sparkles, Flame, Shield, Swords, Medal, Star, Gem, Trophy, Crown, Lock, Trash2 } from 'lucide-react';
import { getLevel, LEVELS } from '@/lib/utils';
import { cn } from '@/lib/utils';

const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

const LEVEL_ICONS = {
  1: Sparkles,
  2: Zap,
  3: Flame,
  4: Shield,
  5: Swords,
  6: Medal,
  7: Star,
  8: Gem,
  9: Trophy,
  10: Crown,
};

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
  const [dailyEmailTime, setDailyEmailTime] = useState('07:00');
  const [timezone, setTimezone] = useState('UTC');
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showAvatars, setShowAvatars] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showLevels, setShowLevels] = useState(false);
  const [originalData, setOriginalData] = useState(null);

  useEffect(() => {
    const browserTz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return 'UTC'; } })();
    api.getMe().then(({ user: u }) => {
      const data = {
        name: u.name || '',
        avatar: u.avatar || '',
        dob: u.dob ? u.dob.split('T')[0] : '',
        gender: u.gender || '',
        bio: u.bio || '',
        dailyEmail: u.dailyEmailEnabled || false,
        dailyEmailTime: u.dailyEmailTime || '07:00',
        timezone: u.timezone || browserTz,
      };
      setName(data.name);
      setAvatar(data.avatar);
      setDob(data.dob);
      setGender(data.gender);
      setBio(data.bio);
      setDailyEmail(data.dailyEmail);
      setDailyEmailTime(data.dailyEmailTime);
      setTimezone(data.timezone);
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
      setDailyEmailTime(originalData.dailyEmailTime);
      setTimezone(originalData.timezone);
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
        dailyEmailTime,
        timezone,
      });
      await checkAuth();
      setOriginalData({ name: name.trim(), avatar, dob, gender, bio: bio.trim(), dailyEmail, dailyEmailTime, timezone });
      setIsEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteAccount();
      router.push('/');
    } catch (err) {
      setError(err.message || 'Failed to delete account');
      setDeleting(false);
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
            <div className={cn('mt-4 p-4 rounded-xl glass-card w-full transition-all', showLevels ? 'max-w-md' : 'max-w-xs')}>
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
                <div className="mt-4 pt-4 border-t border-[var(--card-border)]">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-4">Your Journey</p>
                  <div className="relative">
                    {/* Vertical connector line */}
                    <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gradient-to-b from-yellow-500/40 via-[var(--card-bg-hover)] to-[var(--card-bg-hover)]" />
                    <div className="space-y-3">
                      {LEVELS.map((l, i) => {
                        const isCurrent = l.level === lvl.level;
                        const totalXp = user?.totalXp || 0;
                        const isUnlocked = totalXp >= l.xp;
                        const Icon = LEVEL_ICONS[l.level] || Sparkles;
                        const nextInLadder = LEVELS[i + 1];
                        const stepProgress = isUnlocked && nextInLadder
                          ? Math.min(100, Math.max(0, ((totalXp - l.xp) / (nextInLadder.xp - l.xp)) * 100))
                          : isUnlocked ? 100 : 0;
                        return (
                          <div key={l.level} className="relative flex items-start gap-4">
                            <div className={cn(
                              'relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all',
                              isCurrent ? 'bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg shadow-yellow-500/30 ring-4 ring-yellow-500/20' :
                              isUnlocked ? 'bg-yellow-500/15' : 'bg-[var(--card-bg-hover)]'
                            )}>
                              {isUnlocked ? (
                                <Icon className={cn('w-5 h-5', isCurrent ? 'text-white' : l.color)} />
                              ) : (
                                <Lock className="w-4 h-4 text-muted" />
                              )}
                            </div>
                            <div className={cn(
                              'flex-1 p-3 rounded-xl transition-all',
                              isCurrent ? 'bg-yellow-500/10 border border-yellow-500/30' :
                              isUnlocked ? 'bg-[var(--card-bg-hover)]' : 'opacity-60'
                            )}>
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Lv {l.level}</span>
                                  <span className={cn('font-bold text-sm', isUnlocked ? l.color : 'text-muted')}>{l.name}</span>
                                  {isCurrent && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-500 text-white font-bold uppercase tracking-wider">You</span>}
                                </div>
                                <span className={cn('text-xs tabular-nums', isUnlocked ? 'font-semibold' : 'text-muted')}>{l.xp} XP</span>
                              </div>
                              {isCurrent && nextInLadder && (
                                <>
                                  <div className="h-1.5 rounded-full bg-[var(--card-bg-hover)] overflow-hidden mt-2">
                                    <div className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 transition-all" style={{ width: `${stepProgress}%` }} />
                                  </div>
                                  <p className="text-[11px] text-muted mt-1">{nextInLadder.xp - totalXp} XP to {nextInLadder.name}</p>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted text-center mt-4 italic">Complete a task to earn XP equal to its weightage.</p>
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
            <DatePicker value={dob} onChange={setDob} />
          ) : (
            <div className="px-4 py-3 rounded-xl glass-card">{dob ? new Date(dob + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : <span className="text-muted">Not set</span>}</div>
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
        <div className="p-4 rounded-xl glass-card space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium flex items-center gap-2">
                <Mail className="w-4 h-4 text-brand-400" /> Daily Email Reminder
              </p>
              <p className="text-sm text-muted">Get your planned tasks emailed each morning</p>
            </div>
            <button type="button" disabled={!isEditing} onClick={() => setDailyEmail(!dailyEmail)}
              className={cn('w-12 h-7 rounded-full transition-colors relative disabled:opacity-60', dailyEmail ? 'bg-brand-500' : 'bg-gray-300 dark:bg-white/10')}>
              <div className={cn('w-5 h-5 rounded-full bg-white absolute top-1 transition-transform', dailyEmail ? 'translate-x-6' : 'translate-x-1')} />
            </button>
          </div>
          {dailyEmail && (
            <div className="flex items-center gap-3 pt-2 border-t border-[var(--card-border)]">
              <Clock className="w-4 h-4 text-muted shrink-0" />
              <span className="text-sm text-muted">Send at</span>
              {isEditing ? (
                <>
                  <input type="time" step="3600" value={dailyEmailTime} onChange={(e) => setDailyEmailTime(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-[var(--card-bg)] border border-[var(--input-border)] focus:outline-none focus:border-brand-500 text-sm" />
                  <span className="text-xs text-muted">in {timezone}</span>
                </>
              ) : (
                <span className="text-sm font-medium">{dailyEmailTime} <span className="text-muted font-normal">({timezone})</span></span>
              )}
            </div>
          )}
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

        {/* Danger zone */}
        <div className="mt-8 pt-6 border-t border-[var(--card-border)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-3">Danger zone</p>
          {showDelete ? (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-sm mb-2 font-medium">Delete your account?</p>
              <p className="text-xs text-muted mb-4">Your habits, completions, and memberships will be hidden from the app. You won't be able to sign in again. This cannot be undone from the app.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDelete(false)} disabled={deleting} className="flex-1 py-2 rounded-lg bg-[var(--card-bg)] text-sm font-medium">Cancel</button>
                <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete permanently'}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowDelete(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-red-400 hover:bg-red-500/10 text-sm">
              <Trash2 className="w-4 h-4" /> Delete account
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const WEEKDAYS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function DatePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const parsed = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value + 'T12:00:00') : null;
  const [viewDate, setViewDate] = useState(parsed || new Date());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

  useEffect(() => {
    if (open && parsed) setViewDate(parsed);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const cells = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, month: month - 1, year: month === 0 ? year - 1 : year, otherMonth: true });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, month, year, otherMonth: false });
  while (cells.length % 7 !== 0) {
    const d = cells.length - firstDay - daysInMonth + 1;
    cells.push({ day: d, month: month + 1, year: month === 11 ? year + 1 : year, otherMonth: true });
  }

  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const displayValue = parsed
    ? parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  const shiftMonth = (delta) => {
    const d = new Date(viewDate); d.setMonth(d.getMonth() + delta);
    setViewDate(d);
  };

  const now = new Date();
  const years = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 100; y--) years.push(y);

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)}
        className={cn('w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--card-bg)] border border-[var(--input-border)] focus:outline-none focus:border-brand-500 transition-colors text-left',
          open && 'border-brand-500')}>
        <Calendar className="w-4 h-4 text-muted shrink-0" />
        <span className={cn('flex-1', !displayValue && 'text-muted')}>
          {displayValue || 'Select your date of birth'}
        </span>
        {value && (
          <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); onChange(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onChange(''); } }}
            className="p-1 rounded-lg hover:bg-[var(--card-bg-hover)] text-muted cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 sm:right-auto sm:w-80 mt-2 p-4 rounded-2xl bg-[var(--card-bg-solid)] border border-[var(--card-border)] shadow-xl z-20 animate-scale-in">
            {/* Header: month/year pickers + prev/next */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => { setShowMonthPicker(!showMonthPicker); setShowYearPicker(false); }}
                  className="px-2 py-1 rounded-lg hover:bg-[var(--card-bg-hover)] text-sm font-semibold">
                  {MONTHS_LONG[month]}
                </button>
                <button type="button" onClick={() => { setShowYearPicker(!showYearPicker); setShowMonthPicker(false); }}
                  className="px-2 py-1 rounded-lg hover:bg-[var(--card-bg-hover)] text-sm font-semibold">
                  {year}
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => shiftMonth(-1)} className="p-1.5 rounded-lg hover:bg-[var(--card-bg-hover)] text-muted">
                  <ChevronLeftSvg />
                </button>
                <button type="button" onClick={() => shiftMonth(1)} className="p-1.5 rounded-lg hover:bg-[var(--card-bg-hover)] text-muted">
                  <ChevronRightSvg />
                </button>
              </div>
            </div>

            {showMonthPicker && (
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {MONTHS_LONG.map((m, i) => (
                  <button key={m} type="button" onClick={() => { const d = new Date(viewDate); d.setMonth(i); setViewDate(d); setShowMonthPicker(false); }}
                    className={cn('px-2 py-2 rounded-lg text-sm', i === month ? 'bg-brand-500 text-white font-semibold' : 'hover:bg-[var(--card-bg-hover)]')}>
                    {m.slice(0, 3)}
                  </button>
                ))}
              </div>
            )}

            {showYearPicker && (
              <div className="grid grid-cols-4 gap-1.5 mb-3 max-h-56 overflow-y-auto">
                {years.map(y => (
                  <button key={y} type="button" onClick={() => { const d = new Date(viewDate); d.setFullYear(y); setViewDate(d); setShowYearPicker(false); }}
                    className={cn('px-2 py-2 rounded-lg text-sm', y === year ? 'bg-brand-500 text-white font-semibold' : 'hover:bg-[var(--card-bg-hover)]')}>
                    {y}
                  </button>
                ))}
              </div>
            )}

            {!showMonthPicker && !showYearPicker && (
              <>
                {/* Weekday labels */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {WEEKDAYS_SHORT.map(d => (
                    <div key={d} className="text-center text-[11px] font-semibold text-muted py-1">{d}</div>
                  ))}
                </div>
                {/* Day grid */}
                <div className="grid grid-cols-7 gap-1">
                  {cells.map((c, i) => {
                    const cellDate = new Date(c.year, c.month, c.day);
                    cellDate.setHours(0, 0, 0, 0);
                    const key = fmt(cellDate);
                    const isSelected = key === value;
                    const isToday = cellDate.getTime() === today.getTime();
                    const isFuture = cellDate > today;
                    return (
                      <button key={i} type="button" disabled={isFuture}
                        onClick={() => { onChange(key); setOpen(false); }}
                        className={cn(
                          'h-9 rounded-lg text-sm font-medium transition-colors',
                          isSelected ? 'bg-brand-500 text-white shadow-md' :
                          isFuture ? 'text-muted opacity-30 cursor-not-allowed' :
                          c.otherMonth ? 'text-muted hover:bg-[var(--card-bg-hover)]' :
                          isToday ? 'bg-brand-500/10 text-brand-500 font-bold hover:bg-[var(--card-bg-hover)]' :
                          'hover:bg-[var(--card-bg-hover)]'
                        )}>
                        {c.day}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--card-border)]">
              <button type="button" onClick={() => { onChange(''); setOpen(false); }} className="text-xs text-muted hover:text-primary">Clear</button>
              <button type="button" onClick={() => setViewDate(new Date())} className="text-xs text-brand-500 hover:underline font-semibold">Today</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ChevronLeftSvg() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>;
}

function ChevronRightSvg() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>;
}
