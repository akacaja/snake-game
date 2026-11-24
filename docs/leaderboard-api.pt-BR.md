# Contrato do serviço de ranking

[English](leaderboard-api.md)

Aqui está o que o jogo (`addons/leaderboard.js`, com `leaderboard-url="https://scores.example.org/api"`) envia a um serviço de ranking e o que ele espera receber de volta. Qualquer servidor que siga esta página funciona. Os exemplos usam `https://scores.example.org/api`.

## 1. Visão geral

- **Dois pedidos:** `POST {url}/scores` envia uma pontuação e devolve o Top 10; `GET {url}/scores?limit=10` só devolve o Top 10.
- **`{url}`** é o valor de `leaderboard-url`, sem a barra final. Pode ser relativo (mesmo site).
- **Nomes únicos com uma chave no navegador.** Na primeira vez que um nome é salvo, o serviço cria uma chave aleatória e a devolve (`201`). O jogo guarda a chave no navegador (separada para cada endereço de serviço) e a envia nos próximos salvamentos desse nome. Sem a chave certa, o nome responde `409`.
- **Dados enviados:** só `name`, `score` e `key`. Sem cookies, sem referrer, sem e-mail.
- **Sem `leaderboard-url`, nada sai do navegador** (o ranking é local).

## 2. Todos os pedidos

- O jogo envia `credentials: 'omit'`, `referrerPolicy: 'no-referrer'` e `Accept: application/json`. O POST também envia `Content-Type: application/json`. O navegador acrescenta só o cabeçalho `Origin`.
- **Tempo limite:** 5 segundos por pedido, sem nova tentativa automática. A pessoa pode apertar "Tentar de novo".
- **As respostas** são `Content-Type: application/json; charset=utf-8`.
- **CORS.** O preflight `OPTIONS {url}/scores` responde `204` com `Access-Control-Allow-Origin: <origem ou *>`, `Access-Control-Allow-Methods: GET, POST, OPTIONS`, `Access-Control-Allow-Headers: Content-Type` e `Access-Control-Max-Age: 600`. **Toda resposta, inclusive 409, 422 e 429, precisa de `Access-Control-Allow-Origin`.** Sem ele, o navegador esconde a resposta e o jogo só consegue dizer "Serviço fora do ar".
- **Limites:** corpo de até 1 KB. `name` é texto. `score` é um inteiro de 1 a 1.000.000. `key` tem de 16 a 128 caracteres de `[A-Za-z0-9_-]` (o jogo ignora uma chave em outro formato).

## 3. POST {url}/scores

Corpo: `{ "name": string, "score": integer, "key"?: string }`.

O serviço confere, nesta ordem:

1. O corpo é um JSON válido e está dentro dos limites. Se não: `400`.
2. `score` é um inteiro de 1 a 1.000.000. Se não: `400`.
3. `name`, com as mesmas regras que o jogo usa (as regras de username do README): a primeira regra que falha decide. Links, e-mails ou 6 ou mais números: `422 {"error":"personal_data"}`. Caracteres, tamanho, começo, ou nenhuma letra (`1_2`, `1.2.3`): `422 {"error":"format"}`.
4. A política do serviço (nomes ofensivos ou reservados): `422 {"error":"rejected"}`.
5. Procura o nome pela chave de comparação (minúsculas, sem acentos, sem `_`, `-` ou `.`: "Carol", "cárol" e "ca_rol" são o mesmo nome):
   - **nome novo:** cria o registro, gera uma chave aleatória de pelo menos 128 bits (base64url), guarda **só o hash** dela e responde `201 {"key","top"}`;
   - **o nome existe e a chave confere** (compare em tempo constante): guarda a maior entre a pontuação antiga e a nova, atualiza a grafia e responde `200 {"top"}`. Uma pontuação menor não muda nada: vale a do serviço;
   - **o nome existe e a chave falta ou não confere:** `409 {"error":"taken"}`.
6. Muitas tentativas: `429 {"error":"rate_limited"}`. O `Retry-After` é opcional.
7. Falha interna: `5xx`.

**`top`** tem até 10 entradas `{ "name", "score" }`, da maior para a menor pontuação. No empate, quem chegou primeiro fica em cima (use um número de sequência, não uma data).

**O que o serviço guarda:** a grafia, a chave de comparação, a melhor pontuação, o hash da chave e o número de sequência. Nenhum endereço IP além da janela usada para limitar tentativas.

## 4. GET {url}/scores?limit=10

- Responde `200 {"top":[…]}`. O `limit` vai de 1 a 10 (padrão 10; outros valores são ajustados a esse intervalo).
- Responde com `Cache-Control: no-store`.
- O jogo só usa este pedido quando uma resposta `200` ou `201` ao POST vem sem `top`.

## 5. Como o jogo lê cada resposta

| Resposta | Mensagem (atributo de texto) | O que a pessoa vê |
|---|---|---|
| `201 {key, top}` | nenhuma | O Top 10. O jogo guarda a `key` desse nome e desse serviço. |
| `200 {top}` (uma `key` válida, se vier, também é guardada) | nenhuma | O Top 10. |
| `409` | `text-leaderboard-error-taken` | O formulário, com o campo marcado como inválido. |
| `422 {"error":"format"}` | `text-leaderboard-error-chars` | O formulário, com o campo marcado como inválido. |
| `422 {"error":"personal_data"}` | `text-leaderboard-error-personal-data` | O formulário, com o campo marcado como inválido. |
| `422 {"error":"rejected"}`, ou `422` com outro motivo ou sem motivo | `text-leaderboard-error-rejected` | O formulário, com o campo marcado como inválido. |
| `429` | `text-leaderboard-error-rate-limited` | O formulário e "Tentar de novo". |
| Qualquer outra coisa: `400`, `401`, `403`, `404`, `413`, `5xx`, um corpo que não é JSON, um `top` que não é lista, falha de rede ou nenhuma resposta em 5 segundos | `text-leaderboard-error-offline` | O formulário e "Tentar de novo". O jogo também escreve um aviso no console com o que recebeu. |

O aviso no console é parecido com `snake-game leaderboard: unexpected response 403`, ou `network error`, ou `timeout` quando não há código de status.

O jogo mostra uma única mensagem para o `422` `format` ("Use só letras, números, _, - e ."), porque o motivo exato (tamanho ou começo) já é conferido no navegador antes do envio.

Se a chave se perder (dados do navegador apagados, outro aparelho), o nome responde `409`. Por enquanto isso só fica documentado; um jeito de recuperar o nome está nos próximos passos.

## 6. Exemplos

```http
POST /api/scores            (primeira vez)
{"name":"Carol","score":42}
→ 201 {"key":"k7Qf2m9Xr4TzP1bW8sLc0A","top":[{"name":"Carol","score":42},{"name":"Ana","score":12}]}

POST /api/scores            (mesmo navegador, pontuação maior, outra grafia)
{"name":"cárol","score":50,"key":"k7Qf2m9Xr4TzP1bW8sLc0A"}
→ 200 {"top":[{"name":"cárol","score":50},{"name":"Ana","score":12}]}

POST /api/scores            (pontuação menor: vale a do serviço)
{"name":"Carol","score":10,"key":"k7Qf2m9Xr4TzP1bW8sLc0A"}
→ 200 {"top":[{"name":"Carol","score":50},{"name":"Ana","score":12}]}

POST /api/scores            (outro navegador, nome que é de outra pessoa)
{"name":"ana","score":20}
→ 409 {"error":"taken"}

POST /api/scores  {"name":"ab","score":5}         → 422 {"error":"format"}
POST /api/scores  {"name":"ana.com","score":5}    → 422 {"error":"personal_data"}
POST /api/scores  {"name":"Xxxxx","score":5}      → 422 {"error":"rejected"}
POST /api/scores  {"name":"Zed","score":5}        → 422 {"error":"other"}   (aparece "Escolha outro nome.")
POST /api/scores  (muitas seguidas)               → 429 Retry-After: 30 {"error":"rate_limited"}
POST /api/scores  (falha interna)                 → 503 {"error":"unavailable"}   (aparece "Serviço fora do ar")
POST /api/scores  {"name":"Carol","score":1.5}    → 400 {"error":"bad_request"}   (aparece "Serviço fora do ar")

GET /api/scores?limit=10
→ 200 {"top":[{"name":"Carol","score":50},{"name":"Ana","score":12}]}

OPTIONS /api/scores
→ 204  Access-Control-Allow-Origin: *  Access-Control-Allow-Methods: GET, POST, OPTIONS
       Access-Control-Allow-Headers: Content-Type  Access-Control-Max-Age: 600
```

## 7. Testando sem servidor

`demo/fake-service.js` é um serviço de mentira que vive dentro da página de demonstração (endereço `https://fake-leaderboard.invalid/api`, um nome que nunca chega à rede). Os estados dele cobrem as linhas da tabela acima: funciona, nome em uso, nome recusado, 422 com motivo desconhecido, muitas tentativas, resposta inesperada (403), 200 com JSON quebrado, fora do ar e lento. Ele guarda a chave em texto puro só por ser uma demo; o servidor real guarda só o hash.
