import { 
  Calendar, 
  BookOpen, 
  Bell, 
  User, 
  Home, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  MoreVertical, 
  Plus, 
  Play, 
  Pause, 
  SkipForward,
  Search,
  Settings,
  ClipboardList,
  Timer
} from 'lucide-react';

export type Tab = 'home' | 'schedule' | 'study' | 'tasks' | 'reminders';

export type Day = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export interface ClassSession {
  id: string;
  title: string;
  subtitle: string;
  time: string; // HH:mm
  duration: string;
  room: string;
  instructor: string;
  day: Day;
  color: 'blue' | 'emerald' | 'orange' | 'purple';
}

export type AssignmentStatus = 'pending' | 'in-progress' | 'completed';

export interface Assignment {
  id: string;
  title: string;
  subject: string;
  dueDate: string; // ISO string
  status: AssignmentStatus;
}

export interface StudySession {
  id: string;
  title: string;
  subject: string;
  time: string;
  hours: number;
  notes: string;
  completed: boolean;
  timerSeconds?: number;
  timerRunning?: boolean;
  lastTimerUpdate?: number;
}

export interface Reminder {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
}
