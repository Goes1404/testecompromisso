"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  User, 
  Camera, 
  CheckCircle2, 
  Loader2, 
  ShieldCheck, 
  Sparkles,
  Palette,
  Lock,
  Star,
  RefreshCw
} from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/app/lib/supabase";

const PRESET_AVATARS = [
  "https://picsum.photos/seed/user1/400/400",
  "https://picsum.photos/seed/user2/400/400",
  "https://picsum.photos/seed/user3/400/400",
  "https://picsum.photos/seed/user4/400/400",
  "https://picsum.photos/seed/user5/400/400",
  "https://picsum.photos/seed/user6/400/400",
];

export default function SettingsPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    avatar_url: "",
    favorite_subject: ""
  });

  useEffect(() => {
    async function fetchSubjects() {
      setLoadingSubjects(true);
      try {
        const { data, error } = await supabase
          .from('subjects')
          .select('id, name')
          .order('name');
        
        if (error) throw error;
        setSubjects(data || []);
      } catch (e) {
        console.error("Erro ao carregar matérias:", e);
      } finally {
        setLoadingSubjects(false);
      }
    }

    fetchSubjects();
  }, []);

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        avatar_url: profile.avatar_url || "",
        favorite_subject: profile.favorite_subject || ""
      });
    }
  }, [profile]);

  const isNameDisabled = (profile?.name_changes_count ?? 0) >= 1;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isUpdating) return;

    setIsUpdating(true);
    try {
      const isNameChanged = formData.name !== profile?.name;
      
      const updateData: any = {
        avatar_url: formData.avatar_url,
        favorite_subject: formData.favorite_subject,
        updated_at: new Date().toISOString()
      };

      if (isNameChanged && !isNameDisabled) {
        updateData.name = formData.name;
        updateData.name_changes_count = (profile?.name_changes_count ?? 0) + 1;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Perfil Atualizado! ✅",
        description: "Suas preferências foram sincronizadas com a rede industrial."
      });
    } catch (err: any) {
      toast({ title: "Erro na Atualização", description: err.message, variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, avatar_url: data.publicUrl }));
      toast({ title: "Foto industrial carregada! 📸" });
    } catch (err: any) {
      toast({ title: "Falha no Upload", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20 px-2 md:px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-primary italic leading-none">Configurações de Identidade</h1>
          <p className="text-muted-foreground font-medium italic">Gerencie sua presença digital e preferências acadêmicas.</p>
        </div>
        <Badge className="bg-accent text-accent-foreground font-black border-none px-5 py-2.5 flex items-center gap-2 w-fit rounded-xl shadow-xl">
          <ShieldCheck className="h-4 w-4" /> ACESSO VERIFICADO
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Coluna Visual */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-2xl bg-white rounded-[3rem] overflow-hidden text-center p-10 flex flex-col items-center">
            <div className="relative group mb-8">
              <div className="h-48 w-48 rounded-[3rem] overflow-hidden border-[8px] border-slate-50 shadow-2xl relative transition-transform duration-500 group-hover:scale-105">
                <Avatar className="h-full w-full rounded-none">
                  <AvatarImage src={formData.avatar_url || `https://picsum.photos/seed/${user.id}/400/400`} className="object-cover" />
                  <AvatarFallback className="bg-primary text-white text-6xl font-black italic">{formData.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                {isUploading && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center">
                    <Loader2 className="h-12 w-12 animate-spin text-white" />
                  </div>
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()} 
                disabled={isUploading} 
                className="absolute -bottom-3 -right-3 h-14 w-14 bg-accent rounded-2xl border-4 border-white flex items-center justify-center text-accent-foreground shadow-2xl hover:scale-110 active:scale-95 transition-all z-10"
                title="Trocar Foto"
              >
                <Camera className="h-7 w-7" />
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-primary italic leading-none truncate max-w-[240px] uppercase tracking-tighter">{formData.name || "Usuário"}</h3>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.3em]">{profile?.profile_type?.replace('_', ' ')} • {profile?.institution || 'Rede Geral'}</p>
            </div>
          </Card>

          <Card className="border-none shadow-xl bg-primary text-white rounded-[2.5rem] p-10 relative overflow-hidden group">
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 shadow-xl">
                  <Sparkles className="h-6 w-6 text-accent animate-pulse" />
                </div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em]">Protocolo Visual</h4>
              </div>
              <p className="text-sm md:text-lg font-medium italic opacity-80 leading-relaxed tracking-tight">
                "Uma foto nítida e profissional aumenta a confiança mútua nas mentorias e debates em grupo."
              </p>
            </div>
            <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-accent/20 rounded-full blur-3xl transition-transform duration-700 group-hover:scale-125" />
          </Card>
        </div>

        {/* Coluna Formulário */}
        <div className="lg:col-span-8 space-y-8">
          <Card className="border-none shadow-2xl bg-white rounded-[3rem] overflow-hidden">
            <CardHeader className="bg-muted/10 p-10 border-b border-dashed border-muted/20">
              <CardTitle className="text-2xl font-black text-primary italic uppercase tracking-tighter">Dados Cadastrais</CardTitle>
              <CardDescription className="font-medium italic text-lg mt-2">Alterações de nome são restritas por segurança de rede.</CardDescription>
            </CardHeader>
            <CardContent className="p-10">
              <form onSubmit={handleUpdateProfile} className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 px-2 flex items-center gap-3">
                      <User className="h-4 w-4" /> Nome de Exibição
                    </Label>
                    <div className="relative">
                      <Input 
                        value={formData.name} 
                        onChange={(e) => setFormData({...formData, name: e.target.value})} 
                        disabled={isNameDisabled} 
                        className={`h-16 rounded-2xl border-none font-bold text-xl italic ${isNameDisabled ? 'bg-muted/30 opacity-60' : 'bg-muted/40 shadow-inner focus:ring-accent'}`} 
                      />
                      {isNameDisabled && <Lock className="absolute right-5 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/20" />}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 px-2 flex items-center gap-3">
                      <Star className="h-4 w-4" /> Matéria de Foco
                    </Label>
                    <Select value={formData.favorite_subject} onValueChange={(v) => setFormData({...formData, favorite_subject: v})}>
                      <SelectTrigger className="h-16 rounded-2xl bg-muted/40 border-none font-bold text-xl italic shadow-inner">
                        {loadingSubjects ? (
                          <div className="flex items-center gap-3"><RefreshCw className="h-4 w-4 animate-spin" /> Sincronizando...</div>
                        ) : (
                          <SelectValue placeholder="Selecione sua preferência" />
                        )}
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-none shadow-2xl max-h-80 p-2">
                        {subjects.map(s => <SelectItem key={s.id} value={s.name} className="font-bold py-4 rounded-xl italic">{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-6">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 px-2 flex items-center gap-3">
                    <Palette className="h-4 w-4" /> Galeria de Avatares Dinâmicos
                  </Label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-6">
                    {PRESET_AVATARS.map((url, i) => (
                      <button 
                        key={i} 
                        type="button" 
                        onClick={() => setFormData({...formData, avatar_url: url})} 
                        className={`relative rounded-[1.5rem] overflow-hidden aspect-square border-[6px] transition-all hover:scale-110 active:scale-90 shadow-xl ${formData.avatar_url === url ? 'border-accent scale-110 ring-8 ring-accent/5' : 'border-white opacity-60 hover:opacity-100'}`}
                      >
                        <Avatar className="w-full h-full rounded-none"><AvatarImage src={url} className="object-cover" /></Avatar>
                        {formData.avatar_url === url && (
                          <div className="absolute inset-0 bg-accent/20 flex items-center justify-center animate-in zoom-in duration-500">
                            <CheckCircle2 className="h-10 w-10 text-white drop-shadow-xl" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <Button type="submit" disabled={isUpdating} className="w-full h-20 bg-primary text-white font-black text-xl rounded-3xl shadow-[0_20px_50px_-10px_rgba(26,44,75,0.4)] hover:scale-[1.02] active:scale-95 transition-all mt-6 border-none">
                  {isUpdating ? <Loader2 className="h-8 w-8 animate-spin mr-3" /> : <CheckCircle2 className="h-8 w-8 mr-3 text-accent" />}
                  SALVAR PREFERÊNCIAS
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}