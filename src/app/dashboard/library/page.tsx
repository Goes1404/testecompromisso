
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  FileText, 
  Video, 
  BookOpen, 
  ExternalLink, 
  Filter, 
  Loader2,
  PenLine
} from "lucide-react";
import Image from "next/image";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/app/lib/supabase";
import Link from "next/link";

const categories = ["Todos", "Matemática", "Física", "Tecnologia", "Linguagens", "História", "Saúde"];
const types = ["Todos", "PDF", "Video", "E-book", "Artigo"];

export default function LibraryPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [activeType, setActiveType] = useState("Todos");
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadResources() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('library_resources')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (!error) setResources(data || []);
      } catch (err) {
        console.error("Erro ao carregar acervo:", err);
      } finally {
        setLoading(false);
      }
    }
    loadResources();
  }, []);

  const filteredResources = resources.filter(resource => {
    const title = (resource.title || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    const matchesSearch = title.includes(search);
    const matchesCategory = activeCategory === "Todos" || resource.category === activeCategory;
    const matchesType = activeType === "Todos" || resource.type === activeType;
    return matchesSearch && matchesCategory && matchesType;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-primary italic leading-none">Biblioteca Digital</h1>
          <p className="text-muted-foreground text-lg font-medium">Acervo oficial curado pelos mentores da rede.</p>
        </div>
        <div className="relative w-full md:w-80 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-accent transition-colors" />
          <Input 
            placeholder="Buscar material..." 
            className="pl-12 h-14 bg-white border-none shadow-xl rounded-[1.25rem] text-lg font-medium italic focus-visible:ring-accent transition-all duration-300"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="Todos" className="w-full">
        <div className="flex items-center justify-between mb-6 overflow-x-auto pb-2 scrollbar-hide gap-4">
          <TabsList className="bg-white/50 backdrop-blur-md p-1.5 h-14 rounded-2xl border-none shadow-sm shrink-0">
            {categories.map(cat => (
              <TabsTrigger 
                key={cat} 
                value={cat} 
                onClick={() => setActiveCategory(cat)}
                className="rounded-xl px-6 data-[state=active]:bg-primary data-[state=active]:text-white font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 duration-300"
              >
                {cat}
              </TabsTrigger>
            ))}
          </TabsList>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="shrink-0 h-14 w-14 rounded-2xl bg-white border-none shadow-xl hover:bg-accent hover:text-white transition-all group active:scale-90 duration-300">
                <Filter className={`h-6 w-6 ${activeType !== 'Todos' ? 'text-accent group-hover:text-white' : ''}`} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 border-none shadow-2xl">
              <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-3 py-3">Filtrar por Tipo</DropdownMenuLabel>
              {types.map(type => (
                <DropdownMenuItem 
                  key={type} 
                  onClick={() => setActiveType(type)}
                  className={`rounded-xl px-3 py-2.5 font-bold text-sm cursor-pointer mb-1 last:mb-0 ${activeType === type ? 'bg-primary text-white' : ''}`}
                >
                  {type}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-accent" />
            <p className="font-black text-muted-foreground uppercase text-xs tracking-widest animate-pulse">Consultando Acervo...</p>
          </div>
        ) : filteredResources.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredResources.map((item, index) => (
              <Card key={item.id} className="overflow-hidden border-none shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group bg-white rounded-[2.5rem] flex flex-col animate-in fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image 
                    src={item.image_url || `https://picsum.photos/seed/${item.id}/400/250`} 
                    alt={item.title || "Material"} 
                    fill 
                    className="object-cover transition-transform duration-1000 group-hover:scale-110"
                    unoptimized
                  />
                  <div className="absolute top-4 left-4 flex gap-2">
                    <Badge className="bg-white/80 backdrop-blur-md text-primary border-none shadow-lg flex items-center gap-2 px-4 py-1.5 rounded-xl">
                      {item.type === "Video" ? <Video className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                      <span className="text-[10px] font-black uppercase tracking-wider">{item.type}</span>
                    </Badge>
                  </div>
                </div>
                
                <CardHeader className="p-8 space-y-4 flex-1">
                  <Badge variant="outline" className="w-fit text-[9px] border-accent/20 text-accent font-black uppercase px-2 py-0.5 bg-accent/5">
                    {item.category}
                  </Badge>
                  <CardTitle className="text-xl font-black text-primary italic leading-tight line-clamp-2">
                    {item.title}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground font-medium leading-relaxed line-clamp-3 italic opacity-80">
                    {item.description || "Material de apoio técnico pedagógico para aceleração do seu aprendizado."}
                  </p>
                </CardHeader>
                
                <CardFooter className="p-8 pt-0 mt-auto">
                  <div className="flex gap-3 w-full pt-6 border-t border-muted/10">
                    {item.type !== "Video" ? (
                      <Button asChild className="flex-1 bg-primary text-white h-12 rounded-xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all">
                        <Link href={`/dashboard/library/book/${item.id}`}>
                          <PenLine className="h-4 w-4 mr-2 text-accent" /> Estudar Agora
                        </Link>
                      </Button>
                    ) : (
                      <Button asChild className="flex-1 bg-slate-900 text-white h-12 rounded-xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all">
                        <a href={item.url} target="_blank" rel="noopener noreferrer">
                          <Video className="h-4 w-4 mr-2 text-accent" /> Ver Videoaula
                        </a>
                      </Button>
                    )}
                    <Button asChild variant="outline" className="h-12 w-12 rounded-xl border-2 border-muted/20 hover:border-accent hover:text-accent transition-all">
                      <a href={item.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-5 w-5" /></a>
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center border-4 border-dashed border-muted/20 rounded-[3rem] bg-white/50 animate-in zoom-in-95 duration-500">
            <FileText className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
            <p className="font-black italic text-xl text-primary/40">Acervo em Sincronização</p>
            <p className="text-sm text-muted-foreground mt-2">Nenhum material encontrado para os filtros atuais.</p>
          </div>
        )}
      </Tabs>
    </div>
  );
}
