import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Missing supabase credentials.");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const rawData = `Alan Henrique | alanhenrique@compromisso.com | Aldônio | ENEM
Alana G Costa Nogueira | alanagnogueira@compromisso.com | Aldônio | ENEM
Alice Agami Koga | aliceakoga@compromisso.com | Carlos Alberto | ENEM
Alison Italo Ribeiro | alisoniribeiro@compromisso.com | Aldônio | ENEM
Alyson G de Oliveira | alysongoliveira@compromisso.com | Mário Covas | ENEM
Ana Alice Carvalho | anaacarvalho@compromisso.com | Aldônio | ENEM
Ana Clara Alves | anacalves@compromisso.com | Imídeo Giuseppe | ENEM
Ana Clara Moises Martins | anacmartins@compromisso.com | Carlos Alberto | ENEM
Ana Julia M. de Almeida | anajalmeida@compromisso.com | Colaço | ENEM
Ana Julia Pereira | anajpereira@compromisso.com | Aldônio | ENEM
Ana Julia das Neves Silva | anajsilva@compromisso.com | Ricarda | ENEM
Ana Julia de Souza F | anajf@compromisso.com | Aurélio | ENEM
Ana Julia dos Santos | anajsantos@compromisso.com | Carlos Alberto | ENEM
Ana Júlia Leite | anajleite@compromisso.com | Imídeo Giuseppe | ENEM
Ana Karoline de Oliveira | anakoliveira@compromisso.com | Mário Covas | ENEM
Ana Laura Teixeira | analteixeira@compromisso.com | Aldônio | ENEM
Ana Luisa Sena de Aquino | analaquino@compromisso.com | Carlos Alberto | ENEM
Ana Luiza Fiuza | analfiuza@compromisso.com | Manoel Jacob | ENEM
Ana Luiza Mesquini | analmesquini@compromisso.com | Padre Anacleto | ENEM
Ana Maria Magalhaes de Oliveira | anamoliveira@compromisso.com | Ullysses SIlveira | ENEM
Andressa Marques da Silva | andressamsilva@compromisso.com | Carlos Alberto | ENEM
Anna Beatriz Santos Rocha | annabrocha@compromisso.com | Ricarda | ENEM
Anna Laura Miranda | annalmiranda@compromisso.com | Colaço | ENEM
Anny Gabriela Bispo | annygbispo@compromisso.com | Colaço | ENEM
Antonio Carlos | antoniocarlos@compromisso.com | Aldônio | ENEM
Antonio Gabriel da Silva | antoniogsilva@compromisso.com | Colaço | ENEM
Antônio Enrique Fernandes | antonioefernandes@compromisso.com | Colaço | ENEM
Arthur Alexandre Vieira da Costa | arthuracosta@compromisso.com | Aldônio | ENEM
Arthur Alves de SOuza | arthurasouza@compromisso.com | Padre Anacleto | ENEM
Arthur Gabryel Rodrigues | arthurgrodrigues@compromisso.com | Paulo Botelho | ENEM
Arthur de Moraes Araujo | arthurmaraujo@compromisso.com | Colaço | ENEM
Artur A. Miziara de Oliveira | arturaoliveira@compromisso.com | Colaço | ENEM
Artur Lopes Barbosa | arturlbarbosa@compromisso.com | Abelardo Marques | ENEM
Beatriz Moraes Amorim | beatrizmamorim@compromisso.com | Colaço | ENEM
Beatriz Silva Santana | beatrizssantana@compromisso.com | Aldônio | ENEM
Breno Oliveira Souza | brenoosouza@compromisso.com | Carlos Alberto | ENEM
Bruno Guilherme Ribeiro | brunogribeiro@compromisso.com | Aldônio | ENEM
Bruno Oliveira Lopes | brunoolopes@compromisso.com | Aldônio | ENEM
Camila Fonseca Amorim | camilafamorim@compromisso.com | Mário Covas | ENEM
Camila Miranda Neves | camilamneves@compromisso.com | Ricarda | ENEM
Carlos Eduardo Porto | carloseporto@compromisso.com | Aldônio | ENEM
Carlos Felipe | carlosfelipe@compromisso.com | Abelardo Marques | ENEM
Caroline Souza da Silva | carolinessilva@compromisso.com | Colaço | ENEM
Cassimily Oliveira Santana | cassimilyosantana@compromisso.com | Paulo Botelho | ENEM
Caua Henrique | cauahenrique@compromisso.com | Aldônio | ENEM
Cauã de Oliveira Costa | cauaocosta@compromisso.com | Leda Caira | ENEM
Cesar Bernardo Alves | cesarbalves@compromisso.com | Colaço | ENEM
Crystal Vitoria da SIlva | crystalvsilva@compromisso.com | Carlos Alberto | ENEM
Daniel Contente Takeda | danielctakeda@compromisso.com | Tom Jobim | ENEM
Debora Corcina Ribeiro | deboracribeiro@compromisso.com | Paulo Botelho | ENEM
Dhioxne Pereira L. da Silva | dhioxnepsilva@compromisso.com | Paulo Botelho | ENEM
Douglas Henrique Franco | douglashfranco@compromisso.com | Colaço | ENEM
Eduardo Almeida | eduardoalmeida@compromisso.com | Aldônio | ENEM
Eduardo Macedo Santos | eduardomsantos@compromisso.com | Aurélio | ENEM
Elsa P Chuve | elsapchuve@compromisso.com | Aldônio | ENEM
Emanoelly Mirand da Silva | emanoellymsilva@compromisso.com | Ricarda | ENEM
Emanuelle Oliveira da Silva | emanuelleosilva@compromisso.com | Carlos Alberto | ENEM
Emilly Alves | emillyalves@compromisso.com | Carlos Alberto | ENEM
Emilly D. Capistrano | emillydcapistrano@compromisso.com | Mário Covas | ENEM
Emilly Vitoria Maximo | emillyvmaximo@compromisso.com | Carlos Alberto | ENEM
Emilly da Silva | emillysilva@compromisso.com | Aldônio | ENEM
Emilly de Souza | emillysouza@compromisso.com | Mário Covas | ENEM
Enzo Pedro Neves | enzopneves@compromisso.com | Aldônio | ENEM
Estela Felismino | estelafelismino@compromisso.com | Aurélio | ENEM
Ester Beatriz Olimpio | esterbolimpio@compromisso.com | Carlos Alberto | ENEM
Ester Melissa Leonardo | estermleonardo@compromisso.com | Aldônio | ENEM
Evanizia Tomaz SIlva | evaniziatsilva@compromisso.com | Ricarda | ENEM
Evelyn Sousa Nunes | evelynsnunes@compromisso.com | Ricarda | ENEM
Evlyn Silva dos Santos | evlynssantos@compromisso.com | Leda Caira | ENEM
Felipe Contente Takeda | felipectakeda@compromisso.com | Tom Jobim | ENEM
Gabriel A. da Silva | gabrielasilva@compromisso.com | Colaço | ENEM
Gabriel Santos Xavier | gabrielsxavier@compromisso.com | Ullysses SIlveira | ENEM
Gabriel de Oliveira R | gabrielor@compromisso.com | Colaço | ENEM
Gabriel de Souza | gabrielsouza@compromisso.com | Ana Aparecida | ENEM
Gabriela Dias Barbosa | gabrieladbarbosa@compromisso.com | Carlos Alberto | ENEM
Gabriela Martins Gonçalves | gabrielamgoncalves@compromisso.com | Leda Caira | ENEM
Gabrielle Alves Mariano | gabrielleamariano@compromisso.com | Aldônio | ENEM
Gabrielly Figueiredo dos Santos | gabriellyfsantos@compromisso.com | Carlos Alberto | ENEM
Geovanna Aparecido Rodrigues | geovannaarodrigues@compromisso.com | Ricarda | ENEM
Giovana Beatriz C. Batista | giovanabbatista@compromisso.com | Padre Anacleto | ENEM
Giovana dos Santos Alves | giovanasalves@compromisso.com | Carlos Alberto | ENEM
Giovanna C. Gomes L. | giovannacl@compromisso.com | Leda Caira | ENEM
Giovanna Ketellin Vieira | giovannakvieira@compromisso.com | Aldônio | ENEM
Giovanna Rinco Hernandes | giovannarhernandes@compromisso.com | Tom Jobim | ENEM
Giulia Rodrigues de Araujo | giuliararaujo@compromisso.com | Ricarda | ENEM
Grazielle Oliveira N Rangel | grazielleorangel@compromisso.com | Imídeo Giuseppe | ENEM
Grazielly Alves da SIlva | graziellyasilva@compromisso.com | Ana Aparecida | ENEM
Guilherme Pinheiro Martins | guilhermepmartins@compromisso.com | Aldônio | ENEM
Guilherme Ryan dos Santos | guilhermersantos@compromisso.com | Leda Caira | ENEM
Gustavo Henrique Silva | gustavohsilva@compromisso.com | Ana Aparecida | ENEM
Gustavo Luis dos Santos | gustavolsantos@compromisso.com | Carlos Alberto | ENEM
Gustavo Luiz Romao | gustavolromao@compromisso.com | Aldônio | ENEM
Gyovana Menezes Magalhães | gyovanammagalhaes@compromisso.com | Mário Covas | ENEM
Heloisa G, G Ribeiro | heloisagribeiro@compromisso.com | Padre Anacleto | ENEM
Heloiza Vitória Rezende de Souza | heloizavsouza@compromisso.com | Paulo Botelho | ENEM
Heloísa de Paiva Vieira | heloisapvieira@compromisso.com | Colaço | ENEM
Henrique da Cruz | henriquecruz@compromisso.com | Carlos Alberto | ENEM
Isabela de Paiva Lima | isabelaplima@compromisso.com | Leda Caira | ENEM
Isabelli Reis T. de Sousa | isabellirsousa@compromisso.com | Leda Caira | ENEM
Isabely Hillary | isabelyhillary@compromisso.com | Carlos Alberto | ENEM
Isaque Montell | isaquemontell@compromisso.com | Imídeo Giuseppe | ENEM
Israel A. C Carry | israelacarry@compromisso.com | Aldônio | ENEM
Israel Fujimoto | israelfujimoto@compromisso.com | Tom Jobim | ENEM
Izaias Santos de Brito | izaiassbrito@compromisso.com | Carlos Alberto | ENEM
JOão Henrique Sousa | joaohsousa@compromisso.com | Aldônio | ENEM
Joao Gabriel | joaogabriel@compromisso.com | Aldônio | ENEM
João ALberto Pimentel Bastos | joaoabastos@compromisso.com | Carlos Alberto | ENEM
João Gabriel Ferreira da SIlva | joaogsilva@compromisso.com | Aldônio | ENEM
João Victor SOuza | joaovsouza@compromisso.com | Colaço | ENEM
João Vitor de Oliveira | joaovoliveira@compromisso.com | Paulo Botelho | ENEM
Julia Albano Rodrigues | juliaarodrigues@compromisso.com | Aldônio | ENEM
Julia Gabriela Vilas Boas | juliagboas@compromisso.com | Abelardo Marques | ENEM
Julia Gonçalves Ribeiro | juliagribeiro@compromisso.com | Aldônio | ENEM
Julia Marques Franco | juliamfranco@compromisso.com | Colaço | ENEM
Julia de Cassia Costa | juliaccosta@compromisso.com | Tom Jobim | ENEM
Juliana Fagundes de Oliveira | julianafoliveira@compromisso.com | Paulo Botelho | ENEM
Juliana Pavan Sanchez | julianapsanchez@compromisso.com | Colaço | ENEM
Julio Cesar SIlva | juliocsilva@compromisso.com | Ana Aparecida | ENEM
Jullya Mariana de Lacerda | jullyamlacerda@compromisso.com | Abelardo Marques | ENEM
Julya Beatriz Alves | julyabalves@compromisso.com | Imídeo Giuseppe | ENEM
Junior Silva Santos | juniorssantos@compromisso.com | Etec | ENEM
Kaique Leandro Pires | kaiquelpires@compromisso.com | Aurélio | ENEM
Kamilly Silva dos Santos | kamillyssantos@compromisso.com | Carlos Alberto | ENEM
Kamily Bianca dos Santos Souza | kamilybsouza@compromisso.com | Aurélio | ENEM
Karen Costa Ribeiro | karencribeiro@compromisso.com | Mário Covas | ENEM
Karolliny Silva Moraes | karollinysmoraes@compromisso.com | Imídeo Giuseppe | ENEM
Katarina Melo | katarinamelo@compromisso.com | Carlos Alberto | ENEM
Kauan Henrique | kauanhenrique@compromisso.com | Aldônio | ENEM
Kauã Felix Campos | kauafcampos@compromisso.com | Colaço | ENEM
Kauã Viviam | kauaviviam@compromisso.com | Ricarda | ENEM
Kelvin De Oliveira Pires de Almeida | kelvinoalmeida@compromisso.com | Colaço | ENEM
Kemes Rogers Moreira | kemesrmoreira@compromisso.com | Aldônio | ENEM
Kemilly Bernardes | kemillybernardes@compromisso.com | Aldônio | ENEM
Kemilly Neves Alves de Sousa | kemillynsousa@compromisso.com | Carlos Alberto | ENEM
Kesia Vitoria Da Silva Santos | kesiavsantos@compromisso.com | Padre Anacleto | ENEM
Ketellyn V.M. Soares | ketellynvsoares@compromisso.com | Colaço | ENEM
Laiane Santos Matos | laianesmatos@compromisso.com | Colaço | ENEM
Larissa Caroline | larissacaroline@compromisso.com | Aldônio | ENEM
Larissa Carvalho Araujo | larissacaraujo@compromisso.com | Mário Covas | ENEM
Larissa Emanuela Braga | larissaebraga@compromisso.com | Aldônio | ENEM
Larissa Ferreira Reinaldo | larissafreinaldo@compromisso.com | Ullysses SIlveira | ENEM
Larissa Maria de Sousa Sampaio | larissamsampaio@compromisso.com | Colaço | ENEM
Larissa Pereira da Silva | larissapsilva@compromisso.com | Mário Covas | ENEM
Laryssa SOuza de Farias | laryssasfarias@compromisso.com | Padre Anacleto | ENEM
Laura B.Mininel | laurabmininel@compromisso.com | Colaço | ENEM
Lavinia Da Silva Lima Candido | laviniascandido@compromisso.com | Tom Jobim | ENEM
Lavínia Lopes da SIlva | lavinialsilva@compromisso.com | Ana Aparecida | ENEM
Lavínia Soares Oliveira | laviniasoliveira@compromisso.com | Carlos Alberto | ENEM
Laysa Vitória Sousa | laysavsousa@compromisso.com | Abelardo Marques | ENEM
Leticia Santana | leticiasantana@compromisso.com | Aldônio | ENEM
Letícia F. dos Santos | leticiafsantos@compromisso.com | Colaço | ENEM
Libia SIlva Costa | libiascosta@compromisso.com | Abelardo Marques | ENEM
Livia Rezende Rocha | liviarrocha@compromisso.com | Colaço | ENEM
Lohane Marques da Silva | lohanemsilva@compromisso.com | Imídeo Giuseppe | ENEM
Lorena Vitoria Nascimento | lorenavnascimento@compromisso.com | Ricarda | ENEM
Luana Alencar Carvalho Alves | luanaaalves@compromisso.com | Abelardo Marques | ENEM
Luany Ibiapina de Almeida | luanyialmeida@compromisso.com | Paulo Botelho | ENEM
Lucas Abner da SIlva | lucasasilva@compromisso.com | Carlos Alberto | ENEM
Lucas Costa | lucascosta@compromisso.com | Aldônio | ENEM
Lucas Gabriel G, dos Santos | lucasgsantos@compromisso.com | Padre Anacleto | ENEM
Luciana Barbosa Queiroz | lucianabqueiroz@compromisso.com | Aurélio | ENEM
Ludmila Y. Silva Carvalho | ludmilaycarvalho@compromisso.com | Abelardo Marques | ENEM
Luisa Pires Afonso | luisapafonso@compromisso.com | Colaço | ENEM
Luiza R. Gonçalves SIlva | luizarsilva@compromisso.com | Ricarda | ENEM
Maisa Donizetti Barbara | maisadbarbara@compromisso.com | Colaço | ENEM
Manuela Barros Coelho Moraes | manuelabmoraes@compromisso.com | Padre Anacleto | ENEM
Manuele Santos Souza | manuelessouza@compromisso.com | Abelardo Marques | ENEM
Maria Clara Ramos | mariacramos@compromisso.com | Ana Aparecida | ENEM
Maria Clara de SOusa Gonçalves | mariacgoncalves@compromisso.com | Imídeo Giuseppe | ENEM
Maria Eduarda ALmeida | mariaealmeida@compromisso.com | Aldônio | ENEM
Maria Eduarda ALves dos Santos | mariaesantos@compromisso.com | Imídeo Giuseppe | ENEM
Maria Eduarda Araujo Rodrigues | mariaerodrigues@compromisso.com | Paulo Botelho | ENEM
Maria Eduarda Da Silva Gonçalves | mariaegoncalves@compromisso.com | Imídeo Giuseppe | ENEM
Maria Eduarda Lemos dos Santos | mariaesantos@compromisso.com | Ullysses SIlveira | ENEM
Maria Eduarda Medeiros | mariaemedeiros@compromisso.com | Colaço | ENEM
Maria Eduarda Neves | mariaeneves@compromisso.com | Colaço | ENEM
Maria Eduarda Polito | mariaepolito@compromisso.com | Tom Jobim | ENEM
Maria Eduarda Silva | mariaesilva@compromisso.com | Mário Covas | ENEM
Maria Eduarda de Oliveira | mariaeoliveira@compromisso.com | Colaço | ENEM
Maria Eduarda de Santana Pereira | mariaepereira@compromisso.com | Leda Caira | ENEM
Maria Eduardo M. | mariaem@compromisso.com | Colaço | ENEM
Maria Luiza Sousa | marialsousa@compromisso.com | Mário Covas | ENEM
Mariana L. Gusmão da Silva | marianalsilva@compromisso.com | Aurélio | ENEM
Mariana Nunes Macedo | mariananmacedo@compromisso.com | Imídeo Giuseppe | ENEM
Marina Alice Sales | marinaasales@compromisso.com | Ricarda | ENEM
Marley R. Reis Macedo | marleyrmacedo@compromisso.com | Aldônio | ENEM
Maryane Barreto Lima | maryaneblima@compromisso.com | Imídeo Giuseppe | ENEM
Matheus Alves de Oliveira | matheusaoliveira@compromisso.com | Aldônio | ENEM
Matheus Barbosa Matos | matheusbmatos@compromisso.com | Mário Covas | ENEM
Matheus Dias Romão | matheusdromao@compromisso.com | Carlos Alberto | ENEM
Matheus Guedes dos Santos | matheusgsantos@compromisso.com | Abelardo Marques | ENEM
Matheus do C. Francisco | matheuscfrancisco@compromisso.com | Tom Jobim | ENEM
Matheus dos Santos Pereira | matheusspereira@compromisso.com | Ricarda | ENEM
Mauricio Melo Araujo | mauriciomaraujo@compromisso.com | Imídeo Giuseppe | ENEM
Mayana S. Domingos | mayanasdomingos@compromisso.com | Aldônio | ENEM
Murillo SIlva Soares de Menezes | murillosmenezes@compromisso.com | Aldônio | ENEM
Murilo Santos | murilosantos@compromisso.com | Colaço | ENEM
Natacha de Assis | natachaassis@compromisso.com | Aldônio | ENEM
Nathalia Oliveira Lopes | nathaliaolopes@compromisso.com | Carlos Alberto | ENEM
Nathalia Silva Pereira | nathaliaspereira@compromisso.com | Imídeo Giuseppe | ENEM
Nayara Bezerra Bastos | nayarabbastos@compromisso.com | Colaço | ENEM
Nicole Pereira Nunes | nicolepnunes@compromisso.com | Padre Anacleto | ENEM
Nicole de Carvalho | nicolecarvalho@compromisso.com | Abelardo Marques | ENEM
Nicolly Caroline dos Santos | nicollycsantos@compromisso.com | Ricarda | ENEM
Nicolly Vicente da Silva | nicollyvsilva@compromisso.com | Ricarda | ENEM
Nikolas Dias da SIlva | nikolasdsilva@compromisso.com | Padre Anacleto | ENEM
Osmar Julio Pinto | osmarjpinto@compromisso.com | Colaço | ENEM
Pamela Império | pamelaimperio@compromisso.com | Colaço | ENEM
Paola Alexandra Figueiredo | paolaafigueiredo@compromisso.com | Leda Caira | ENEM
Paulo Henrique P de SOuza | paulohsouza@compromisso.com | Abelardo Marques | ENEM
Pedro A. Lima dos Anjos | pedroaanjos@compromisso.com | Carlos Alberto | ENEM
Pedro Felipa Barbosa | pedrofbarbosa@compromisso.com | Colaço | ENEM
Pedro Henrique | pedrohenrique@compromisso.com | Colaço | ENEM
Pedro Henrique  Ferreira | pedrohferreira@compromisso.com | Ana Aparecida | ENEM
Raiana Viana Nascimento | raianavnascimento@compromisso.com | Ullysses SIlveira | ENEM
Raissa Gonçalves Ferreira | raissagferreira@compromisso.com | Paulo Botelho | ENEM
Ranielle Santos | raniellesantos@compromisso.com | Aldônio | ENEM
Raylla Cruz de Oliveira | rayllacoliveira@compromisso.com | Abelardo Marques | ENEM
Rayssa de Carvalho | rayssacarvalho@compromisso.com | Abelardo Marques | ENEM
Renan dos Santos | renansantos@compromisso.com | Aldônio | ENEM
Ruan Wagner Pereira | ruanwpereira@compromisso.com | Colaço | ENEM
Ryan Batista da Silva | ryanbsilva@compromisso.com | Carlos Alberto | ENEM
Ryan Henrique Rodrigues | ryanhrodrigues@compromisso.com | Carlos Alberto | ENEM
Ryan de Souza Nascimento | ryansnascimento@compromisso.com | Aldônio | ENEM
Sabine Rodrigues M. Luzia | sabinerluzia@compromisso.com | Aldônio | ENEM
Samuel Lima dos Santos | samuellsantos@compromisso.com | Aldônio | ENEM
Sarah da SIlva | sarahsilva@compromisso.com | Aldônio | ENEM
Sofia Santos Vieira | sofiasvieira@compromisso.com | Manoel Jacob | ENEM
Solange Martins de Oliveira | solangemoliveira@compromisso.com | Aldônio | ENEM
Sophia B. Soares | sophiabsoares@compromisso.com | Ricarda | ENEM
Sophia Soares Barbosa | sophiasbarbosa@compromisso.com | Padre Anacleto | ENEM
Sophia Soares dos Santos | sophiassantos@compromisso.com | Colaço | ENEM
Sophya de Carvalho | sophyacarvalho@compromisso.com | Abelardo Marques | ENEM
Syman Alcantara | symanalcantara@compromisso.com | Aldônio | ENEM
Thaiane Beatriz Moraes | thaianebmoraes@compromisso.com | Colaço | ENEM
Thais Oliveira Portugal | thaisoportugal@compromisso.com | Colaço | ENEM
Thayla Luiza dos Anjos | thaylalanjos@compromisso.com | Leda Caira | ENEM
Thierry Dantas Jonas Pereira | thierrydpereira@compromisso.com | Padre Anacleto | ENEM
Tuan Pablo Gonçalves de Freitas | tuanpfreitas@compromisso.com | Padre Anacleto | ENEM
Vanessa Costa Andrade | vanessacandrade@compromisso.com | Mário Covas | ENEM
Victor Hugo Quintino | victorhquintino@compromisso.com | Aldônio | ENEM
Victor Santos Maciel | victorsmaciel@compromisso.com | Padre Anacleto | ENEM
Vinicius Ferreira | viniciusferreira@compromisso.com | Aldônio | ENEM
Vinicius Guilherme C. de LIma | viniciusglima@compromisso.com | Paulo Botelho | ENEM
Vinicius Natista | viniciusnatista@compromisso.com | Aldônio | ENEM
Vitor Hugo Vieira | vitorhvieira@compromisso.com | Aldônio | ENEM
Vitória  Ribeiro A. | vitoriara@compromisso.com | Ricarda | ENEM
Vitória R. Souza Melo | vitoriarmelo@compromisso.com | Padre Anacleto | ENEM
Vitória Santana de Arruda | vitoriasarruda@compromisso.com | Padre Anacleto | ENEM
Wesley L Sales da Silva | wesleylsilva@compromisso.com | Mário Covas | ENEM
Willian Batista Gonçalves | willianbgoncalves@compromisso.com | Aldônio | ENEM
Yasmim Angel Bastos | yasmimabastos@compromisso.com | Carlos Alberto | ENEM
Yasmim Aparecida Silva Reis | yasmimareis@compromisso.com | Abelardo Marques | ENEM
Yasmim Figueiredo | yasmimfigueiredo@compromisso.com | Leda Caira | ENEM
Yasmim Nogueira de Raphael | yasmimnraphael@compromisso.com | Imídeo Giuseppe | ENEM
Yasmim Santos Lopes | yasmimslopes@compromisso.com | Ullysses SIlveira | ENEM
Yasmim Vitória dos Anjos | yasmimvanjos@compromisso.com | Aldônio | ENEM
Yasmim X. Pallazoli | yasmimxpallazoli@compromisso.com | Colaço | ENEM
Ycaro Souza Bomfim | ycarosbomfim@compromisso.com | Carlos Alberto | ENEM`;

async function main() {
  console.log("Starting bulk recreation process from raw string...");

  // 1. Delete all existing students
  console.log("1. Extrating existing students from profiles to delete...");
  
  let hasMore = true;
  let offset = 0;
  const BATCH_SIZE = 1000;
  const deletedEmails = new Set();
  
  while (hasMore) {
      const { data, error } = await supabaseAdmin
          .from('profiles')
          .select('id, email, role')
          .eq('role', 'student')
          .range(offset, offset + BATCH_SIZE - 1);
          
      if (error) {
          console.error("Error fetching profiles:", error);
          break;
      }
      
      if (!data || data.length === 0) {
          hasMore = false;
          break;
      }
      
      console.log('Found ' + data.length + ' student profiles to delete in this batch...');
      
      for (const profile of data) {
          if (profile.email) deletedEmails.add(profile.email.trim().toLowerCase());
          
          const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(profile.id);
          if (delError && delError.message.includes('User not found')) {
            // Already deleted or from profiles only, let's delete from profiles explicitly
             await supabaseAdmin.from('profiles').delete().eq('id', profile.id);
          } else if (delError) {
              console.error('Failed to delete user ' + profile.id + ': ' + delError.message);
          }
      }
      
      offset += BATCH_SIZE;
  }
  
  // also specifically target all auth users with 'student' role just in case
  console.log("Deleting orphaned auth users with role student...");
  let page = 1;
  while (true) {
      const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 100 });
      if (error || !users || users.length === 0) break;
      
      for (const u of users) {
          if (u.user_metadata?.role === 'student' || u.user_metadata?.profile_type === 'student' || u.email?.endsWith('@aluno.compromisso.com')) {
              await supabaseAdmin.auth.admin.deleteUser(u.id);
          }
      }
      if (users.length < 100) break;
      page++;
  }

  console.log("All existing students deleted.");
  
  // 2. Import the new ones
  const lines = rawData.split('\n').filter(l => l.trim().length > 0);
  console.log('Total students to import in Part 1: ' + lines.length);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const line of lines) {
      const parts = line.split('|').map(s => s.trim());
      if (parts.length < 4) {
          console.warn('Skipping invalid line: ' + line);
          continue;
      }
      
      const [name, email, school, profileType] = parts;
      const cleanEmail = email.toLowerCase();
      
      try {
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
              email: cleanEmail,
              password: 'compromisso2026',
              email_confirm: true,
              user_metadata: {
                  full_name: name,
                  role: 'student',
                  profile_type: 'student',
                  school: school,
                  study_focus: profileType,
                  must_change_password: false // per requirements
              }
          });
          
          if (createError) {
              console.error('Failed to recreate ' + email + ': ' + createError.message);
              failCount++;
              continue;
          }
          
          // Try inserting profile if trigger didn't catch it
          if (newUser.user) {
                const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
                    id: newUser.user.id,
                    email: cleanEmail,
                    full_name: name,
                    name: name,
                    role: 'student',
                    status: 'active',
                    institution: school,
                    exam_target: profileType
                }, { onConflict: 'id' });
              
              if (profileError) {
                  console.error('Profile insert error for ' + email + ': ' + profileError.message);
              }
          }
          
          successCount++;
          if (successCount % 20 === 0) {
              console.log('Imported ' + successCount + ' students...');
          }
      } catch (e) {
          console.error('Exception processing ' + email + ':', e);
          failCount++;
      }
  }
  
  console.log('Recreation summary - Success: ' + successCount + ', Failed: ' + failCount);
  console.log('Done Part 1.');
}

main().catch(console.error);
