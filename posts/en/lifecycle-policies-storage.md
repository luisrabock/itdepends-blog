---
title: "every file you upload to storage needs a lifecycle policy"
date: "2025-11-29"
description: "how the absence of retention policies turned terabytes of temporary files into permanent cost — and how to fix it."
tags: ["architecture", "cloud", "storage", "best-practices"]
---

Storage is one of the cloud resources that most quietly spirals out of control. It's cheap per GB, so nobody pays much attention — until the day you look at the bucket and see terabytes of files that had no business still being there.

I worked on an application in exactly this situation. The bucket had accumulated several TBs. When we analyzed the contents, we reached an uncomfortable conclusion: **about 90% of it could have been deleted long ago**.

---

## what was stored there

The application was robust, with multiple async processes and report generation. Over time, storage grew without any criteria. When we categorized the files, the pattern became clear:

**Async processing files**
When a user triggered a bulk import or heavy processing job, the application generated intermediate files — CSV splits, partitioned batches, partial results. These files existed to coordinate the process between services. Once the job finished, they had no further use.

They had been sitting there for months.

**On-demand generated reports**
The application generated complex PDFs and spreadsheets that could take minutes to process. The strategy was sound: process asynchronously and provide a download link. The problem was that the link stayed valid forever and the file was never removed.

A report generated a year ago, for a user who probably didn't even work at the company anymore, was still taking up space.

**Manual exports and backups**
"Export everything" features generated large files that were downloaded once and forgotten. Some were over two years old.

---

## the real problem isn't the cost

Cost matters, but it's not the worst problem.

**The worst problem is data that should no longer exist.**

Reports with sensitive customer information, files with personal data from a process that already ended, full database exports — all with potential for data breaches, audit scope, and regulatory exposure (LGPD, GDPR).

Every file without an expiration policy is a growing risk surface.

---

## the solution: a lifecycle class for every file type

The first change was conceptual: **every file uploaded to storage needs a defined retention class before it goes up**. Not after. Not "when we get around to it."

We categorized files into three classes:

| Class | Description | Retention |
|---|---|---|
| **Process temporary** | Auxiliary files for async jobs | Deleted when process ends |
| **Time-limited temporary** | Reports, exports, generated downloads | 30 days |
| **Permanent** | Business documents, contracts, auditable records | Indefinite (with periodic review) |

The vast majority fell into the first two classes.

---

## implementing: native storage lifecycle policies

The simplest and most reliable way to implement retention is using the **native lifecycle policies** of the storage provider. They run at the infrastructure level, with no dependency on application code.

**AWS S3:**

```json
{
  "Rules": [
    {
      "ID": "delete-temp-reports",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "reports/"
      },
      "Expiration": {
        "Days": 30
      }
    },
    {
      "ID": "delete-async-temp-files",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "processing/temp/"
      },
      "Expiration": {
        "Days": 1
      }
    }
  ]
}
```

**Oracle Cloud OCI Object Storage:**

OCI calls these *Object Lifecycle Policies*, configurable via console or CLI:

```json
{
  "items": [
    {
      "name": "delete-temp-reports",
      "action": "DELETE",
      "timeAmount": 30,
      "timeUnit": "DAYS",
      "isEnabled": true,
      "objectNameFilter": {
        "inclusionPrefixes": ["reports/"]
      }
    },
    {
      "name": "delete-async-processing",
      "action": "DELETE",
      "timeAmount": 1,
      "timeUnit": "DAYS",
      "isEnabled": true,
      "objectNameFilter": {
        "inclusionPrefixes": ["processing/temp/"]
      }
    }
  ]
}
```

**Azure Blob Storage** also has native lifecycle management with rules based on prefix, tags, and creation or last-access date.

The key is **prefix-based organization**. The retention policy starts at the moment you decide where the file will be stored:

```
storage-bucket/
├── documents/          # permanent — no expiration policy
├── reports/            # 30 days
├── processing/
│   ├── temp/           # 1 day
│   └── output/         # 7 days
└── exports/            # 30 days
```

---

## when storage doesn't support lifecycle policies

Not every storage solution supports native lifecycle policies. In that case, the responsibility falls to the application.

The most robust approach is building an **automated cleanup process** with two parts:

**1. Record metadata at upload time**

When uploading a file, record the path, retention class, and calculated expiration date in the database:

```java
@Entity
public class StoredFile {
    private String bucket;
    private String key;
    private RetentionClass retentionClass;
    private LocalDateTime expiresAt;
    private LocalDateTime createdAt;
}
```

```java
public void uploadReport(String key, InputStream content) {
    storageService.upload(bucket, key, content, size);

    StoredFile record = new StoredFile();
    record.setKey(key);
    record.setRetentionClass(RetentionClass.TEMPORARY_30_DAYS);
    record.setExpiresAt(LocalDateTime.now().plusDays(30));
    storedFileRepository.save(record);
}
```

**2. Periodic cleanup job**

A scheduled job that finds expired files and removes them:

```java
@Component
public class StorageCleanupJob {

    private final StoredFileRepository repository;
    private final StorageService storageService;

    @Scheduled(cron = "0 0 2 * * *") // every night at 2am
    public void cleanup() {
        List<StoredFile> expired = repository.findByExpiresAtBeforeAndDeletedFalse(
            LocalDateTime.now()
        );

        for (StoredFile file : expired) {
            try {
                storageService.delete(file.getBucket(), file.getKey());
                file.setDeleted(true);
                repository.save(file);
                log.info("Deleted expired file: {}", file.getKey());
            } catch (Exception e) {
                log.error("Failed to delete file: {}", file.getKey(), e);
            }
        }
    }
}
```

This process also serves as an audit trail: you know exactly what was deleted, when, and under which policy.

---

## deleting on process completion

For temporary files from async jobs, cleanup shouldn't wait for a nightly job. The file should be deleted as soon as the process that created it finishes:

```java
@Service
public class ImportJobService {

    public void processImport(String jobId) {
        List<String> tempFiles = new ArrayList<>();
        try {
            // generate temporary files
            String splitFile = splitService.split(jobId);
            tempFiles.add(splitFile);

            // process
            processorService.process(splitFile);

        } finally {
            // ensures cleanup regardless of success or failure
            tempFiles.forEach(key -> {
                try {
                    storageService.delete(bucket, key);
                } catch (Exception e) {
                    log.warn("Could not delete temp file: {}", key);
                }
            });
        }
    }
}
```

The `finally` block guarantees cleanup even when processing fails.

---

## what changed after

After implementing policies and running a retroactive cleanup on the existing bucket, the volume dropped significantly. Monthly storage costs fell noticeably, but the more important gain was different: **the bucket started containing only what should be there**.

Security audits became simpler. The scope of sensitive data shrank. And every new file uploaded now comes with a defined destination.

---

## summary

Cheap storage creates the illusion that it doesn't need managing. It does.

Define the retention class of every file type **before** implementing the upload. Use native lifecycle policies when available — they're reliable and independent of application code. When unavailable, implement control in the application with metadata and a cleanup job.

The file with no expiration policy isn't permanent. It's a waiting problem.
