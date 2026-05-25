"use client";

import { useState, useEffect, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  Loader2,
  ShieldCheck,
  Flame,
  ChevronRight,
  Grid3x3,
  List as ListIcon,
  Clock3,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";

type AcademicEvent = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_type: string;
  is_official: boolean;
};

const EVENT_TYPE_META: Record<string, { label: string; chip: string; dot: string; glow: string }> = {
  simulado:             { label: "Simulado",        chip: "bg-blue-500/15 text-blue-400 border-blue-500/25",       dot: "bg-blue-500",     glow: "shadow-blue-500/30" },
  inscricao:            { label: "Inscrição",       chip: "bg-amber-500/15 text-amber-400 border-amber-500/25",    dot: "bg-amber-500",    glow: "shadow-amber-500/30" },
  aulao:                { label: "Aulão",           chip: "bg-purple-500/15 text-purple-400 border-purple-500/25", dot: "bg-purple-500",   glow: "shadow-purple-500/30" },
  entrega_redacao:      { label: "Redação",         chip: "bg-pink-500/15 text-pink-400 border-pink-500/25",       dot: "bg-pink-500",     glow: "shadow-pink-500/30" },
  feriado:              { label: "Feriado",         chip: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25", dot: "bg-emerald-500", glow: "shadow-emerald-500/30" },
  vestibular:           { label: "Vestibular",      chip: "bg-red-500/15 text-red-400 border-red-500/25",          dot: "bg-red-500",      glow: "shadow-red-500/30" },
  abertura_inscricao:   { label: "Abre Inscrições", chip: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25", dot: "bg-emerald-500", glow: "shadow-emerald-500/30" },
  fechamento_inscricao: { label: "Fecha Inscrições",chip: "bg-orange-500/15 text-orange-400 border-orange-500/25", dot: "bg-orange-500",   glow: "shadow-orange-500/30" },
  resultado:            { label: "Resultado",       chip: "bg-indigo-500/15 text-indigo-400 border-indigo-500/25", dot: "bg-indigo-500",   glow: "shadow-indigo-500/30" },
  matricula:            { label: "Matrícula",       chip: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",       dot: "bg-cyan-500",     glow: "shadow-cyan-500/30" },
  outro:                { label: "Evento",          chip: "bg-white/8 text-white/50 border-white/10",              dot: "bg-white/40",     glow: "shadow-white/10" },
};

const getMeta = (type: string) => EVENT_TYPE_META[type] ?? EVENT_TYPE_META.outro;

const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function daysBetween(target: string) {
  const targetDate = new Date(target + "T12:00:00");
  return Math.ceil((targetDate.getTime() - Date.now()) / 86400000);
}

function urgencyTone(days: number) {
  if (days < 0) return { label: "Passou", color: "text-white/55", bg: "bg-white/3", emoji: "✓" };
  if (days === 0) return { label: "Hoje", color: "text-red-400", bg: "bg-red-500/15", emoji: "•" };
  if (days === 1) return { label: "Amanhã", color: "text-orange-400", bg: "bg-orange-500/15", emoji: "→" };
  if (days <= 7) return { label: `${days}d`, color: "text-amber-400", bg: "bg-amber-500/15", emoji: "→" };
  if (days <= 30) return { label: `${days}d`, color: "text-yellow-400", bg: "bg-yellow-500/10", emoji: "→" };
  return { label: `${days}d`, color: "text-white/40", bg: "bg-white/5", emoji: "→" };
}

export default function StudentCalendarPage() {
  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [view, setView] = useState<"timeline" | "grid">("timeline");

  useEffect(() => {
    supabase
      .from("academic_events")
      .select("id, title, description, event_date, event_type, is_official")
      .order("event_date")
      .then(({ data }) => {
        setEvents(data ?? []);
        setLoading(false);
      });
  }, []);

  const today = new Date().toISOString().split("T")[0];

  const upcoming = useMemo(
    () => events.filter((e) => e.event_date >= today).sort((a, b) => a.event_date.localeCompare(b.event_date)),
    [events, today]
  );

  const nextEvent = upcoming[0];
  const nextDays = nextEvent ? daysBetween(nextEvent.event_date) : null;
  const nextMeta = nextEvent ? getMeta(nextEvent.event_type) : null;

  const urgentTypes = new Set(["vestibular", "abertura_inscricao", "fechamento_inscricao"]);
  const upcomingUrgent = upcoming.filter((e) => urgentTypes.has(e.event_type)).slice(0, 4);

  const eventDates = new Set(events.map((e) => e.event_date));
  const selectedDateStr = selectedDate?.toISOString().split("T")[0];
  const eventsOnSelected = events.filter((e) => e.event_date === selectedDateStr);

  const groupedByMonth = useMemo(() => {
    const groups: Record<string, AcademicEvent[]> = {};
    upcoming.forEach((ev) => {
      const d = new Date(ev.event_date + "T12:00:00");
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(ev);
    });
    return Object.entries(groups);
  }, [upcoming]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-9 w-9 animate-spin text-orange-400" />
        <p className="text-[10px] font-black uppercase tracking-widest text-white/55 animate-pulse">
          Carregando calendário acadêmico...
        </p>
      </div>
    );
  }

  return (
    <div className="pb-24 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ─────────────────────────────────────────────────────────────────────────
         HERO — Editorial countdown
         A massive number is the visual anchor. Days remaining until the next
         critical date. Composition is asymmetric — number on the left, label
         stacked on the right.
      ────────────────────────────────────────────────────────────────────────── */}
      <div className="relative rounded-[2rem] overflow-hidden bg-[#0d0d0f] border border-white/5 p-6">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 90% 0%, rgba(255,107,0,0.15) 0%, transparent 60%), radial-gradient(ellipse at 0% 100%, rgba(244,63,94,0.10) 0%, transparent 60%)",
          }}
        />
        {/* Subtle dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
        />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="h-3 w-3 text-orange-400" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-400/85">
              Calendário Acadêmico
            </p>
          </div>
          <h1 className="text-2xl font-black italic tracking-tighter text-white leading-none">
            Sua jornada
          </h1>
          <p className="text-white/40 text-xs font-semibold mt-1">
            Vestibulares, prazos e marcos importantes
          </p>

          {/* Countdown spotlight */}
          {nextEvent && nextDays !== null && nextMeta && (
            <div className="mt-6 flex items-end gap-5">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-white/55 leading-none mb-1">
                  Próximo evento
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-[5rem] sm:text-[6rem] font-black italic leading-[0.85] tracking-tighter bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
                    {nextDays}
                  </span>
                  <span className="text-xl font-black italic tracking-tighter text-white/40">
                    {nextDays === 1 ? "dia" : "dias"}
                  </span>
                </div>
              </div>
              <div className="flex-1 min-w-0 pb-2">
                <Badge className={`${nextMeta.chip} border font-black text-[8px] uppercase tracking-widest mb-2 inline-flex items-center gap-1 px-2 h-5`}>
                  <Flame className="h-2.5 w-2.5" />
                  {nextMeta.label}
                </Badge>
                <p className="text-sm font-black italic text-white leading-snug line-clamp-2">
                  {nextEvent.title}
                </p>
                <p className="text-[10px] font-bold text-white/40 mt-1 uppercase tracking-wider">
                  {new Date(nextEvent.event_date + "T12:00:00").toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                  })}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Urgent strip ── */}
      {upcomingUrgent.length > 0 && (
        <div>
          <div className="flex items-center gap-2 px-1 mb-2">
            <Flame className="h-3.5 w-3.5 text-red-400 animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-400/80">
              Prazos críticos
            </p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
            {upcomingUrgent.map((ev) => {
              const meta = getMeta(ev.event_type);
              const days = daysBetween(ev.event_date);
              const u = urgencyTone(days);
              return (
                <button
                  key={ev.id}
                  onClick={() => setSelectedDate(new Date(ev.event_date + "T12:00:00"))}
                  className="shrink-0 w-[200px] text-left bg-[#0d0d0f] border border-red-500/15 rounded-2xl p-3.5 hover:border-red-500/30 transition-all active:scale-95 touch-manipulation relative overflow-hidden"
                >
                  <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-red-500/20 to-transparent" />
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`h-2 w-2 rounded-full ${meta.dot} animate-pulse`} />
                    <span className={`text-[9px] font-black uppercase tracking-widest ${u.color}`}>
                      {u.label}
                    </span>
                  </div>
                  <p className="text-[11px] font-black text-white italic leading-tight line-clamp-2 mb-1.5">
                    {ev.title}
                  </p>
                  <Badge className={`${meta.chip} border font-black text-[8px] uppercase px-1.5 h-4`}>
                    {meta.label}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── View toggle ── */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setView("timeline")}
          className={`h-11 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all touch-manipulation active:scale-95 flex items-center justify-center gap-1.5 ${
            view === "timeline"
              ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
              : "bg-white/5 border border-white/8 text-white/40"
          }`}
        >
          <ListIcon className="h-3.5 w-3.5" />
          Linha do Tempo
        </button>
        <button
          onClick={() => setView("grid")}
          className={`h-11 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all touch-manipulation active:scale-95 flex items-center justify-center gap-1.5 ${
            view === "grid"
              ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
              : "bg-white/5 border border-white/8 text-white/40"
          }`}
        >
          <Grid3x3 className="h-3.5 w-3.5" />
          Grade
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
         TIMELINE — Mobile-friendly chronological list, grouped by month
         Each month gets a heavy display heading. Each event is a card with
         the day number as the visual anchor.
      ────────────────────────────────────────────────────────────────────────── */}
      {view === "timeline" ? (
        <div className="space-y-6">
          {groupedByMonth.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-white/10 rounded-[1.5rem]">
              <CalendarDays className="h-8 w-8 mx-auto mb-2 text-white/15" />
              <p className="text-xs font-bold text-white/55 uppercase tracking-widest">
                Nenhum evento agendado
              </p>
            </div>
          ) : (
            groupedByMonth.map(([key, monthEvents]) => {
              const [yearStr, monthStr] = key.split("-");
              const monthIdx = parseInt(monthStr, 10);
              const year = yearStr;
              return (
                <section key={key} className="space-y-2.5">
                  {/* Editorial month header */}
                  <div className="flex items-end justify-between gap-3 px-1">
                    <div className="flex items-baseline gap-2">
                      <h2 className="text-3xl font-black italic tracking-tighter text-white leading-none">
                        {MONTHS_PT[monthIdx]}
                      </h2>
                      <span className="text-base font-black italic text-white/55 tracking-tighter">{year}</span>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/55 pb-1">
                      {monthEvents.length} {monthEvents.length === 1 ? "evento" : "eventos"}
                    </span>
                  </div>
                  <div className="h-px bg-gradient-to-r from-white/10 to-transparent" />

                  {/* Events */}
                  <div className="space-y-2">
                    {monthEvents.map((ev) => {
                      const meta = getMeta(ev.event_type);
                      const days = daysBetween(ev.event_date);
                      const u = urgencyTone(days);
                      const d = new Date(ev.event_date + "T12:00:00");
                      const dayNum = d.getDate();
                      const weekday = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");

                      return (
                        <button
                          key={ev.id}
                          onClick={() => setSelectedDate(d)}
                          className="w-full text-left bg-white/3 border border-white/6 hover:border-white/15 rounded-2xl p-3.5 transition-all active:scale-[0.99] touch-manipulation group"
                        >
                          <div className="flex items-center gap-3.5">
                            {/* Day anchor — editorial typography */}
                            <div className="flex flex-col items-center justify-center w-12 shrink-0">
                              <span className="text-3xl font-black italic leading-none tracking-tighter text-white">
                                {String(dayNum).padStart(2, "0")}
                              </span>
                              <span className="text-[8px] font-black uppercase tracking-widest text-white/55 mt-0.5">
                                {weekday}
                              </span>
                            </div>

                            {/* Divider line + color */}
                            <div className="self-stretch flex flex-col items-center justify-center">
                              <div className={`w-1 h-full ${meta.dot} rounded-full`} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-black text-white italic leading-snug line-clamp-2">
                                  {ev.title}
                                </p>
                                {ev.is_official && (
                                  <ShieldCheck className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                <Badge className={`${meta.chip} border font-black text-[8px] uppercase px-1.5 h-4`}>
                                  {meta.label}
                                </Badge>
                                <span className={`${u.bg} ${u.color} font-black text-[8px] uppercase tracking-widest px-2 h-4 rounded-full flex items-center gap-1`}>
                                  <Clock3 className="h-2 w-2" />
                                  {u.label}
                                </span>
                              </div>
                              {ev.description && (
                                <p className="text-[11px] text-white/40 font-medium italic mt-1.5 line-clamp-2 leading-tight">
                                  {ev.description}
                                </p>
                              )}
                            </div>

                            <ChevronRight className="h-3.5 w-3.5 text-white/15 group-hover:text-white/40 transition-colors shrink-0" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })
          )}
        </div>
      ) : (
        /* ─────────────────────────────────────────────────────────────────────
           GRID — Traditional month-grid calendar with dark styling.
        ────────────────────────────────────────────────────────────────────── */
        <div className="space-y-4">
          <div className="bg-white/3 border border-white/6 rounded-[1.5rem] overflow-hidden p-3">
            <div className="rounded-xl bg-[#0d0d0f] border border-white/5 p-3">
              <style jsx global>{`
                .rdp { color: rgba(255,255,255,0.85); }
                .rdp-day { color: rgba(255,255,255,0.6); border-radius: 0.5rem; font-weight: 600; }
                .rdp-day:hover:not([disabled]) { background-color: rgba(255,255,255,0.06) !important; }
                .rdp-day_selected,
                .rdp-day_selected:focus-visible,
                .rdp-day_selected:hover { background-color: rgb(249,115,22) !important; color: white !important; }
                .rdp-day_today { color: rgb(251,146,60) !important; font-weight: 800; }
                .rdp-head_cell { color: rgba(255,255,255,0.3); font-weight: 800; text-transform: uppercase; font-size: 0.6rem; letter-spacing: 0.1em; }
                .rdp-caption_label { color: rgba(255,255,255,0.9); font-weight: 800; font-style: italic; letter-spacing: -0.025em; }
                .rdp-nav_button { color: rgba(255,255,255,0.5); }
                .rdp-nav_button:hover { background-color: rgba(255,255,255,0.08) !important; color: white !important; }
              `}</style>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                modifiers={{ hasEvent: (day) => eventDates.has(day.toISOString().split("T")[0]) }}
                modifiersClassNames={{
                  hasEvent:
                    "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-orange-400",
                }}
                className="mx-auto"
              />
            </div>
          </div>

          {/* Events on selected date */}
          {eventsOnSelected.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40 px-1">
                {selectedDate?.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
              </p>
              {eventsOnSelected.map((ev) => {
                const meta = getMeta(ev.event_type);
                return (
                  <div
                    key={ev.id}
                    className="flex gap-3 bg-white/3 border border-white/6 rounded-2xl p-4"
                  >
                    <div className={`w-1 rounded-full shrink-0 ${meta.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-black text-white text-sm italic">{ev.title}</p>
                        {ev.is_official && (
                          <ShieldCheck className="h-3.5 w-3.5 text-yellow-400" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Badge className={`${meta.chip} border font-black text-[8px] uppercase px-1.5 h-4`}>
                          {meta.label}
                        </Badge>
                      </div>
                      {ev.description && (
                        <p className="text-xs text-white/50 font-medium italic mt-2 leading-relaxed">
                          {ev.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {eventsOnSelected.length === 0 && selectedDate && (
            <div className="py-10 text-center border border-dashed border-white/10 rounded-2xl">
              <p className="text-xs font-bold text-white/55 uppercase tracking-widest">
                Nenhum evento neste dia
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
