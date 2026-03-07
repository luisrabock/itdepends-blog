---
title: "centralizando autenticação no API Gateway em um cluster Kubernetes"
date: "2026-02-14"
description: "como mover a autenticação de cada serviço para o API Gateway simplificou a segurança, eliminou duplicação e deixou os serviços focados no que importa."
tags: ["kubernetes", "api-gateway", "arquitetura", "segurança", "jwt"]
---

Em um cluster Kubernetes com muitos serviços, uma das primeiras decisões de segurança que você precisa tomar é: **onde a autenticação acontece?**

A resposta mais natural — e problemática — é "em cada serviço". É o que acontece quando os serviços crescem organicamente. Cada um implementa sua própria lógica de validação de token, seu próprio middleware de autenticação, suas próprias regras de acesso. Com o tempo, você tem duplicação, inconsistência, e superfície de ataque espalhada por todo o cluster.

Trabalhei em um cluster nessa situação. A solução foi mover toda a autenticação para o API Gateway — e o resultado foi uma arquitetura significativamente mais simples e segura.

---

## o problema: autenticação distribuída

O cluster tinha múltiplos serviços expostos diretamente. Cada um verificava tokens JWT por conta própria:

```
Internet
   │
   ▼
[ Load Balancer ]
   │
   ├──▶ [ Service A :8080 ] → valida JWT internamente
   ├──▶ [ Service B :8081 ] → valida JWT internamente
   ├──▶ [ Service C :8082 ] → valida JWT internamente
   └──▶ [ Service D :8083 ] → valida JWT internamente
```

Os problemas acumulados:

- **Duplicação de código**: cada serviço tinha seu próprio middleware de autenticação, geralmente copiado e adaptado. Uma mudança na lógica de validação (nova claim obrigatória, mudança de algoritmo, rotação de chaves) precisava ser replicada em todos os serviços
- **Inconsistência**: versões diferentes do mesmo middleware em serviços diferentes, com comportamentos ligeiramente distintos
- **Todos os serviços expostos publicamente**: qualquer serviço acessível diretamente é uma superfície de ataque. Um bug de segurança em qualquer um deles era um problema imediato
- **Lógica de negócio misturada com infraestrutura de segurança**: os serviços precisavam conhecer a chave pública do JWT, as claims esperadas, as regras de expiração — detalhes que não são responsabilidade deles

---

## a solução: Load Balancer → API Gateway → serviços internos

A arquitetura que adotamos:

```
Internet
   │
   ▼
[ Load Balancer ]           ← único ponto de entrada externo
   │
   ▼
[ API Gateway ]             ← valida JWT, roteamento, rate limiting, CORS
   │
   ├──▶ [ Service A ] (ClusterIP — interno)
   ├──▶ [ Service B ] (ClusterIP — interno)
   ├──▶ [ Service C ] (ClusterIP — interno)
   └──▶ [ Service D ] (ClusterIP — interno)
```

**Os serviços deixaram de ser públicos.** Cada um passou a ser um `Service` do tipo `ClusterIP` no Kubernetes — acessível apenas dentro do cluster. O único ponto de entrada externo é o API Gateway.

O API Gateway se tornou responsável por:
1. Validar o token JWT de toda requisição
2. Rejeitar requisições inválidas antes de chegar nos serviços
3. Propagar as informações do usuário autenticado via headers
4. Roteamento para o serviço correto
5. Rate limiting e throttling
6. CORS centralizado
7. Logging de acesso unificado

---

## autenticação stateless no gateway

A autenticação é **stateless** — o gateway não consulta banco de dados nem serviço externo para validar cada requisição. Ele valida o JWT usando a chave pública do servidor de identidade (Keycloak, Auth0, ou qualquer outro).

O fluxo completo:

```
1. Cliente obtém o JWT do servidor de identidade (login)
2. Cliente envia requisição com JWT no header Authorization
3. Load Balancer recebe e repassa ao API Gateway
4. API Gateway:
   a. Extrai o token do header
   b. Verifica a assinatura com a chave pública (JWKS endpoint)
   c. Valida exp, iss, aud
   d. Extrai claims relevantes (user_id, company_id, roles)
   e. Adiciona headers internos: X-User-Id, X-Company-Id, X-Roles
   f. Encaminha ao serviço de destino
5. Serviço recebe a requisição já autenticada — confia nos headers internos
```

O serviço não precisa validar nada. Ele simplesmente lê os headers que o gateway já populou:

```java
@GetMapping("/orders")
public List<Order> listOrders(
    @RequestHeader("X-Company-Id") Long companyId,
    @RequestHeader("X-User-Id") Long userId
) {
    return orderService.findByCompany(companyId);
}
```

---

## configuração no Kubernetes

**Services como ClusterIP (internos):**

```yaml
# Antes: LoadBalancer ou NodePort (público)
apiVersion: v1
kind: Service
metadata:
  name: order-service
spec:
  type: LoadBalancer   # exposto externamente
  ports:
    - port: 80
      targetPort: 8080

---
# Depois: ClusterIP (interno)
apiVersion: v1
kind: Service
metadata:
  name: order-service
spec:
  type: ClusterIP      # acessível apenas dentro do cluster
  ports:
    - port: 80
      targetPort: 8080
```

**NetworkPolicy para reforçar o isolamento:**

Além de usar `ClusterIP`, uma `NetworkPolicy` garante que apenas o API Gateway pode chamar os serviços — mesmo dentro do cluster:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-only-gateway
  namespace: production
spec:
  podSelector:
    matchLabels:
      tier: backend
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: api-gateway
      ports:
        - protocol: TCP
          port: 8080
```

Com essa policy, mesmo que alguém consiga acesso à rede interna do cluster, não consegue chamar os serviços diretamente — apenas através do gateway.

---

## validação JWT no gateway

Dependendo do gateway utilizado, a configuração da validação JWT varia. Exemplos com as principais opções:

**Kong (plugin JWT ou OIDC):**

```yaml
plugins:
  - name: oidc
    config:
      issuer: https://auth.minha-empresa.com/realms/app
      client_id: api-gateway
      client_secret: ${CLIENT_SECRET}
      bearer_only: true
      introspection_endpoint_auth_method: client_secret_post
```

**NGINX (com lua ou auth_request):**

```nginx
location / {
    auth_request /auth-validate;
    auth_request_set $user_id $upstream_http_x_user_id;
    auth_request_set $company_id $upstream_http_x_company_id;

    proxy_set_header X-User-Id $user_id;
    proxy_set_header X-Company-Id $company_id;
    proxy_pass http://order-service;
}

location /auth-validate {
    internal;
    proxy_pass http://auth-service/validate;
    proxy_pass_request_body off;
    proxy_set_header Content-Length "";
    proxy_set_header Authorization $http_authorization;
}
```

**Traefik (ForwardAuth middleware):**

```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: jwt-auth
spec:
  forwardAuth:
    address: http://auth-service/validate
    authResponseHeaders:
      - X-User-Id
      - X-Company-Id
      - X-Roles

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: order-service-ingress
  annotations:
    traefik.ingress.kubernetes.io/router.middlewares: production-jwt-auth@kubernetescrd
spec:
  rules:
    - host: api.minha-empresa.com
      http:
        paths:
          - path: /orders
            pathType: Prefix
            backend:
              service:
                name: order-service
                port:
                  number: 80
```

---

## rotas públicas e autenticadas no mesmo gateway

Nem toda rota precisa de autenticação. O gateway gerencia isso de forma centralizada:

```yaml
# Rotas públicas (sem autenticação)
routes:
  - path: /auth/login
    service: auth-service
    auth: false

  - path: /health
    service: health-service
    auth: false

  - path: /api/v1/public
    service: public-service
    auth: false

# Rotas autenticadas
  - path: /api/v1/orders
    service: order-service
    auth: true
    roles: [USER, ADMIN]

  - path: /api/v1/admin
    service: admin-service
    auth: true
    roles: [ADMIN]
```

Antes, cada serviço precisava saber quais endpoints eram públicos e quais não eram. Agora, essa decisão está em um único lugar.

---

## comunicação entre serviços (service-to-service)

Um ponto importante: a comunicação **entre serviços dentro do cluster** não passa pelo gateway. Serviços que precisam chamar outros serviços usam os endpoints internos diretamente via DNS do Kubernetes:

```java
// Service A chamando Service B internamente
restTemplate.getForObject(
    "http://order-service.production.svc.cluster.local/orders/{id}",
    Order.class,
    orderId
);
```

Essas chamadas internas não carregam JWT. A autenticação entre serviços dentro do cluster pode ser resolvida com:

- **mTLS** (mutual TLS) — cada serviço tem um certificado e autentica o outro
- **Service mesh** (Istio, Linkerd) — gerencia autenticação e criptografia entre serviços automaticamente
- **Network Policies** — garantem que apenas serviços autorizados podem se comunicar

---

## o que o gateway centralizou de graça

Além da autenticação, mover toda a entrada pelo gateway trouxe outros benefícios que não exigiram mudança nos serviços:

**Rate limiting por usuário ou empresa:**
```yaml
rate-limit:
  by: header:X-Company-Id
  requests-per-minute: 1000
  burst: 200
```

**CORS em um único lugar:**
```yaml
cors:
  origins:
    - https://app.minha-empresa.com
  methods: [GET, POST, PUT, DELETE]
  headers: [Authorization, Content-Type]
```

**Logging unificado:**
Cada requisição que entra no sistema gera um log com usuário, empresa, rota, tempo de resposta e status — sem que nenhum serviço precise implementar isso.

**Circuit breaker:**
Se um serviço começa a retornar erros em sequência, o gateway para de encaminhar requisições para ele temporariamente — protegendo o resto do sistema.

**Versionamento de API:**
Rotas `/v1/` e `/v2/` podem coexistir apontando para versões diferentes do mesmo serviço, sem que o cliente precise mudar nada.

---

## o que mudou depois

Com a arquitetura centralizada, os serviços ficaram menores e mais focados. Dependências de bibliotecas de autenticação foram removidas de vários projetos. Rotação de chaves JWT passou a ser configurada em um lugar só. Auditorias de segurança ficaram mais simples — havia um único ponto de entrada para analisar.

O custo: o API Gateway virou um componente crítico. Se ele cai, tudo cai. Por isso, ele precisa ser tratado como infraestrutura de missão crítica: múltiplas réplicas, health checks, circuit breakers, e estratégia de rollout sem downtime.

---

## resumo

Autenticação distribuída em múltiplos serviços é uma dívida técnica que cresce com o número de serviços. Centralizar no API Gateway é uma das decisões de arquitetura com melhor custo-benefício em sistemas distribuídos.

O padrão é simples: **apenas o gateway é público. Os serviços são internos.** O gateway autentica, extrai as informações do usuário, e propaga via headers. Os serviços confiam no gateway e focam no negócio.

Serviço que não precisa saber validar JWT é serviço com menos responsabilidade, menos dependência e menos surface de ataque.
