---
title: "JPA é ótimo — até ser um problema"
date: "2025-12-17"
description: "como o uso excessivo de JPA, entidades mal mapeadas e tabelas mal estruturadas podem destruir a performance da sua aplicação — e quando o JDBC é a resposta certa."
tags: ["java", "jpa", "jdbc", "banco-de-dados", "performance"]
---

JPA é uma das abstrações mais poderosas do ecossistema Java. Ela elimina boilerplate, mapeia objetos para tabelas de forma declarativa e deixa o desenvolvedor focado na lógica de negócio. Em projetos que estão crescendo, ela acelera muito o desenvolvimento.

E também é uma das principais fontes de problema de performance em aplicações grandes.

Não são excludentes. As duas afirmações são verdadeiras ao mesmo tempo.

---

## o que a JPA faz por você

Antes de falar dos problemas, vale reconhecer o valor.

Sem JPA, cada operação de banco envolve SQL manual, mapeamento de `ResultSet` para objetos, controle de conexões e tratamento de exceções. JPA abstrai tudo isso. Você define a entidade uma vez e o framework cuida do resto:

```java
@Entity
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    private Customer customer;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL)
    private List<OrderItem> items;

    private BigDecimal total;
    private LocalDateTime createdAt;
}
```

Operações que antes exigiam várias linhas de código ficam em uma:

```java
orderRepository.findById(id);
orderRepository.save(order);
orderRepository.findByCustomerAndCreatedAtAfter(customer, date);
```

Em projetos novos ou em times que precisam de velocidade de entrega, essa produtividade é real e tem valor.

---

## onde começa o problema

O problema começa quando o desenvolvedor para de pensar em SQL e passa a pensar apenas em objetos.

JPA não elimina o banco de dados — ela apenas esconde ele. E tudo que está escondido continua existindo e tendo custo. A diferença é que agora o custo não é mais visível.

### o problema do N+1

É o clássico. Você busca uma lista de pedidos e itera sobre eles para acessar os clientes:

```java
List<Order> orders = orderRepository.findAll(); // 1 query
for (Order order : orders) {
    System.out.println(order.getCustomer().getName()); // N queries
}
```

Com 500 pedidos, você acabou de executar 501 queries. Com `FetchType.LAZY` (o padrão correto), cada acesso a um relacionamento não inicializado dispara uma nova ida ao banco.

O Hibernate até avisa sobre isso com logs — mas em produção, com logging de SQL desativado, o problema fica completamente invisível até a aplicação começar a travar.

### carregamento desnecessário de dados

Entidades mapeadas com todos os campos da tabela carregam tudo, sempre. Se você tem uma tabela `Product` com 40 colunas — incluindo descrição longa, HTML de apresentação, campos de auditoria e dados históricos — toda query que usa essa entidade carrega as 40 colunas, mesmo que você precise apenas do `id` e do `name`.

```java
// Você quer isso:
SELECT id, name FROM product WHERE category_id = ?

// JPA entrega isso:
SELECT id, name, description, html_content, audit_user, audit_date,
       historical_price, sku, weight, dimensions, ... FROM product WHERE category_id = ?
```

Em tabelas com colunas `TEXT` ou `BLOB`, o impacto é significativo.

### o produto cartesiano silencioso

Quando você mapeia múltiplos `@OneToMany` e usa `JOIN FETCH` para evitar o N+1, o Hibernate pode gerar um produto cartesiano:

```java
// Aparentemente inofensivo
@Query("SELECT o FROM Order o JOIN FETCH o.items JOIN FETCH o.payments")
List<Order> findAllWithDetails();
```

Se um pedido tem 10 itens e 3 pagamentos, essa query retorna 30 linhas para representar 1 pedido. Com mil pedidos, a situação escala rapidamente. O Hibernate faz o deduplicação em memória — mas o banco já processou e transferiu todas as linhas.

### relacionamentos em cascata sem critério

`cascade = CascadeType.ALL` em um relacionamento parece conveniente. Na prática, pode significar que salvar uma entidade pai dispara updates desnecessários em dezenas de entidades filhas, mesmo quando nenhuma foi modificada. Em um monolito com muitos relacionamentos, o rastro de SQL gerado por uma única operação pode ser surpreendente.

---

## o problema que vem da estrutura do banco

JPA não resolve — e pode mascarar — problemas que estão na estrutura do banco de dados.

**Índices ausentes**

JPA gera queries com `WHERE`, `JOIN` e `ORDER BY`. Se as colunas envolvidas não têm índices, o banco faz full table scan. Em tabelas com milhões de registros, a diferença entre uma query indexada e não indexada pode ser de milissegundos vs minutos.

A JPA não cria índices automaticamente (ao menos não os corretos). Você precisa conhecer o padrão de acesso e criar os índices certos.

```java
// Essa query é executada centenas de vezes por minuto
orderRepository.findByStatusAndCreatedAtAfter(status, date);

// O banco precisa de:
CREATE INDEX idx_order_status_created ON orders(status, created_at);
```

**Tabelas sem critério de design**

Uma tabela com 80 colunas onde metade são `nullable`, com nomes genéricos como `field1`, `value_aux`, `flag3`, geralmente indica que o modelo de dados cresceu sem intenção. JPA vai mapear tudo isso fielmente — e as consequências aparecem em performance, clareza e manutenibilidade.

**Ausência de particionamento**

Tabelas de alto volume (logs, eventos, registros históricos) sem particionamento fazem as queries degradar com o tempo. JPA não sabe disso e não avisa. A query que funcionava bem com 1 milhão de registros começa a travar quando chega em 500 milhões.

---

## o que o JDBC ainda faz melhor

JDBC é frequentemente tratado como "o jeito antigo". Não é. É a camada de acesso a banco mais direta do Java, e em situações específicas, ela é a resposta certa.

Com JDBC (ou `JdbcTemplate` do Spring), você escreve exatamente o SQL que precisa:

```java
// Relatório complexo com agregações, CTEs e window functions
String sql = """
    WITH monthly_totals AS (
        SELECT customer_id,
               DATE_TRUNC('month', created_at) AS month,
               SUM(total) AS monthly_total,
               COUNT(*) AS order_count
        FROM orders
        WHERE created_at >= :startDate
        GROUP BY customer_id, DATE_TRUNC('month', created_at)
    )
    SELECT c.name,
           mt.month,
           mt.monthly_total,
           mt.order_count,
           RANK() OVER (PARTITION BY mt.month ORDER BY mt.monthly_total DESC) AS rank
    FROM monthly_totals mt
    JOIN customers c ON c.id = mt.customer_id
    ORDER BY mt.month, rank
    """;

return jdbcTemplate.query(sql, params, rowMapper);
```

JPA não consegue expressar isso de forma limpa. Você pode usar `@Query` com native query, mas aí está escrevendo SQL de qualquer forma — só que com a overhead do Hibernate por cima.

**Projeções específicas**

Quando você precisa de apenas alguns campos, JDBC entrega exatamente o que você pede:

```java
// Busca leve para listagem
String sql = "SELECT id, name, status, created_at FROM orders WHERE customer_id = ?";
return jdbcTemplate.query(sql, (rs, row) -> new OrderSummary(
    rs.getLong("id"),
    rs.getString("name"),
    rs.getString("status"),
    rs.getTimestamp("created_at").toLocalDateTime()
), customerId);
```

Nenhuma entidade carregada, nenhum campo desnecessário, nenhum relacionamento resolvido.

---

## a estratégia que funciona em sistemas grandes

Em monolitos grandes, a abordagem mais saudável não é escolher entre JPA e JDBC — é usar cada um onde faz sentido.

**Use JPA para:**
- Operações de escrita (insert, update, delete) onde o mapeamento de entidade tem valor
- Queries simples de busca por ID ou campos diretos
- Onde o modelo de domínio é estável e bem definido

**Use JDBC / queries nativas para:**
- Relatórios e consultas analíticas
- Listagens com projeções específicas
- Qualquer query que envolva agregações, CTEs, window functions
- Situações onde o N+1 é inevitável com JPA
- Operações em lote (bulk updates, bulk deletes)

```java
// Repository com as duas abordagens no mesmo lugar
@Repository
public class OrderRepository {

    private final JpaRepository<Order, Long> jpaRepo;
    private final JdbcTemplate jdbc;

    // JPA para operações de domínio
    public Order save(Order order) {
        return jpaRepo.save(order);
    }

    public Optional<Order> findById(Long id) {
        return jpaRepo.findById(id);
    }

    // JDBC para consultas analíticas
    public List<OrderSummary> findSummariesByCustomer(Long customerId) {
        return jdbc.query(
            "SELECT id, total, status, created_at FROM orders WHERE customer_id = ?",
            (rs, row) -> mapToSummary(rs),
            customerId
        );
    }
}
```

---

## o que observar antes de resolver com JPA

Antes de jogar uma query no `findBy` do Spring Data e seguir em frente, vale perguntar:

1. **Qual SQL isso gera?** — habilite `spring.jpa.show-sql=true` em desenvolvimento e leia as queries
2. **Quantas queries são executadas para esse caso de uso?** — use um APM ou o próprio log do Hibernate
3. **A tabela tem os índices certos para esse padrão de acesso?** — verifique com `EXPLAIN`
4. **Preciso de todos os campos da entidade?** — se não, use projeções ou JDBC
5. **Esse dado é lido com frequência?** — se sim, considere cache antes de otimizar a query

---

## resumo

JPA é uma ferramenta poderosa que deve ser usada com consciência do que ela gera embaixo. Em projetos pequenos e médios, a produtividade que ela oferece supera os riscos. Em sistemas grandes, com tabelas de alto volume e consultas complexas, ignorar o SQL gerado é acumular dívida técnica de performance.

JDBC não é primitivo. É direto. E direto, em banco de dados, é frequentemente mais rápido, mais legível e mais previsível.

A escolha não precisa ser binária. Um sistema maduro usa as duas ferramentas no lugar certo.
