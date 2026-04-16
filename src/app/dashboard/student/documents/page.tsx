"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileCheck, 
  ExternalLink, 
  Cloud, 
  CheckCircle2, 
  ShieldCheck, 
  Info,
  Smartphone,
  MousePointer2,
  FolderPlus,
  Loader2,
  Calculator,
  Users2,
  Trash2,
  TrendingUp,
  UserPlus,
  FileWarning,
  Scale,
  Sparkles,
  ClipboardList,
  FileSearch,
  Clock,
  LayoutList
} from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/app/lib/supabase";
import Link from "next/link";

const DOCUMENT_GROUPS = [
  {
    title: "Documentos Pessoais",
    items: [
      { id: "rg", label: "RG (Frente e Verso)" },
      { id: "cpf", label: "CPF ou CNH" },
      { id: "birth_cert", label: "Certidão de Nascimento ou Casamento" },
      { id: "voter_id", label: "Título de Eleitor" },
      { id: "military", label: "Reservista (Para homens)" },
      { id: "address", label: "Comprovante de Residência atualizado" }
    ]
  },
  {
    title: "Escolares (FATEC/ETEC/SiSU)",
    items: [
      { id: "hs_transcript", label: "Histórico Escolar do Ensino Médio" },
      { id: "hs_diploma", label: "Certificado de Conclusão do Ensino Médio" },
      { id: "photo_3x4", label: "Foto 3x4 digitalizada" }
    ]
  },
  {
    title: "Socioeconômicos (ProUni/Cotas)",
    items: [
      { id: "income_all", label: "Comprovantes de Renda de todos os moradores" },
      { id: "cadunico", label: "Comprovante de Inscrição no CadÚnico (Se houver)" },
      { id: "tax_return", label: "Declaração de IR (Se houver)" }
    ]
  }
];

interface FamilyMember {
  id: string;
  label: string;
  income: string;
}

export default function StudentAdmissionCentral() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [savingDoc, setSavingDoc] = useState(false);
  const [checkedItems, setCheckedItems] = useState<string[]>([]);

  const [loadingCalc, setLoadingCalc] = useState(false);
  const [members, setFamilyMembers] = useState<FamilyMember[]>([
    { id: '1', label: 'Você', income: '' }
  ]);
  const [calcResult, setCalcResult] = useState<{
    eligible: boolean;
    perCapita: number;
    totalFamilyIncome: number;
    familySize: number;
    threshold: number;
  } | null>(null);

  const MIN_WAGE = 1621;
  const THRESHOLD = MIN_WAGE * 1.5;

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('student_checklists')
          .select('item_id')
          .eq('user_id', user.id);
        
        if (!error && data) {
          setCheckedItems(data.map(d => d.item_id));
        }
      } catch (e) {
        console.error("Erro ao carregar central:", e);
      } finally {
        setLoadingDocs(false);
      }
    }
    loadData();
  }, [user]);

  const toggleItem = async (itemId: string) => {
    if (!user || savingDoc) return;
    const isChecked = checkedItems.includes(itemId);
    const newItems = isChecked ? checkedItems.filter(i => i !== itemId) : [...checkedItems, itemId];
    setCheckedItems(newItems);
    setSavingDoc(true);
    try {
      if (isChecked) {
        await supabase.from('student_checklists').delete().match({ user_id: user.id, item_id: itemId });
      } else {
        await supabase.from('student_checklists').insert({ user_id: user.id, item_id: itemId });
      }
    } catch (e) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSavingDoc(false);
    }
  };

  const totalFamilyIncome = useMemo(() => {
    return members.reduce((acc, m) => acc + (Number(m.income) || 0), 0);
  }, [members]);

  const addMember = () => setFamilyMembers([...members, { id: Math.random().toString(36).substr(2, 9), label: '', income: '' }]);
  const removeMember = (id: string) => members.length > 1 && setFamilyMembers(members.filter(m => m.id !== id));
  const updateMember = (id: string, field: 'label' | 'income', value: string) => {
    setFamilyMembers(members.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const handleCalcSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingCalc(true);
    await new Promise(r => setTimeout(r, 1000));
    const familySize = members.length;
    const perCapita = totalFamilyIncome / familySize;
    const eligible = perCapita <= THRESHOLD;

    setCalcResult({ eligible, perCapita, totalFamilyIncome, familySize, threshold: THRESHOLD });

    if (user) {
      try {
        await supabase.from('profiles').update({ is_financial_aid_eligible: eligible }).eq('id', user.id);
      } catch (e) { console.error(e); }
    }
    setLoadingCalc(false);
    toast({ title: "Cálculo Concluído ✅", description: "Status de isenção atualizado no seu perfil." });
  };

  const totalDocs = DOCUMENT_GROUPS.reduce((acc, group) => acc + group.items.length, 0);
  const progressPercent = Math.round((checkedItems.length / totalDocs) * 100);

  if (loadingDocs) return (
    <div className="h-96 flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-12 w-12 animate-spin text-accent" />
      <p className="text-[10px] font-black uppercase tracking-widest text-primary animate-pulse">Sincronizando Central de Ingresso...</p>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20 px-1">
      <section className="bg-primary p-8 md:p-12 rounded-[2.5rem] text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-accent/20 rounded-full blur-3xl" />
        <div className="relative z-10 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <Badge className="bg-accent text-accent-foreground border-none font-black text-[9px] px-3 py-1 uppercase tracking-widest mb-2">Padrão SiSU/ProUni</Badge>
              <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter leading-none">Central de <span className="text-white">Ingresso</span></h1>
              <p className="text-sm md:text-lg text-white/90 font-medium italic">Gerencie seus dados e organize sua documentação oficial.</p>
            </div>
            <div className="flex flex-col items-end gap-3 bg-white/10 p-6 rounded-[2rem] border border-white/10 backdrop-blur-md">
              <div className="flex justify-between w-40 text-[9px] font-black uppercase text-white tracking-widest">
                <span>Prontidão Documental</span>
                <span className="text-white">{progressPercent}%</span>
              </div>
              <div className="h-1.5 w-40 bg-white/10 rounded-full overflow-hidden border border-white/5">
                <div className="h-full bg-accent transition-all duration-1000 shadow-[0_0_10px_rgba(245,158,11,0.5)]" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <Tabs defaultValue="checklist" className="space-y-8">
        <TabsList className="grid w-full grid-cols-2 h-16 bg-white shadow-xl rounded-2xl p-1.5 border-none">
          <TabsTrigger value="checklist" className="rounded-xl font-black text-xs uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
            <ClipboardList className="h-4 w-4 mr-2" /> Checklist de Documentos
          </TabsTrigger>
          <TabsTrigger value="exemption" className="rounded-xl font-black text-xs uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
            <Calculator className="h-4 w-4 mr-2" /> Cálculo de Renda
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checklist" className="animate-in slide-in-from-left-4 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-8">
              {DOCUMENT_GROUPS.map((group, idx) => (
                <Card key={idx} className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
                  <CardHeader className="bg-slate-50/50 border-b border-muted/10 p-8">
                    <CardTitle className="text-lg font-black text-primary italic uppercase flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg text-xs font-black">
                        {idx + 1}
                      </div>
                      {group.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 space-y-4">
                    {group.items.map((item) => (
                      <div 
                        key={item.id} 
                        className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                          checkedItems.includes(item.id) 
                            ? 'bg-green-50/50 border-green-200' 
                            : 'bg-white border-transparent hover:border-muted/20'
                        }`}
                        onClick={() => toggleItem(item.id)}
                      >
                        <Checkbox checked={checkedItems.includes(item.id)} onCheckedChange={() => toggleItem(item.id)} className="h-6 w-6 rounded-lg border-2" />
                        <span className={`text-sm font-bold italic transition-colors ${checkedItems.includes(item.id) ? 'text-green-700' : 'text-primary'}`}>{item.label}</span>
                        {checkedItems.includes(item.id) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="space-y-8">
              <Card className="border-none shadow-2xl bg-primary text-white rounded-[2.5rem] overflow-hidden relative group">
                <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-accent/20 rounded-full blur-2xl" />
                <CardHeader className="p-8 relative z-10">
                  <div className="h-14 w-14 rounded-3xl bg-white/10 flex items-center justify-center mb-6 shadow-xl"><Cloud className="h-8 w-8 text-white" /></div>
                  <CardTitle className="text-2xl font-black italic">Nuvem de Documentos</CardTitle>
                  <CardDescription className="text-white/90 font-medium font-bold italic">Use o Google Drive para não perder nada.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 pt-0 space-y-6 relative z-10">
                  <div className="space-y-4">
                    {[
                      { icon: MousePointer2, text: "Acesse drive.google.com" },
                      { icon: FolderPlus, text: 'Crie a pasta "Ingresso 2024"' },
                      { icon: Smartphone, text: 'Escaneie com a câmera do celular' }
                    ].map((step, i) => (
                      <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5">
                        <step.icon className="h-4 w-4 text-white shrink-0" />
                        <span className="text-xs font-bold italic opacity-90">{step.text}</span>
                      </div>
                    ))}
                  </div>
                  <Button asChild className="w-full h-14 bg-accent text-accent-foreground font-black text-xs uppercase rounded-2xl shadow-xl hover:scale-105 transition-all">
                    <a href="https://drive.google.com" target="_blank" rel="noopener noreferrer">ABRIR MEU DRIVE <ExternalLink className="ml-2 h-4 w-4" /></a>
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-none shadow-xl bg-white rounded-[2rem] p-8 space-y-4">
                <h3 className="text-[10px] font-black text-primary/40 uppercase tracking-widest flex items-center gap-2">
                  <FileSearch className="h-3.5 w-3.5 text-accent" /> Qualidade da Imagem
                </h3>
                <p className="text-xs font-medium italic text-primary/70 leading-relaxed">
                  "Evite fotos com sombras ou reflexos de luz. Se o texto não estiver legível, sua inscrição poderá ser indeferida pela universidade."
                </p>
              </Card>

              <Card className="border-none shadow-xl bg-white rounded-[2rem] p-8 space-y-4">
                <h3 className="text-[10px] font-black text-primary/40 uppercase tracking-widest flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-accent" /> Validade dos Papéis
                </h3>
                <p className="text-xs font-medium italic text-primary/70 leading-relaxed">
                  "Comprovantes de residência devem ter no máximo 90 dias. Certidões não podem ter rasuras ou remendos."
                </p>
              </Card>

              <Card className="border-none shadow-xl bg-white rounded-[2rem] p-8 space-y-4">
                <h3 className="text-[10px] font-black text-primary/40 uppercase tracking-widest flex items-center gap-2">
                  <LayoutList className="h-3.5 w-3.5 text-accent" /> Organização Maestro
                </h3>
                <p className="text-xs font-medium italic text-primary/70 leading-relaxed">
                  "Renomeie seus arquivos como 'RG_FRENTE.pdf' ou 'HISTORICO_MEDIO.pdf'. Isso agiliza a conferência do tutor e evita erros de envio."
                </p>
              </Card>

              <Card className="border-none shadow-xl bg-white rounded-[2rem] p-8 space-y-4">
                <h3 className="text-[10px] font-black text-primary/40 uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck className="h-3 w-3 text-accent" /> Dica de Segurança
                </h3>
                <p className="text-xs font-medium italic text-primary/70 leading-relaxed">
                  "Nunca envie documentos originais por chats informais. Mantenha seu rastro digital seguro em pastas oficiais."
                </p>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="exemption" className="animate-in slide-in-from-right-4 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 space-y-6">
              <Card className="border-none shadow-2xl bg-primary text-white rounded-[2.5rem] overflow-hidden relative group">
                <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-accent/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                <CardHeader className="p-8">
                  <div className="h-12 w-12 rounded-2xl bg-accent text-accent-foreground flex items-center justify-center mb-6 shadow-xl rotate-3"><Scale className="h-6 w-6" /></div>
                  <CardTitle className="text-2xl font-black italic">Critério Social</CardTitle>
                  <CardDescription className="text-white/60 font-medium italic">O parâmetro de 1,5 salário mínimo per capita.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 pt-0 space-y-6">
                  <div className="p-5 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-accent flex items-center gap-2"><CheckCircle2 className="h-3 w-3" /> Teto de Isenção</p>
                    <p className="text-sm font-medium leading-relaxed italic">Até <strong className="text-accent text-lg">R$ {THRESHOLD.toLocaleString('pt-BR')}</strong> por morador.</p>
                  </div>
                  <div className="space-y-4">
                    {[
                      { icon: Users2, text: "Inclua quem não tem renda (0,00)" },
                      { icon: Info, text: "Ignore auxílios governamentais" }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 opacity-80">
                        <item.icon className="h-4 w-4 text-accent" />
                        <span className="text-[11px] font-bold uppercase tracking-tight italic">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-8 space-y-8">
              <Card className="shadow-2xl border-none bg-white rounded-[2.5rem] overflow-hidden">
                <CardHeader className="bg-muted/10 p-10 border-b border-muted/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl font-black text-primary italic flex items-center gap-3">Cálculo de Renda <Sparkles className="h-5 w-5 text-accent" /></CardTitle>
                      <CardDescription className="font-medium italic">Adicione cada integrante da sua residência.</CardDescription>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Soma Familiar</p>
                      <p className="text-2xl font-black text-primary italic">R$ {totalFamilyIncome.toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-10">
                  <form onSubmit={handleCalcSubmit} className="space-y-6">
                    <div className="space-y-4">
                      {members.map((member, index) => (
                        <div key={member.id} className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-muted/20 border border-transparent hover:border-accent/20 transition-all">
                          <div className="flex-1 space-y-2">
                            <Label className="text-[9px] font-black uppercase text-primary/40 ml-2">Membro da Casa</Label>
                            <Input placeholder={index === 0 ? "Você" : "Ex: Mãe, Irmão..."} value={member.label} onChange={(e) => updateMember(member.id, 'label', e.target.value)} className="h-12 bg-white rounded-xl border-none font-bold italic" />
                          </div>
                          <div className="w-full sm:w-48 space-y-2">
                            <Label className="text-[9px] font-black uppercase text-primary/40 ml-2">Renda Bruta (R$)</Label>
                            <Input type="number" placeholder="0.00" value={member.income} onChange={(e) => updateMember(member.id, 'income', e.target.value)} className="h-12 bg-white rounded-xl border-none font-black text-primary" />
                          </div>
                          <div className="flex items-end pb-1">
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeMember(member.id)} disabled={members.length === 1} className="h-10 w-10 text-muted-foreground hover:text-red-500 rounded-full"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                      <Button type="button" variant="outline" onClick={addMember} className="flex-1 h-14 border-dashed border-2 border-primary/20 rounded-2xl font-bold text-primary"><UserPlus className="h-4 w-4 mr-2" /> Adicionar Membro</Button>
                      <Button type="submit" disabled={loadingCalc} className="flex-1 bg-primary text-white h-14 rounded-2xl font-black text-lg shadow-xl">
                        {loadingCalc ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <TrendingUp className="h-5 w-5 mr-2 text-accent" />} Verificar Elegibilidade
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {calcResult && (
                <div className="animate-in zoom-in-95 slide-in-from-top-10 duration-700">
                  <Card className={`border-none shadow-2xl rounded-[3rem] overflow-hidden ${calcResult.eligible ? 'bg-green-50/50' : 'bg-red-50/50'}`}>
                    <div className={`p-10 flex flex-col md:flex-row items-center gap-8 ${calcResult.eligible ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                      <div className="h-20 w-20 rounded-[2rem] bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-2xl">
                        {calcResult.eligible ? <CheckCircle2 className="h-10 w-10" /> : <FileWarning className="h-10 w-10" />}
                      </div>
                      <div>
                        <h3 className="text-2xl md:text-4xl font-black italic tracking-tighter leading-none">{calcResult.eligible ? "Elegível para Isenção" : "Fora do Critério Social"}</h3>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mt-2">Diagnóstico: {calcResult.familySize} moradores registrados</p>
                      </div>
                    </div>
                    <CardContent className="p-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-6 bg-white rounded-3xl border-2 border-muted/10 shadow-inner">
                        <span className="text-[9px] font-black text-muted-foreground uppercase">Sua Renda Per Capita</span>
                        <p className={`text-3xl font-black italic ${calcResult.eligible ? 'text-green-600' : 'text-red-600'}`}>R$ {calcResult.perCapita.toLocaleString('pt-BR')}</p>
                      </div>
                      <div className="p-6 bg-white rounded-3xl border-2 border-muted/10 shadow-inner">
                        <span className="text-[9px] font-black text-muted-foreground uppercase">Limite do Governo (1,5 SM)</span>
                        <p className="text-3xl font-black text-primary italic">R$ {calcResult.threshold.toLocaleString('pt-BR')}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}