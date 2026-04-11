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

const batch1 = `Alan Henrique | alanhenrique@compromisso.com | Aldônio | ENEM
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
Yasmin de Souza | yasminnsouza@compromisso.com | Aldônio | ENEM
Yasmine Oliveira | yasminneoliveira@compromisso.com | Colaço | ENEM
Yhasmin Ribeiro | yhasminribeiro@compromisso.com | Colaço | ENEM
Yuri Gabriel de Lima | yuriglima@compromisso.com | Aldônio | ENEM
Yuri Lima | yurislima@compromisso.com | Carlos Alberto | ENEM
Yuri Silva | yurisilva@compromisso.com | Carlos Alberto | ENEM
Yasmim P Celestino | yasmimpcelestino@compromisso.com | Aldônio | ENEM`;

const batch2 = `Abner de J.J. da Silva | abnerjsilva@compromisso.com | Ricarda | ETEC
Adrian Mateus S.N | adrianmsilva@compromisso.com | Ricarda | ETEC
Adryan da Paz | adryandas@compromisso.com | Ricarda | ETEC
Agatha Beatriz | agathab@compromisso.com | Ricarda | ETEC
Allan Souza C | allansouza@compromisso.com | Aldônio | ETEC
Allana Gabrielly | allanagabrielly@compromisso.com | Leda Caira | ETEC
Allyce Karolinne | allycekarolinne@compromisso.com | Aurélio | ETEC
Allyson dos Santos | allysondossantos@compromisso.com | Ullysses SIlveira | ETEC
Alvaro Luiz M Junior | alvarojunior@compromisso.com | Ricarda | ETEC
Amada Scarllet | amandascarllet@compromisso.com | Leda Caira | ETEC
Amanda Neves | amandaneves@compromisso.com | Mário Covas | ETEC
Amanda Ribeiro | amandaribeiro@compromisso.com | Leda Caira | ETEC
Ana Beatriz A A | anabeatrizandrade@compromisso.com | Leda Caira | ETEC
Ana Beatriz S M | anabeatrizmello@compromisso.com | Ricarda | ETEC
Ana Caroline | anacaroline@compromisso.com | Aurélio | ETEC
Ana Leticia | analeticia@compromisso.com | Carlos Alberto | ETEC
Andrei Rodrigues | andreirodrigues@compromisso.com | Paulo Botelho | ETEC
Andrew Willian | andrewwillian@compromisso.com | Mário Covas | ETEC
Ane Caroline | anecaroline@compromisso.com | Ricarda | ETEC
Anna Julia S S | annajuliasampaio@compromisso.com | Ricarda | ETEC
Anna Karoline M | annakaroline@compromisso.com | Colaço | ETEC
Anna Laura R S | annalaurasantos@compromisso.com | Colaço | ETEC
Anne Caroline | annecaroline@compromisso.com | Aldônio | ETEC
Anthony Gabriel | anthonygabriel@compromisso.com | Imídeo Giuseppe | ETEC
Arthur Gabriel | arthurgabriel@compromisso.com | Mário Covas | ETEC
Arthur Tenorio | arthurtenorio@compromisso.com | Padre Anacleto | ETEC
Artur Almeida | arturalmeida@compromisso.com | Colaço | ETEC
Artur Gabriel S S | arturgabrielsilva@compromisso.com | Paulo Botelho | ETEC
Assueros Francisco | assuerosfrancisco@compromisso.com | Aldônio | ETEC
Aylla Sophia | ayllasophia@compromisso.com | Leda Caira | ETEC
Barbara Beatriz | barbarabeatriz@compromisso.com | Aurélio | ETEC
Brenno Ferreira | brennoferreira@compromisso.com | Aurélio | ETEC
Brenno Guedes | brennoguedes@compromisso.com | Ricarda | ETEC
Breno Henrique | brenohenrique@compromisso.com | Ricarda | ETEC
Bruno de f Souza | brunofreitas@compromisso.com | Ricarda | ETEC
Bruno dos Santos | brunosantos@compromisso.com | Ricarda | ETEC
Caio Gabriel | caiogabriel@compromisso.com | Ana Aparecida | ETEC
Caio Gustavo | caiogustavo@compromisso.com | Carlos Alberto | ETEC
Carlos Eduardo L S | carlossilva@compromisso.com | Paulo Botelho | ETEC
Cauane Mendes | cauanemendes@compromisso.com | Abelardo Marques | ETEC
Clara Bianca | clarabianca@compromisso.com | Carlos Alberto | ETEC
Cristian Aparecido | cristianaparecido@compromisso.com | Leda Caira | ETEC
Crysthian Henrique | crysthian@compromisso.com | Carlos Alberto | ETEC
Daniel Camilo | danielcamilo@compromisso.com | Ricarda | ETEC
Daniela Vitoria | danielavitoria@compromisso.com | Ana Aparecida | ETEC
Danilo Miranda | danilomiranda@compromisso.com | Mário Covas | ETEC
Dante Ramos | danteramos@compromisso.com | Aldônio | ETEC
Dante Santos | dantesantos@compromisso.com | Leda Caira | ETEC
Davi Araujo | daviaraujo@compromisso.com | Carlos Alberto | ETEC
Davi Guilehrme | daviguilherme@compromisso.com | Abelardo Marques | ETEC
David Willian | davidwillian@compromisso.com | Paulo Botelho | ETEC
Debora Eduarda | deboraeduarda@compromisso.com | Carlos Alberto | ETEC
Deivison Lucas | deivisonlucas@compromisso.com | Mário Covas | ETEC
Denis Ferreira | denisferreira@compromisso.com | Carlos Alberto | ETEC
Douglas de Lima | douglaslima@compromisso.com | Tom Jobim | ETEC
Eduarda Gabrielle | eduardagabrielle@compromisso.com | Padre Anacleto | ETEC
Eduardo de Jesus | eduardojesus@compromisso.com | Tom Jobim | ETEC
Eduardo Henrique | eduardohenrique@compromisso.com | Ana Aparecida | ETEC
Eleone de Jesus | eleonejesus@compromisso.com | Tom Jobim | ETEC
Eloá Martins | eloamartins@compromisso.com | Abelardo Marques | ETEC
Eloize Pinheiro | eloizepinheiro@compromisso.com | Ana Aparecida | ETEC
Erick de Sousa | ericksousa@compromisso.com | Carlos Alberto | ETEC
Erick Matheus L C | erickmatheus@compromisso.com | Aldônio | ETEC
Erik de Oliveira | erikoliveira@compromisso.com | Tom Jobim | ETEC
Ester Maria | estermaria@compromisso.com | Etec | ETEC
Esther Caroline | esthercaroline@compromisso.com | Abelardo Marques | ETEC
Esther de Araújo | estheraraujo@compromisso.com | Padre Anacleto | ETEC
Everton de Freitas | evertonfreitas@compromisso.com | Paulo Botelho | ETEC
Felipe Gabriel S S | felipegabrielsilva@compromisso.com | Carlos Alberto | ETEC
Felipe Gabriel S O | felipegabrielsantos@compromisso.com | Ricarda | ETEC
Flavia Vitoria | flaviavitoria@compromisso.com | Ana Aparecida | ETEC
Gabriel de Oliveira C | gabrielcardoso@compromisso.com | Imídeo Giuseppe | ETEC
Gabriel Henrique S S | gabrielhenriquesilva@compromisso.com | Paulo Botelho | ETEC
Gabriel Moreira | gabrielmoreira@compromisso.com | Ullysses SIlveira | ETEC
Gabriel Rodrigues | gabrielrodrigues@compromisso.com | Manoel Jacob | ETEC
Gabriel Soares | gabrielsoares@compromisso.com | Leda Caira | ETEC
Gabriela de oliveira | gabrielaoliveira@compromisso.com | Carlos Alberto | ETEC
Geovana Luiza | geovanaluiza@compromisso.com | Tom Jobim | ETEC
Geovana Nascimento | geovananascimento@compromisso.com | Ricarda | ETEC
Giovana Thauane | giovanathauane@compromisso.com | Leda Caira | ETEC
Gisele de Oliveira | giseleoliveira@compromisso.com | Aurélio | ETEC
Gislaine de Almeida | gislainealmeida@compromisso.com | Ana Aparecida | ETEC
Giulia Ferreira | giuliaferreira@compromisso.com | Imídeo Giuseppe | ETEC
Graziele Silva | grazielesilva@compromisso.com | Paulo Botelho | ETEC
Guilherme Bezerra | guilhermebezerra@compromisso.com | Paulo Botelho | ETEC
Guilherme Lucca | guilhermelucca@compromisso.com | Colaço | ETEC
Guilherme Mendes | guilhermemendes@compromisso.com | Leda Caira | ETEC
Guilherme Otavio | guilhermeotavio@compromisso.com | Carlos Alberto | ETEC
Gustavo Borges | gustavoborges@compromisso.com | Carlos Alberto | ETEC
Gustavo Gabriel | gustavogabriel@compromisso.com | Carlos Alberto | ETEC
Gustavo Henrique A S | gustavohenrique@compromisso.com | Paulo Botelho | ETEC
Gustavo Henrique A B | gustavohenrique@compromisso.com | Aldônio | ETEC
Gustavo Lopes | gustavolopes@compromisso.com | Padre Anacleto | ETEC
Iago Alves | iagoalves@compromisso.com | Carlos Alberto | ETEC
Ian Luccas | ianluccas@compromisso.com | Padre Anacleto | ETEC
Igor de Oliveira | igoroliveira@compromisso.com | Tom Jobim | ETEC
Igor Gabriel | igorgabriel@compromisso.com | Ricarda | ETEC
Igor Ramos | igorramos@compromisso.com | Paulo Botelho | ETEC
Ingrid de Oliveira | ingridoliveira@compromisso.com | Tom Jobim | ETEC
Isaac Tenorio | isaactenorio@compromisso.com | Padre Anacleto | ETEC
Isabel de Jesus | isabeljesus@compromisso.com | Ricarda | ETEC
Isabela de Siqueira | isabelasiqueira@compromisso.com | Carlos Alberto | ETEC
Isabella Cavalcante | isabellacavalcante@compromisso.com | Mário Covas | ETEC
Israel Elias | israelelias@compromisso.com | Aldônio | ETEC
Iury Ruan | iuryruan@compromisso.com | Ana Aparecida | ETEC
Jacira Tenorio | jaciratenorio@compromisso.com | Padre Anacleto | ETEC
Jandira Ramos | jandiraramos@compromisso.com | Paulo Botelho | ETEC
Janice Alves | janicealves@compromisso.com | Aldônio | ETEC
Jessica de Lima | jessicalima@compromisso.com | Carlos Alberto | ETEC
Jhennifer Mendes | jhennifermendes@compromisso.com | Leda Caira | ETEC
João Carlos | joaocarlos@compromisso.com | Paulo Botelho | ETEC
João Gabriel | joaogabriel@compromisso.com | Ricarda | ETEC
João Guilherme | joaoguilherme@compromisso.com | Aldônio | ETEC
João Otávio | joaootavio@compromisso.com | Paulo Botelho | ETEC
João Victor de Souza | joaovictorsouza@compromisso.com | Ricarda | ETEC
Joaquim Francisco | joaquimfrancisco@compromisso.com | Aldônio | ETEC
Jonas Francisco | jonasfrancisco@compromisso.com | Aldônio | ETEC
José Eduardo | joseeduardo@compromisso.com | Paulo Botelho | ETEC
Josenildo Pereira | josenildopereira@compromisso.com | Leda Caira | ETEC
Joshuel Araujo | joshuelaraujo@compromisso.com | Aurélio | ETEC
Juan Gabriel | juangabriel@compromisso.com | Tom Jobim | ETEC
Julia Gabriele | juliagabriele@compromisso.com | Tom Jobim | ETEC
Juliana Gomes | julianagomes@compromisso.com | Tom Jobim | ETEC
Kaike Almeida | kaikealmeida@compromisso.com | Leda Caira | ETEC
Kaike Pereira | kaikepereira@compromisso.com | Padre Anacleto | ETEC
Kaiky Henrique | kaikyhenrique@compromisso.com | Padre Anacleto | ETEC
Kaiky Rangel | kaikyrangel@compromisso.com | Ricarda | ETEC
Kailane Alves | kailanealves@compromisso.com | Ricarda | ETEC
Kamilla Vitoria | kamillavitoria@compromisso.com | Mário Covas | ETEC
Karen Gabrielle | karengabrielle@compromisso.com | Tom Jobim | ETEC
Kayque Gabriel | kayquegabriel@compromisso.com | Aurélio | ETEC
Kelly de Oliveira | kellyoliveira@compromisso.com | Tom Jobim | ETEC
Kezia Eduarda | keziaeduarda@compromisso.com | Paulo Botelho | ETEC
Kimberly Rayane | kimberlyrayane@compromisso.com | Ana Aparecida | ETEC
Lara Bianca | larabianca@compromisso.com | Colaço | ETEC
Larissa Gabrielle | larissagabrielle@compromisso.com | Aurélio | ETEC
Larissa Marinho | larissamarinho@compromisso.com | Tom Jobim | ETEC
Laura de Oliveira | lauraoliveira@compromisso.com | Ricarda | ETEC
Laysla Vitoria | layslavitoria@compromisso.com | Manoel Jacob | ETEC
Leandro de Jesus | leandrojesus@compromisso.com | Carlos Alberto | ETEC
Letícia de Castro | leticiacastro@compromisso.com | Leda Caira | ETEC
Lorena Gabrielle | lorenagabrielle@compromisso.com | Tom Jobim | ETEC
Lucas Arcanjo | lucasarcanjo@compromisso.com | Ana Aparecida | ETEC
Lucas Ferreira | lucasferreira@compromisso.com | Leda Caira | ETEC
Lucas Gabriel R N | lucasgabrielneves@compromisso.com | Ricarda | ETEC
Lucas Tenorio | lucastenorio@compromisso.com | Padre Anacleto | ETEC
Luis Antonio | luisantonio@compromisso.com | Imídeo Giuseppe | ETEC
Luiz Felipe | luizfelipe@compromisso.com | Carlos Alberto | ETEC
Luiz Otavio | luizotavio@compromisso.com | Paulo Botelho | ETEC
Maitê Mendes | maitemendes@compromisso.com | Leda Caira | ETEC
Marcos Vinicius B S | marcosviniciussilva@compromisso.com | Carlos Alberto | ETEC
Maria Julia Mendes | mariajuliamendes@compromisso.com | Leda Caira | ETEC
Maria Julia de Oliveira | mariajuliaoliveira@compromisso.com | Tom Jobim | ETEC
Maria Luiza Mendes | marialuizamendes@compromisso.com | Tom Jobim | ETEC
Maria Aparecida | mariaaparecida@compromisso.com | Aldônio | ETEC
Maria Eduarda B | mariaeduardabezerra@compromisso.com | Imídeo Giuseppe | ETEC
Maria Gabrielly | mariagabrielly@compromisso.com | Carlos Alberto | ETEC
Martha Maria | marthamaria@compromisso.com | Carlos Alberto | ETEC
Mateus de O.S | mateussantos@compromisso.com | Ricarda | ETEC
Mateus Henrique | mateushenrique@compromisso.com | Paulo Botelho | ETEC
Matheus de O.B | matheusbezerra@compromisso.com | Tom Jobim | ETEC
Matheus de O.S | matheusdossantos@compromisso.com | Ricarda | ETEC
Matheus Eduardo | matheuseduardo@compromisso.com | Carlos Alberto | ETEC
Matheus Gabriel | matheusgabriel@compromisso.com | Padre Anacleto | ETEC
Matheus Henrique | matheushenrique@compromisso.com | Paulo Botelho | ETEC
Matheus Lucca | matheuslucca@compromisso.com | Colaço | ETEC
Miguel de O.B | miguelbezerra@compromisso.com | Tom Jobim | ETEC
Miguel Henrique | miguelhenrique@compromisso.com | Carlos Alberto | ETEC
Moises Gabriel | moisesgabriel@compromisso.com | Carlos Alberto | ETEC
Murilo Henrique | murilohenrique@compromisso.com | Carlos Alberto | ETEC
Murilo Otavio | murilootavio@compromisso.com | Paulo Botelho | ETEC
Otavio de Almeida | otavioalmeida@compromisso.com | Aldônio | ETEC
Pablo Rangel | pablorangel@compromisso.com | Leda Caira | ETEC
Patricia de Castro | patriciacastro@compromisso.com | Paulo Botelho | ETEC
Paulo Antonio | pauloantonio@compromisso.com | Paulo Botelho | ETEC
Paulo Henrique | paulohenrique@compromisso.com | Paulo Botelho | ETEC
Pietro Gabriel | pietrogabriel@compromisso.com | Tom Jobim | ETEC
Priscila de Oliveira | priscilaoliveira@compromisso.com | Carlos Alberto | ETEC
Raissa de Oliveira | raissaoliveira@compromisso.com | Manoel Jacob | ETEC
Renata de Oliveira | renataoliveira@compromisso.com | Tom Jobim | ETEC
Rodrigo Alves | rodrigoalves@compromisso.com | Carlos Alberto | ETEC
Ruan Gabriel | ruangabriel@compromisso.com | Ricarda | ETEC
Ryan Gabriel | ryangabriel@compromisso.com | Ricarda | ETEC
Ryan Henrique | ryanhenrique@compromisso.com | Ricarda | ETEC
Sacha de Oliveira | sachaoliveira@compromisso.com | Carlos Alberto | ETEC
Tainá Bianca | tainabianca@compromisso.com | Colaço | ETEC
Thalita Gomes | thalitagomes@compromisso.com | Tom Jobim | ETEC
Thauane de Oliveira | thauanedeoliveira@compromisso.com | Aldônio | ETEC
Thauane de Souza | thauanedesouza@compromisso.com | Tom Jobim | ETEC
Thiago de O.S | thiagosilva@compromisso.com | Ricarda | ETEC
Thiago Sales | thiagosales@compromisso.com | Paulo Botelho | ETEC
Uriel Araujo | urielaraujo@compromisso.com | Aurélio | ETEC
Vanderson de Jesus | vandersonjesus@compromisso.com | Carlos Alberto | ETEC
Vitor Gabriel | vitorgabriel@compromisso.com | Carlos Alberto | ETEC
Vitoria Gabrielle | vitoriagabrielle@compromisso.com | Padre Anacleto | ETEC
William Henrique | williamhenrique@compromisso.com | Padre Anacleto | ETEC
Willian de O.S | williansantos@compromisso.com | Ricarda | ETEC
Pietro A F Bezerra | pietrobezerra@compromisso.com | Imídeo Giuseppe | ETEC
Raphaelly Almeida N da Silva | raphaellysilva@compromisso.com | Leda Caira | ETEC
Rayssa R Moreira | rayssamoreira@compromisso.com | Ricarda | ETEC
Rebeca Pires Oliveira | rebecaoliveira@compromisso.com | Mário Covas | ETEC
Roberta Avelino da SIlva | robertasilva@compromisso.com | Ullysses SIlveira | ETEC
Talita de Oliveira T de M | talitam@compromisso.com | Cadorna | ETEC
Witoria Guedes De Santana | witoriasantana@compromisso.com | Ricarda | ETEC
Yasmin Oliveira P. dos Santos | yasminoliveira@compromisso.com | Ricarda | ETEC
Yudi O. de França | yudifranca@compromisso.com | Leda Caira | ETEC`;

async function main() {
  console.log("Starting FINAL ROBUST SYNC...");
  
  const allRaw = batch1 + '\n' + batch2;
  const lines = allRaw.split('\n').filter(l => l.trim().length > 0);
  console.log('Total students to sync: ' + lines.length);
  
  // 1. Get ALL users to map emails to IDs
  console.log('Fetching existing users...');
  let allUsers = [];
  let page = 1;
  while(true) {
      const {data:{users}, error} = await supabaseAdmin.auth.admin.listUsers({page, perPage:1000});
      if(!users || users.length === 0 || error) break;
      allUsers = allUsers.concat(users);
      page++;
  }
  const userMap = new Map(allUsers.map(u => [u.email.toLowerCase(), u.id]));
  console.log(`Found ${userMap.size} users in Auth.`);

  let successCount = 0;
  let failCount = 0;
  let updateCount = 0;
  let createCount = 0;

  for (const line of lines) {
      const parts = line.split('|').map(s => s.trim());
      if (parts.length < 4) continue;
      
      const [name, email, school, profileType] = parts;
      const cleanEmail = email.toLowerCase();
      
      try {
          let userId;
          if (userMap.has(cleanEmail)) {
              // UPDATE
              userId = userMap.get(cleanEmail);
              const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
                  password: 'compromisso2026',
                  user_metadata: {
                      full_name: name,
                      role: 'student',
                      profile_type: 'student',
                      school: school,
                      study_focus: profileType,
                      must_change_password: true // ENFORCE RESET
                  }
              });
              
              if (updateError) {
                  console.error('Failed to update ' + email + ': ' + updateError.message);
                  failCount++;
                  continue;
              }
              updateCount++;
          } else {
              // CREATE
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
                      must_change_password: true // ENFORCE RESET
                  }
              });
              
              if (createError) {
                  console.error('Failed to create ' + email + ': ' + createError.message);
                  failCount++;
                  continue;
              }
              userId = newUser.user.id;
              createCount++;
          }
          
          // UPSERT PROFILE
          const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
              id: userId,
              email: cleanEmail,
              full_name: name,
              name: name,
              role: 'student',
              status: 'active',
              institution: school,
              exam_target: profileType
          }, { onConflict: 'id' });
          
          if (profileError) {
              console.error('Profile upsert error for ' + email + ': ' + profileError.message);
          }
          
          successCount++;
          if (successCount % 50 === 0) {
              console.log('Synced ' + successCount + ' students...');
          }
      } catch (e) {
          console.error('Exception processing ' + email + ':', e);
          failCount++;
      }
  }
  
  console.log('FINAL SYNC SUMMARY:');
  console.log('- Total Success: ' + successCount);
  console.log('- Total Failed: ' + failCount);
  console.log('- Created: ' + createCount);
  console.log('- Updated: ' + updateCount);
  console.log('Done.');
}

main().catch(console.error);
