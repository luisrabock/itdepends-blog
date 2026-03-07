---
title: "centralizing authentication at the API Gateway in a Kubernetes cluster"
date: "2026-02-14"
description: "how moving authentication from each service to the API Gateway simplified security, eliminated duplication, and let services focus on what matters."
tags: ["kubernetes", "api-gateway", "architecture", "security", "jwt"]
---

In a Kubernetes cluster with many services, one of the first security decisions you need to make is: **where does authentication happen?**

The most natural — and problematic — answer is "in each service." That's what happens when services grow organically. Each one implements its own token validation logic, its own auth middleware, its own access rules. Over time, you get duplication, inconsistency, and attack surface scattered across the entire cluster.

I worked on a cluster in exactly this situation. The solution was to move all authentication to the API Gateway — and the result was a significantly simpler and more secure architecture.

---

## the problem: distributed authentication

The cluster had multiple services exposed directly. Each one validated JWT tokens on its own:

```
Internet
   │
   ▼
[ Load Balancer ]
   │
   ├──▶ [ Service A :8080 ] → validates JWT internally
   ├──▶ [ Service B :8081 ] → validates JWT internally
   ├──▶ [ Service C :8082 ] → validates JWT internally
   └──▶ [ Service D :8083 ] → validates JWT internally
```

The accumulated problems:

- **Code duplication**: each service had its own auth middleware, usually copied and adapted. A change in validation logic (new required claim, algorithm change, key rotation) had to be replicated across all services
- **Inconsistency**: different versions of the same middleware in different services, with slightly different behaviors
- **All services publicly exposed**: any directly accessible service is an attack surface. A security bug in any one of them was an immediate problem
- **Business logic mixed with security infrastructure**: services needed to know the JWT public key, expected claims, expiration rules — details that aren't their responsibility

---

## the solution: Load Balancer → API Gateway → internal services

The architecture we adopted:

```
Internet
   │
   ▼
[ Load Balancer ]           ← single external entry point
   │
   ▼
[ API Gateway ]             ← validates JWT, routing, rate limiting, CORS
   │
   ├──▶ [ Service A ] (ClusterIP — internal)
   ├──▶ [ Service B ] (ClusterIP — internal)
   ├──▶ [ Service C ] (ClusterIP — internal)
   └──▶ [ Service D ] (ClusterIP — internal)
```

**Services stopped being public.** Each one became a `ClusterIP` type Service in Kubernetes — accessible only within the cluster. The only external entry point is the API Gateway.

The API Gateway became responsible for:
1. Validating the JWT token of every request
2. Rejecting invalid requests before they reach the services
3. Propagating authenticated user information via headers
4. Routing to the correct service
5. Rate limiting and throttling
6. Centralized CORS
7. Unified access logging

---

## stateless authentication at the gateway

Authentication is **stateless** — the gateway doesn't query a database or external service to validate each request. It validates the JWT using the public key from the identity server (Keycloak, Auth0, or any other).

The complete flow:

```
1. Client obtains JWT from the identity server (login)
2. Client sends request with JWT in the Authorization header
3. Load Balancer receives and forwards to API Gateway
4. API Gateway:
   a. Extracts the token from the header
   b. Verifies the signature with the public key (JWKS endpoint)
   c. Validates exp, iss, aud
   d. Extracts relevant claims (user_id, company_id, roles)
   e. Adds internal headers: X-User-Id, X-Company-Id, X-Roles
   f. Forwards to the destination service
5. Service receives an already authenticated request — trusts the internal headers
```

The service doesn't need to validate anything. It simply reads the headers the gateway already populated:

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

## Kubernetes configuration

**Services as ClusterIP (internal):**

```yaml
# Before: LoadBalancer or NodePort (public)
apiVersion: v1
kind: Service
metadata:
  name: order-service
spec:
  type: LoadBalancer   # externally exposed
  ports:
    - port: 80
      targetPort: 8080

---
# After: ClusterIP (internal)
apiVersion: v1
kind: Service
metadata:
  name: order-service
spec:
  type: ClusterIP      # accessible only within the cluster
  ports:
    - port: 80
      targetPort: 8080
```

**NetworkPolicy to enforce isolation:**

Beyond using `ClusterIP`, a `NetworkPolicy` ensures only the API Gateway can call the services — even from within the cluster:

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

With this policy, even if someone gains access to the cluster's internal network, they can't call services directly — only through the gateway.

---

## JWT validation at the gateway

Depending on the gateway used, JWT validation configuration varies. Examples with the main options:

**Kong (JWT or OIDC plugin):**

```yaml
plugins:
  - name: oidc
    config:
      issuer: https://auth.my-company.com/realms/app
      client_id: api-gateway
      client_secret: ${CLIENT_SECRET}
      bearer_only: true
      introspection_endpoint_auth_method: client_secret_post
```

**NGINX (with lua or auth_request):**

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
    - host: api.my-company.com
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

## public and authenticated routes on the same gateway

Not every route needs authentication. The gateway manages this centrally:

```yaml
# Public routes (no authentication)
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

# Authenticated routes
  - path: /api/v1/orders
    service: order-service
    auth: true
    roles: [USER, ADMIN]

  - path: /api/v1/admin
    service: admin-service
    auth: true
    roles: [ADMIN]
```

Before, each service had to know which of its endpoints were public and which weren't. Now, that decision lives in one place.

---

## service-to-service communication

An important point: communication **between services inside the cluster** doesn't go through the gateway. Services that need to call other services use internal endpoints directly via Kubernetes DNS:

```java
// Service A calling Service B internally
restTemplate.getForObject(
    "http://order-service.production.svc.cluster.local/orders/{id}",
    Order.class,
    orderId
);
```

These internal calls don't carry JWT tokens. Authentication between services inside the cluster can be handled with:

- **mTLS** (mutual TLS) — each service has a certificate and authenticates the other
- **Service mesh** (Istio, Linkerd) — manages authentication and encryption between services automatically
- **Network Policies** — ensure only authorized services can communicate

---

## what the gateway centralized for free

Beyond authentication, routing everything through the gateway brought other benefits that required no changes to the services:

**Rate limiting per user or company:**
```yaml
rate-limit:
  by: header:X-Company-Id
  requests-per-minute: 1000
  burst: 200
```

**CORS in one place:**
```yaml
cors:
  origins:
    - https://app.my-company.com
  methods: [GET, POST, PUT, DELETE]
  headers: [Authorization, Content-Type]
```

**Unified logging:**
Every request entering the system generates a log with user, company, route, response time, and status — without any service needing to implement this.

**Circuit breaker:**
If a service starts returning errors in sequence, the gateway stops forwarding requests to it temporarily — protecting the rest of the system.

**API versioning:**
`/v1/` and `/v2/` routes can coexist pointing to different versions of the same service, with no changes needed on the client side.

---

## what changed after

With the centralized architecture, services became smaller and more focused. Auth library dependencies were removed from several projects. JWT key rotation became a single-place configuration. Security audits got simpler — there was a single entry point to analyze.

The cost: the API Gateway became a critical component. If it goes down, everything goes down. For this reason, it needs to be treated as mission-critical infrastructure: multiple replicas, health checks, circuit breakers, and a zero-downtime rollout strategy.

---

## summary

Distributed authentication across multiple services is technical debt that grows with the number of services. Centralizing at the API Gateway is one of the best cost-benefit architectural decisions in distributed systems.

The pattern is simple: **only the gateway is public. Services are internal.** The gateway authenticates, extracts user information, and propagates it via headers. Services trust the gateway and focus on the business.

A service that doesn't need to know how to validate JWT is a service with less responsibility, less dependency, and less attack surface.
