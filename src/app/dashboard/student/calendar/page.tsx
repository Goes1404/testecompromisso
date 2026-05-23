
'use client';

import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';

type AcademicEvent = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_type: string;
  is_official: boolean;
};

const EVENT_TYPE_META: Record<string, { label: string; color: string; dot: string }> = {
  simulado:             { label: 'Simulado',               color: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-500' },
  inscricao:            { label: 'Inscrição',               color: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-500' },
  aulao:                { label: 'Aulão',                   color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  entrega_redacao:      { label: 'Redação',                 color: 'bg-pink-100 text-pink-700',     dot: 'bg-pink-500' },
  feriado:              { label: 'Feriado',                 color: 'bg-green-100 text-green-700',   dot: 'bg-green-500' },
  vestibular:           { label: 'Vestibular',              color: 'bg-red-100 text-red-700',       dot: 'bg-red-500' },
  abertura_inscricao:   { label: 'Abre Inscrições',         color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  fechamento_inscricao: { label: 'Fecha Inscrições',        color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  resultado:            { label: 'Resultado',               color: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500' },
  matricula:            { label: 'Matrícula',               color: 'bg-cyan-100 text-cyan-700',     dot: 'bg-cyan-500' },
  outro:                { label: 'Evento',                  color: 'bg-slate-100 text-slate-600',   dot: 'bg-slate-400' },
};

function getMeta(type: string) {
  return EVENT_TYPE_META[type] ?? EVENT_TYPE_META.outro;
}

export default function StudentCalendarPage() {
  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    supabase
      .from('academic_events')
      .select('id, title, description, event_date, event_type, is_official')
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

  // Próximos eventos de vestibular/inscrição para destaque
  const today = new Date().toISOString().split('T')[0];
  const urgentTypes = new Set(['vestibular', 'abertura_inscricao', 'fechamento_inscricao']);
  const upcomingUrgent = events
    .filter(e => e.event_date >= today && urgentTypes.has(e.event_type))
    .slice(0, 4);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 pb-24">
      <header className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-xl rotate-3">
          <CalendarDays className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-primary italic leading-none">Calendário Acadêmico</h1>
          <p className="text-muted-foreground font-medium italic">Datas importantes, vestibulares e prazos.</p>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <>
          {/* Alertas de prazos próximos */}
          {upcomingUrgent.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-black text-primary italic uppercase tracking-wide">Atenção — Próximos Prazos</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {upcomingUrgent.map(ev => {
                  const meta = getMeta(ev.event_type);
                  const daysLeft = Math.ceil(
                    (new Date(ev.event_date + 'T12:00:00').getTime() - Date.now()) / 86400000
                  );
                  return (
                    <div
                      key={ev.id}
                      className="flex items-center gap-3 bg-white rounded-2xl shadow-sm p-3 border-l-4 border-l-primary cursor-pointer hover:shadow-md transition-all"
                      onClick={() => setSelectedDate(new Date(ev.event_date + 'T12:00:00'))}
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-primary text-xs truncate">{ev.title}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(ev.event_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          {daysLeft === 0 ? ' — Hoje!' : daysLeft === 1 ? ' — Amanhã' : ` — em ${daysLeft} dias`}
                        </p>
                      </div>
                      <Badge className={`text-[8px] font-black border-none shrink-0 ${meta.color}`}>{meta.label}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8">
            {/* Calendário */}
            <Card className="border-none shadow-xl rounded-[2.5rem] w-fit mx-auto lg:mx-0">
              <CardContent className="p-4">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  modifiers={{ hasEvent: (day) => eventDates.has(day.toISOString().split('T')[0]) }}
                  modifiersClassNames={{
                    hasEvent: 'relative after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:rounded-full after:bg-accent',
                  }}
                  className="rounded-2xl"
                />
              </CardContent>
            </Card>

            {/* Painel lateral */}
            <div className="space-y-6">
              {/* Eventos do dia selecionado */}
              {eventsOnSelected.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-black text-primary italic">
                    {selectedDate?.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                  </h3>
                  {eventsOnSelected.map(ev => {
                    const meta = getMeta(ev.event_type);
                    return (
                      <div key={ev.id} className="flex gap-3 bg-white rounded-2xl shadow-md p-4">
                        <div className={`w-1.5 rounded-full shrink-0 ${meta.dot}`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-black text-primary text-sm">{ev.title}</p>
                            <Badge className={`text-[9px] font-black border-none ${meta.color}`}>{meta.label}</Badge>
                            {ev.is_official && (
                              <Badge className="text-[9px] font-black border-none bg-yellow-100 text-yellow-700 gap-1">
                                <ShieldCheck className="h-2.5 w-2.5" />Oficial
                              </Badge>
                            )}
                          </div>
                          {ev.description && <p className="text-xs text-muted-foreground font-medium mt-1">{ev.description}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Todos os eventos do mês */}
              <div className="space-y-3">
                <h3 className="text-sm font-black text-primary italic">Eventos do mês</h3>
                {eventsThisMonth.length === 0 ? (
                  <p className="text-sm text-muted-foreground font-medium">Nenhum evento este mês.</p>
                ) : (
                  eventsThisMonth.map(ev => {
                    const meta = getMeta(ev.event_type);
                    return (
                      <div
                        key={ev.id}
                        className="flex items-center gap-3 bg-white rounded-2xl shadow-sm p-4 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => setSelectedDate(new Date(ev.event_date + 'T12:00:00'))}
                      >
                        <div className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />
                        <div className="w-14 shrink-0">
                          <p className="text-xs font-black text-primary">
                            {new Date(ev.event_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          </p>
                        </div>
                        <p className="flex-1 font-bold text-primary text-sm truncate">{ev.title}</p>
                        {ev.is_official && <ShieldCheck className="h-3.5 w-3.5 text-yellow-500 shrink-0" />}
                        <Badge className={`text-[8px] font-black border-none shrink-0 ${meta.color}`}>{meta.label}</Badge>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
