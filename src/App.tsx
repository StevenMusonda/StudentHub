/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  BookOpen, 
  Bell, 
  User, 
  Home as HomeIcon, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  MoreVertical, 
  Plus, 
  Pause, 
  SkipForward,
  Search,
  Settings,
  ClipboardList,
  Timer,
  Check,
  X,
  Trash2
} from 'lucide-react';
import { Tab, ClassSession, Assignment, StudySession, Reminder, Day, AssignmentStatus } from './types';

// --- Helpers ---

const DAYS: Day[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getToday = (): Day => DAYS[new Date().getDay()];

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
};

const calculateDaysLeft = (dueDate: string) => {
  const diff = new Date(dueDate).getTime() - new Date().getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days;
};

// --- Storage Hook ---

function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue] as const;
}

// --- Components ---

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card-dark w-full max-w-md rounded-3xl p-6 border border-slate-800 shadow-2xl"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-full bg-slate-800 text-slate-400">
            <X size={20} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
};

const BottomNav = ({ activeTab, setActiveTab }: { activeTab: Tab, setActiveTab: (t: Tab) => void }) => {
  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'home', label: 'Home', icon: HomeIcon },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'study', label: 'Study', icon: BookOpen },
    { id: 'tasks', label: 'Tasks', icon: ClipboardList },
    { id: 'reminders', label: 'Alerts', icon: Bell },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card-dark/90 backdrop-blur-xl border-t border-slate-800 px-6 pb-8 pt-3 flex justify-between items-center z-50">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeTab === tab.id ? 'text-primary' : 'text-slate-500'
          }`}
        >
          <tab.icon size={24} fill={activeTab === tab.id ? 'currentColor' : 'none'} />
          <span className={`text-[10px] ${activeTab === tab.id ? 'font-bold' : 'font-medium'}`}>
            {tab.label}
          </span>
        </button>
      ))}
    </nav>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [classes, setClasses] = useLocalStorage<ClassSession[]>('studenthub_classes', []);
  const [assignments, setAssignments] = useLocalStorage<Assignment[]>('studenthub_assignments', []);
  const [studySessions, setStudySessions] = useLocalStorage<StudySession[]>('studenthub_study', []);
  const [reminders, setReminders] = useLocalStorage<Reminder[]>('studenthub_reminders', []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<Tab | null>(null);

  // --- Dashboard Logic ---
  const today = getToday();
  const nowTime = formatTime(new Date());

  const nextClass = useMemo(() => {
    const todayClasses = classes
      .filter(c => c.day === today)
      .sort((a, b) => a.time.localeCompare(b.time));
    return todayClasses.find(c => c.time > nowTime) || null;
  }, [classes, today, nowTime]);

  const totalStudyHours = useMemo(() => {
    return studySessions
      .filter(s => s.completed)
      .reduce((acc, curr) => acc + curr.hours, 0);
  }, [studySessions]);

  const urgentAssignment = useMemo(() => {
    return assignments
      .filter(a => a.status !== 'completed')
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0] || null;
  }, [assignments]);

  // --- Handlers ---

  const addClass = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newClass: ClassSession = {
      id: crypto.randomUUID(),
      title: formData.get('title') as string,
      subtitle: formData.get('subtitle') as string,
      time: formData.get('time') as string,
      duration: formData.get('duration') as string,
      room: formData.get('room') as string,
      instructor: formData.get('instructor') as string,
      day: formData.get('day') as Day,
      color: formData.get('color') as any,
    };
    setClasses([...classes, newClass]);
    setIsModalOpen(false);
  };

  const addAssignment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newAssignment: Assignment = {
      id: crypto.randomUUID(),
      title: formData.get('title') as string,
      subject: formData.get('subject') as string,
      dueDate: formData.get('dueDate') as string,
      status: 'pending',
    };
    setAssignments([...assignments, newAssignment]);
    setIsModalOpen(false);
  };

  const addStudySession = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newSession: StudySession = {
      id: crypto.randomUUID(),
      title: formData.get('title') as string,
      subject: formData.get('subject') as string,
      time: formData.get('time') as string,
      hours: Number(formData.get('hours')),
      notes: formData.get('notes') as string,
      completed: false,
    };
    setStudySessions([...studySessions, newSession]);
    setIsModalOpen(false);
  };

  const addReminder = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newReminder: Reminder = {
      id: crypto.randomUUID(),
      text: formData.get('text') as string,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    setReminders([...reminders, newReminder]);
    setIsModalOpen(false);
    
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Reminder Added", { body: newReminder.text });
    } else if ("Notification" in window && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  };

  // --- Screens ---

  const HomeScreen = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-6 pt-6 pb-24">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Good Morning, Alex</h1>
          <p className="text-primary/70 text-sm font-medium">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="relative">
          <button onClick={() => setActiveTab('reminders')} className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Bell size={20} />
          </button>
          {reminders.some(r => !r.completed) && <span className="absolute top-0 right-0 size-2.5 bg-red-500 border-2 border-background-dark rounded-full"></span>}
        </div>
      </header>

      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Up Next</h2>
          <button onClick={() => setActiveTab('schedule')} className="text-primary text-xs font-semibold">View Timetable</button>
        </div>
        {nextClass ? (
          <div className="relative overflow-hidden rounded-2xl bg-primary p-5 text-white shadow-lg shadow-primary/20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            <div className="flex justify-between items-start relative z-10">
              <div>
                <span className="px-2 py-1 rounded bg-white/20 text-[10px] font-bold uppercase tracking-wider">Next Class</span>
                <h3 className="text-xl font-bold mt-2">{nextClass.title}</h3>
                <p className="text-white/80 text-sm mt-1 flex items-center gap-1">
                  <MapPin size={14} /> {nextClass.room} • {nextClass.instructor}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{nextClass.time}</p>
                <p className="text-white/70 text-xs font-medium uppercase">Today</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-slate-800/50 border border-dashed border-slate-700 text-center text-slate-500">
            No more classes today
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-4">Today's Study Progress</h2>
        <div className="bg-primary/10 rounded-2xl p-5 border border-primary/20">
          <div className="flex justify-between items-end mb-3">
            <div>
              <p className="text-xs font-semibold text-primary/60 uppercase tracking-widest">Completed</p>
              <p className="text-lg font-bold">{totalStudyHours} hours total</p>
            </div>
            <p className="text-2xl font-bold text-primary">{Math.min(100, Math.round((totalStudyHours / 10) * 100))}%</p>
          </div>
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (totalStudyHours / 10) * 100)}%` }}></div>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Urgent Assignment</h2>
          <button onClick={() => setActiveTab('tasks')} className="text-primary text-xs font-semibold">View All</button>
        </div>
        {urgentAssignment ? (
          <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800 shadow-sm">
            <div className="size-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
              <ClipboardList size={24} />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-sm">{urgentAssignment.title}</h4>
              <p className="text-xs font-medium text-red-500">
                Due in {calculateDaysLeft(urgentAssignment.dueDate)} days
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-800/50 border border-dashed border-slate-700 text-center text-slate-500">
            No pending assignments
          </div>
        )}
      </section>
    </motion.div>
  );

  const ScheduleScreen = () => {
    const [selectedDay, setSelectedDay] = useState<Day>(today);
    const filteredClasses = classes
      .filter(c => c.day === selectedDay)
      .sort((a, b) => a.time.localeCompare(b.time));

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-24">
        <header className="sticky top-0 z-50 bg-background-dark/80 backdrop-blur-md border-b border-slate-800 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Calendar className="text-primary" size={28} />
              <h1 className="text-xl font-bold tracking-tight">Timetable</h1>
            </div>
            <button onClick={() => { setModalType('schedule'); setIsModalOpen(true); }} className="size-10 rounded-full bg-primary text-white flex items-center justify-center">
              <Plus size={24} />
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar py-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDay(d as Day)}
                className={`flex flex-col items-center justify-center min-w-[64px] py-3 rounded-2xl transition-all ${
                  selectedDay === d ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-800/50 text-slate-400'
                }`}
              >
                <span className="text-[10px] font-medium uppercase opacity-80">{d}</span>
                <span className="text-lg font-bold">{d === today ? 'Today' : ''}</span>
              </button>
            ))}
          </div>
        </header>

        <main className="px-6 py-6">
          <div className="space-y-6 relative">
            {filteredClasses.length > 0 ? filteredClasses.map((session, idx) => (
              <div key={session.id} className="flex gap-4 items-start">
                <div className="flex flex-col items-center pt-2 min-w-[60px]">
                  <span className="text-sm font-bold">{session.time}</span>
                  {idx < filteredClasses.length - 1 && <div className="w-0.5 h-24 mt-2 rounded-full bg-slate-800" />}
                </div>
                <div className={`flex-1 bg-card-dark rounded-2xl p-4 shadow-sm border-l-4 border-${session.color}-accent`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-lg font-bold leading-tight">{session.title}</h3>
                      <p className="text-sm text-slate-400 font-medium">{session.subtitle}</p>
                    </div>
                    <button onClick={() => setClasses(classes.filter(c => c.id !== session.id))} className="text-slate-600 hover:text-red-500">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-300">
                      <MapPin size={14} className="text-slate-500" /> {session.room}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-300">
                      <Clock size={14} className="text-slate-500" /> {session.duration}
                    </div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-20 text-slate-500">No classes scheduled for {selectedDay}</div>
            )}
          </div>
        </main>
      </motion.div>
    );
  };

  const StudyScreen = () => {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-24">
        <header className="px-6 pt-12 pb-6 bg-background-dark sticky top-0 z-40 border-b border-slate-800">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight">Study Planner</h1>
            <button onClick={() => { setModalType('study'); setIsModalOpen(true); }} className="size-10 rounded-full bg-primary text-white flex items-center justify-center">
              <Plus size={24} />
            </button>
          </div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="text-orange-accent">🔥</span> Goal: 10h / Week
            </h2>
            <span className="text-sm font-medium text-primary">{totalStudyHours}h Completed</span>
          </div>
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${Math.min(100, (totalStudyHours / 10) * 100)}%` }}></div>
          </div>
        </header>

        <main className="px-6 py-6 space-y-6">
          {studySessions.map((block) => (
            <div key={block.id} className={`p-4 rounded-2xl border transition-all ${block.completed ? 'bg-slate-800/40 border-slate-800 opacity-60' : 'bg-slate-800 border-l-4 border-l-orange-accent shadow-xl'}`}>
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-orange-accent">{block.subject}</span>
                <button onClick={() => setStudySessions(studySessions.map(s => s.id === block.id ? { ...s, completed: !s.completed } : s))}>
                  {block.completed ? <CheckCircle2 className="text-emerald-accent" /> : <div className="size-6 rounded-full border-2 border-slate-700" />}
                </button>
              </div>
              <h3 className="font-bold text-base mb-0.5">{block.title}</h3>
              <p className="text-xs text-slate-500">{block.hours} hours • {block.time}</p>
              <button onClick={() => setStudySessions(studySessions.filter(s => s.id !== block.id))} className="mt-2 text-slate-600 hover:text-red-500 text-xs flex items-center gap-1">
                <Trash2 size={12} /> Remove
              </button>
            </div>
          ))}
          {studySessions.length === 0 && <div className="text-center py-20 text-slate-500">No study sessions planned</div>}
        </main>
      </motion.div>
    );
  };

  const TasksScreen = () => {
    const [filter, setFilter] = useState<AssignmentStatus | 'all'>('all');
    const filtered = assignments.filter(a => filter === 'all' || a.status === filter);

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-24">
        <header className="px-6 pt-12 pb-4 bg-background-dark sticky top-0 z-20 border-b border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold tracking-tight">Assignments</h1>
            <button onClick={() => { setModalType('tasks'); setIsModalOpen(true); }} className="size-10 rounded-full bg-primary text-white flex items-center justify-center">
              <Plus size={24} />
            </button>
          </div>
          <div className="flex border-b border-slate-800">
            {(['all', 'pending', 'in-progress', 'completed'] as const).map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 py-3 text-sm font-semibold text-center border-b-2 transition-all ${filter === f ? 'border-primary text-primary' : 'border-transparent text-slate-500'}`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </header>

        <main className="px-6 py-4 space-y-3">
          {filtered.map(a => (
            <div key={a.id} className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800 shadow-sm">
              <select 
                value={a.status} 
                onChange={(e) => setAssignments(assignments.map(item => item.id === a.id ? { ...item, status: e.target.value as AssignmentStatus } : item))}
                className="bg-slate-800 text-xs rounded border-none focus:ring-0"
              >
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
              <div className="flex-1 min-w-0">
                <h3 className={`text-base font-semibold truncate ${a.status === 'completed' ? 'line-through text-slate-500' : ''}`}>{a.title}</h3>
                <p className="text-xs text-slate-500">Due: {new Date(a.dueDate).toLocaleDateString()} • {calculateDaysLeft(a.dueDate)} days left</p>
              </div>
              <button onClick={() => setAssignments(assignments.filter(item => item.id !== a.id))} className="text-slate-600 hover:text-red-500">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          {filtered.length === 0 && <div className="text-center py-20 text-slate-500">No assignments found</div>}
        </main>
      </motion.div>
    );
  };

  const RemindersScreen = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-24">
      <header className="flex items-center justify-between px-6 py-12 sticky top-0 bg-background-dark/80 backdrop-blur-md z-10">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-tight">Reminders</h1>
          <p className="text-xs font-medium text-slate-400">Manage your school alerts</p>
        </div>
        <button onClick={() => { setModalType('reminders'); setIsModalOpen(true); }} className="size-10 rounded-full bg-primary text-white flex items-center justify-center">
          <Plus size={24} />
        </button>
      </header>

      <main className="px-6 space-y-3">
        {reminders.map(r => (
          <div key={r.id} className="flex items-center gap-4 bg-slate-900/40 border border-slate-800/50 p-4 rounded-xl shadow-sm">
            <button onClick={() => setReminders(reminders.map(item => item.id === r.id ? { ...item, completed: !item.completed } : item))}>
              {r.completed ? <CheckCircle2 className="text-emerald-accent" /> : <div className="size-6 rounded-full border-2 border-slate-700" />}
            </button>
            <p className={`flex-1 text-sm font-semibold ${r.completed ? 'line-through text-slate-500' : ''}`}>{r.text}</p>
            <button onClick={() => setReminders(reminders.filter(item => item.id !== r.id))} className="text-slate-600 hover:text-red-500">
              <Trash2 size={18} />
            </button>
          </div>
        ))}
        {reminders.length === 0 && <div className="text-center py-20 text-slate-500">No reminders set</div>}
      </main>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background-dark text-slate-100 selection:bg-primary/30">
      <AnimatePresence mode="wait">
        {activeTab === 'home' && <HomeScreen key="home" />}
        {activeTab === 'schedule' && <ScheduleScreen key="schedule" />}
        {activeTab === 'study' && <StudyScreen key="study" />}
        {activeTab === 'tasks' && <TasksScreen key="tasks" />}
        {activeTab === 'reminders' && <RemindersScreen key="reminders" />}
      </AnimatePresence>
      
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={`Add ${modalType === 'schedule' ? 'Class' : modalType === 'study' ? 'Study Session' : modalType === 'tasks' ? 'Assignment' : 'Reminder'}`}
      >
        {modalType === 'schedule' && (
          <form onSubmit={addClass} className="space-y-4">
            <input name="title" placeholder="Subject Name" required className="w-full bg-slate-800 border-none rounded-xl p-3" />
            <input name="subtitle" placeholder="Subtitle (e.g. Advanced Calculus)" className="w-full bg-slate-800 border-none rounded-xl p-3" />
            <div className="grid grid-cols-2 gap-4">
              <input name="time" type="time" required className="bg-slate-800 border-none rounded-xl p-3" />
              <input name="duration" placeholder="Duration (e.g. 90 min)" required className="bg-slate-800 border-none rounded-xl p-3" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input name="room" placeholder="Room" required className="bg-slate-800 border-none rounded-xl p-3" />
              <input name="instructor" placeholder="Instructor" required className="bg-slate-800 border-none rounded-xl p-3" />
            </div>
            <select name="day" required className="w-full bg-slate-800 border-none rounded-xl p-3">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select name="color" className="w-full bg-slate-800 border-none rounded-xl p-3">
              <option value="blue">Blue</option>
              <option value="emerald">Emerald</option>
              <option value="orange">Orange</option>
              <option value="purple">Purple</option>
            </select>
            <button type="submit" className="w-full bg-primary py-3 rounded-xl font-bold">Add Class</button>
          </form>
        )}

        {modalType === 'study' && (
          <form onSubmit={addStudySession} className="space-y-4">
            <input name="title" placeholder="Topic" required className="w-full bg-slate-800 border-none rounded-xl p-3" />
            <input name="subject" placeholder="Subject" required className="w-full bg-slate-800 border-none rounded-xl p-3" />
            <div className="grid grid-cols-2 gap-4">
              <input name="time" type="time" required className="bg-slate-800 border-none rounded-xl p-3" />
              <input name="hours" type="number" step="0.5" placeholder="Hours" required className="bg-slate-800 border-none rounded-xl p-3" />
            </div>
            <textarea name="notes" placeholder="Notes" className="w-full bg-slate-800 border-none rounded-xl p-3 h-24" />
            <button type="submit" className="w-full bg-primary py-3 rounded-xl font-bold">Add Session</button>
          </form>
        )}

        {modalType === 'tasks' && (
          <form onSubmit={addAssignment} className="space-y-4">
            <input name="title" placeholder="Assignment Title" required className="w-full bg-slate-800 border-none rounded-xl p-3" />
            <input name="subject" placeholder="Subject" required className="w-full bg-slate-800 border-none rounded-xl p-3" />
            <input name="dueDate" type="date" required className="w-full bg-slate-800 border-none rounded-xl p-3" />
            <button type="submit" className="w-full bg-primary py-3 rounded-xl font-bold">Add Assignment</button>
          </form>
        )}

        {modalType === 'reminders' && (
          <form onSubmit={addReminder} className="space-y-4">
            <input name="text" placeholder="Reminder text..." required className="w-full bg-slate-800 border-none rounded-xl p-3" />
            <button type="submit" className="w-full bg-primary py-3 rounded-xl font-bold">Add Reminder</button>
          </form>
        )}
      </Modal>
    </div>
  );
}
