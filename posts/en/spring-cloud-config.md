---
title: "managing configuration with spring cloud config"
date: "2025-10-14"
description: "how to centralize and version configurations across multiple environments and customers using spring cloud config — and how to integrate with quarkus."
tags: ["java", "spring", "cloud", "architecture"]
---

As an application grows, managing configuration becomes a real problem. Each environment has its own variables, each customer has its own specifics, and keeping everything in sync without mistakes or exposed secrets is challenging. **Spring Cloud Config** solves this elegantly.

## what it is

Spring Cloud Config is a centralized configuration server. Instead of each service loading its own `application.yml` bundled in the artifact, they fetch configurations from an external server — which in turn reads from a Git repository, filesystem, or other backends.

```
[ Config Server ] ←── Git repo (application.yml, app-dev.yml, app-prd.yml...)
       ↑
  [ Service A ]   [ Service B ]   [ Service C ]
```

The immediate advantage: **you change a configuration in Git and services reload without a new deploy**.

---

## repository file structure

The Config Server follows a naming convention to resolve which file to serve:

```
{application}.yml
{application}-{profile}.yml
{application}-{profile}-{label}.yml
```

- **application**: service name (`connect`, `gateway`, `auth-service`...)
- **profile**: environment or context (`dev`, `hml`, `prd`)
- **label**: Git branch or tag (`main`, `v2.1.0`)

A typical repository looks like this:

```
config-repo/
├── application.yml              # global configs (shared by all)
├── connect.yml                  # "connect" service configs (all envs)
├── connect-dev.yml              # connect in dev
├── connect-hml.yml              # connect in staging
├── connect-prd.yml              # connect in prd (base)
├── connect-prd-customer1.yml    # connect in prd for customer 1
└── connect-prd-customer2.yml    # connect in prd for customer 2
```

The Config Server **merges** files in layers. If a service starts with `profile=prd-customer1`, it receives:

1. `application.yml` (global base)
2. `connect.yml` (service base)
3. `connect-prd.yml` (prd environment base)
4. `connect-prd-customer1.yml` (customer override)

Properties defined in more specific layers override the previous ones. This allows `connect-prd.yml` to define production defaults, and `connect-prd-customer1.yml` to only override what differs for that customer.

---

## setting up the server

Dependency in `pom.xml`:

```xml
<dependency>
  <groupId>org.springframework.cloud</groupId>
  <artifactId>spring-cloud-config-server</artifactId>
</dependency>
```

Annotation on the main class:

```java
@SpringBootApplication
@EnableConfigServer
public class ConfigServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(ConfigServerApplication.class, args);
    }
}
```

Server `application.yml`:

```yaml
server:
  port: 8888

spring:
  cloud:
    config:
      server:
        git:
          uri: https://github.com/your-org/config-repo
          default-label: main
          search-paths: '{application}'   # optional: subfolders per service
```

---

## setting up the client (Spring Boot)

In the service `pom.xml`:

```xml
<dependency>
  <groupId>org.springframework.cloud</groupId>
  <artifactId>spring-cloud-starter-config</artifactId>
</dependency>
```

In the service `application.yml` (or via environment variable):

```yaml
spring:
  application:
    name: connect
  config:
    import: "configserver:http://config-server:8888"
  profiles:
    active: ${PROFILE:dev}
```

On startup, the service makes an HTTP request to the Config Server passing its name and profile, and receives the merged configuration.

---

## multiple environments and customers in practice

The most powerful aspect is combining profiles to represent **environment + customer**.

Imagine you have two customers in production, each with their own database, integrations, and rate limits:

**`connect-prd.yml`** — production base:
```yaml
datasource:
  pool-size: 20
rate-limit:
  requests-per-minute: 1000
feature:
  new-checkout: false
```

**`connect-prd-customer1.yml`** — enterprise customer:
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

**`connect-prd-customer2.yml`** — standard customer:
```yaml
datasource:
  url: jdbc:postgresql://db-customer2.internal:5432/connect
  username: ${DB_USER_C2}
  password: ${DB_PASS_C2}
```

The `customer2` service inherits `rate-limit` and `feature` from the prd base, and only overrides what is specific to it. No unnecessary duplication.

---

## real-time refresh

To reload configurations without restarting, add Actuator and expose the endpoint:

```yaml
management:
  endpoints:
    web:
      exposure:
        include: refresh
```

Annotate beans that need reloading with `@RefreshScope`:

```java
@RefreshScope
@RestController
public class FeatureController {

    @Value("${feature.new-checkout}")
    private boolean newCheckout;

    // ...
}
```

After pushing to the config repository, simply call:

```bash
POST http://my-service/actuator/refresh
```

To propagate this automatically to all services, you can use **Spring Cloud Bus** with RabbitMQ or Kafka — a refresh event is published to the broker and all subscribed services reload simultaneously.

---

## quarkus compatibility

Quarkus doesn't use Spring Cloud Config natively, but supports integration via an official extension:

```xml
<dependency>
  <groupId>io.quarkus</groupId>
  <artifactId>quarkus-spring-cloud-config-client</artifactId>
</dependency>
```

In the Quarkus service `application.properties`:

```properties
quarkus.spring-cloud-config.url=http://config-server:8888
quarkus.spring-cloud-config.name=my-service
quarkus.spring-cloud-config.profile=prd-customer1
quarkus.spring-cloud-config.enabled=true

# optional: fail if config server is unavailable
quarkus.spring-cloud-config.fail-fast=true
```

Configurations received from the Config Server are treated like any other Quarkus config — injected via `@ConfigProperty` as usual:

```java
@ApplicationScoped
public class FeatureService {

    @ConfigProperty(name = "feature.new-checkout", defaultValue = "false")
    boolean newCheckout;

    // ...
}
```

> **Note**: Quarkus does not support `@RefreshScope`. In native mode (GraalVM), configurations are resolved at build time. For dynamic reload in Quarkus, the alternative is using **Consul** or HashiCorp **Vault** with the appropriate extension.

---

## when to use it

| Scenario | Worth it? |
|---|---|
| Monolith in a single environment | Probably not |
| Multiple microservices, multiple environments | Yes |
| Multi-tenant (prd per customer) | Yes — this is the ideal case |
| Sensitive secrets | Combine with Vault or Config Server's own encryption |

---

## summary

Spring Cloud Config solves a problem that scales poorly when ignored: configurations scattered, duplicated, and hard to audit. With a Git repository as the source of truth, you gain history, PR review, rollback, and the ability to model any combination of environment and customer using profile inheritance.

For teams already using Quarkus, integration via `quarkus-spring-cloud-config-client` allows you to reuse the same server without leaving the ecosystem.
