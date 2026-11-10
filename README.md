# Pokédex do grupo

Aplicação web que consulta a PokéAPI, grava os resultados no MongoDB e apresenta indicadores calculados sobre os documentos da coleção. A API da PokéAPI é usada somente para leitura; o cadastro e as alterações são feitos na API própria Node.js/Express e salvos no MongoDB.

## Grupo, tema e papéis

Tema: Pokédex. API de origem: [PokéAPI](https://pokeapi.co/api/v2/pokemon?limit=30).

O trabalho foi desenvolvido por um grupo de quatro integrantes, com divisão de responsabilidades entre dados e MongoDB, API Node.js/Express e testes HTTP, interface e indicadores, e integração e documentação. Todos participaram do desenvolvimento e devem registrar suas contribuições no repositório.

## Modelo de documento

Exemplo de documento salvo:

```json
{
  "nome": "bulbasaur",
  "numero": 1,
  "tipos": ["grass", "poison"],
  "ataque": 49,
  "defesa": 49,
  "hp": 45,
  "altura": 7,
  "peso": 69,
  "imagem": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png",
  "favorito": false,
  "criadoEm": "2026-11-08T12:00:00.000Z",
  "atualizadoEm": "2026-11-08T12:00:00.000Z"
}
```

`tipos` fica embutido como lista porque um Pokémon pode ter mais de um tipo e a interface sempre os consulta junto com o Pokémon. Não há referência a outra coleção: os dados usados pelo painel pertencem ao mesmo documento. `favorito`, `criadoEm` e `atualizadoEm` são campos de controle adicionados pelo grupo. A importação busca os primeiros 30 Pokémon e grava cada documento no MongoDB.

## Executar com Docker

Requisitos: Docker Desktop com mecanismo Linux ativo e acesso à internet na primeira inicialização.

Na raiz do projeto:

```powershell
docker compose up -d --build
```

Abra <http://localhost:3000>, clique em **Importar 30 Pokémon** e aguarde a confirmação. A interface e a API sobem em containers. MongoDB persiste os dados no volume nomeado `dados-mongo`.

```powershell
docker compose ps       # verificar os serviços
docker compose logs -f  # acompanhar os logs
docker compose down     # parar sem apagar os dados
docker compose down -v  # apagar também os dados persistidos
```

## Acesso pelo celular (Cloudflare Tunnel)

O `docker compose` também sobe um serviço `tunnel` (cloudflared) que cria um link público `https://...trycloudflare.com` apontando para a interface. O nginx do frontend repassa `/pokemons` para a API, então a página e a API funcionam pelo mesmo link, no PC ou no celular.

```powershell
docker compose up -d --build
docker compose logs tunnel
```

Procure nos logs a linha com `https://<algo>.trycloudflare.com` e abra esse endereço no celular. O link só funciona enquanto os containers estiverem rodando e muda a cada reinício do serviço `tunnel`.

## API HTTP

As rotas da API própria usam autenticação Basic de demonstração (`admin` / `secret`) e JSON. A senha é aceita pelo enunciado para uso local.

| Método | Rota | Ação | Status esperado |
|---|---|---|---|
| PUT | `/pokemons` | Cria a coleção na primeira chamada; nas seguintes confirma que existe | 201 / 200 |
| GET | `/pokemons?pagesize=100` | Lista documentos (padrão 100, máximo 1000) | 200 |
| POST | `/pokemons` | Insere documento e retorna `Location` | 201 |
| GET | `/pokemons/:id` | Busca documento pelo ID | 200 / 404 |
| PUT | `/pokemons/:id` | Substitui documento inteiro | 200 / 404 |
| PATCH | `/pokemons/:id` | Altera somente os campos enviados | 200 / 404 |
| DELETE | `/pokemons/:id` | Exclui documento | 204 / 404 |

IDs inválidos retornam 400. Erros internos retornam 500. A rota `GET /health` verifica se a API está disponível.

## Painel e interpretação

O painel calcula total de Pokémon, ataque médio, maior ataque e percentual de favoritos. Mostra dois gráficos de tipos diferentes (barras e rosca), agrupamento por tipo e ranking dos cinco maiores ataques. Busca textual, filtro por tipo, ordenação, cadastro, edição, favoritos e exclusão atuam sobre os documentos locais; após cada alteração, os indicadores são recalculados.

Conclusão: a amostra importada permite comparar atributos de combate e observar a distribuição de tipos entre os 30 primeiros Pokémon da API. Como a seleção corresponde apenas aos primeiros registros, ela não representa todas as espécies nem todas as gerações. O painel é recalculado com base nos dados da coleção local.

## Evidências e apresentação

Coloque em `docs/prints/` capturas reais do painel com os documentos carregados e, se possível, do Postman mostrando respostas dos cinco métodos. Não use capturas simuladas. Durante a apresentação de 7 minutos, demonstre importação, listagem, busca/filtro, criação, edição (PUT), favorito (PATCH), exclusão (DELETE), os status e os indicadores.

## Postman

Importe `postman/colecao.json`. Configure a variável `baseUrl` como `http://localhost:8080`; a coleção usa Basic Auth (`admin` / `secret`) nas rotas próprias. A requisição POST salva automaticamente o ID recebido para as chamadas subsequentes de GET por ID, PUT, PATCH e DELETE. Rode o DELETE por último.

## Uso de IA

O grupo utilizou o ChatGPT e o Claude para auxiliar na implementação e revisão de trechos do backend, Docker Compose, documentação e coleção Postman. Os integrantes devem revisar e conseguir explicar o código e adaptar esta declaração caso outras ferramentas também tenham sido usadas.
