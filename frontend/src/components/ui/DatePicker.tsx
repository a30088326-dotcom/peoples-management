import React, { useState, useRef, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { format, parseISO, isValid } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import 'react-day-picker/dist/style.css';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  label: string;
}

export default function DatePicker({ value, onChange, label }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const parsedDate = value ? parseISO(value) : undefined;
  const displayDate = parsedDate && isValid(parsedDate) ? format(parsedDate, 'PPP') : <span className="text-slate-400">Pick a date</span>;

  return (
    <div className="space-y-2 relative" ref={ref}>
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
      <div 
        className="relative cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <div className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:border-slate-300 transition-colors flex items-center h-[46px]">
          {displayDate}
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute z-[150] mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 p-3 left-0"
          >
            <DayPicker
              mode="single"
              selected={parsedDate}
              onSelect={(date) => {
                if (date) onChange(format(date, 'yyyy-MM-dd'));
                setIsOpen(false);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}