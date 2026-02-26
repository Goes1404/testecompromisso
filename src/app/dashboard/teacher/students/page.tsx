
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { 
  Search, 
  AlertCircle, 
  UserCircle, 
  Send, 
  ShieldCheck, 
  Loader2, 
  Mail,
  ArrowUpRight
} from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/hooks/use-toast";

const mockStudents = [
  {
    id: "demo-s-1",
    name: "Arthur Pendragon",
    email: "arthur@exemplo.com",
    profile_type: "etec",
    institution: "ETEC Jorge Street",
    course: "Mecatrônica",
    last_access: new Date().toISOString(),
    is_financial_aid_eligible: true,
    progress: 85
  },
  {
    id: "demo-s-2",
    name: "Beatriz Oliveira",
    email: "beatriz@exemplo.com",
    profile_type: "uni",
    institution: "FATEC São Paulo",
    course: "ADS",
    last_access: new Date(Date.now() - 864000000).toISOString(),
    is_financial_aid_eligible: false,
    progress: 42
  },
  {
    id: "demo-s-3",
    name: "Carlos Eduardo",
    email: "carlos@exemplo.com",
    profile_type: "etec",
    institution: "ETEC Lauro Gomes",
    course: "Informática",
    last_access: new Date().toISOString(),
    is_financial_aid_eligible: true,
    progress: 98
  }
];

export default function TeacherStudentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "at_risk" | "financial_aid">("all");
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
        setStudents(mockStudents);
        setLoading(false);
    }, 800);
  }, []);

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          student.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeFilter === "at_risk") {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return matchesSearch && (!student.last_access || new Date(student.last_access) < sevenDaysAgo);
    }
    if (activeFilter === "financial_aid") return matchesSearch && student.is_financial_aid_eligible === true;
    return matchesSearch;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1 px-1">
          <h1 className="text-3xl font-black text-primary italic leading-none">Gestão de Rede</h1>
          <p className="text-muted-foreground font-medium text-lg">Monitoramento estratégico do corpo discente.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-accent transition-colors" />
            <Input 
              placeholder="Pesquisar aluno..." 
              className="pl-12 h-14 bg-white border-none shadow-xl rounded-2xl italic focus-visible:ring-2 focus-visible:ring-accent/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Button onClick={() => setActiveFilter("all")} variant={activeFilter === "all" ? "default" : "outline"} className={`h-16 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-lg transition-all ${activeFilter === 'all' ? 'bg-primary scale-105 shadow-primary/20' : 'bg-white'}`}>
          <UserCircle className="h-5 w-5 mr-2" /> Total Rede
        </Button>
        <Button onClick={() => setActiveFilter("at_risk")} variant={activeFilter === "at_risk" ? "default" : "outline"} className={`h-16 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-lg transition-all ${activeFilter === 'at_risk' ? 'bg-red-600 scale-105 text-white' : 'bg-white text-red-600 border-red-100'}`}>
          <AlertCircle className="h-5 w-5 mr-2" /> Alunos em Risco
        </Button>
        <Button onClick={() => setActiveFilter("financial_aid")} variant={activeFilter === "financial_aid" ? "default" : "outline"} className={`h-16 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-lg transition-all ${activeFilter === 'financial_aid' ? 'bg-green-600 scale-105 text-white' : 'bg-white text-green-600 border-green-100'}`}>
          <ShieldCheck className="h-5 w-5 mr-2" /> Isenção Social
        </Button>
      </div>

      <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 flex justify-center"><Loader2 className="animate-spin h-10 w-10 text-accent" /></div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 border-b border-muted/10">
                    <TableRow className="border-none h-16">
                      <TableHead className="px-8 font-black uppercase text-[10px] tracking-widest text-primary/40">Estudante</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest text-primary/40">Instituição / Curso</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest text-primary/40">Status</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest text-primary/40">Evolução</TableHead>
                      <TableHead className="text-right px-8 font-black uppercase text-[10px] tracking-widest text-primary/40">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => {
                      const sevenDaysAgo = new Date();
                      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                      const isAtRisk = student.last_access && new Date(student.last_access) < sevenDaysAgo;
                      
                      return (
                        <TableRow key={student.id} className="border-b last:border-0 hover:bg-accent/5 transition-all group h-24">
                          <TableCell className="px-8">
                            <div className="flex items-center gap-4">
                              <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center font-black text-primary text-sm shadow-inner group-hover:bg-primary group-hover:text-white transition-all">{student.name.charAt(0)}</div>
                              <div className="flex flex-col">
                                <span className="font-black text-primary text-sm italic">{student.name}</span>
                                <span className="text-[10px] text-muted-foreground font-bold flex items-center gap-1"><Mail className="h-3 w-3"/> {student.email}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-primary/70">{student.institution}</span>
                              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{student.course}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`border-none font-black text-[8px] uppercase h-6 px-3 ${isAtRisk ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              {isAtRisk ? 'Risco Detectado' : 'Ativo'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="w-24 space-y-1">
                              <div className="flex justify-between text-[8px] font-black text-primary/40 uppercase">
                                <span>{student.progress}%</span>
                              </div>
                              <Progress value={student.progress} className="h-1 w-full" />
                            </div>
                          </TableCell>
                          <TableCell className="text-right px-8">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 text-accent hover:bg-accent/10"><Send className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 text-primary hover:bg-primary/5"><ArrowUpRight className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="md:hidden grid grid-cols-1 divide-y divide-muted/10">
                {filteredStudents.map((student) => (
                  <div key={student.id} className="p-6 space-y-4 hover:bg-accent/5 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary text-white flex items-center justify-center font-black text-xs shadow-lg">{student.name.charAt(0)}</div>
                        <div className="flex flex-col">
                          <span className="font-black text-primary text-sm italic">{student.name}</span>
                          <Badge className="w-fit bg-muted/50 text-[7px] font-black uppercase text-primary/40 border-none mt-1">{student.profile_type}</Badge>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="rounded-xl text-accent"><Send className="h-5 w-5" /></Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Instituição</p>
                        <p className="text-[10px] font-bold text-primary italic leading-tight">{student.institution}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Progresso</p>
                        <div className="flex items-center gap-2">
                          <Progress value={student.progress} className="h-1.5 flex-1" />
                          <span className="text-[9px] font-black text-accent">{student.progress}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {filteredStudents.length === 0 && !loading && (
            <div className="py-24 text-center">
              <UserCircle className="h-16 w-16 auto mb-4 text-muted-foreground/20" />
              <p className="font-black italic text-xl text-primary/40 uppercase tracking-widest">Rede Vazia</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
