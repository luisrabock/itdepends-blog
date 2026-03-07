---
title: "gerenciando configurações com spring cloud config"
date: "2025-10-14"
description: "como centralizar e versionar as configurações de múltiplos ambientes e clientes usando spring cloud config — e como integrar com quarkus."
tags: ["java", "spring", "cloud", "arquitetura"]
---

Conforme uma aplicação cresce, gerenciar configurações vira um problema real. Cada ambiente tem suas variáveis, cada cliente tem suas particularidades, e manter tudo sincronizado sem errar e sem expor segredos é desafiador. O **Spring Cloud Config** resolve isso de forma elegante.

## o que é

O Spring Cloud Config é um servidor centralizado de configurações. Em vez de cada serviço carregar seu próprio `application.yml` empacotado no artefato, eles buscam as configurações em um servidor externo — que por sua vez lê de um repositório Git, sistema de arquivos ou outros backends.

```
[ Config Server ] ←── Git repo (application.yml, app-dev.yml, app-prd.yml...)
       ↑
  [ Serviço A ]   [ Serviço B ]   [ Serviço C ]
```

A vantagem imediata: **você muda uma configuração no Git e os serviços recarregam sem novo deploy**.

---

## estrutura de arquivos no repositório

O Config Server segue uma convenção de nomenclatura para resolver qual arquivo servir:

```
{application}.yml
{application}-{profile}.yml
{application}-{profile}-{label}.yml
```

- **application**: nome do serviço (`connect`, `gateway`, `auth-service`...)
- **profile**: ambiente ou contexto (`dev`, `hml`, `prd`)
- **label**: branch ou tag Git (`main`, `v2.1.0`)

Um repositório típico ficaria assim:

```
config-repo/
├── application.yml              # configs globais (compartilhadas por todos)
├── connect.yml                  # configs do serviço "connect" (todos os ambientes)
├── connect-dev.yml              # connect em dev
├── connect-hml.yml              # connect em hml
├── connect-prd.yml              # connect em prd (base)
├── connect-prd-customer1.yml    # connect em prd para o cliente 1
└── connect-prd-customer2.yml    # connect em prd para o cliente 2
```

O Config Server **mescla** os arquivos em camadas. Se um serviço sobe com `profile=prd-customer1`, ele recebe:

1. `application.yml` (base global)
2. `connect.yml` (base do serviço)
3. `connect-prd.yml` (base do ambiente prd)
4. `connect-prd-customer1.yml` (override do cliente)

Propriedades definidas nas camadas mais específicas sobrescrevem as anteriores. Isso permite que `connect-prd.yml` defina as configurações padrão de produção, e `connect-prd-customer1.yml` apenas sobrescreva o que for diferente para aquele cliente.

---

## configurando o servidor

Dependência no `pom.xml`:

```xml
<dependency>
  <groupId>org.springframework.cloud</groupId>
  <artifactId>spring-cloud-config-server</artifactId>
</dependency>
```

Anotação na classe principal:

```java
@SpringBootApplication
@EnableConfigServer
public class ConfigServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(ConfigServerApplication.class, args);
    }
}
```

`application.yml` do servidor:

```yaml
server:
  port: 8888

spring:
  cloud:
    config:
      server:
        git:
          uri: https://github.com/sua-org/config-repo
          default-label: main
          search-paths: '{application}'   # opcional: subpastas por serviço
```

---

## configurando o cliente (Spring Boot)

No `pom.xml` do serviço:

```xml
<dependency>
  <groupId>org.springframework.cloud</groupId>
  <artifactId>spring-cloud-starter-config</artifactId>
</dependency>
```

No `application.yml` do serviço (ou via variável de ambiente):

```yaml
spring:
  application:
    name: connect
  config:
    import: "configserver:http://config-server:8888"
  profiles:
    active: ${PROFILE:dev}
```

Na inicialização, o serviço faz uma requisição HTTP ao Config Server passando seu nome e profile, e recebe as configurações mescladas.

---

## múltiplos ambientes e clientes na prática

O ponto mais poderoso é a combinação de profiles para representar **ambiente + cliente**.

Imagine que você tem dois clientes em produção, cada um com seu banco de dados, suas integrações e limites de rate:

**`connect-prd.yml`** — base de produção:
```yaml
datasource:
  pool-size: 20
rate-limit:
  requests-per-minute: 1000
feature:
  new-checkout: false
```

**`connect-prd-customer1.yml`** — cliente enterprise:
```yaml
datasource:
  url: jdbc:postgresql://db-customer1.internal:5432/connect
  username: ${DB_USER_C1}
  password: ${DB_PASS_C1}
rate-limit:
  requests-per-minute: 5000
feature:
  new-checkout: true
```

**`connect-prd-customer2.yml`** — cliente standard:
```yaml
datasource:
  url: jdbc:postgresql://db-customer2.internal:5432/connect
  username: ${DB_USER_C2}
  password: ${DB_PASS_C2}
```

O serviço do `customer2` herda `rate-limit` e `feature` do base de prd, e só sobrescreve o que é específico dele. Nenhuma duplicação desnecessária.

---

## refresh em tempo real

Para recarregar configurações sem reiniciar, adicione o Actuator e exponha o endpoint:

```yaml
management:
  endpoints:
    web:
      exposure:
        include: refresh
```

Anote os beans que precisam recarregar com `@RefreshScope`:

```java
@RefreshScope
@RestController
public class FeatureController {

    @Value("${feature.new-checkout}")
    private boolean newCheckout;

    // ...
}
```

Depois de um push no repositório de configurações, basta chamar:

```bash
POST http://meu-servico/actuator/refresh
```

Para propagar isso automaticamente para todos os serviços, você pode usar **Spring Cloud Bus** com RabbitMQ ou Kafka — um evento de refresh é publicado no broker e todos os serviços inscritos recarregam ao mesmo tempo.

---

## compatibilidade com quarkus

O Quarkus não usa o Spring Cloud Config nativamente, mas suporta a integração via extensão oficial:

```xml
<dependency>
  <groupId>io.quarkus</groupId>
  <artifactId>quarkus-spring-cloud-config-client</artifactId>
</dependency>
```

No `application.properties` do serviço Quarkus:

```properties
quarkus.spring-cloud-config.url=http://config-server:8888
quarkus.spring-cloud-config.name=meu-servico
quarkus.spring-cloud-config.profile=prd-customer1
quarkus.spring-cloud-config.enabled=true

# opcional: falha se o config server não estiver disponível
quarkus.spring-cloud-config.fail-fast=true
```

As configurações recebidas do Config Server são tratadas como qualquer outra config do Quarkus — injetadas via `@ConfigProperty` normalmente:

```java
@ApplicationScoped
public class FeatureService {

    @ConfigProperty(name = "feature.new-checkout", defaultValue = "false")
    boolean newCheckout;

    // ...
}
```

> **Atenção**: o Quarkus não suporta `@RefreshScope`. Em nativo (GraalVM), as configurações são resolvidas em build time. Para reload dinâmico no Quarkus, a alternativa é usar o **Consul** ou o **Vault** da HashiCorp com a extensão adequada.

---

## quando usar

| Cenário | Vale a pena? |
|---|---|
| Monolito em um único ambiente | Provavelmente não |
| Vários microserviços, múltiplos ambientes | Sim |
| Multi-tenant (prd por cliente) | Sim — esse é o caso ideal |
| Segredos sensíveis | Combine com Vault ou criptografia do próprio Config Server |

---

## resumo

O Spring Cloud Config resolve um problema que escala mal quando ignorado: configurações espalhadas, duplicadas e difíceis de auditar. Com um repositório Git como fonte da verdade, você ganha histórico, revisão por PR, rollback e a capacidade de modelar qualquer combinação de ambiente e cliente com herança de profiles.

Para times que já usam Quarkus, a integração via `quarkus-spring-cloud-config-client` permite aproveitar o mesmo servidor sem abandonar o ecossistema.
