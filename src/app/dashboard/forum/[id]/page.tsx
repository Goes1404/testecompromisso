
"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Send, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/app/lib/supabase";
import { useToast } from "@/hooks/use-toast";

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

    // Inscrição Real-time
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
      <div className="h-96 flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 animate-spin text-accent" />
        <p className="text-muted-foreground font-black uppercase text-[10px] tracking-widest animate-pulse">Sincronizando Debate...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-full mx-auto w-full animate-in fade-in overflow-hidden space-y-2 px-1">
       <div className="flex items-center justify-between px-2 py-2 md:py-3 shrink-0 bg-white/50 backdrop-blur-md rounded-2xl shadow-sm border border-white/20">
        <div className="flex items-center gap-2 overflow-hidden min-w-0">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full h-9 w-9 shrink-0 hover:bg-primary/5">
            <ChevronLeft className="h-5 w-5 text-primary" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-sm md:text-base font-black text-primary italic leading-none truncate">
              {forum?.name}
            </h1>
            <Badge variant="outline" className="bg-accent text-accent-foreground border-none font-black text-[6px] md:text-[8px] uppercase px-2 h-4 tracking-widest mt-1">
              {forum?.category || "Geral"}
            </Badge>
          </div>
        </div>
        <Badge className="bg-green-100 text-green-700 border-none font-black text-[7px] md:text-[9px] px-2 py-1 uppercase tracking-tighter animate-pulse">Debate Ativo</Badge>
      </div>

      <Card className="flex-1 min-h-0 border-none shadow-2xl shadow-accent/10 rounded-2xl md:rounded-[3rem] bg-white overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-700">
        <ScrollArea className="flex-1" ref={scrollRef}>
           <div className="flex flex-col gap-6 py-6 md:py-10 px-4 md:px-12">
                <div className="p-6 bg-muted/10 rounded-[2rem] border-2 border-dashed border-primary/5 mb-6">
                  <p className="text-xs font-black uppercase text-primary/40 mb-2">Pauta Inicial</p>
                  <p className="text-sm font-medium italic text-primary/80">{forum?.description}</p>
                </div>

                {posts.map((post) => {
                    const isMe = post.author_id === user?.id;
                    return (
                        <div key={post.id} className={`flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                            <span className="text-[8px] font-black uppercase text-primary/40 px-2">{post.author_name}</span>
                            <div className={`px-5 py-3 rounded-[1.5rem] shadow-sm max-w-[85%] text-sm font-medium ${isMe ? 'bg-primary text-white rounded-tr-none' : 'bg-muted/30 text-primary rounded-tl-none border border-muted/20'}`}>
                                {post.content}
                            </div>
                        </div>
                    );
                })}
           </div>
        </ScrollArea>
        <div className="p-4 md:p-6 bg-muted/5 border-t shrink-0">
          <form onSubmit={handleSendPost} className="flex items-center gap-3 bg-white p-2 md:p-2.5 pl-6 rounded-full shadow-2xl border border-muted/20 focus-within:ring-2 focus-within:ring-accent/30 transition-all duration-300">
            <Input 
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="Contribuir com o debate..."
              disabled={isSubmitting}
              className="flex-1 h-10 md:h-12 bg-transparent border-none text-primary text-xs md:text-sm font-medium italic focus-visible:ring-0 px-0"
            />
            <Button type="submit" disabled={!newPost.trim() || isSubmitting} className="h-10 w-10 md:h-12 md:w-12 bg-primary hover:bg-primary/95 text-white rounded-full shadow-xl shrink-0 transition-all">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 md:h-5 md:w-5" />}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
