"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { BookOpen, Plus, Search, Loader2, Trash2, FileText, Video, ExternalLink, Filter, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/app/lib/supabase";
import Image from "next/image";

const categories = ["Matemática", "Física", "Tecnologia", "Linguagens", "História", "Saúde", "Outros"];
const types = ["PDF", "Video", "E-book", "Artigo"];

export default function LibraryManagementPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setQuestionToEdit] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "Matemática",
    type: "PDF",
    url: "",
    image_url: ""
  });

  async function fetchResources() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('library_resources')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setResources(data || []);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro de Rede", description: "Falha ao carregar acervo.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchResources();
  }, []);

  const handleSave = async () => {
    if (!formData.title || !formData.url) {
      toast({ title: "Campos obrigatórios", description: "Título e Link são necessários.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('library_resources')
          .update(formData)
          .eq('id', editingId);
        if (error) throw error;
        toast({ title: "Apostila Atualizada!" });
      } else {
        const { error } = await supabase
          .from('library_resources')
          .insert([formData]);
        if (error) throw error;
        toast({ title: "Apostila Cadastrada!" });
      }
      
      setIsDialogOpen(false);
      setFormData({ title: "", description: "", category: "Matemática", type: "PDF", url: "", image_url: "" });
      setQuestionToEdit(null);
      fetchResources();
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover esta apostila?")) return;
    
    try {
      const { error } = await supabase.from('library_resources').delete().eq('id', id);
      if (error) throw error;
      setResources(prev => prev.filter(r => r.id !== id));
      toast({ title: "Removido do acervo." });
    } catch (e: any) {
      toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" });
    }
  };

  const startEdit = (resource: any) => {
    setQuestionToEdit(resource.id);
    setFormData({
      title: resource.title,
      description: resource.description || "",
      category: resource.category || "Matemática",
      type: resource.type || "PDF",
      url: resource.url || "",
      image_url: resource.image_url || ""
    });
    setIsDialogOpen(true);
  };

  const filtered = resources.filter(r => 
    r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-primary italic leading-none">Gestão de Apostilas</h1>
          <p className="text-muted-foreground font-medium italic">Curadoria industrial das apostilas e materiais didáticos.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if(!open) {
            setQuestionToEdit(null);
            setFormData({ title: "", description: "", category: "Matemática", type: "PDF", url: "", image_url: "" });
          }
        }}>
          <DialogTrigger asChild>
            <Button className="rounded-2xl h-14 bg-accent text-accent-foreground font-black px-8 shadow-xl hover:scale-105 transition-all">
              <Plus className="h-6 w-6 mr-2" /> Nova Apostila
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[2.5rem] p-10 bg-white max-w-lg border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black italic text-primary">Configurar Apostila</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase opacity-40">Título</Label>
                <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ex: Guia de Trigonometria" className="h-12 rounded-xl bg-muted/30 border-none font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase opacity-40">Categoria</Label>
                  <Select value={formData.category} onValueChange={v => setFormData({...formData, category: v})}>
                    <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-none font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase opacity-40">Tipo</Label>
                  <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                    <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-none font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent>{types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase opacity-40">Link do PDF ou Recurso</Label>
                <Input value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} placeholder="URL do PDF ou Vídeo" className="h-12 rounded-xl bg-muted/30 border-none font-medium" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase opacity-40">Capa (Opcional - URL)</Label>
                <Input value={formData.image_url} onChange={e => setFormData({...formData, image_url: e.target.value})} placeholder="https://..." className="h-12 rounded-xl bg-muted/30 border-none font-medium" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase opacity-40">Resumo Pedagógico</Label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Descrição breve para o aluno..." className="min-h-[80px] w-full rounded-xl bg-muted/30 border-none px-3 py-2 text-sm font-medium resize-none" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSave} disabled={isSubmitting} className="w-full h-16 bg-primary text-white font-black text-lg rounded-2xl shadow-xl">
                {isSubmitting ? <Loader2 className="animate-spin h-6 w-6 mr-2" /> : <Plus className="h-5 w-5 mr-2" />}
                {editingId ? "Atualizar Apostila" : "Publicar Apostila"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-xl group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-accent transition-colors" />
        <Input 
          placeholder="Pesquisar entre as apostilas..." 
          className="pl-12 h-14 bg-white border-none shadow-xl rounded-[1.25rem] italic focus-visible:ring-accent"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><Loader2 className="h-12 w-12 animate-spin text-accent" /></div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center border-4 border-dashed border-muted/20 rounded-[3rem] bg-muted/5">
          <BookOpen className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
          <p className="font-black text-primary italic text-xl">Nenhuma apostila localizada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map((item) => (
            <Card key={item.id} className="border-none shadow-xl overflow-hidden group bg-white rounded-[2.5rem] flex flex-col hover:shadow-2xl transition-all duration-500">
              <div className="relative aspect-video bg-muted overflow-hidden">
                <Image src={item.image_url || `https://picsum.photos/seed/${item.id}/600/400`} alt={item.title} fill className="object-cover transition-transform duration-1000 group-hover:scale-110" />
                <div className="absolute top-4 left-4">
                  <Badge className="bg-white/80 backdrop-blur-md text-primary border-none px-3 py-1 font-black text-[10px] uppercase shadow-lg flex items-center gap-2">
                    {item.type === 'Video' ? <Video className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                    {item.type}
                  </Badge>
                </div>
              </div>
              <CardHeader className="p-8 pb-4">
                <span className="text-[10px] font-black text-accent uppercase tracking-widest">{item.category}</span>
                <CardTitle className="text-xl font-black italic truncate mt-2">{item.title}</CardTitle>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-2 italic">{item.description || "Sem descrição."}</p>
              </CardHeader>
              <CardFooter className="p-8 pt-4 border-t border-muted/10 mt-auto flex justify-between">
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => startEdit(item)} className="h-10 w-10 rounded-full text-accent hover:bg-accent/10">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-10 w-10 rounded-full text-muted-foreground hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Button asChild variant="outline" className="h-10 px-4 rounded-xl border-2 font-black text-[10px] uppercase">
                  <a href={item.url} target="_blank" rel="noopener noreferrer">Acessar <ExternalLink className="h-3.5 w-3.5 ml-2" /></a>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}