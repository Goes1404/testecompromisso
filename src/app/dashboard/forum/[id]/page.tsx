
"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Send, Loader2, MessageSquare, Calendar } from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/app/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function ForumDetailPage() {
  const params = useParams();
  const forumId = params.id as string;
  const { user, profile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [newPost, setNewPost] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [forum, setForum] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!forumId) return;
      setLoading(true);
      try {
        const { data: forumData } = await supabase.from('forums').select('*').eq('id', forumId).single();
        if (forumData) setForum(forumData);

        const { data: postsData } = await supabase
          .from('forum_posts')
          .select('*')
          .eq('forum_id', forumId)
          .order('created_at', { ascending: true });
        
        setPosts(postsData || []);
      } catch (err) {
        console.error("Erro ao carregar fórum:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    const channel = supabase
      .channel(`forum:${forumId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'forum_posts', 
        filter: `forum_id=eq.${forumId}` 
      }, (payload) => {
        setPosts(prev => {
          const exists = prev.some(p => p.id === payload.new.id);
          return exists ? prev : [...prev, payload.new];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [forumId]);

  const handleSendPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() || !user || isSubmitting) return;

    setIsSubmitting(true);
    const content = newPost;
    
    const { data, error } = await supabase.from('forum_posts').insert({
      forum_id: forumId,
      author_id: user.id,
      author_name: profile?.name || user.email?.split('@')[0],
      content: content
    }).select().single();

    if (error) {
      console.error("Erro ao postar:", error);
      toast({ title: "Erro ao publicar", description: "Verifique a conexão.", variant: "destructive" });
    } else if (data) {
      setNewPost("");
      setPosts(prev => [...prev, data]);
    }
    setIsSubmitting(false);
  };

  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
      }
    }
  }, [posts]);

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 py-20">
        <Loader2 className="h-10 animate-spin text-accent" />
        <p className="text-muted-foreground font-black uppercase text-[10px] tracking-widest animate-pulse">Sincronizando Debate...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-full mx-auto w-full animate-in fade-in overflow-hidden">
       <div className="flex items-center justify-between p-2 md:p-4 bg-white/50 backdrop-blur-md rounded-2xl shadow-sm border mb-2">
        <div className="flex items-center gap-3 overflow-hidden min-w-0">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full h-10 w-10 shrink-0 hover:bg-primary/5">
            <ChevronLeft className="h-6 w-6 text-primary" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-base md:text-xl font-black text-primary italic leading-none truncate">
              {forum?.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="bg-accent/10 text-accent border-none font-black text-[8px] uppercase px-2 h-4 tracking-widest">
                {forum?.category || "Geral"}
              </Badge>
              <span className="text-[8px] font-bold text-muted-foreground uppercase hidden sm:inline">Iniciado por {forum?.author_name}</span>
            </div>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <Badge className="bg-green-100 text-green-700 border-none font-black text-[9px] px-3 py-1 uppercase tracking-tighter animate-pulse">Debate Ativo</Badge>
        </div>
      </div>

      <Card className="flex-1 min-h-0 border-none shadow-2xl shadow-primary/5 rounded-[2rem] md:rounded-[3rem] bg-white overflow-hidden flex flex-col relative">
        <ScrollArea className="flex-1" ref={scrollRef}>
           <div className="flex flex-col gap-6 py-8 px-4 md:px-12">
                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 mb-4 max-w-2xl mx-auto w-full">
                  <p className="text-[10px] font-black uppercase text-primary/40 mb-3 flex items-center gap-2">
                    <MessageSquare className="h-3 w-3" /> Pauta Inicial
                  </p>
                  <p className="text-sm md:text-base font-medium italic text-primary/80 leading-relaxed">
                    "{forum?.description}"
                  </p>
                </div>

                {posts.length === 0 ? (
                  <div className="text-center py-12 opacity-30 flex flex-col items-center">
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <MessageSquare className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="font-black italic uppercase text-xs">Seja o primeiro a contribuir</p>
                  </div>
                ) : (
                  posts.map((post) => {
                    const isMe = post.author_id === user?.id;
                    return (
                        <div key={post.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2`}>
                            <div className="flex items-center gap-2 mb-1 px-2">
                              <span className="text-[8px] font-black uppercase text-primary/40">{post.author_name}</span>
                              <span className="text-[7px] font-bold text-muted-foreground italic">
                                {format(new Date(post.created_at), "HH:mm")}
                              </span>
                            </div>
                            <div className={`px-5 py-3.5 rounded-[1.5rem] shadow-sm max-w-[90%] md:max-w-[70%] text-sm font-medium leading-relaxed ${
                              isMe 
                                ? 'bg-primary text-white rounded-tr-none' 
                                : 'bg-muted/30 text-primary rounded-tl-none border border-muted/20'
                            }`}>
                                {post.content}
                            </div>
                        </div>
                    );
                  })
                )}
           </div>
        </ScrollArea>
        <div className="p-4 md:p-6 bg-slate-50/50 border-t shrink-0">
          <form onSubmit={handleSendPost} className="flex items-center gap-3 bg-white p-2 pl-6 rounded-full shadow-xl border border-muted/20 focus-within:ring-2 focus-within:ring-accent/30 transition-all duration-300 max-w-4xl mx-auto">
            <Input 
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="Contribuir com o debate..."
              disabled={isSubmitting}
              className="flex-1 h-10 md:h-12 bg-transparent border-none text-primary text-sm font-medium italic focus-visible:ring-0 px-0"
            />
            <Button type="submit" disabled={!newPost.trim() || isSubmitting} className="h-10 w-10 md:h-12 md:w-12 bg-primary hover:bg-primary/95 text-white rounded-full shadow-xl shrink-0 transition-all">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
