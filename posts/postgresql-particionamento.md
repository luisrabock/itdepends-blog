---
title: "como o particionamento do PostgreSQL salvou uma tabela com bilhões de registros"
date: "2026-01-23"
description: "uma tabela central, bilhões de linhas, dezenas de relacionamentos e processos travando em cascata — e como o particionamento por uma chave já usada em toda a aplicação mudou o jogo."
tags: ["postgresql", "banco-de-dados", "performance", "particionamento"]
---

Toda aplicação tem aquela tabela. A que cresceu junto com o negócio, recebeu coluna por coluna ao longo dos anos, se tornou referência de metade do modelo de dados e, um dia, começou a fazer tudo ficar lento.

Trabalhei em um sistema que tinha exatamente essa tabela. E o processo de resolver esse problema com particionamento no PostgreSQL foi um dos trabalhos de banco de dados mais impactantes que já realizei.

---

## o cenário

A tabela era central para a operação. Vou chamá-la de `device_records` — registros gerados continuamente por dispositivos de múltiplas empresas. Com o tempo, acumulou **bilhões de linhas**, dezenas de colunas, e estava relacionada a praticamente todas as tabelas relevantes do sistema.

Uma visão simplificada do que ela guardava:

```sql
CREATE TABLE device_records (
    id            BIGSERIAL PRIMARY KEY,
    company_id    BIGINT NOT NULL,
    device_id     BIGINT NOT NULL,
    record_type   VARCHAR(50) NOT NULL,
    status        VARCHAR(30) NOT NULL,
    payload       JSONB,
    processed_at  TIMESTAMP,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    -- ... mais ~30 colunas de dados operacionais
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (device_id)  REFERENCES devices(id)
);
```

Todo processo da aplicação passava por ela: relatórios, jobs de processamento assíncrono, dashboards em tempo real, integrações com parceiros, rotinas de limpeza. Praticamente toda query tinha um `WHERE company_id = ?` — afinal, era um sistema multi-tenant.

---

## os sintomas

A degradação foi gradual, como sempre é. Não tem um dia em que tudo para de funcionar. Tem um dia em que o time percebe que o que antes era rápido agora está lento, e o que antes era lento agora trava.

Os primeiros sinais:

- Relatórios que levavam 3 segundos começaram a levar 30
- Jobs noturnos que terminavam em 2 horas passaram a não terminar antes do próximo ciclo
- Queries de dashboard começaram a competir por lock com jobs de processamento
- O `autovacuum` mal conseguia acompanhar o volume de escritas

O monitoramento mostrava queries que antes custavam poucos milissegundos com planos de execução completamente diferentes. O PostgreSQL havia abandonado os índices e estava fazendo **sequential scan** na tabela inteira.

---

## o diagnóstico

O primeiro passo foi entender o que estava acontecendo nos planos de execução. Com `EXPLAIN (ANALYZE, BUFFERS)`:

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, device_id, status, created_at
FROM device_records
WHERE company_id = 42
  AND status = 'PENDING'
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 100;
```

O resultado era algo assim:

```
Limit  (cost=0.00..98432.11 rows=100 width=48)
       (actual time=45231.442..45231.501 rows=100 loops=1)
  ->  Seq Scan on device_records
        (cost=0.00..2847392.00 rows=289321 width=48)
        (actual time=0.021..45218.332 rows=100 loops=1)
        Filter: (company_id = 42 AND status = 'PENDING' AND ...)
        Rows Removed by Filter: 2847291342
  Buffers: shared hit=12483 read=1847291
Planning Time: 2.3 ms
Execution Time: 45231.8 ms
```

45 segundos. Removendo **2,8 bilhões** de linhas pelo filtro. O índice composto em `(company_id, status, created_at)` existia — mas com uma tabela desse tamanho e volume de writes, o PostgreSQL havia decidido que o custo de usá-lo era maior do que fazer o scan completo.

O problema não era falta de índice. Era o tamanho absoluto da tabela.

---

## por que particionamento

Particionamento resolve exatamente esse problema: em vez de uma tabela com 3 bilhões de linhas, você tem N tabelas menores (as partições), e o PostgreSQL sabe em qual delas cada registro está.

Quando uma query tem `WHERE company_id = 42`, o banco executa em apenas a partição daquela empresa — **ignorando completamente as partições das demais**. Esse mecanismo se chama **partition pruning**.

A escolha da chave de particionamento é a decisão mais crítica. No nosso caso, era óbvia: `company_id`. Por duas razões:

1. **Toda query da aplicação tinha `WHERE company_id = ?`** — o filtro já estava lá, o particionamento só tornaria ele ainda mais eficiente
2. **Os dados de cada empresa são isolados** — nenhum processo precisava cruzar dados entre empresas na mesma query

---

## implementando o particionamento

O PostgreSQL suporta três tipos de particionamento:

- `RANGE` — por faixas de valor (ideal para datas)
- `LIST` — por valores específicos (ideal para IDs discretos como `company_id`)
- `HASH` — distribuição uniforme por hash (quando não há chave de negócio clara)

Para `company_id`, usamos `LIST`.

**1. Criando a tabela particionada:**

```sql
CREATE TABLE device_records_partitioned (
    id            BIGSERIAL,
    company_id    BIGINT NOT NULL,
    device_id     BIGINT NOT NULL,
    record_type   VARCHAR(50) NOT NULL,
    status        VARCHAR(30) NOT NULL,
    payload       JSONB,
    processed_at  TIMESTAMP,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
    -- demais colunas
) PARTITION BY LIST (company_id);
```

**2. Criando as partições por empresa:**

```sql
CREATE TABLE device_records_company_1
    PARTITION OF device_records_partitioned
    FOR VALUES IN (1);

CREATE TABLE device_records_company_2
    PARTITION OF device_records_partitioned
    FOR VALUES IN (2);

CREATE TABLE device_records_company_42
    PARTITION OF device_records_partitioned
    FOR VALUES IN (42);

-- partição padrão para empresas novas ou valores não mapeados
CREATE TABLE device_records_default
    PARTITION OF device_records_partitioned
    DEFAULT;
```

**3. Criando os índices nas partições:**

No PostgreSQL, os índices são criados nas partições, não na tabela pai. Mas você pode criá-los na tabela pai e eles se propagam automaticamente:

```sql
CREATE INDEX idx_dr_company_status_created
    ON device_records_partitioned (company_id, status, created_at DESC);

CREATE INDEX idx_dr_device_created
    ON device_records_partitioned (device_id, created_at DESC);
```

---

## a migração dos dados

Migrar bilhões de linhas sem downtime exige cuidado. A estratégia que seguimos:

**1. Migração em lotes, com a aplicação rodando:**

```sql
-- Migrar em batches de 100k por vez, priorizando dados recentes
INSERT INTO device_records_partitioned
SELECT * FROM device_records
WHERE id BETWEEN :start AND :end
  AND NOT EXISTS (
    SELECT 1 FROM device_records_partitioned p WHERE p.id = device_records.id
  );
```

Rodamos esse processo fora do horário de pico, em lotes, por vários dias.

**2. Cutover final com janela mínima:**

Quando os dados históricos já estavam migrados, fizemos um lock rápido na tabela original para migrar apenas o delta gerado durante o processo:

```sql
BEGIN;
LOCK TABLE device_records IN EXCLUSIVE MODE;

-- migra o delta final
INSERT INTO device_records_partitioned
SELECT * FROM device_records dr
WHERE NOT EXISTS (
    SELECT 1 FROM device_records_partitioned p WHERE p.id = dr.id
);

-- rename atômico
ALTER TABLE device_records RENAME TO device_records_old;
ALTER TABLE device_records_partitioned RENAME TO device_records;

COMMIT;
```

O lock durou segundos — apenas o tempo de migrar o delta final.

---

## os resultados

A mesma query que levava 45 segundos:

```
Limit  (cost=0.00..142.31 rows=100 width=48)
       (actual time=1.823..1.891 rows=100 loops=1)
  ->  Index Scan using idx_dr_company_status_created
        on device_records_company_42
        (cost=0.56..142.31 rows=100 width=48)
        (actual time=1.821..1.883 rows=100 loops=1)
        Index Cond: (company_id = 42 AND status = 'PENDING' AND ...)
  Buffers: shared hit=8 read=3
Planning Time: 1.1 ms
Execution Time: 1.9 ms
```

**De 45 segundos para menos de 2 milissegundos.**

O PostgreSQL agora vai direto para a partição `device_records_company_42`, que tinha uma fração dos dados originais. O índice passou a ser eficiente porque a partição era gerenciável.

Os efeitos em cascata foram imediatos:

- Jobs noturnos voltaram a terminar nos seus ciclos
- Relatórios voltaram para o tempo de resposta original
- O `autovacuum` passou a funcionar adequadamente — partições menores são processadas mais rápido
- Locks de concorrência reduziram drasticamente, pois operações de empresas diferentes pararam de competir pelo mesmo espaço físico
- Índices menores por partição cabem melhor em memória (`shared_buffers`), aumentando o hit rate do cache

---

## outros ganhos com particionamento

**Manutenção por empresa**

Precisa arquivar ou deletar todos os dados de uma empresa? Em vez de um `DELETE` que percorre bilhões de linhas:

```sql
-- Drop instantâneo da partição — sem custo de I/O
DROP TABLE device_records_company_99;

-- Ou detach sem deletar (para arquivamento)
ALTER TABLE device_records
    DETACH PARTITION device_records_company_99;
```

**Particionamento combinado**

Para empresas com volume muito alto, é possível subparticionar por data dentro da partição da empresa:

```sql
CREATE TABLE device_records_company_1
    PARTITION OF device_records_partitioned
    FOR VALUES IN (1)
    PARTITION BY RANGE (created_at);

CREATE TABLE device_records_company_1_2024
    PARTITION OF device_records_company_1
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

**Aplicação das lifecycle policies**

Lembra do post sobre políticas de ciclo de vida? Com particionamento por data, deletar registros antigos passa a ser um `DROP TABLE` — instantâneo, sem bloqueio, sem custo de vacuum posterior.

---

## o que saber antes de partir para o particionamento

Particionamento não é a primeira resposta para qualquer problema de performance. Antes, vale verificar:

- Os índices corretos estão criados e sendo usados?
- A query está bem escrita? (sem funções em colunas indexadas, sem `SELECT *` desnecessário)
- O `autovacuum` está saudável? Tabelas com muito dead tuple degradam o planejador
- O hardware e as configurações do PostgreSQL (`work_mem`, `shared_buffers`, `effective_cache_size`) estão adequados?

Particionamento é para quando a tabela simplesmente é grande demais para índices e vacuum funcionarem bem — e isso geralmente começa a acontecer na faixa de centenas de milhões a bilhões de registros, dependendo do hardware.

---

## resumo

Particionamento no PostgreSQL não é um recurso obscuro ou de nicho. É uma ferramenta de maturidade para tabelas que cresceram além do que índices conseguem resolver sozinhos.

A chave do sucesso aqui foi que a chave de particionamento (`company_id`) já estava presente em todas as queries da aplicação. O banco só precisava saber que podia usá-la para eliminar 99% dos dados antes de nem começar a busca.

Quando a tabela é o gargalo, não dá para tunar só a query. É preciso repensar como os dados estão organizados.
