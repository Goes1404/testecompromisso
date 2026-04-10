
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim().replace(/^"(.*)"$/, '$1');
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Erro: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const RawPasswords = "1394, 6864, 7256, 4012, 5455, 0267, 6917, 4449, 2086, 1765, 3662, 0472, 7490, 6203, 6456, 3170, 8116, 6213, 6343, 2337, 0737, 6718, 5781, 8152, 3735, 7273, 0556, 3711, 4664, 0759, 3296, 1209, 0166, 5879, 9226, 7707, 2437, 5966, 3804, 1974, 5060, 7013, 7559, 1603, 3908, 9276, 8239, 9103, 1359, 5042, 6612, 1362, 9052, 3009, 9156, 9901, 5477, 9757, 2372, 5108, 7005, 1905, 3825, 8906, 7145, 0986, 6831, 3476, 7669, 5041, 7394, 3052, 7166, 8936, 8849, 1655, 9108, 8779, 3836, 9288, 5235, 8111, 1222, 0896, 3223, 8483, 9562, 8227, 9598, 5190, 6465, 6654, 0974, 1306, 9817, 1026, 1404, 4944, 0174, 0223, 2297, 0608, 9907, 4867, 6372, 5520, 6676, 6811, 1023, 4604, 0446, 8825, 1248, 0899, 5745, 1379, 5556, 2581, 1062, 1833, 9544, 8133, 4249, 3118, 1735, 5214, 4952, 5842, 7546, 2377, 6434, 2451, 2563, 0058, 2284, 2639, 7456, 8031, 3468, 9066, 1203, 5680, 8878, 4606, 7956, 9085, 8750, 5541, 3690, 7741, 6252, 0691, 7118, 1572, 2388, 9459, 7759, 1136, 2657, 4881, 1022, 6545, 2892, 8934, 0657, 1377, 3101, 4426, 4932, 9461, 7553, 1320, 0065, 6100, 9830, 7704, 6289, 6281, 1662, 3871, 9080, 2153, 1687, 1621, 9826, 3454, 6905, 5821, 3321, 4764, 2484, 1050, 4843, 1479, 7603, 1750, 0550, 4929, 0386, 3865, 2964, 5627, 9012, 0025, 3071, 1352, 6024, 8536, 5837, 6773, 6909, 5295, 3849, 6739, 0040, 6452, 6229, 5831, 8823, 2114, 2636, 4577, 7309, 2538, 5887, 4343, 4944, 9518, 9603, 6131, 6600, 9058, 8230, 2838, 2428, 9244, 8085, 1585, 0823, 5776, 3987, 2974, 8054, 1158, 3035, 0644, 9382, 3362, 0169, 2624, 4456, 5154, 2056, 4101, 8066, 2947, 6479, 1106, 0337, 6560, 7664, 9253, 4156, 8488, 5118, 1722, 8168, 3419, 5662, 1022, 4684, 6236, 7060, 2420, 7004, 9741, 4414, 3717, 2415, 2933, 4778, 9796, 8081, 6366, 2672, 1062, 9036, 2964, 5832, 0636, 0203, 4553, 7232, 0280, 9112, 7856, 4735, 4370, 9469, 5254, 0795, 3594, 9036, 5102, 1385, 4012, 2742, 9914, 9112, 0948, 2151, 8541, 8660, 4932, 8173, 0492, 7204, 2290, 4686, 2932, 4652, 7736, 3109, 5026, 2359, 1307, 6495, 0669, 4169, 6063, 1342, 3262, 9909, 7740, 9992, 1547, 6150, 5965, 4170, 7320, 4098, 4737, 1066, 8287, 8019, 3439, 6110, 5834, 6844, 8059, 3065, 7971, 3217, 6452, 7045, 3989, 1421, 0525, 6837, 9788, 5668, 2070, 6071, 7344, 2480, 4045, 1402, 9088, 2424, 3692, 8812, 1611, 1316, 7594, 1397, 4331, 1641, 6277, 3559, 4061, 7679, 8588, 0149, 6605, 8953, 0959, 2758, 4774, 0059, 0080, 6779, 1131, 6768, 0803, 3747, 5320, 7932, 8968, 5425, 1585, 6977, 8887, 1021, 8795, 8940, 0510, 1328, 6958, 8226, 5250, 6064, 0686, 4191, 9960, 5208, 3332, 7335, 8933, 8702, 3289, 2792, 8831, 0978, 6602, 4874, 8137, 0199, 7405, 6851, 8567, 3399, 8730, 9976, 4118, 0154, 6500, 7921, 5000, 9453, 3135, 2845, 3931, 6871, 7891, 4579, 1743, 1104, 3414, 0596, 7504, 0777, 5087, 2481, 4468, 0336, 8473, 3926, 5927, 5878, 0567, 5361, 0518, 3303, 9132, 9947, 9303, 2296, 4395, 5760, 7383, 7317, 9813, 4587, 8687, 6226, 9614, 5955, 0122, 6590, 9777, 3996, 3123, 5734, 3914, 5596, 1827, 7151, 1328, 1845, 5438, 5505, 0241, 7131, 6090, 7785, 0601, 5831, 9602, 2964, 6788, 8856, 5089, 9840, 6574, 4554, 6252, 8435, 3372, 6732, 6628, 2970, 4369, 4382, 1074, 3573, 5339, 4425, 2940, 0546, 8711, 0489, 0601, 4080, 4418, 4101, 5792, 7947, 1048, 6369, 7407, 8206, 3943, 8703, 5506, 6749, 0137, 9642, 8805, 4945, 6546, 6374, 6765, 7120, 6481, 8445, 3680, 7433, 7075, 2208, 9238, 5220, 3713, 6050, 7545, 2075, 7519, 0138, 7625, 0915, 4314, 6078, 6193, 8747, 7563, 3643, 9042, 8147, 9045, 1905, 6526, 5343, 4799, 2678, 4510, 9432, 2186, 1138, 2213, 7570, 2366, 0311, 1026, 2673, 3208, 6381, 6043, 0151, 7039, 8251, 3374, 4661, 9498, 0637, 9808, 1344, 3094, 4128, 3701, 5646, 5339, 8369, 0528, 0952, 7251, 5913, 6176, 1779, 2293, 2057, 7335, 2721, 4009, 5055, 6553, 2229, 1127, 9117, 4059, 0720, 8484, 3892, 7811, 1693, 1897, 5244, 6783, 5049, 4623, 1687, 0230, 9838, 2561, 4608, 7831, 8395, 3512, 9750, 7636, 5038, 2035, 8071, 8844, 1026, 7738, 2908, 4642, 9564, 2746, 1186, 8685, 2417, 8953, 5012, 9135, 7113, 6936, 9817, 6727, 7798, 7719, 8302, 3834, 2202, 6120, 6798, 1500, 0037, 3743, 2865, 1850, 8441, 8459, 2415, 6392, 3043, 3960, 6817, 9006, 2989, 9127, 2376, 2739, 1545, 4868, 5040, 9396, 0737, 9231, 3648, 8914, 2266, 7392, 0399, 2071, 3951, 2835, 9319, 1288, 7867, 0093, 7121, 7232, 9481, 7888, 5662, 0432, 7187, 7263, 2124, 9297, 8881, 9114, 9091, 6141, 1019, 8626, 2517, 7465";

const passwordsList = RawPasswords.split(',').map(p => p.trim());

// We need the student list to match by index
const RawDataENEM = `
Alan Henrique
Aldônio

Alana G Costa Nogueira
Aldônio

Alice Agami Koga
Carlos Alberto

Alison Italo Ribeiro
Aldônio

Alyson G de Oliveira
Mário Covas

Ana Alice Carvalho
Aldônio

Ana Clara Alves
Imídeo Giuseppe

Ana Clara Moises Martins
Carlos Alberto

Ana Julia M. de Almeida
Colaço

Ana Julia Pereira
Aldônio

Anderson Alves De Lima
Imídeo Giuseppe

Andre Gustavo De Souza Silva
Imídeo Giuseppe

Andre Vinicius De Sousa Da Silva
Imídeo Giuseppe

Angelyca Gomes Sampaio
Imídeo Giuseppe

Anna Julia G. P. M. S. Silva
Aldônio

Anna Julia Moraes De Alencar
Imídeo Giuseppe

Antonio Carlos Da Silva Junior
Imídeo Giuseppe

Arthur Ferreira Do Nascimento
Imídeo Giuseppe

Arthur Silva Alves
Imídeo Giuseppe

Artur Gabriel Mendes De Souza
Imídeo Giuseppe

Beatriz De Souza Santos
Imídeo Giuseppe

Beatriz Oliveira Da Rocha
Imídeo Giuseppe

Beatriz Perereira Lima Dos Santos
Imídeo Giuseppe

Bianca De S. Silva
Aldônio

Bianca Ferreira Da Silva
Imídeo Giuseppe

Breno Mendes Dos Santos
Imídeo Giuseppe

Bruna De Freitas Souza
Imídeo Giuseppe

Bruna Vitoria Souza
Aldônio

Bruno Da Cruz Barbosa
Imídeo Giuseppe

Bruno Eduardo Rodrigues S. Dos Santos
Imídeo Giuseppe

Bryan Henrique De Almeida Dos Santos
Imídeo Giuseppe

Caio De Oliveira Guedes
Aldônio

Caio Henrique Soares Da Silva
Imídeo Giuseppe

Carlos Eduardo Da Cruz Silva
Imídeo Giuseppe

Carlos Eduardo Marques Lima
Imídeo Giuseppe

Carlos Felipe
Abelardo Marques

Caua Dos Santos Silva
Imídeo Giuseppe

Caua Ferreira De Oliveira
Imídeo Giuseppe

Cibele Cristina P. Ramos
Aldônio

Crystian Henrique Ferreira
Aldônio

Dandara Martins Dos Santos
Imídeo Giuseppe

Daniel De Oliveira Guedes
Aldônio

Daniele Da Silva Matos
Imídeo Giuseppe

Danilo Gabriel Silva Costa
Imídeo Giuseppe

Dantte Ramos Da Rocha
Imídeo Giuseppe

Davi De Araujo Lopes
Imídeo Giuseppe

Davi Ferreira De Oliveira
Imídeo Giuseppe

Davi Henrique Silva
Imídeo Giuseppe

Davi Lopes Da Silva
Imídeo Giuseppe

Davi Lourenço De Oliveira Santos
Imídeo Giuseppe

Diego Lima Santos
Carlos Alberto

Eduarda Gabrielle Da Silva
Imídeo Giuseppe

Eduarda Vitoria C Da Rocha
Aldônio

Eduardo Henrique Dos Santos
Imídeo Giuseppe

Eduardo Mendes Da Silva
Aldônio

Eduardo Oliveira Lima
Imídeo Giuseppe

Elisa Ribeiro Dos Santos
Imídeo Giuseppe

Emanuela De Freitas Costa
Imídeo Giuseppe

Emanuelle Silva Dos Santos
Imídeo Giuseppe

Emilly Karine De O. Santana
Carlos Alberto

Erick Matheus L. De Lima
Carlos Alberto

Erick Rocha De Oliveira
Imídeo Giuseppe

Erick Santana De Souza
Aldônio

Eros Ferreira Galdino Dos Santos
Imídeo Giuseppe

Evelin Rayane Lima Da Silva
Imídeo Giuseppe

Ewellin Rayane Pereira Cardoso
Imídeo Giuseppe

Ezequiel Elias
Aldônio

Fabio Santos De Oliveira
Aldônio

Felipe De Oliveira Sousa
Carlos Alberto

Felipe Dos Santos Alvarenga
Aldônio

Felipe Gabriel De Oliveira Lima
Imídeo Giuseppe

Felipe Gabriel Santos De Oliveira
Aldônio

Felipe Lima Silva
Imídeo Giuseppe

Felipe Mendes Da Silva
Carlos Alberto

Felipe Oliveira Da Rocha
Imídeo Giuseppe

Fernanda Camargo De Abreu
Imídeo Giuseppe

Fernanda De Castro Ribeiro
Imídeo Giuseppe

Fernanda De Jesus Oliveira
Aldônio

Gabriel Araújo Da SIlva
Aldônio

Gabriel Arcanjo Santos Ferreira
Aldônio

Gabriel De Araujo Gomes
Imídeo Giuseppe

Gabriel De Oliveira Santos
Imídeo Giuseppe

Gabriel Henrique F Moreira
Aldônio

Gabriel Henrique Ferreira Moreira
Imídeo Giuseppe

Gabriel Henrique Souza Dos Santos
Imídeo Giuseppe

Gabriel Lucas Silva Da Costa
Imídeo Giuseppe

Gabriel Rodrigues De Brito
Imídeo Giuseppe

Gabriel Soares Dias
Imídeo Giuseppe

Gabriel Souza Gross
Carlos Alberto

Gabriela Marinho Miranda
Aldônio

Gabriella Silva De Souza
Aldônio

Gabrielle Alves De Souza
Aldônio

Gabrielly Gomes Ferreira
Imídeo Giuseppe

Gaby Vitoria S. Santos
Aldônio

Giovana Maria Oliveira Lima
Aldônio

Giovanna De Oliveira Barros
Imídeo Giuseppe

Giovanna De Souza Santos
Aldônio

Giovanna Dos Santos Souza
Imídeo Giuseppe

Giovanna Luiza De S. Mendes
Aldônio

Gisele Oliveira Santos
Aldônio

Graciliano Mendes Dos Santos
Imídeo Giuseppe

Graziela Vitoria Silva Lima
Imídeo Giuseppe

Guilherme Henrique Barbosa
Aldônio

Guilherme Henrique Lima Silva
Imídeo Giuseppe

Guilherme Oliveira De Araujo
Imídeo Giuseppe

Guilherme Sales Dos Santos
Aldônio

Guilherme Silva Santana
Aldônio

Gustavo Caetano Guedes
Imídeo Giuseppe

Gustavo Henrique Barbosa Silva
Imídeo Giuseppe

Gustavo Henrique Do Nascimento
Imídeo Giuseppe

Gustavo Henrique Galdino Ferreira
Imídeo Giuseppe

Gustavo Henrique Do Nascimento
Imídeo Giuseppe

Gustavo Pereira Alvarenga
Carlos Alberto

Hayalla Gabrielly S. Alvarenga
Aldônio

Heberth De Oliveira Silva Chagas
Carlos Alberto

Helena Luiza Carvalho Dos Santos
Imídeo Giuseppe

Hellen Caroline Gomes
Aldônio

Heloisa De Souza Araujo
Imídeo Giuseppe

Henrique Pereira Lima
Imídeo Giuseppe

Henrique Tenorio Rodrigues
Aldônio

Hiago Barbosa Lima
Imídeo Giuseppe

Hiago Ferreira Da Silva
Aldônio

Ian Lucas De Oliveira Silva
Aldônio

Iara Caroline Lemes
Aldônio

Igor De Lima Bezerra
Aldônio

Igor Ramos Rocha
Imídeo Giuseppe

Isaac De Almeida Silva
Imídeo Giuseppe

Isabela De Castro Ribeiro
Imídeo Giuseppe

Isabele Luiza Mello Mendes
Aldônio

Isabelle De Oliveira Barros
Imídeo Giuseppe

Isadora Eduarda Ramos Lima
Aldônio

Israel De Almeida Silva
Imídeo Giuseppe

Italo Araujo Silva
Imídeo Giuseppe

Italo Ferreira Da Silva
Carlos Alberto

James Henrique Dos Santos
Carlos Alberto

Jamile Beatriz Gomes De Oliveira
Imídeo Giuseppe

Jamille Gomes Da Silva
Aldônio

Jaqueline De Jesus Sousa
Imídeo Giuseppe

Jean Felipe De Souza Lemos
Imídeo Giuseppe

Jean Lucas De Oliveira Silva
Aldônio

Jennifer Rayane Dos Santos Martins
Carlos Alberto

Jessica Carolina Rocha
Carlos Alberto

Jhenifer Gabrielle De Castro Silva
Aldônio

Joana Marinho De Oliveira
Aldônio

João Antonio Siqueira
Imídeo Giuseppe

João Gabriel Rocha Sampaio
Aldônio

João Henrique Mello Mendes
Aldônio

João Lucas Silva Santos
Aldônio

João Marcus Souza Oliveira
Imídeo Giuseppe

João Paulo Mendes Silva
Aldônio

João Pedro Lima Da Silva
Imídeo Giuseppe

João Victor De Oliveira Sousa
Imídeo Giuseppe

Jonathan Henrique Dos Santos
Imídeo Giuseppe

Jose Augusto Leite Cavalcante
Imídeo Giuseppe

Julia De Cassia Costa
Tom Jobim

Julia De Freitas de Oliveira
Carlos Alberto

Julia Marinho De Oliveira
Carlos Alberto

Julia Thauane Dos Santos Silva
Aldônio

Juliana Aparecida Rocha
Aldônio

Kamila Vitoria De Jesus
Aldônio

Karen Caroline De Oliveira
Imídeo Giuseppe

Karen Costa Ribeiro
Mário Covas

Karina De Oliveira Santos
Aldônio

Karolliny Silva Moraes
Imídeo Giuseppe

Kauan Barbosa De Abreu
Aldônio

Kauan Henrique Alves De Souza
Aldônio

Kauane Marques De Oliveira
Imídeo Giuseppe

Kauany Sales De Oliveira
Imídeo Giuseppe

Kayo Ferreira Da Rocha
Imídeo Giuseppe

Keli Vitoria Lima De Araujo
Imídeo Giuseppe

Kemilly Beatriz Sousa Santos
Imídeo Giuseppe

Kemilly Thauane Silva
Aldônio

Kevin Eduardo Sousa De Oliveira
Imídeo Giuseppe

Klayton Ruan S. Alvarenga
Aldônio

Lara Gabrielle De Oliveira
Carlos Alberto

Larissa Caroline Pereira Santos
Imídeo Giuseppe

Larissa Maria de Sousa Sampaio
Colaço

Laura Beatriz Pereira Santos
Imídeo Giuseppe

Leandro Gomes Da Silva
Aldônio

Leticia Caroline S. Lima
Aldônio

Leticia Dos Santos Carvalho
Aldônio

Leticia Ramos Da Silva
Carlos Alberto

Lorena Aparecida Rocha
Aldônio

Lorraine Gabrielle Rocha
Aldônio

Luan Gabriel De Alvarenga
Aldônio

Luan Gabriel Mendes Silva
Aldônio

Luan Henrique Silva Cavalcante
Imídeo Giuseppe

Lucas De Oliveira Guedes
Aldônio

Lucas Dos Santos Alvarenga
Aldônio

Lucas Gabriel De Alvarenga
Aldônio

Lucas Gabriel Dos Santos
Carlos Alberto

Lucas Gabriel Silva De Alvarenga
Carlos Alberto

Lucas Henrique Barbosa Silva
Aldônio

Lucas Henrique De Oliveira Lima
Imídeo Giuseppe

Lucia Aparecida Rocha
Imídeo Giuseppe

Luis Felipe De Souza Araujo
Imídeo Giuseppe

Luiz Eduardo Lima Da Silva
Imídeo Giuseppe

Luiz Guilherme De Souza
Aldônio

Luiza Beatriz Pereira Santos
Imídeo Giuseppe

Luiza Gabrielle Rocha
Aldônio

Maely Vitoria Lima Oliveira
Aldônio

Maicon Douglas De Oliveira
Imídeo Giuseppe

Manoel Gomes Da Silva
Aldônio

Manuel Gomes Da Silva
Aldônio

Marcos De Araujo Lopes
Imídeo Giuseppe

Marcos Vinicius Barbosa De Souza
Imídeo Giuseppe

Maria Beatriz De Araujo
Imídeo Giuseppe

Maria Eduarda Da Silva Gonçalves
Imídeo Giuseppe

Maria Eduarda Da Silva S. Alvarenga
Aldônio

Maria Eduarda De Oliveira Santos
Aldônio

Maria Eduarda De Souza Silva
Imídeo Giuseppe

Maria Eduarda Marques
Imídeo Giuseppe

Maria Eduarda Ramos
Aldônio

Maria Eduarda Silva
Carlos Alberto

Maria Eduarda Silva Dos Santos
Carlos Alberto

Maria Eduarda Souza Silva
Aldônio

Mariana De Jesus Oliveira
Aldônio

Maysa Vitoria C Da Rocha
Aldônio

Melissa Beatriz Pereira Santos
Imídeo Giuseppe

Melissa Caroline Lemes
Aldônio

Milena Caroline Lemes
Aldônio

Mirella Caroline De Oliveira
Imídeo Giuseppe

Natan De Souza Santos
Aldônio

Nathan Henrique Rosa Neves
Aldônio

Nathan Matheus Leite Cavalcante
Imídeo Giuseppe

Nathan Sales Dos Santos
Aldônio

Nicolas Borges Da Silva
Aldônio

Nicolas Henrique Dos Santos
Aldônio

Nicole Aparecida Rocha
Aldônio

Nicole Gabrielle Rocha
Aldônio

Nicole Marinho De Carvalho
Aldônio

Otavio Henrique Marques
Aldônio

Paloma Gomes Da Silva
Imídeo Giuseppe

Paula Beatriz Alvares De Andrade
Aldônio

Pedro Henrique Ferreira Moreira
Imídeo Giuseppe

Pedro Henrique Silva Da Silva
Aldônio

Poliana Gomes Da Silva
Imídeo Giuseppe

Rafael Arcanjo Santos
Aldônio

Rafaela De Jesus Ferreira
Imídeo Giuseppe

Raissa Beatriz Pereira Santos
Imídeo Giuseppe

Raul Almeida De Souza
Imídeo Giuseppe

Rayane Gomes Da Silva
Imídeo Giuseppe

Rebeca De Oliveira Santos
Aldônio

Rebecca Luiza Mello Mendes
Aldônio

Renan De Oliveira Marcolino
Imídeo Giuseppe

Renan Felipe De Souza Lemos
Imídeo Giuseppe

Ricardo Ferreira Rocha
Carlos Alberto

Rikelme Pereira Dos Santos
Imídeo Giuseppe

Samuel De Jesus Leite
Imídeo Giuseppe

Samuel Ferreira Da Rocha
Imídeo Giuseppe

Sara Maria Nascimento
Imídeo Giuseppe

Sarah Gabrielle Silva
Aldônio

Stefany Rayane Pereira Cardoso
Imídeo Giuseppe

Talita Gomes Da Silva
Aldônio

Tarcisio Dos Santos Mendes
Aldônio

Tarcisio Pereira Dos Santos
Imídeo Giuseppe

Taynara De Oliveira Sousa
Aldônio

Thauany Mendes Silva
Aldônio

Thiago De Jesus Oliveira
Aldônio

Thiago Ferreira Rocha
Aldônio

Thiago Mendes Silva
Aldônio

Tiago De Oliveira Sousa
Aldônio

Tiago Mendes Silva
Aldônio

Valentina Maria Rocha Sousa
Prefeitura

Vania Alves Barbosa
Imídeo Giuseppe

Vitor Gabriel Marques Silva
Aldônio

Vitor Henrique Alves De Souza
Imídeo Giuseppe

Vitoria Caroline Gomes
Aldônio

Vitoria De Freitas Souza
Aldônio

Vitoria De Jesus Oliveira
Aldônio

Vitoria Eduarda Ramos
Aldônio

Walace Arcanjo Santos
Aldônio

Wesley De Araujo Lopes
Imídeo Giuseppe

Willian Henrique Alves De Souza
Imídeo Giuseppe

Yago Willian Oliveira Moreira
Aldônio

Yan Lucas De Oliveira Silva
Aldônio

Yara Eduarda Ramos Lima
Aldônio

Yasmim Aparecida Silva Reis
Abelardo Marques

Yuri Gabriel Silva De Lima
Aldônio
`;

const RawDataETEC = `
Abner de Jesus Jales da Silva
Leda Caira

Adriane maria da SIlva
Helena Chaves

Adriel Mateus Silva Nepomucena
Teotônio Vilela

Adryan da Paz Sales
Ullysses Guimarães

Agata Beatriz Martins da Silva
Benedita Odette

Agatha Caroline Lemes
Tancredo Neves

Agatha Victória F. Silva
Benedita Odette

Alessandra Gouveia
André Fernandes

Alex Eduardo
Celina

Alexia Sales Godinho
João José de Oliveira

Allan Souza Conceição
Osasco III

Allana Gabrielly S. Alvarenga
Helena Chaves

Allyce Karolinne de Oliveira
Ullysses Guimarães

Allyson dos Santos Chaves
Alba de Mello

Alvaro Luiz Mendes Junior
Antônio Carlos de Azevedo

Amanda Barbosa
André Fernandes

Amanda Gomes da Silva
Maria Augusta de Morais

Amanda Neves de Souza
Helena Chaves

Amanda Ribeiro Gomes
Ana Aparecida

Amanda Scarllet Mendes Santos
Teotônio Vilela

Amanda Silva dos Santos
Ana Aparecida

Ana Beatriz A. de Andrade
Ana Aparecida

Ana Beatriz S. Mello
Helena Chaves

Ana Beatriz de Melo Miranda
Walter de Oliveira

Ana Caroline
Benedita Odette

Ana Clara Araújo de Souza
Josué Benedicto

Ana Clara Barbosa dos Santos
Alba de Mello

Ana Clara Dias dos Reis
Walter de Oliveira

Ana Clara Gurgel de Souza
Helena Chaves

Ana Clara S. de Oliveira
Hélio Simões

Ana Júlia de Jesus Sousa
Benedita Odette

Ana Laura de Oliveira Silva
Alba de Mello

Ana Leticia de Sousa Silva
Josué Benedicto

Ana Lucia Pereira Lima
Josué Benedicto

Ana Luiza Mendes de Jesus
Antônio Carlos de Azevedo

Ana Luiza Siqueira de Freitas
Antônio Carlos de Azevedo

Andrei Rodrigues Pereira
Leda Caira

Andrew Willian S. Martins
Josué Benedicto

Ane Caroline dos S. Pereira
Maria Augusta de Morais

Anna Julia da Silva Sampaio
Alba de Mello

Anna Julia de Oliveira Silva
Leda Caira

Anna Karoline Marinho
Josué Benedicto

Anna Laura Ramos dos Santos
Walter de Oliveira

Anne Caroline Ferreira Rocha
Alba de Mello

Anthony Gabriel Silva
Hélio Simões

Arthur Ferreira do Nascimento
Antônio Carlos de Azevedo

Arthur Gabriel de Jesus Leite
João José de Oliveira

Arthur Marques de Oliveira
Maria Augusta de Morais

Arthur Tenorio Rodrigues
Ana Aparecida

Artur Almeida de Souza
Ullysses Guimarães

Artur Gabriel dos Santos Silva
Hélio Simões

Assueros Francisco Gomes
Walter de Oliveira

Aylla Sophia de Oliveira
Teotônio Vilela

Barbara Beatriz Lima de Araujo
Maria Augusta de Morais

Beatriz Cavalcante Pereira
Tancredo Neves

Beatriz dos Santos Carvalho
Papa João

Bianca de Souza S. de Lima
João José de Oliveira

Brenno Ferreira dos Santos
André Fernandes

Brenno Guedes de Oliveira
Osasco III

Breno Henrique S. Cavalcante
Teotônio Vilela

Breno Marques Lemos
Maria Augusta de Morais

Bruna de Oliveira dos Santos
Josué Benedicto

Bruno de Freitas Souza
Tancredo Neves

Bruno dos Santos Souza
Walter de Oliveira

Bryan Henrique Soares Lima
Helena Chaves

Caio Gabriel da Silva Souza
Alba de Mello

Caio Gustavo Guedes de Brito
Antônio Carlos de Azevedo

Caio Henrrique de Oliveira
Josué Benedicto

Carlos Eduardo Lima da Silva
Josué Benedicto

Carlos Eduardo S. de Oliveira
Ullysses Guimarães

Cauã Felipe Rosa Neves
Leda Caira

Cauã Henrique Santos de Jesus
Hélio Simões

Cauane Mendes Gomes
Ana Aparecida

Clara Bianca dos Santos Silva
Alba de Mello

Cristian Aparecido de Oliveira
Josué Benedicto

Crysthian Henrique de S. Santos
Josué Benedicto

Dandara Martins dos Santos
Josué Benedicto

Daniel Camilo de Souza
Leda Caira

Daniel de Oliveira Guedes
Papa João

Daniela Vitoria Oliveira Lima
João José de Oliveira

Danilo Gabriel Silva Costa
Teotônio Vilela

Danilo Miranda de Sousa
Alba de Mello

Dante Ramos Rodrigues
Josué Benedicto

Dante Santos Moreira
Antônio Carlos de Azevedo

Davi Araujo de Oliveira
Aurélio

Davi de Araujo Lopes
Maria Augusta de Morais

Davi Gabriel Alves Bezerra
Walter de Oliveira

Davi Guilherme Lopes Silva
Antônio Carlos de Azevedo

Davi Pereira Lima
Josué Benedicto

David Willian Ramos Lima
Teotônio Vilela

Debora Eduarda S. Ferreira
Alba de Mello

Deivison Lucas Dias Chaves
Alba de Mello

Denis Ferreira de Carvalho
Ullysses Guimarães

Douglas de Lima Bezerra
Alba de Mello

Eduarda Gabrielle Ramos
Alba de Mello

Eduarda Vitoria C. da Rocha
Helena Chaves

Eduardo de Jesus Ferreira
Josué Benedicto

Eduardo Henrique de Oliveira
Teotônio Vilela

Eleone de Jesus Ferreira
Josué Benedicto

Eloá Martins Rodrigues
Leda Caira

Eloize Pinheiro da Silva
Ana Aparecida

Emanuelle Silva Santos
Walter de Oliveira

Emilly Beatriz P. Santos
Alba de Mello

Emilly Thauane Silva de Oliveira
Ana Aparecida

Erick de Sousa Ribeiro
Alba de Mello

Erick Matheus L. Cavalcante
João José de Oliveira

Erick Santana de Souza
João José de Oliveira

Erik de Oliveira Marcolino
Josué Benedicto

Ester Maria Nascimento
Josué Benedicto

Esther Caroline Rocha Martins
Walter de Oliveira

Esther de Araújo Souza
Helena Chaves

Everton de Freitas Pereira
Josué Benedicto

Ewellin Rayane P. Cardoso
João José de Oliveira

Ezequiel Elias
Helena Chaves

Felipe de Oliveira Sousa
João José de Oliveira

Felipe dos Santos Alvarenga
Papa João

Felipe Gabriel dos S. Oliveira
Josué Benedicto

Felipe Gabriel S. da Silva
Josué Benedicto

Fernanda Camargo de Abreu
Ana Aparecida

Fernanda de Castro Ribeiro
Alba de Mello

Flavia Vitoria Lima Oliveira
Josué Benedicto

Gabriel Araújo da SIlva
Alba de Mello

Gabriel Arcanjo Santos Ferreira
Papa João

Gabriel de Araujo Gomes
Teotônio Vilela

Gabriel de Oliveira Cardoso
Josué Benedicto

Gabriel de Oliveira Santos
Alba de Mello

Gabriel Henrique F. Moreira
Ullysses Guimarães

Gabriel Henrique S. da Silva
Ana Aparecida

Gabriel Moreira da Silva
Josué Benedicto

Gabriel Rodrigues do Nascimento
Maria Augusta de Morais

Gabriel Soares Dias da Silva
Maria Augusta de Morais

Gabriel Souza Gross
Leda Caira

Gabriela de Oliveira Dias
Antônio Carlos de Azevedo

Gabriela Marinho Miranda
Walter de Oliveira

Gabriella Silva de Souza
Walter de Oliveira

Gabrielle Alves de Souza
Alba de Mello

Gaby Vitória de S. Santos
Antônio Carlos de Azevedo

Geovana Luiza Mendes
Antônio Carlos de Azevedo

Geovana Nascimento de Lima
Helena Chaves

Giovana Maria Oliveira Lima
Papa João

Giovana Thauane Souza Silva
Josué Benedicto

Giovanna de Oliveira Barros
Josué Benedicto

Giovanna de Souza Santos
Helena Chaves

Gisele de Oliveira Santos
Ullysses Guimarães

Gislaine de Almeida Silva
Teotônio Vilela

Giulia Ferreira de Moura
Alba de Mello

Graciliano dos Santos Mendes
Josué Benedicto

Graziela Vitoria da Silva Lima
Teotônio Vilela

Graziele Silva dos Santos
Alba de Mello

Guilherme Bezerra de Almeida
Josué Benedicto

Guilherme Henrique Barbosa
Ana Aparecida

Guilherme Lucca de S. Silva
Hélio Simões

Guilherme Mendes Gomes
Alba de Mello

Guilherme Oliveira de Araujo
Maria Augusta de Morais

Guilherme Otavio Lima
Hélio Simões

Guilherme Sales dos Santos
Osasco III

Guilherme Silva Santana
João José de Oliveira

Gustavo Borges da Silva
Antônio Carlos de Azevedo

Gustavo Caetano Guedes
João José de Oliveira

Gustavo Ferreira Rocha
Ana Aparecida

Gustavo Gabriel de O. Lima
Josué Benedicto

Gustavo Henrique A. de Souza
João José de Oliveira

Gustavo Henrique Barbosa Silva
Hélio Simões

Gustavo Henrique da S. Almeida
Tancredo Neves

Gustavo Henrique Marques
Antônio Carlos de Azevedo

Gustavo Lopes de Souza
Walter de Oliveira

Heberth de Oliveira S. Chagas
Leda Caira

Hellen Caroline Gomes
Walter de Oliveira

Heloisa de Souza Araujo
Teotônio Vilela

Henrique Pereira Lima
João José de Oliveira

Henrique Tenorio Rodrigues
Ana Aparecida

Iago Alves Bezerra
Walter de Oliveira

Iago Ferreira da Silva
Leda Caira

Ian Gabriel S. de Alvarenga
Antônio Carlos de Azevedo

Ian Lucas de Oliveira Silva
Hélio Simões

Iara Caroline Lemes
Tancredo Neves

Igor de Lima Bezerra
Papa João

Igor de Oliveira Bezerra
Alba de Mello

Igor Gabriel Mendes Silva
Helena Chaves

Igor Ramos Rodrigues
Josué Benedicto

Ingrid de Oliveira Santos
Walter de Oliveira

Isaac de Almeida Silva
Teotônio Vilela

Isaac Tenorio Rodrigues
Ana Aparecida

Isabel de Jesus Jales da Silva
Leda Caira

Isabela de Castro Ribeiro
Alba de Mello

Isabela de Siqueira
Josué Benedicto

Isabela Marinho de Carvalho
Antônio Carlos de Azevedo

Isabele Luiza Mello Mendes
Hélio Simões

Isabella Cavalcante Araujo
Josué Benedicto

Isadora Eduarda Ramos Lima
Papa João

Israel de Almeida Silva
Teotônio Vilela

Israel Elias
Helena Chaves

Italo Araujo Silva
Josué Benedicto

Iury Ruan Santos Ferreira
Osasco III

Jacira Tenorio Rodrigues
Ana Aparecida

James Henrique dos Santos
Ullysses Guimarães

Jamile Beatriz G. de Oliveira
Maria Augusta de Morais

Jamille Gomes da Silva
Helena Chaves

Jandira Ramos Rocha
Alba de Mello

Janice Alves Barbosa
Teotônio Vilela

Jaqueline de Jesus Sousa
João José de Oliveira

Jean Felipe de Souza Lemos
Maria Augusta de Morais

Jean Lucas de Oliveira Silva
Hélio Simões

Jennifer Rayane P. Cardoso
João José de Oliveira

Jessica Carolina Rocha
João José de Oliveira

Jessica de Lima Guedes
Papa João

Jhenifer Gabrielle Silva
Helena Chaves

Jhennifer Mendes Silva
Hélio Simões

Joana Marinho de Oliveira
Leda Caira

João Antonio Siqueira
Josué Benedicto

João Carlos Mendes Silva
Helena Chaves

João Gabriel P. dos Santos
Ana Aparecida

João Gabriel Rocha Sampaio
Walter de Oliveira

João Guilherme Barbosa Silva
Tancredo Neves

João Henrique Mello Mendes
Hélio Simões

João Lucas Silva Santos
Walter de Oliveira

João Marcus S. Oliveira
Ullysses Guimarães

João Otávio Ramos Rocha
Alba de Mello

João Paulo Mendes Silva
Hélio Simões

João Pedro Lima da Silva
João José de Oliveira

João Victor de Oliveira Sousa
Osasco III

João Victor de Souza Santos
Helena Chaves

Joaquim Francisco Gomes
Walter de Oliveira

Jonas Francisco Gomes
Walter de Oliveira

Jonathan Henrique dos Santos
João José de Oliveira

José Augusto L. Cavalcante
João José de Oliveira

José Eduardo Rocha
Antônio Carlos de Azevedo

Josenildo Pereira dos Santos
Ullysses Guimarães

Joshuel Araujo de Oliveira
Josué Benedicto

Juan Gabriel Silva Marinho
Antônio Carlos de Azevedo

Julia de Freitas de Oliveira
Leda Caira

Julia Gabriele S. Rodrigues
Alba de Mello

Julia Marinho de Oliveira
Leda Caira

Julia Thauane de S. Santos
Ana Aparecida

Juliana Aparecida Rocha
João José de Oliveira

Juliana Gomes da Silva
Helena Chaves

Kaike Almeida Dias
Alba de Mello

Kaike Pereira de Souza
André Fernandes

Kaiky Henrique Lima Silva
Walter de Oliveira

Kaiky Rangel G. da Silva
Maria Augusta de Morais

Kailane Alves de Sousa
Walter de Oliveira

Kamila Vitoria de Jesus
Antônio Carlos de Azevedo

Kamilla Vitoria Dias Chaves
Alba de Mello

Karen Caroline de Oliveira
Maria Augusta de Morais

Karen Gabrielle Marques
Antônio Carlos de Azevedo

Karina de Oliveira Santos
Walter de Oliveira

Kauan Barbosa de Abreu
Ana Aparecida

Kauan Henrique A. de Souza
Josué Benedicto

Kauane Marques de Oliveira
Maria Augusta de Morais

Kauany Sales de Oliveira
Alba de Mello

Kayo Ferreira da Rocha
Ullysses Guimarães

Kayque Gabriel S. Oliveira
Hélio Simões

Keli Vitoria Lima de Araujo
Maria Augusta de Morais

Kelly de Oliveira Marcolino
Josué Benedicto

Kemilly Beatriz S. Santos
Alba de Mello

Kemilly Thauane Silva
Helena Chaves

Kevin Eduardo S. de Oliveira
Ullysses Guimarães

Kezia Eduarda S. Ferreira
Alba de Mello

Kimberly Rayane Santos
Walter de Oliveira

Klayton Ruan S. Alvarenga
Helena Chaves

Lara Bianca dos Santos
Papa João

Lara Gabrielle de Oliveira
Leda Caira

Larissa Caroline P. Santos
Alba de Mello

Larissa Gabrielle de Oliveira
Leda Caira

Larissa Marinho Silva
Maria Augusta de Morais

Laura Beatriz P. Santos
Alba de Mello

Laura de Oliveira Marinho
Antônio Carlos de Azevedo

Laysla Vitoria dos S. Silva
Tancredo Neves

Leandro de Jesus Oliveira
Hélio Simões

Leandro Gomes da Silva
Ana Aparecida

Leticia Caroline S. Lima
Josué Benedicto

Leticia de Castro Ribeiro
Alba de Mello

Leticia dos Santos Carvalho
Papa João

Lorena Aparecida Rocha
João José de Oliveira

Lorena Gabrielle Ramos
Alba de Mello

Lorraine Gabrielle Rocha
Antônio Carlos de Azevedo

Luan Gabriel de Alvarenga
Antônio Carlos de Azevedo

Luan Gabriel Mendes Silva
Hélio Simões

Luan Henrique S. Cavalcante
Teotônio Vilela

Lucas Arcanjo Santos
Papa João

Lucas de Oliveira Guedes
Papa João

Lucas de Oliveira Santos
Alba de Mello

Lucas dos Santos Alvarenga
Papa João

Lucas Ferreira do Nascimento
Antônio Carlos de Azevedo

Lucas Gabriel Rosa Neves
Leda Caira

Lucas Gabriel S. de Alvarenga
Antônio Carlos de Azevedo

Lucas Henrique Barbosa Silva
Tancredo Neves

Lucas Henrique de O. Lima
Josué Benedicto

Lucas Henrique Rosa Neves
Leda Caira

Lucas Tenorio Rodrigues
Ana Aparecida

Lucia Aparecida Rocha
João José de Oliveira

Luis Antonio de Souza
Teotônio Vilela

Luis Felipe de Souza Araujo
Teotônio Vilela

Luiz Eduardo Lima da Silva
João José de Oliveira

Luiz Felipe Guedes de Brito
Antônio Carlos de Azevedo

Luiz Guilherme de Souza
Papa João

Luiz Otavio Lima de Araujo
Maria Augusta de Morais

Luiza Beatriz P. Santos
Alba de Mello

Luiza Gabrielle Rocha
João José de Oliveira

Maely Vitoria Lima Oliveira
João José de Oliveira

Maicon Douglas de Oliveira
Maria Augusta de Morais

Maitê Mendes da Silva
Josué Benedicto

Manoel Gomes da Silva
Ana Aparecida

Manuel Gomes da Silva
Ana Aparecida

Marcos de Araujo Lopes
Maria Augusta de Morais

Marcos Vinicius B. da Silva
João José de Oliveira

Marcos Vinicius B. de Souza
João José de Oliveira

Maria Aparecida R. Lima
Papa João

Maria Beatriz de Araujo
Maria Augusta de Morais

Maria Eduarda A. Bezerra
Walter de Oliveira

Maria Eduarda de O. Santos
Walter de Oliveira

Maria Eduarda de S. Silva
Maria Augusta de Morais

Maria Eduarda Marques
Maria Augusta de Morais

Maria Eduarda Ramos
Papa João

Maria Eduarda S. Alvarenga
Helena Chaves

Maria Eduarda S. da Silva
Helena Chaves

Maria Eduarda Silva
Ana Aparecida

Maria Gabrielly Marinho
Antônio Carlos de Azevedo

Maria Julia de Oliveira
Leda Caira

Maria Julia Mendes Gomes
Alba de Mello

Maria Luiza Mendes de Jesus
Antônio Carlos de Azevedo

Mariana de Jesus Oliveira
Hélio Simões

Martha Maria Rocha Sousa
Prefeitura

Mateus de Oliveira Santos
Alba de Mello

Mateus Henrique F. Moreira
Ullysses Guimarães

Matheus de Oliveira Bezerra
Alba de Mello

Matheus de Oliveira S. Gross
Leda Caira

Matheus de Oliveira Santos
Alba de Mello

Matheus Eduardo S. de Oliveira
Ullysses Guimarães

Matheus Gabriel S. de Lima
Tancredo Neves

Matheus Henrique S. da Silva
Ana Aparecida

Matheus Lucca de S. Silva
Hélio Simões

Maysa Vitoria C. da Rocha
Helena Chaves

Melissa Beatriz P. Santos
Alba de Mello

Melissa Caroline Lemes
Tancredo Neves

Miguel de Oliveira Bezerra
Alba de Mello

Miguel Henrique de O. Silva
Antônio Carlos de Azevedo

Milena Caroline Lemes
Tancredo Neves

Mirella Caroline de Oliveira
Maria Augusta de Morais

Moises Gabriel de O. Lima
Josué Benedicto

Murilo Henrique Barbosa
Ana Aparecida

Murilo Otavio Lima de Araujo
Maria Augusta de Morais

Natan de Souza Santos
Antônio Carlos de Azevedo

Nathan Henrique Rosa Neves
Leda Caira

Nathan Matheus L. Cavalcante
João José de Oliveira

Nathan Sales dos Santos
Osasco III

Nicolas Borges da Silva
Antônio Carlos de Azevedo

Nicolas Henrique dos Santos
João José de Oliveira

Nicole Aparecida Rocha
João José de Oliveira

Nicole Gabrielle Rocha
Antônio Carlos de Azevedo

Nicole Marinho de Carvalho
Antônio Carlos de Azevedo

Otavio de Almeida Silva
Teotônio Vilela

Otavio Henrique Marques
Antônio Carlos de Azevedo

Pablo Rangel Santos Lemos
Imídeo Giuseppe

Paloma Gomes da Silva
Maria Augusta de Morais

Patricia de Castro Ribeiro
Alba de Mello

Paula Beatriz A. de Andrade
Ana Aparecida

Paulo Antonio Siqueira
Josué Benedicto

Paulo Henrique de Oliveira
Teotônio Vilela

Pedro Henrique F. Moreira
Ullysses Guimarães

Pedro Henrique S. da Silva
Ana Aparecida

Pietro Gabriel Silva Marinho
Antônio Carlos de Azevedo

Poliana Gomes da Silva
Maria Augusta de Morais

Priscila de Oliveira Barros
Josué Benedicto

Rafael Arcanjo Santos
Papa João

Rafaela de Jesus Ferreira
Josué Benedicto

Raissa Beatriz P. Santos
Alba de Mello

Raissa de Oliveira Cardoso
Josué Benedicto

Raul Almeida de Souza
Ullysses Guimarães

Rayane Gomes da Silva
Maria Augusta de Morais

Rebecca Luiza Mello Mendes
Hélio Simões

Rebeca de Oliveira Santos
Walter de Oliveira

Renan de Oliveira Marcolino
Josué Benedicto

Renan Felipe de Souza Lemos
Maria Augusta de Morais

Renata de Oliveira S. Chagas
Leda Caira

Ricardo Ferreira Rocha
Ana Aparecida

Rikelme Pereira dos Santos
Ullysses Guimarães

Rodrigo Alves Bezerra
Walter de Oliveira

Ruan Gabriel Rosa Neves
Leda Caira

Ryan Gabriel Silva Costa
Teotônio Vilela

Ryan Henrique Barbosa Silva
Hélio Simões

Sacha de Oliveira Barros
Josué Benedicto

Samuel de Jesus Leite
João José de Oliveira

Samuel Ferreira da Rocha
Ullysses Guimarães

Sara Maria Nascimento
Josué Benedicto

Sarah Gabrielle Silva
Helena Chaves

Stefany Rayane P. Cardoso
João José de Oliveira

Tainá Bianca dos Santos
Alba de Mello

Talita Gomes da Silva
Maria Augusta de Morais

Tarcisio dos Santos Mendes
Josué Benedicto

Tarcisio Pereira dos Santos
Ullysses Guimarães

Taynara de Oliveira Sousa
Osasco III

Thalita Gomes da Silva
Maria Augusta de Morais

Thauane de Oliveira Sousa
Josué Benedicto

Thauane de Souza Santos
Helena Chaves

Thauany Mendes Silva
Helena Chaves

Thiago de Jesus Oliveira
Hélio Simões

Thiago de Oliveira S. Gross
Leda Caira

Thiago Ferreira Rocha
Ana Aparecida

Thiago Mendes Silva
Hélio Simões

Thiago Sales de Oliveira
Alba de Mello

Tiago de Oliveira Sousa
João José de Oliveira

Tiago Mendes Silva
Hélio Simões

Uriel Araujo de Oliveira
Josué Benedicto

Valentina Maria Rocha Sousa
Prefeitura

Vanderson de Jesus Oliveira
Hélio Simões

Vania Alves Barbosa
Teotônio Vilela

Vitor Gabriel de Alvarenga
Antônio Carlos de Azevedo

Vitor Gabriel Marques Silva
Ana Aparecida

Vitor Henrique A. de Souza
Josué Benedicto

Vitoria Caroline Gomes
Walter de Oliveira

Vitoria de Freitas Souza
Tancredo Neves

Vitoria de Jesus Oliveira
Hélio Simões

Vitoria Eduarda Ramos
Papa João

Vitoria Gabrielle Ramos
Alba de Mello

Walace Arcanjo Santos
Papa João

Wesley de Araujo Lopes
Maria Augusta de Morais

William Henrique A. de Souza
Josué Benedicto

Willian de Oliveira S. Gross
Leda Caira

Yago Willian Oliveira Moreira
Papa João

Yan Lucas de Oliveira Silva
Hélio Simões

Yara Eduarda Ramos Lima
Papa João

Yuri Gabriel S. de Lima
Tancredo Neves
`;

function parseData(raw) {
  const lines = raw.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const result = [];
  for (let i = 0; i < lines.length; i += 2) {
    const name = lines[i];
    const school = lines[i + 1];
    if (name && school) {
      result.push({ name, school });
    }
  }
  return result;
}

const studentsENEM = parseData(RawDataENEM);
const studentsETEC = parseData(RawDataETEC);
const allStudents = [...studentsENEM, ...studentsETEC];

async function run() {
  console.log(`Iniciando atualização real para ${allStudents.length} alunos...`);

  // 1. Fetch ALL auth users
  console.log("📥 Carregando todos os usuários do Supabase Auth para cache...");
  let allAuthUsers = [];
  let page = 1;
  let keepFetching = true;

  while (keepFetching) {
    const { data: usersData, error } = await supabase.auth.admin.listUsers({
      page: page,
      perPage: 1000
    });
    if (error) {
      console.error("Error fetching users:", error);
      process.exit(1);
    }
    const { users } = usersData;
    if (users.length === 0) {
      keepFetching = false;
    } else {
      allAuthUsers = allAuthUsers.concat(users);
      page++;
    }
  }
  console.log(`✅ Carregados ${allAuthUsers.length} usuários do Auth.`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < allStudents.length; i++) {
    const student = allStudents[i];
    
    // Evaluate Email
    const nameParts = student.name.trim().split(' ').filter(p => p.length > 0);
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];
    let secondNameInitial = '';
    if (nameParts.length > 1) {
      secondNameInitial = nameParts[1][0].toLowerCase();
    }
    const emailPart = (firstName + secondNameInitial + lastName)
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
    
    const email = `${emailPart}@compromisso.com`;
    const institution = student.school;
    const exam_target = (i < studentsENEM.length) ? 'ENEM' : 'ETEC';

    try {
      let userId;
      const existing = allAuthUsers.find(u => u.email.toLowerCase() === email);

      if (existing) {
        userId = existing.id;
        // Update
        await supabase.auth.admin.updateUserById(userId, { 
          password: 'compromisso2026',
          user_metadata: { must_change_password: true, display_name: student.name }
        });
      } else {
        // Create
        const { data: userData, error: userError } = await supabase.auth.admin.createUser({
          email: email,
          password: 'compromisso2026',
          email_confirm: true,
          user_metadata: { must_change_password: true, display_name: student.name }
        });

        if (userError) throw userError;
        userId = userData.user.id;
        allAuthUsers.push(userData.user);
      }

      if (userId) {
        // Upsert Profile
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            email: email,
            name: student.name,
            institution: institution,
            exam_target: exam_target,
            profile_type: 'student',
            status: 'active',
            updated_at: new Date()
          });

        if (profileError) throw profileError;
        successCount++;
        if (i % 50 === 0) process.stdout.write(`✅ ${i}.. `);
      }
    } catch (err) {
      console.error(`❌ Erro em ${student.name}:`, err.message);
      failCount++;
    }
  }

  console.log(`\n🏁 Sincronização Concluída!`);
  console.log(`✅ Sucessos: ${successCount} | ❌ Falhas: ${failCount}`);
}

run();
