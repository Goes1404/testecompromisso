
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local if it exists
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

Gustavo Lopes De Souza
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

Julia De Freitas De Oliveira
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
Imídeo Giuseppe

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

function parseData(raw, type) {
  const lines = raw.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const result = [];
  for (let i = 0; i < lines.length; i += 2) {
    const name = lines[i];
    const school = lines[i + 1];
    if (name && school) {
      result.push({ name, school, type });
    }
  }
  return result;
}

const allStudents = [
  ...parseData(RawDataENEM, 'enem'),
  ...parseData(RawDataETEC, 'etec')
];

async function registerStudent(student) {
  const nameParts = student.name.trim().split(' ').filter(p => p.length > 0);
  const firstName = nameParts[0];
  const lastName = nameParts[nameParts.length - 1];
  
  // Email logic: firstName + secondName[0] + lastName
  let secondNameInitial = '';
  if (nameParts.length > 2) {
    secondNameInitial = nameParts[1][0].toLowerCase();
  }

  const emailPart = (firstName + secondNameInitial + lastName)
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
  
  const email = `${emailPart}@compromisso.com`;
  const displayName = `${firstName} ${lastName}`;

  console.log(`🚀 Preparando: ${displayName} <${email}> (${student.school} - ${student.type})`);

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: "compromisso2026",
    email_confirm: true,
    user_metadata: {
      full_name: displayName,
      must_change_password: true,
      profile_type: 'student',
      exam_target: student.type,
      institution: student.school
    }
  });

  if (error) {
    if (error.message.includes('already been registered')) {
        console.warn(`- ⚠️ Aluno já cadastrado: ${email}`);
        return;
    }
    console.error(`- ❌ Erro ao criar auth: ${error.message}`);
    return;
  }

  const userId = data.user.id;

  // Sync with profiles table
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      name: displayName,
      email: email,
      profile_type: 'student',
      exam_target: student.type,
      institution: student.school,
      status: 'active',
      updated_at: new Date().toISOString()
    });

  if (profileError) {
    console.error(`- ❌ Erro ao criar perfil no banco: ${profileError.message}`);
  } else {
    console.log(`- ✅ Sucesso!`);
  }
}

async function run() {
  console.log(`Iniciando registro de ${allStudents.length} alunos...`);
  for (const student of allStudents) {
    await registerStudent(student);
    // Pequeno delay para evitar rate limiting agressivo (mesmo com service role)
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log('--- FIM DO PROCESSO ---');
}

run();
