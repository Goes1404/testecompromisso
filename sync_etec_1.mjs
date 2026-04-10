import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const data = [
  {"name": "Abner de Jesus Jales da Silva", "email": "abnerjsilva@compromisso.com", "institution": "Leda Caira", "exam_target": "ETEC"},
  {"name": "Adriane Maria da SIlva", "email": "adrianemsilva@compromisso.com", "institution": "Helena Chaves", "exam_target": "ETEC"},
  {"name": "Adriel Mateus Silva Nepomucena", "email": "adrielmnepomucena@compromisso.com", "institution": "Teotônio Vilela", "exam_target": "ETEC"},
  {"name": "Adryan da Paz Sales", "email": "adryanpsales@compromisso.com", "institution": "Ullysses Guimarães", "exam_target": "ETEC"},
  {"name": "Agata Beatriz Martins da Silva", "email": "agatabsilva@compromisso.com", "institution": "Benedita Odette", "exam_target": "ETEC"},
  {"name": "Agatha Caroline Lemes", "email": "agathaclemes@compromisso.com", "institution": "Tancredo Neves", "exam_target": "ETEC"},
  {"name": "Agatha Victória F. Silva", "email": "agathavsilva@compromisso.com", "institution": "Benedita Odette", "exam_target": "ETEC"},
  {"name": "Alessandra Gouveia", "email": "alessandragouveia@compromisso.com", "institution": "André Fernandes", "exam_target": "ETEC"},
  {"name": "Alex Eduardo", "email": "alexeduardo@compromisso.com", "institution": "Celina", "exam_target": "ETEC"},
  {"name": "Alexia Sales Godinho", "email": "alexiasgodinho@compromisso.com", "institution": "João José de Oliveira", "exam_target": "ETEC"},
  {"name": "Alexya Marques Teodosio", "email": "alexyamteodosio@compromisso.com", "institution": "Ruth de Azevedo", "exam_target": "ETEC"},
  {"name": "Alice D Fonseca", "email": "alicedfonseca@compromisso.com", "institution": "Leda Caira", "exam_target": "ETEC"},
  {"name": "Alice Mindelli", "email": "alicemindelli@compromisso.com", "institution": "Sebastião Florêncio", "exam_target": "ETEC"},
  {"name": "Alice Santos de Oliveira", "email": "alicesoliveira@compromisso.com", "institution": "Paulo Botelho", "exam_target": "ETEC"},
  {"name": "Allefy Augusto José Felix", "email": "allefyafelix@compromisso.com", "institution": "Maria Fernandes", "exam_target": "ETEC"},
  {"name": "Allyne Lidia dos Santos", "email": "allynelsantos@compromisso.com", "institution": "Helena Chaves", "exam_target": "ETEC"},
  {"name": "Amanda Ramos de Almeida", "email": "amandaralmeida@compromisso.com", "institution": "Paulo Botelho", "exam_target": "ETEC"},
  {"name": "Amanda de Souza Silva", "email": "amandassilva@compromisso.com", "institution": "Ana Aparecida", "exam_target": "ETEC"},
  {"name": "Ana Beatriz Jesus", "email": "anabjesus@compromisso.com", "institution": "Ruth de Azevedo", "exam_target": "ETEC"},
  {"name": "Ana Carolina Santos de Sousa", "email": "anacsousa@compromisso.com", "institution": "Padre Anacleto", "exam_target": "ETEC"},
  {"name": "Ana Clara P Pinheiro", "email": "anacpinheiro@compromisso.com", "institution": "Aurélio", "exam_target": "ETEC"},
  {"name": "Ana Clara da Silva", "email": "anacsilva@compromisso.com", "institution": "Daisy Moraes", "exam_target": "ETEC"},
  {"name": "Ana Clara dos Santos", "email": "anacsantos@compromisso.com", "institution": "Ullysses Guimarães", "exam_target": "ETEC"},
  {"name": "Ana Jhulya Arruda Silva", "email": "anajsilva@compromisso.com", "institution": "Manoel Jacob", "exam_target": "ETEC"},
  {"name": "Ana Julia Alves dos Santos", "email": "anajsantos@compromisso.com", "institution": "Ana Aparecida", "exam_target": "ETEC"},
  {"name": "Ana Jília Cardoso LIma", "email": "anajlima@compromisso.com", "institution": "João José de Oliveira", "exam_target": "ETEC"},
  {"name": "Ana Júlia Carvalho de Oliveira", "email": "anajoliveira@compromisso.com", "institution": "Paulo Botelho", "exam_target": "ETEC"},
  {"name": "Ana Júlia Macedo de Morais", "email": "anajmorais@compromisso.com", "institution": "Carlos Alberto", "exam_target": "ETEC"},
  {"name": "Ana Júlia Souza de Sá", "email": "anajsa@compromisso.com", "institution": "André Fernandes", "exam_target": "ETEC"},
  {"name": "Ana Luiza Andrade", "email": "analandrade@compromisso.com", "institution": "André Fernandes", "exam_target": "ETEC"},
  {"name": "Ana Vitória Lima dos Santos", "email": "anavsantos@compromisso.com", "institution": "João José de Oliveira", "exam_target": "ETEC"},
  {"name": "Ana Vitória Nogueira Santos", "email": "anavsantos2@compromisso.com", "institution": "J.K", "exam_target": "ETEC"},
  {"name": "Analice Silva Gomes", "email": "analicesgomes@compromisso.com", "institution": "Padre Anacleto", "exam_target": "ETEC"},
  {"name": "Andre Gonçalves Soares Filho", "email": "andregfilho@compromisso.com", "institution": "Sebastião Florêncio", "exam_target": "ETEC"},
  {"name": "Andre Lucena Silva", "email": "andrelsilva@compromisso.com", "institution": "Sebastião Florêncio", "exam_target": "ETEC"},
  {"name": "André Gustavo de Oliveira Soares", "email": "andregsoares@compromisso.com", "institution": "Teotônio Vilela", "exam_target": "ETEC"},
  {"name": "Anna Beatriz Rodrigues da Silva", "email": "annabsilva@compromisso.com", "institution": "Ana Aparecida", "exam_target": "ETEC"},
  {"name": "Annia de Queiroz SIlva", "email": "anniaqsilva@compromisso.com", "institution": "Ana Aparecida", "exam_target": "ETEC"},
  {"name": "Arthur Campos Calegari", "email": "arthurccalegari@compromisso.com", "institution": "Alba de Mello", "exam_target": "ETEC"},
  {"name": "Arthur Eduardo Gomes da SIlva", "email": "arthuresilva@compromisso.com", "institution": "Celina", "exam_target": "ETEC"},
  {"name": "Arthur Freire Da Silva", "email": "arthurfsilva_jk@compromisso.com", "institution": "J.K", "exam_target": "ETEC"},
  {"name": "Arthur Henrique Carneiro de Lima", "email": "arthurhlima@compromisso.com", "institution": "Imídeo Giuseppe", "exam_target": "ETEC"},
  {"name": "Arthur Ignacio Santana", "email": "arthurisantana@compromisso.com", "institution": "Sebastião Florêncio", "exam_target": "ETEC"},
  {"name": "Arthur de Almeida", "email": "arthuralmeida_af@compromisso.com", "institution": "André Fernandes", "exam_target": "ETEC"},
  {"name": "Arthur Ferreira da SIlva", "email": "arthurfsilva_tn@compromisso.com", "institution": "Tancredo Neves", "exam_target": "ETEC"},
  {"name": "Arthur Guedes Gomes", "email": "arthurg_gomes@compromisso.com", "institution": "Celina", "exam_target": "ETEC"},
  {"name": "Arthur Henrique Alves dos Santos", "email": "arthurh_santos@compromisso.com", "institution": "Ana Aparecida", "exam_target": "ETEC"},
  {"name": "Arthur Henrique SIlva da Cruz", "email": "arthurh_cruz@compromisso.com", "institution": "Helena Chaves", "exam_target": "ETEC"},
  {"name": "Arthur Pereira Martins", "email": "arthurp_martins@compromisso.com", "institution": "João José de Oliveira", "exam_target": "ETEC"},
  {"name": "Arthur R. Rocha", "email": "arthurr_rocha@compromisso.com", "institution": "Ana Aparecida", "exam_target": "ETEC"},
  {"name": "Arthur Teodoro de Souza", "email": "arthurt_souza@compromisso.com", "institution": "Ruth de Azevedo", "exam_target": "ETEC"},
  {"name": "Arthur de LIma Camargo", "email": "arthurl_camargo@compromisso.com", "institution": "S. Florêncio", "exam_target": "ETEC"}
];

async function sync() {
  for (const s of data) {
    try {
      const { data: ud, error: ue } = await supabase.auth.admin.createUser({
        email: s.email, password: 'compromisso2026', email_confirm: true,
        user_metadata: { must_change_password: true, display_name: s.name }
      });
      let uid = ud?.user?.id;
      if (ue?.message.includes('already registered')) {
        const { data: { users } } = await supabase.auth.admin.listUsers();
        uid = users.find(u => u.email === s.email)?.id;
        if (uid) await supabase.auth.admin.updateUserById(uid, { password: 'compromisso2026', user_metadata: { must_change_password: true } });
      }
      if (uid) await supabase.from('profiles').upsert({ id: uid, email: s.email, name: s.name, institution: s.institution, exam_target: s.exam_target, profile_type: 'student', status: 'active' });
    } catch (e) { console.log(e.message); }
  }
}
sync();
