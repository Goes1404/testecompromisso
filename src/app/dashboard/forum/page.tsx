
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  ArrowRight, 
  Loader2, 
  Hash,
  Calculator,
  Atom,
  FlaskConical,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/app/lib/supabase";

const FORUM_CATEGORIES = [
  "Todos", 
  "Dúvidas", 
  "Matemática", 
  "Física", 
  "Química", 
  "Biologia", 
  "Linguagens", 
  "História", 
  "Geografia", 
  "Carreira", 
  "Off-Topic"
];

export default function ForumPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newForum, setNewForum] = useState({ name: "", description: "", category: "Dúvidas" });
  const [forums, setForums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchForums = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('forums')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error) setForums(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchForums();
  }, []);

  const handleCreateForum = async () => {
    if (!newForum.name.trim() || !user) return;

    setIsSubmitting(true);
    const { data, error } = await supabase
      .from('forums')
      .insert([{
        name: newForum.name,
        description: newForum.description,
        category: newForum.category,
        author_id: user.id,
        author_name: profile?.name || user.email?.split('@')[0],
      }])
      .select()
      .single();
    
    if (!error) {
      setForums(prev => [data, ...prev]);
      toast({ title: "Discussão Iniciada!", description: "Sua pergunta agora está visível para toda a rede." });
      setIsCreateOpen(false);
      setNewForum({ name: "", description: "", category: "Dúvidas" });
    } else {
      toast({ title: "Erro ao publicar", description: error.message, variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const filteredForums = forums?.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (f.description && f.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = activeCategory === "Todos" || f.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "Matemática": return <Calculator className="h-5 w-5 md:h-6 md:w-6" />;
      case "Física": return <Atom className="h-5 w-5 md:h-6 md:w-6" />;
      case "Química": return <FlaskConical className="h-5 w-5 md:h-6 md:w-6" />;
      default: return <Hash className="h-5 w-5 md:h-6 md:w-6" />;
    }
  };

  return (
    <div className="flex flex-col space-y-6 md:space-y-10 animate-in fade-in duration-700 pb-20 max-w-full min-w-0 overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1 shrink-0">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-4xl font-black text-primary italic tracking-tight leading-none">
            Comunidade Compromisso
          </h1>
          <p className="text-muted-foreground font-medium text-sm md:text-lg italic">Onde o conhecimento se torna colaborativo.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
              <button className="rounded-xl md:rounded-[1.25rem] h-12 md:h-14 bg-accent text-accent-foreground font-black px-6 md:px-8 shadow-lg shadow-accent/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 w-full md:w-auto border-none">
                  <Plus className="h-5 w-5 md:h-6 md:w-6" />
                  <span className="text-sm md:text-base">Novo Tópico</span>
              </button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl border-none shadow-2xl p-6 md:p-10 max-w-[95vw] md:max-w-lg bg-white mx-auto">
              <DialogHeader>
                  <DialogTitle className="text-xl md:text-2xl font-black italic text-primary">Iniciar Discussão</DialogTitle>
                  <DialogDescription className="font-medium text-xs">Compartilhe sua dúvida com a rede.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                  <Input placeholder="Título da discussão" value={newForum.name} onChange={(e) => setNewForum({...newForum, name: e.target.value})} disabled={isSubmitting} />
                  <Select value={newForum.category} onValueChange={(v) => setNewForum({...newForum, category: v})} disabled={isSubmitting}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{FORUM_CATEGORIES.filter(c=>c!=="Todos").map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input placeholder="Descreva sua dúvida" value={newForum.description} onChange={(e) => setNewForum({...newForum, description: e.target.value})} disabled={isSubmitting} />
              </div>
              <DialogFooter>
                  <Button onClick={handleCreateForum} disabled={isSubmitting || !newForum.name.trim()} className="w-full h-12 rounded-xl">
                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : "Publicar"}
                  </Button>
              </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {FORUM_CATEGORIES.map(cat => (
          <Button 
            key={cat} 
            variant={activeCategory === cat ? "default" : "outline"}
            onClick={() => setActiveCategory(cat)}
            className="rounded-full px-6 h-10 text-[10px] font-black uppercase tracking-widest shrink-0"
          >
            {cat}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><Loader2 className="h-12 w-12 animate-spin text-accent" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 pt-2 px-1">
          {filteredForums?.map((forum) => (
              <Card key={forum.id} className="group relative overflow-hidden flex flex-col border-none shadow-xl rounded-[2rem] bg-white hover:shadow-2xl transition-all duration-500">
                  <CardHeader className="p-8">
                      <div className="flex items-center justify-between">
                          <div className="h-12 w-12 rounded-2xl bg-primary/5 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shadow-inner">{getCategoryIcon(forum.category)}</div>
                          <Badge className="bg-accent/10 text-accent border-none font-black text-[8px] uppercase px-3">{forum.category}</Badge>
                      </div>
                      <CardTitle className="pt-6 text-xl font-black italic text-primary leading-tight group-hover:text-accent transition-colors">{forum.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 pt-0 flex-grow">
                      <CardDescription className="font-medium italic line-clamp-2">"{forum.description}"</CardDescription>
                      <div className="flex items-center justify-between mt-8">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black uppercase text-muted-foreground">Autor</span>
                          <span className="text-[10px] font-bold text-primary">{forum.author_name}</span>
                        </div>
                        <Button asChild variant="ghost" className="text-accent font-black text-[10px] uppercase hover:bg-accent/10">
                          <Link href={`/dashboard/forum/${forum.id}`}>Debater <ArrowRight className="ml-2 h-4 w-4" /></Link>
                        </Button>
                      </div>
                  </CardContent>
              </Card>
          ))}
        </div>
      )}
    </div>
  );
}
