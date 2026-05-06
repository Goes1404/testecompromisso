
'use client';

import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Loader2 } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';

type AcademicEvent = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_type: string;
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  simulado:        'bg-blue-100 text-blue-700',
  inscricao:       'bg-amber-100 text-amber-700',
  aulao:           'bg-purple-100 text-purple-700',
  entrega_redacao: 'bg-pink-100 text-pink-700',
  feriado:         'bg-green-100 text-green-700',
  outro:           'bg-slate-100 text-slate-600',
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  simulado:        'Simulado',
  inscricao:       'Inscrição',
  aulao:           'Aulão',
  entrega_redacao: 'Redação',
  feriado:         'Feriado',
  outro:           'Evento',
};

const EVENT_TYPE_DOTS: Record<string, string> = {
  simulado:        'bg-blue-500',
  inscricao:       'bg-amber-500',
  aulao:           'bg-purple-500',
  entrega_redacao: 'bg-pink-500',
  feriado:         'bg-green-500',
  outro:           'bg-slate-400',
};

export default function StudentCalendarPage() {
  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    supabase
      .from('academic_events')
      .select('id, title, description, event_date, event_type')
      .order('event_date')
      .then(({ data }) => {
        setEvents(data ?? []);
        setLoading(false);
      });
  }, []);

  const eventDates = new Set(events.map(e => e.event_date));

  const selectedDateStr = selectedDate?.toISOString().split('T')[0];
  const eventsOnSelected = events.filter(e => e.event_date === selectedDateStr);

  const selectedMonthStr = selectedDate
    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`
    : '';
  const eventsThisMonth = events.filter(e => e.event_date.startsWith(selectedMonthStr));

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 pb-24">
      <header className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-xl rotate-3">
          <CalendarDays className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-primary italic leading-none">Calendário Acadêmico</h1>
          <p className="text-muted-foreground font-medium italic">Datas importantes, eventos e prazos.</p>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8">
          <Card className="border-none shadow-xl rounded-[2.5rem] w-fit mx-auto lg:mx-0">
            <CardContent className="p-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                modifiers={{ hasEvent: (day) => eventDates.has(day.toISOString().split('T')[0]) }}
                modifiersClassNames={{ hasEvent: 'relative after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:rounded-full after:bg-accent' }}
                className="rounded-2xl"
              />
            </CardContent>
          </Card>

          <div className="space-y-6">
            {eventsOnSelected.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-black text-primary italic">
                  {selectedDate?.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                </h3>
                {eventsOnSelected.map(ev => (
                  <div key={ev.id} className="flex gap-3 bg-white rounded-2xl shadow-md p-4">
                    <div className={`w-1.5 rounded-full shrink-0 ${EVENT_TYPE_DOTS[ev.event_type] ?? EVENT_TYPE_DOTS.outro}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-black text-primary text-sm">{ev.title}</p>
                        <Badge className={`text-[9px] font-black border-none ${EVENT_TYPE_COLORS[ev.event_type] ?? EVENT_TYPE_COLORS.outro}`}>
                          {EVENT_TYPE_LABELS[ev.event_type] ?? 'Evento'}
                        </Badge>
                      </div>
                      {ev.description && <p className="text-xs text-muted-foreground font-medium mt-1">{ev.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <h3 className="text-sm font-black text-primary italic">
                Todos os eventos do mês
              </h3>
              {eventsThisMonth.length === 0 ? (
                <p className="text-sm text-muted-foreground font-medium">Nenhum evento este mês.</p>
              ) : (
                eventsThisMonth.map(ev => (
                  <div key={ev.id} className="flex items-center gap-3 bg-white rounded-2xl shadow-sm p-4 hover:shadow-md transition-all">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${EVENT_TYPE_DOTS[ev.event_type] ?? EVENT_TYPE_DOTS.outro}`} />
                    <div className="w-14 shrink-0">
                      <p className="text-xs font-black text-primary">
                        {new Date(ev.event_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                    <p className="flex-1 font-bold text-primary text-sm truncate">{ev.title}</p>
                    <Badge className={`text-[8px] font-black border-none shrink-0 ${EVENT_TYPE_COLORS[ev.event_type] ?? EVENT_TYPE_COLORS.outro}`}>
                      {EVENT_TYPE_LABELS[ev.event_type] ?? 'Evento'}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
