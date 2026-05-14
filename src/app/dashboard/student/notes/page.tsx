"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Plus, Search, Trash2, List, ListOrdered, CheckSquare,
  Minus, Type, Heading1, Heading2, Heading3, Quote,
  BookOpen, Loader2, Pin, PinOff, ChevronLeft,
  StickyNote, GripVertical, Circle, CheckCircle2,
  Link2, Network, ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/app/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// ── Types ─────────────────────────────────────────────────────────────────────

type BlockType = "text" | "h1" | "h2" | "h3" | "bullet" | "numbered" | "todo" | "quote" | "divider";

interface Block {
  id: string;
  type: BlockType;
  content: string;
  checked?: boolean;
}

interface Note {
  id: string;
  title: string;
  blocks: Block[];
  subject_id: string | null;
  tags: string[];
  is_pinned: boolean;
  updated_at: string;
  created_at: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SUBJECT_PALETTE: Record<string, { bg: string; text: string; dot: string }> = {
  "Matemática":            { bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-400" },
  "Português":             { bg: "bg-purple-50",  text: "text-purple-700",  dot: "bg-purple-400" },
  "Língua Portuguesa":     { bg: "bg-purple-50",  text: "text-purple-700",  dot: "bg-purple-400" },
  "Linguagens":            { bg: "bg-violet-50",  text: "text-violet-700",  dot: "bg-violet-400" },
  "História":              { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-400" },
  "Ciências Humanas":      { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-400" },
  "Geografia":             { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-400" },
  "Biologia":              { bg: "bg-green-50",   text: "text-green-700",   dot: "bg-green-400" },
  "Ciências da Natureza":  { bg: "bg-teal-50",    text: "text-teal-700",    dot: "bg-teal-400" },
  "Física":                { bg: "bg-cyan-50",    text: "text-cyan-700",    dot: "bg-cyan-400" },
  "Química":               { bg: "bg-rose-50",    text: "text-rose-700",    dot: "bg-rose-400" },
  "Redação":               { bg: "bg-pink-50",    text: "text-pink-700",    dot: "bg-pink-400" },
};

const DEFAULT_PALETTE = { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" };

function subjectPalette(name: string) {
  return SUBJECT_PALETTE[name] ?? DEFAULT_PALETTE;
}

const SLASH_MENU_ITEMS = [
  { type: "text"     as BlockType, Icon: Type,         label: "Texto",           desc: "Parágrafo simples" },
  { type: "h1"       as BlockType, Icon: Heading1,     label: "Título 1",        desc: "Grande e em destaque" },
  { type: "h2"       as BlockType, Icon: Heading2,     label: "Título 2",        desc: "Subtítulo" },
  { type: "h3"       as BlockType, Icon: Heading3,     label: "Título 3",        desc: "Seção menor" },
  { type: "bullet"   as BlockType, Icon: List,         label: "Lista",           desc: "Marcadores" },
  { type: "numbered" as BlockType, Icon: ListOrdered,  label: "Lista Numerada",  desc: "Itens numerados" },
  { type: "todo"     as BlockType, Icon: CheckSquare,  label: "Tarefa",          desc: "Checkbox interativo" },
  { type: "quote"    as BlockType, Icon: Quote,        label: "Citação",         desc: "Bloco de destaque" },
  { type: "divider"  as BlockType, Icon: Minus,        label: "Divisor",         desc: "Linha separadora" },
];

function newBlock(type: BlockType = "text"): Block {
  return { id: crypto.randomUUID(), type, content: "", checked: false };
}

// ── Block renderer ────────────────────────────────────────────────────────────

function BlockRow({
  block,
  index,
  blockNumber,
  totalBlocks,
  isFocused,
  onFocus,
  onChange,
  onToggleCheck,
  onKeyDown,
  textareaRef,
}: {
  block: Block;
  index: number;
  blockNumber: number;
  totalBlocks: number;
  isFocused: boolean;
  onFocus: () => void;
  onChange: (content: string) => void;
  onToggleCheck: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef: (el: HTMLTextAreaElement | null) => void;
}) {
  if (block.type === "divider") {
    return (
      <div className="group flex items-center gap-3 py-2 px-2">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <GripVertical className="h-4 w-4 text-slate-300" />
        </div>
        <div className="flex-1 flex items-center">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        </div>
      </div>
    );
  }

  const baseTextarea =
    "w-full bg-transparent resize-none outline-none placeholder-slate-300 leading-relaxed";

  const typeStyle: Record<BlockType, string> = {
    text:     "text-[15px] text-slate-700 py-0.5",
    h1:       "text-3xl font-black italic text-primary tracking-tight py-1",
    h2:       "text-xl font-black text-primary py-0.5",
    h3:       "text-base font-bold text-primary py-0.5",
    bullet:   "text-[15px] text-slate-700 py-0.5",
    numbered: "text-[15px] text-slate-700 py-0.5",
    todo:     "text-[15px] py-0.5",
    quote:    "text-[15px] italic text-slate-500 py-1",
    divider:  "",
  };

  const placeholder: Record<BlockType, string> = {
    text:     "Escreva algo... ou pressione '/' para comandos",
    h1:       "Título principal",
    h2:       "Subtítulo",
    h3:       "Seção",
    bullet:   "Item da lista",
    numbered: "Item da lista",
    todo:     "Tarefa...",
    quote:    "Escreva uma citação ou ideia importante",
    divider:  "",
  };

  return (
    <div className={`group flex items-start gap-2 rounded-xl px-2 py-0.5 transition-colors ${isFocused ? "bg-primary/[0.02]" : "hover:bg-slate-50"}`}>
      {/* Drag handle */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity pt-1.5 shrink-0">
        <GripVertical className="h-4 w-4 text-slate-300 cursor-grab" />
      </div>

      {/* Block prefix */}
      {block.type === "bullet" && (
        <div className="pt-2 shrink-0 text-slate-400 font-black text-lg leading-none select-none">•</div>
      )}
      {block.type === "numbered" && (
        <div className="pt-1.5 shrink-0 text-slate-400 font-bold text-sm w-5 text-right select-none">{blockNumber}.</div>
      )}
      {block.type === "todo" && (
        <button
          onClick={onToggleCheck}
          className="pt-1.5 shrink-0 text-slate-400 hover:text-primary transition-colors"
        >
          {block.checked
            ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            : <Circle className="h-4 w-4" />}
        </button>
      )}
      {block.type === "quote" && (
        <div className="self-stretch w-1 rounded-full bg-primary/30 shrink-0 my-1" />
      )}

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        rows={1}
        value={block.content}
        placeholder={placeholder[block.type]}
        onFocus={onFocus}
        onChange={e => {
          onChange(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = e.target.scrollHeight + "px";
        }}
        onKeyDown={onKeyDown}
        className={`${baseTextarea} ${typeStyle[block.type]} ${
          block.type === "todo" && block.checked ? "line-through text-slate-400" : ""
        } flex-1`}
        style={{ minHeight: "28px", overflow: "hidden" }}
      />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function StudentNotesPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([newBlock()]);
  const [noteSubjectId, setNoteSubjectId] = useState<string | null>(null);
  const [noteIsPinned, setNoteIsPinned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [subjects, setSubjects] = useState<any[]>([]);
  const [filterSubject, setFilterSubject] = useState<string | null>(null);
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "editor">("list");

  // Slash menu
  const [slash, setSlash] = useState<{
    open: boolean; blockId: string; y: number; x: number; filter: string; cursor: number;
  }>({ open: false, blockId: "", y: 0, x: 0, filter: "", cursor: 0 });

  // Wikilink autocomplete menu
  const [wikiMenu, setWikiMenu] = useState<{
    blockId: string; query: string; y: number; x: number;
  } | null>(null);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const titleRef = useRef<HTMLTextAreaElement>(null);

  // ── Data loading ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("notes").select("*").eq("user_id", user.id).order("is_pinned", { ascending: false }).order("updated_at", { ascending: false }),
      supabase.from("subjects").select("id, name").order("name"),
    ]).then(([notesRes, subjectsRes]) => {
      if (notesRes.data) setNotes(notesRes.data as Note[]);
      if (subjectsRes.data) setSubjects(subjectsRes.data);
    }).finally(() => setLoading(false));
  }, [user]);

  // ── Auto-resize all textareas on block change ───────────────────────────────

  useEffect(() => {
    Object.values(textareaRefs.current).forEach(el => {
      if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; }
    });
  }, [blocks]);

  // ── Backlinks: notes that reference the active note via [[title]] ───────────

  const backlinks = useMemo(() => {
    if (!noteTitle.trim() || !activeId) return [];
    const pattern = `[[${noteTitle.trim().toLowerCase()}]]`;
    return notes.filter(n =>
      n.id !== activeId &&
      n.blocks.some(b => b.content.toLowerCase().includes(pattern))
    );
  }, [notes, noteTitle, activeId]);

  // ── All wikilink suggestions (notes other than active) ─────────────────────

  const wikiSuggestions = useMemo(() => {
    if (!wikiMenu) return [];
    const q = wikiMenu.query.toLowerCase();
    return notes
      .filter(n => n.id !== activeId && n.title.toLowerCase().includes(q))
      .slice(0, 8);
  }, [wikiMenu, notes, activeId]);

  // ── Save (debounced) ────────────────────────────────────────────────────────

  const scheduleSave = useCallback((id: string, title: string, bks: Block[], subId: string | null, pinned: boolean) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaving(true);
    saveTimer.current = setTimeout(async () => {
      try {
        const { error } = await supabase.from("notes").upsert({
          id,
          user_id: user!.id,
          title: title || "Sem título",
          blocks: bks,
          subject_id: subId,
          is_pinned: pinned,
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
        setNotes(prev => {
          const exists = prev.find(n => n.id === id);
          if (exists) return prev.map(n => n.id === id ? { ...n, title: title || "Sem título", blocks: bks, subject_id: subId, is_pinned: pinned, updated_at: new Date().toISOString() } : n);
          return prev; // new note already added optimistically
        });
      } catch (e: any) {
        toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
      } finally {
        setSaving(false);
      }
    }, 1200);
  }, [user, toast]);

  // ── Open note ───────────────────────────────────────────────────────────────

  const openNote = (note: Note) => {
    setActiveId(note.id);
    setNoteTitle(note.title === "Sem título" ? "" : note.title);
    setBlocks(note.blocks.length > 0 ? note.blocks : [newBlock()]);
    setNoteSubjectId(note.subject_id);
    setNoteIsPinned(note.is_pinned);
    setMobileView("editor");
    setTimeout(() => titleRef.current?.focus(), 80);
  };

  // ── Create note ─────────────────────────────────────────────────────────────

  const createNote = async () => {
    if (!user) return;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const fresh: Note = { id, title: "Sem título", blocks: [newBlock()], subject_id: null, tags: [], is_pinned: false, updated_at: now, created_at: now };
    setNotes(prev => [fresh, ...prev]);
    openNote(fresh);
    await supabase.from("notes").insert({ id, user_id: user.id, title: "Sem título", blocks: fresh.blocks, updated_at: now, created_at: now });
  };

  // ── Delete note ─────────────────────────────────────────────────────────────

  const deleteNote = async (id: string) => {
    await supabase.from("notes").delete().eq("id", id);
    setNotes(prev => prev.filter(n => n.id !== id));
    if (activeId === id) { setActiveId(null); setMobileView("list"); }
    toast({ title: "Nota apagada" });
  };

  // ── Block helpers ───────────────────────────────────────────────────────────

  const updateBlock = (id: string, content: string) => {
    const next = blocks.map(b => b.id === id ? { ...b, content } : b);
    setBlocks(next);
    if (activeId) scheduleSave(activeId, noteTitle, next, noteSubjectId, noteIsPinned);
  };

  const toggleCheck = (id: string) => {
    const next = blocks.map(b => b.id === id ? { ...b, checked: !b.checked } : b);
    setBlocks(next);
    if (activeId) scheduleSave(activeId, noteTitle, next, noteSubjectId, noteIsPinned);
  };

  const changeBlockType = (id: string, type: BlockType) => {
    const next = blocks.map(b => b.id === id ? { ...b, type, content: b.content.replace(/^\/\S*/, "").trim() } : b);
    setBlocks(next);
    setSlash(s => ({ ...s, open: false }));
    setTimeout(() => textareaRefs.current[id]?.focus(), 40);
    if (activeId) scheduleSave(activeId, noteTitle, next, noteSubjectId, noteIsPinned);
  };

  const addBlockAfter = (id: string, type: BlockType = "text") => {
    const idx = blocks.findIndex(b => b.id === id);
    const fresh = newBlock(type);
    const next = [...blocks.slice(0, idx + 1), fresh, ...blocks.slice(idx + 1)];
    setBlocks(next);
    setFocusedBlockId(fresh.id);
    setTimeout(() => textareaRefs.current[fresh.id]?.focus(), 40);
    if (activeId) scheduleSave(activeId, noteTitle, next, noteSubjectId, noteIsPinned);
    return fresh.id;
  };

  const deleteBlock = (id: string) => {
    if (blocks.length <= 1) return;
    const idx = blocks.findIndex(b => b.id === id);
    const next = blocks.filter(b => b.id !== id);
    setBlocks(next);
    const prev = next[Math.max(0, idx - 1)];
    if (prev) setTimeout(() => {
      const el = textareaRefs.current[prev.id];
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    }, 30);
    if (activeId) scheduleSave(activeId, noteTitle, next, noteSubjectId, noteIsPinned);
  };

  // ── Keyboard handler ────────────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, blockId: string) => {
    const block = blocks.find(b => b.id === blockId)!;

    // Navigate slash menu
    if (slash.open) {
      const filtered = SLASH_MENU_ITEMS.filter(i => i.label.toLowerCase().includes(slash.filter.toLowerCase()));
      if (e.key === "ArrowDown") { e.preventDefault(); setSlash(s => ({ ...s, cursor: Math.min(s.cursor + 1, filtered.length - 1) })); return; }
      if (e.key === "ArrowUp")   { e.preventDefault(); setSlash(s => ({ ...s, cursor: Math.max(s.cursor - 1, 0) })); return; }
      if (e.key === "Enter")     { e.preventDefault(); if (filtered[slash.cursor]) changeBlockType(blockId, filtered[slash.cursor].type); return; }
      if (e.key === "Escape")    { setSlash(s => ({ ...s, open: false })); return; }
    }

    // Navigate wikilink menu
    if (wikiMenu) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); return; }
      if (e.key === "Enter" && wikiSuggestions.length > 0) { e.preventDefault(); insertWikilink(blockId, wikiSuggestions[0].title); return; }
      if (e.key === "Escape") { setWikiMenu(null); return; }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      setSlash(s => ({ ...s, open: false }));
      const type = (block.type === "bullet" || block.type === "numbered" || block.type === "todo") ? block.type : "text";
      addBlockAfter(blockId, type);
      return;
    }

    if (e.key === "Backspace" && block.content === "") {
      e.preventDefault();
      setSlash(s => ({ ...s, open: false }));
      if (block.type !== "text") {
        changeBlockType(blockId, "text");
      } else {
        deleteBlock(blockId);
      }
      return;
    }
  };

  // ── Wikilink insertion ──────────────────────────────────────────────────────

  const insertWikilink = (blockId: string, targetTitle: string) => {
    const block = blocks.find(b => b.id === blockId)!;
    const newContent = block.content.replace(/\[\[[^\]]*$/, `[[${targetTitle}]] `);
    updateBlock(blockId, newContent);
    setWikiMenu(null);
    setTimeout(() => {
      const el = textareaRefs.current[blockId];
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    }, 30);
  };

  // ── Slash / Wikilink menu trigger ───────────────────────────────────────────

  const handleBlockChange = (blockId: string, content: string) => {
    updateBlock(blockId, content);

    // Slash menu
    if (content === "/") {
      const el = textareaRefs.current[blockId];
      if (el) {
        const rect = el.getBoundingClientRect();
        setSlash({ open: true, blockId, y: rect.bottom + window.scrollY + 4, x: rect.left + window.scrollX, filter: "", cursor: 0 });
      }
    } else if (content.startsWith("/") && slash.open && slash.blockId === blockId) {
      setSlash(s => ({ ...s, filter: content.slice(1), cursor: 0 }));
    } else if (!content.startsWith("/")) {
      setSlash(s => ({ ...s, open: false }));
    }

    // Wikilink [[  menu
    const wikiMatch = content.match(/\[\[([^\]]*)$/);
    if (wikiMatch) {
      const el = textareaRefs.current[blockId];
      if (el) {
        const rect = el.getBoundingClientRect();
        setWikiMenu({ blockId, query: wikiMatch[1], y: rect.bottom + window.scrollY + 4, x: rect.left + window.scrollX });
      }
    } else {
      setWikiMenu(null);
    }
  };

  // ── Title change ────────────────────────────────────────────────────────────

  const handleTitleChange = (val: string) => {
    setNoteTitle(val);
    if (activeId) scheduleSave(activeId, val, blocks, noteSubjectId, noteIsPinned);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (blocks[0]) setTimeout(() => textareaRefs.current[blocks[0].id]?.focus(), 30);
    }
  };

  // ── Subject change ──────────────────────────────────────────────────────────

  const handleSubjectChange = (subId: string) => {
    const next = noteSubjectId === subId ? null : subId;
    setNoteSubjectId(next);
    if (activeId) scheduleSave(activeId, noteTitle, blocks, next, noteIsPinned);
    setNotes(prev => prev.map(n => n.id === activeId ? { ...n, subject_id: next } : n));
  };

  // ── Pin toggle ──────────────────────────────────────────────────────────────

  const togglePin = () => {
    const next = !noteIsPinned;
    setNoteIsPinned(next);
    if (activeId) scheduleSave(activeId, noteTitle, blocks, noteSubjectId, next);
    setNotes(prev => prev.map(n => n.id === activeId ? { ...n, is_pinned: next } : n));
  };

  // ── Derived data ────────────────────────────────────────────────────────────

  const filteredNotes = notes.filter(n => {
    const matchesSearch = !search || n.title.toLowerCase().includes(search.toLowerCase());
    const matchesSubject = !filterSubject || n.subject_id === filterSubject;
    return matchesSearch && matchesSubject;
  });

  const pinned = filteredNotes.filter(n => n.is_pinned);
  const recents = filteredNotes.filter(n => !n.is_pinned);

  const activeNote = notes.find(n => n.id === activeId);
  const activeSubject = subjects.find(s => s.id === noteSubjectId);

  // Numbered block counter
  const numberedCountMap: Record<string, number> = {};
  let counter = 0;
  blocks.forEach(b => {
    if (b.type === "numbered") { counter++; numberedCountMap[b.id] = counter; }
    else counter = 0;
  });

  const slashFiltered = SLASH_MENU_ITEMS.filter(i =>
    !slash.filter || i.label.toLowerCase().includes(slash.filter.toLowerCase())
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-10 w-10 animate-spin text-accent" />
    </div>
  );

  return (
    <div className="flex h-[calc(100dvh-4rem)] -mx-4 md:-mx-8 overflow-hidden rounded-none bg-white">

      {/* ── SIDEBAR ──────────────────────────────────────────────────────────── */}
      <aside className={`
        ${mobileView === "editor" ? "hidden" : "flex"} md:flex
        flex-col w-full md:w-[300px] shrink-0
        bg-slate-50/80 border-r border-slate-100 overflow-hidden
      `}>

        {/* Sidebar header */}
        <div className="p-4 md:p-5 pb-3 border-b border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center shadow">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-lg font-black italic text-primary">Meu Caderno</h1>
            </div>
            <div className="flex items-center gap-1">
              <Button asChild variant="ghost" size="icon"
                className="h-10 w-10 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                title="Grafo do conhecimento">
                <Link href="/dashboard/student/notes/graph">
                  <Network className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                onClick={createNote}
                size="icon"
                className="h-10 w-10 rounded-xl bg-primary text-white shadow hover:scale-105 active:scale-95 transition-all border-none"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Buscar notas..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 bg-white border-none shadow-sm rounded-xl text-sm font-medium"
            />
          </div>

          {/* Subject filters */}
          {subjects.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setFilterSubject(null)}
                className={`h-6 px-2.5 rounded-full text-[10px] font-black uppercase tracking-wide transition-all ${
                  !filterSubject ? "bg-primary text-white shadow" : "bg-white text-slate-500 hover:bg-slate-100"
                }`}
              >
                Todas
              </button>
              {subjects.slice(0, 5).map(s => {
                const pal = subjectPalette(s.name);
                return (
                  <button
                    key={s.id}
                    onClick={() => setFilterSubject(filterSubject === s.id ? null : s.id)}
                    className={`h-6 px-2.5 rounded-full text-[10px] font-black uppercase tracking-wide transition-all ${
                      filterSubject === s.id ? `${pal.bg} ${pal.text} shadow-sm` : "bg-white text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    {s.name.split(" ")[0]}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto py-2 space-y-0.5">
          {filteredNotes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 px-6 text-center">
              <StickyNote className="h-10 w-10 text-slate-200" />
              <p className="text-sm font-bold text-slate-400 italic">Nenhuma nota ainda.</p>
              <Button onClick={createNote} size="sm" className="rounded-xl font-black bg-primary text-white border-none shadow h-9 px-4 gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" /> Nova nota
              </Button>
            </div>
          )}

          {pinned.length > 0 && (
            <div className="px-3 pt-2 pb-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Fixadas</p>
            </div>
          )}
          {pinned.map(note => <NoteCard key={note.id} note={note} subjects={subjects} isActive={activeId === note.id} onClick={() => openNote(note)} />)}

          {recents.length > 0 && (
            <div className="px-3 pt-3 pb-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Recentes</p>
            </div>
          )}
          {recents.map(note => <NoteCard key={note.id} note={note} subjects={subjects} isActive={activeId === note.id} onClick={() => openNote(note)} />)}
        </div>

        {/* Footer count */}
        <div className="px-5 py-3 border-t border-slate-100">
          <p className="text-[10px] font-bold text-slate-400">{notes.length} nota{notes.length !== 1 ? "s" : ""}</p>
        </div>
      </aside>

      {/* ── EDITOR ───────────────────────────────────────────────────────────── */}
      <main className={`
        ${mobileView === "list" ? "hidden" : "flex"} md:flex
        flex-1 flex-col overflow-hidden bg-white
      `}>

        {!activeId ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
            <div className="h-24 w-24 rounded-[2rem] bg-primary/5 flex items-center justify-center shadow-inner">
              <BookOpen className="h-12 w-12 text-primary/20" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black italic text-primary">Selecione uma nota</h2>
              <p className="text-sm text-slate-400 font-medium max-w-xs">
                Escolha uma nota na lista ou crie uma nova para começar a escrever.
              </p>
            </div>
            <Button onClick={createNote} className="h-12 px-8 rounded-2xl bg-primary text-white font-black border-none shadow-xl shadow-primary/20 gap-2 hover:scale-[1.02] active:scale-95 transition-all">
              <Plus className="h-4 w-4" />
              Nova Nota
            </Button>
          </div>
        ) : (
          <>
            {/* Editor toolbar */}
            <div className="flex items-center justify-between px-4 md:px-10 py-2 md:py-3 border-b border-slate-100 shrink-0 gap-2">
              <button
                className="md:hidden flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-primary transition-colors"
                onClick={() => setMobileView("list")}
              >
                <ChevronLeft className="h-4 w-4" /> Notas
              </button>

              {/* Subject picker */}
              <div className="flex items-center gap-2 flex-wrap">
                {subjects.slice(0, 6).map(s => {
                  const pal = subjectPalette(s.name);
                  const isActive = noteSubjectId === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => handleSubjectChange(s.id)}
                      className={`h-6 px-3 rounded-full text-[10px] font-black uppercase tracking-wide border transition-all ${
                        isActive
                          ? `${pal.bg} ${pal.text} border-transparent shadow-sm`
                          : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                      }`}
                    >
                      {s.name.length > 12 ? s.name.split(" ")[0] : s.name}
                    </button>
                  );
                })}
              </div>

              {/* Right actions */}
              <div className="flex items-center gap-1 ml-auto shrink-0">
                {saving && (
                  <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold text-slate-400 mr-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Salvando...
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  title={noteIsPinned ? "Desafixar" : "Fixar nota"}
                  onClick={togglePin}
                  className={`h-10 w-10 rounded-xl transition-colors ${noteIsPinned ? "text-amber-500 bg-amber-50" : "text-slate-400 hover:text-amber-500 hover:bg-amber-50"}`}
                >
                  {noteIsPinned ? <Pin className="h-4 w-4 fill-current" /> : <PinOff className="h-4 w-4" />}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-black text-primary">Apagar nota?</AlertDialogTitle>
                      <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-xl font-bold">Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteNote(activeId!)} className="rounded-xl font-bold bg-red-500 hover:bg-red-600 border-none">
                        Apagar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {/* Scrollable editor content */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto px-4 md:px-10 py-6 md:py-8 space-y-1">

                {/* Subject badge */}
                {activeSubject && (
                  <div className="mb-4">
                    {(() => {
                      const pal = subjectPalette(activeSubject.name);
                      return (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${pal.bg} ${pal.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${pal.dot}`} />
                          {activeSubject.name}
                        </span>
                      );
                    })()}
                  </div>
                )}

                {/* Title */}
                <textarea
                  ref={titleRef}
                  rows={1}
                  value={noteTitle}
                  placeholder="Sem título"
                  onChange={e => {
                    handleTitleChange(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = e.target.scrollHeight + "px";
                  }}
                  onKeyDown={handleTitleKeyDown}
                  className="w-full bg-transparent resize-none outline-none text-2xl md:text-4xl font-black italic text-primary placeholder-slate-200 leading-tight mb-2"
                  style={{ minHeight: "44px", overflow: "hidden" }}
                />

                {/* Timestamp */}
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-6">
                  {activeNote ? format(new Date(activeNote.updated_at), "dd 'de' MMM 'de' yyyy", { locale: ptBR }) : ""}
                </p>

                {/* Blocks */}
                {blocks.map((block, idx) => (
                  <BlockRow
                    key={block.id}
                    block={block}
                    index={idx}
                    blockNumber={numberedCountMap[block.id] ?? idx + 1}
                    totalBlocks={blocks.length}
                    isFocused={focusedBlockId === block.id}
                    onFocus={() => setFocusedBlockId(block.id)}
                    onChange={content => handleBlockChange(block.id, content)}
                    onToggleCheck={() => toggleCheck(block.id)}
                    onKeyDown={e => handleKeyDown(e, block.id)}
                    textareaRef={el => { textareaRefs.current[block.id] = el; }}
                  />
                ))}

                {/* Add block hint */}
                <button
                  onClick={() => addBlockAfter(blocks[blocks.length - 1].id)}
                  className="w-full mt-4 py-3 rounded-xl border-2 border-dashed border-slate-100 hover:border-primary/20 hover:bg-primary/[0.02] transition-all flex items-center justify-center gap-2 text-slate-300 hover:text-primary/40 text-sm font-bold"
                >
                  <Plus className="h-4 w-4" />
                  Clique para adicionar bloco
                </button>

                {/* Slash + Wikilink hints */}
                <div className="flex items-center justify-center gap-4 mt-2 flex-wrap">
                  <p className="text-[10px] text-slate-200 font-bold uppercase tracking-widest">
                    <kbd className="bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-mono">/</kbd> tipos de bloco
                  </p>
                  <p className="text-[10px] text-slate-200 font-bold uppercase tracking-widest">
                    <kbd className="bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-mono">[[</kbd> linkar nota
                  </p>
                </div>

                {/* ── Backlinks panel ── */}
                {backlinks.length > 0 && (
                  <div className="mt-10 pt-8 border-t border-slate-100">
                    <div className="flex items-center gap-2 mb-4">
                      <Link2 className="h-4 w-4 text-slate-400" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {backlinks.length} link{backlinks.length !== 1 ? "s" : ""} reverso{backlinks.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {backlinks.map(note => {
                        const subj = subjects.find(s => s.id === note.subject_id);
                        const pal = subj ? subjectPalette(subj.name) : null;
                        return (
                          <button
                            key={note.id}
                            onClick={() => openNote(note)}
                            className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 hover:border-primary/20 hover:bg-primary/[0.02] transition-all text-left group"
                          >
                            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 font-black text-primary text-sm">
                              {note.title.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-black italic text-primary text-sm truncate">{note.title}</p>
                              {subj && pal && (
                                <span className={`text-[9px] font-black uppercase ${pal.text}`}>{subj.name}</span>
                              )}
                            </div>
                            <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-primary transition-colors shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </>
        )}
      </main>

      {/* ── SLASH MENU (fixed overlay) ────────────────────────────────────────── */}
      {slash.open && slashFiltered.length > 0 && (
        <div
          className="fixed z-50 w-[min(16rem,90vw)] bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-100"
          style={{ top: Math.min(slash.y, window.innerHeight - 320), left: Math.min(slash.x, window.innerWidth - 260) }}
        >
          <p className="px-3 pt-1 pb-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
            Tipos de bloco {slash.filter && `· "${slash.filter}"`}
          </p>
          {slashFiltered.map((item, i) => (
            <button
              key={item.type}
              onClick={() => changeBlockType(slash.blockId, item.type)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors ${
                i === slash.cursor ? "bg-primary/5 text-primary" : "hover:bg-slate-50 text-slate-700"
              }`}
            >
              <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${i === slash.cursor ? "bg-primary text-white" : "bg-slate-100 text-slate-500"}`}>
                <item.Icon className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="font-bold text-sm leading-none">{item.label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── WIKILINK MENU (fixed overlay) ─────────────────────────────────────── */}
      {wikiMenu && wikiSuggestions.length > 0 && (
        <div
          className="fixed z-50 w-[min(16rem,90vw)] bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-100"
          style={{ top: Math.min(wikiMenu.y, window.innerHeight - 260), left: Math.min(wikiMenu.x, window.innerWidth - 260) }}
        >
          <p className="px-3 pt-1 pb-2 text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <Link2 className="h-3 w-3" /> Linkar nota
            {wikiMenu.query && <span className="text-primary">· "{wikiMenu.query}"</span>}
          </p>
          {wikiSuggestions.map((note, i) => {
            const subj = subjects.find(s => s.id === note.subject_id);
            const pal = subj ? subjectPalette(subj.name) : null;
            return (
              <button
                key={note.id}
                onClick={() => insertWikilink(wikiMenu.blockId, note.title)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-primary/5 transition-colors"
              >
                <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 font-black text-primary text-sm">
                  {note.title.charAt(0).toUpperCase()}
                </div>
                <div className="text-left min-w-0">
                  <p className="font-bold text-sm leading-tight truncate">{note.title}</p>
                  {subj && pal && (
                    <p className={`text-[9px] font-black uppercase ${pal.text}`}>{subj.name}</p>
                  )}
                </div>
              </button>
            );
          })}
          <p className="px-3 pt-1 pb-2 text-[9px] text-slate-300 font-bold">
            Enter para inserir o primeiro resultado
          </p>
        </div>
      )}

    </div>
  );
}

// ── Note Card (sidebar) ───────────────────────────────────────────────────────

function NoteCard({ note, subjects, isActive, onClick }: { note: Note; subjects: any[]; isActive: boolean; onClick: () => void }) {
  const subject = subjects.find(s => s.id === note.subject_id);
  const pal = subject ? subjectPalette(subject.name) : null;
  const preview = note.blocks.find(b => b.type === "text" && b.content.trim())?.content ?? "";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 mx-2 rounded-xl transition-all ${
        isActive
          ? "bg-primary text-white shadow-md"
          : "hover:bg-white hover:shadow-sm"
      }`}
      style={{ width: "calc(100% - 16px)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={`font-black text-sm truncate leading-tight ${isActive ? "text-white" : "text-primary italic"}`}>
          {note.title || "Sem título"}
        </p>
        <div className="flex items-center gap-1.5 shrink-0">
          {note.is_pinned && <Pin className={`h-3 w-3 fill-current ${isActive ? "text-white/60" : "text-amber-400"}`} />}
        </div>
      </div>
      {preview && (
        <p className={`text-[11px] truncate mt-0.5 ${isActive ? "text-white/60" : "text-slate-400"}`}>
          {preview}
        </p>
      )}
      <div className="flex items-center justify-between mt-1.5 gap-2">
        <p className={`text-[9px] font-bold uppercase tracking-wide ${isActive ? "text-white/50" : "text-slate-300"}`}>
          {format(new Date(note.updated_at), "dd/MM/yy")}
        </p>
        {pal && subject && (
          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/20 text-white" : `${pal.bg} ${pal.text}`}`}>
            {subject.name.split(" ")[0]}
          </span>
        )}
      </div>
    </button>
  );
}
