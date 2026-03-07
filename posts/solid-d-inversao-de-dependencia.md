---
title: "o D do SOLID é o mais importante — e uma migração de cloud me provou isso"
date: "2025-11-06"
description: "como a ausência de inversão de dependência transformou uma migração de storage em um trabalho que poderia ter sido quase nulo."
tags: ["java", "solid", "arquitetura", "cloud"]
---

Eu poderia falar sobre cada letra do SOLID e defender a importância de cada uma. Mas se eu tiver que escolher uma — a que, na prática, mais impacta a capacidade de um sistema de evoluir sem dor — escolho o **D**: o princípio da inversão de dependência.

Não é teoria. Aprendi isso durante uma migração de cloud.

---

## o princípio

O Dependency Inversion Principle diz:

> *Módulos de alto nível não devem depender de módulos de baixo nível. Ambos devem depender de abstrações.*

Na prática: seu código de negócio não deve saber *como* o storage funciona. Ele deve saber apenas *que* existe um storage e o que ele pode fazer.

A diferença entre essas duas afirmações é enorme quando chega a hora de trocar o "como".

---

## o cenário: migração de AWS para Oracle Cloud

Durante uma migração de infraestrutura de AWS para Oracle Cloud, um dos pontos críticos era o storage de objetos. A aplicação usava **AWS S3** intensamente — upload de arquivos, geração de URLs presignadas, listagem de buckets, movimentação entre prefixos.

O problema apareceu logo na análise: **o código chamava o SDK da AWS diretamente em dezenas de lugares**.

Não existia uma abstração. Existia isso espalhado pelo codebase:

```java
// Em um service de documentos
AmazonS3 s3Client = AmazonS3ClientBuilder.standard()
    .withRegion(Regions.SA_EAST_1)
    .build();

s3Client.putObject(bucket, key, file);

// Em um job de limpeza
AmazonS3 s3 = new AmazonS3Client(credentials);
s3.deleteObject(new DeleteObjectRequest(bucket, key));

// Em um controller de download
GeneratePresignedUrlRequest request = new GeneratePresignedUrlRequest(bucket, key)
    .withMethod(HttpMethod.GET)
    .withExpiration(expiration);
URL url = s3Client.generatePresignedUrl(request);
```

Classes de negócio, jobs, controllers — tudo acoplado diretamente ao `AmazonS3`.

---

## o custo real da ausência de abstração

A Oracle Cloud usa **OCI Object Storage**, que tem uma API completamente diferente do S3. SDK diferente, modelos diferentes, autenticação diferente.

Isso significa que cada ponto de uso do `AmazonS3` precisava ser encontrado, entendido e reescrito. A migração do storage, que poderia ter sido uma troca em um único lugar, virou um trabalho espalhado por toda a aplicação.

O risco aumenta proporcionalmente: cada ponto alterado é um ponto que pode quebrar. Testes precisam cobrir caminhos que antes nem precisariam existir. O revisor de código precisa entender o contexto de cada alteração.

Uma mudança de infraestrutura virou uma mudança de aplicação.

---

## a refatoração: aplicando inversão de dependência

Na refatoração que acompanhou a migração, o primeiro passo foi definir uma abstração — uma interface que representasse o *contrato* do storage, sem nenhuma menção a AWS, Oracle ou qualquer provedor:

```java
public interface StorageService {
    void upload(String bucket, String key, InputStream content, long contentLength);
    void delete(String bucket, String key);
    URL generatePresignedUrl(String bucket, String key, Duration expiration);
    InputStream download(String bucket, String key);
    boolean exists(String bucket, String key);
}
```

Esse é o módulo de alto nível: o que o sistema precisa fazer com um storage. Nenhum detalhe de implementação.

Depois, as implementações concretas:

```java
// Implementação AWS S3
@Component
@ConditionalOnProperty(name = "storage.provider", havingValue = "aws")
public class S3StorageService implements StorageService {

    private final AmazonS3 s3Client;

    public S3StorageService(AmazonS3 s3Client) {
        this.s3Client = s3Client;
    }

    @Override
    public void upload(String bucket, String key, InputStream content, long contentLength) {
        ObjectMetadata metadata = new ObjectMetadata();
        metadata.setContentLength(contentLength);
        s3Client.putObject(bucket, key, content, metadata);
    }

    @Override
    public URL generatePresignedUrl(String bucket, String key, Duration expiration) {
        Date expirationDate = Date.from(Instant.now().plus(expiration));
        GeneratePresignedUrlRequest request = new GeneratePresignedUrlRequest(bucket, key)
            .withMethod(HttpMethod.GET)
            .withExpiration(expirationDate);
        return s3Client.generatePresignedUrl(request);
    }

    // ... demais métodos
}
```

```java
// Implementação Oracle OCI
@Component
@ConditionalOnProperty(name = "storage.provider", havingValue = "oci")
public class OciStorageService implements StorageService {

    private final ObjectStorageClient ociClient;
    private final String namespace;

    // ...

    @Override
    public void upload(String bucket, String key, InputStream content, long contentLength) {
        PutObjectRequest request = PutObjectRequest.builder()
            .bucketName(bucket)
            .namespaceName(namespace)
            .objectName(key)
            .contentLength(contentLength)
            .putObjectBody(content)
            .build();
        ociClient.putObject(request);
    }

    // ... demais métodos
}
```

E todo o código de negócio passou a depender apenas da interface:

```java
@Service
public class DocumentService {

    private final StorageService storageService; // não sabe qual implementação

    public DocumentService(StorageService storageService) {
        this.storageService = storageService;
    }

    public void saveDocument(Document doc, InputStream content) {
        String key = buildKey(doc);
        storageService.upload(config.getBucket(), key, content, doc.getSize());
    }

    public URL getDownloadUrl(Document doc) {
        return storageService.generatePresignedUrl(
            config.getBucket(),
            buildKey(doc),
            Duration.ofMinutes(15)
        );
    }
}
```

A troca de provedor passou a ser uma questão de configuração:

```yaml
# AWS
storage:
  provider: aws

# Oracle Cloud
storage:
  provider: oci
```

---

## o bônus: testabilidade

Com a interface em mãos, os testes unitários ficaram triviais. Nenhum mock de SDK externo, nenhuma dependência de credenciais de cloud em tempo de teste:

```java
class DocumentServiceTest {

    private StorageService storageMock;
    private DocumentService documentService;

    @BeforeEach
    void setup() {
        storageMock = Mockito.mock(StorageService.class);
        documentService = new DocumentService(storageMock, config);
    }

    @Test
    void shouldUploadDocumentOnSave() {
        documentService.saveDocument(doc, inputStream);
        verify(storageMock).upload(eq(bucket), anyString(), eq(inputStream), eq(doc.getSize()));
    }
}
```

Antes da refatoração, testar o `DocumentService` envolvia ou mockar o SDK inteiro da AWS ou depender de um bucket real.

---

## o que o D realmente garante

As outras letras do SOLID te ajudam a organizar o que você tem. O **D** te protege do que vai mudar.

- O **S** (responsabilidade única) diz que cada classe deve ter um motivo para mudar.
- O **O** (aberto/fechado) diz que você deve estender sem modificar.
- O **D** diz que quando a mudança vier de fora — de infraestrutura, de fornecedor, de integração — **seu código de negócio não deve saber**.

Cloud muda. Provedores mudam. SDKs mudam. Contratos comerciais mudam. A lógica de negócio não deveria pagar o preço dessas mudanças.

---

## resumo prático

Se você tem código que chama SDKs externos, clientes HTTP ou drivers de banco diretamente dentro de classes de negócio, você está um "precisa trocar o provedor" de distância de um trabalho muito maior do que deveria ser.

A interface custa pouco para criar. O custo de não tê-la aparece na hora errada.
