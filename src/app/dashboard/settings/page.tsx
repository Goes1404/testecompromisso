"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Camera, 
  CheckCircle2, 
  Loader2, 
  ShieldCheck, 
  Sparkles,
  Palette,
  BellRing,
  Upload,
  AlertCircle
} from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/app/lib/supabase";

const PRESET_AVATARS = [
  "https://picsum.photos/seed/user1/200/200",
  "https://picsum.photos/seed/user2/200/200",
  "https://picsum.photos/seed/user3/200/200",
  "https://picsum.photos/seed/user4/200/200",
  "https://picsum.photos/seed/user5/200/200",
  "https://picsum.photos/seed/user6/200/200",
];

export default function SettingsPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    avatar_url: ""
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        avatar_url: profile.avatar_url || ""
      });
    }
  }, [profile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isUpdating) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          avatar_url: formData.avatar_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Perfil Atualizado! ✅",
        description: "Suas preferências foram sincronizadas com a rede."
      });
    } catch (err: any) {
      console.error("Erro ao atualizar:", err);
      toast({
        title: "Erro na Atualização",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Aumentado para 10MB para maior flexibilidade do usuário
    const MAX_SIZE = 10 * 1024 * 1024; 
    if (file.size > MAX_SIZE) {
      toast({ 
        title: "Arquivo muito grande", 
        description: "O novo limite é 10MB. Tente uma imagem mais leve.", 
        variant: "destructive" 
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`; // Salvando na raiz do bucket para simplificar

      // 1. Enviar para o Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { 
          cacheControl: '3600',
          upsert: true 
        });

      if (uploadError) {
        // Se der erro de bucket não encontrado ou permissão
        if (uploadError.message.includes("not found") || uploadError.message.includes("bucket")) {
          throw new Error("O bucket 'avatars' não foi encontrado. Crie-o no painel do Supabase e defina como 'Public'.");
        }
        throw uploadError;
      }

      // 2. Pegar a URL pública (Certifique-se que o bucket é público no Supabase)
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (!data?.publicUrl) throw new Error("Falha ao gerar URL da imagem.");

      // 3. Atualizar estado local
      setFormData(prev => ({ ...prev, avatar_url: data.publicUrl }));
      
      toast({ 
        title: "Foto processada! 📸", 
        description: "Agora clique em 'Gravar Alterações' para salvar seu novo perfil." 
      });
    } catch (err: any) {
      console.error("Erro upload:", err);
      toast({ 
        title: "Falha no Upload", 
        description: err.message || "Verifique se o bucket 'avatars' existe e é público no Supabase Storage.", 
        variant: "destructive" 
      });
    } finally {
      setIsUploading(false);
    }
  };

  const selectPresetAvatar = (url: string) => {
    setFormData(prev => ({ ...prev, avatar_url: url }));
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-primary italic leading-none">Configurações</h1>
          <p className="text-muted-foreground font-medium">Personalize sua identidade no Compromisso.</p>
        </div>
        <Badge className="bg-accent/10 text-accent font-black border-none px-4 py-2 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" /> CONTA ATIVA
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden text-center p-8">
            <div className="relative mx-auto w-32 h-32 mb-6 group">
              <Avatar className="w-32 h-32 border-4 border-primary/5 shadow-2xl transition-all group-hover:opacity-80">
                <AvatarImage src={formData.avatar_url || `https://picsum.photos/seed/${user.id}/200/200`} />
                <AvatarFallback className="bg-primary text-white text-4xl font-black">{formData.name?.charAt(0) || profile?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute bottom-0 right-0 h-10 w-10 bg-accent rounded-full border-4 border-white flex items-center justify-center text-accent-foreground shadow-lg hover:scale-110 active:scale-95 transition-all cursor-pointer z-10"
                title="Carregar da Galeria"
              >
                {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
              </button>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
                accept="image/*"
              />
            </div>
            <h3 className="text-xl font-black text-primary italic leading-none truncate">{formData.name || profile?.name || "Usuário"}</h3>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mt-2">{profile?.profile_type?.toUpperCase()}</p>
            
            <div className="mt-6 p-4 rounded-2xl bg-muted/10 border-2 border-dashed border-muted/20">
              <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                Clique no ícone de câmera (limite 10MB) ou escolha um avatar abaixo.
              </p>
            </div>
          </Card>

          <Card className="border-none shadow-xl bg-primary text-white rounded-[2rem] p-6 relative overflow-hidden">
            <div className="relative z-10">
              <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-accent" />
                Dica da Aurora
              </h4>
              <p className="text-xs font-medium italic opacity-80 leading-relaxed">
                "Um perfil autêntico gera mais confiança nas mentorias e debates da rede."
              </p>
            </div>
            <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-accent/20 rounded-full blur-2xl" />
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-muted/5 p-10">
              <CardTitle className="text-2xl font-black text-primary italic">Dados da Identidade</CardTitle>
              <CardDescription className="font-medium">Atualize como você aparece para mentores e colegas.</CardDescription>
            </CardHeader>
            <CardContent className="p-10 space-y-10">
              <form onSubmit={handleUpdateProfile} className="space-y-8">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-primary/50 flex items-center gap-2 px-2">
                      <User className="h-4 w-4" /> Nome Completo
                    </Label>
                    <Input 
                      id="name" 
                      value={formData.name} 
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="h-14 rounded-2xl bg-muted/30 border-none font-bold text-primary focus:ring-accent transition-all" 
                      placeholder="Seu nome oficial"
                    />
                  </div>

                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary/50 flex items-center gap-2 px-2">
                      <Palette className="h-4 w-4" /> Escolher Avatar Rápido
                    </Label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                      {PRESET_AVATARS.map((url, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => selectPresetAvatar(url)}
                          className={`relative rounded-2xl overflow-hidden aspect-square border-4 transition-all hover:scale-105 active:scale-95 ${
                            formData.avatar_url === url ? 'border-accent shadow-xl ring-4 ring-accent/5 scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                          }`}
                        >
                          <Avatar className="w-full h-full rounded-none">
                            <AvatarImage src={url} />
                          </Avatar>
                          {formData.avatar_url === url && (
                            <div className="absolute inset-0 bg-accent/20 flex items-center justify-center">
                              <CheckCircle2 className="h-6 w-6 text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                   <Button 
                    type="submit" 
                    disabled={isUpdating || isUploading}
                    className="w-full h-16 bg-primary text-white font-black text-lg rounded-2xl shadow-2xl shadow-primary/20 transition-all hover:bg-primary/95 active:scale-95"
                  >
                    {isUpdating ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : <CheckCircle2 className="h-6 w-6 mr-2" />}
                    {isUpdating ? "Sincronizando..." : "Gravar Alterações"}
                  </Button>
                  
                  <p className="text-[9px] text-center text-muted-foreground uppercase font-bold tracking-widest flex items-center justify-center gap-2">
                    <AlertCircle className="h-3 w-3" /> 
                    Certifique-se de ter criado o bucket 'avatars' como Público no Supabase Storage.
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-white rounded-[2rem] p-8 opacity-50 cursor-not-allowed">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center"><BellRing className="h-6 w-6 text-muted-foreground" /></div>
                <div>
                  <h4 className="font-black text-primary italic leading-none">Notificações Push</h4>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">Breve: Alertas de novas lives e aulas.</p>
                </div>
              </div>
              <Badge variant="outline" className="font-black text-[8px] uppercase">DESATIVADO</Badge>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
