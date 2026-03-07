---
title: "the D in SOLID is the most important — and a cloud migration proved it to me"
date: "2025-11-06"
description: "how the absence of dependency inversion turned a storage migration into a project-wide change that could have been nearly zero effort."
tags: ["java", "solid", "architecture", "cloud"]
---

I could argue for the importance of every letter in SOLID. But if I have to pick one — the one that, in practice, most impacts a system's ability to evolve without pain — I pick the **D**: the Dependency Inversion Principle.

This isn't theory. I learned it the hard way during a cloud migration.

---

## the principle

The Dependency Inversion Principle states:

> *High-level modules should not depend on low-level modules. Both should depend on abstractions.*

In practice: your business code should not know *how* storage works. It should only know *that* storage exists and what it can do.

The difference between those two statements is enormous when the time comes to swap the "how".

---

## the scenario: migrating from AWS to Oracle Cloud

During an infrastructure migration from AWS to Oracle Cloud, one of the critical points was object storage. The application used **AWS S3** heavily — file uploads, presigned URL generation, bucket listing, moving objects between prefixes.

The problem surfaced early in the analysis: **the code was calling the AWS SDK directly in dozens of places**.

There was no abstraction. There was this, scattered throughout the codebase:

```java
// Inside a document service
AmazonS3 s3Client = AmazonS3ClientBuilder.standard()
    .withRegion(Regions.SA_EAST_1)
    .build();

s3Client.putObject(bucket, key, file);

// Inside a cleanup job
AmazonS3 s3 = new AmazonS3Client(credentials);
s3.deleteObject(new DeleteObjectRequest(bucket, key));

// Inside a download controller
GeneratePresignedUrlRequest request = new GeneratePresignedUrlRequest(bucket, key)
    .withMethod(HttpMethod.GET)
    .withExpiration(expiration);
URL url = s3Client.generatePresignedUrl(request);
```

Business classes, jobs, controllers — everything directly coupled to `AmazonS3`.

---

## the real cost of missing abstraction

Oracle Cloud uses **OCI Object Storage**, which has a completely different API from S3. Different SDK, different models, different authentication.

This meant every single usage of `AmazonS3` had to be found, understood, and rewritten. What could have been a single-point swap turned into work spread across the entire application.

The risk scales proportionally: every changed point is a point that can break. Tests need to cover paths that shouldn't have needed to exist. Code reviewers need to understand the context of each change individually.

An infrastructure change became an application change.

---

## the refactor: applying dependency inversion

In the refactoring that accompanied the migration, the first step was defining an abstraction — an interface representing the *contract* of storage, with no mention of AWS, Oracle, or any provider:

```java
public interface StorageService {
    void upload(String bucket, String key, InputStream content, long contentLength);
    void delete(String bucket, String key);
    URL generatePresignedUrl(String bucket, String key, Duration expiration);
    InputStream download(String bucket, String key);
    boolean exists(String bucket, String key);
}
```

This is the high-level module: what the system needs to do with storage. No implementation details.

Then, the concrete implementations:

```java
// AWS S3 implementation
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

    // ... remaining methods
}
```

```java
// Oracle OCI implementation
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

    // ... remaining methods
}
```

And all business code now depends only on the interface:

```java
@Service
public class DocumentService {

    private final StorageService storageService; // doesn't know which implementation

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

Switching providers became a matter of configuration:

```yaml
# AWS
storage:
  provider: aws

# Oracle Cloud
storage:
  provider: oci
```

---

## the bonus: testability

With the interface in place, unit tests became trivial. No external SDK mocking, no cloud credentials needed at test time:

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

Before the refactor, testing `DocumentService` meant either mocking the entire AWS SDK or depending on a real bucket.

---

## what the D actually guarantees

The other letters in SOLID help you organize what you have. The **D** protects you from what's going to change.

- **S** (single responsibility) says each class should have one reason to change.
- **O** (open/closed) says you should extend without modifying.
- **D** says that when change comes from the outside — from infrastructure, from vendors, from integrations — **your business code should not feel it**.

Cloud changes. Vendors change. SDKs change. Commercial contracts change. Business logic shouldn't pay the price for those changes.

---

## practical summary

If you have code calling external SDKs, HTTP clients, or database drivers directly inside business classes, you are one "we need to swap the provider" away from a much larger effort than it should be.

The interface costs little to create. The cost of not having it shows up at the worst time.
