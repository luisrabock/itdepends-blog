---
title: "todo arquivo que sobe para o storage precisa de uma política de ciclo de vida"
date: "2025-11-29"
description: "como a ausência de políticas de retenção transformou terabytes de arquivos temporários em custo permanente — e como resolver isso."
tags: ["arquitetura", "cloud", "storage", "boas-práticas"]
---

Storage é um dos recursos de cloud que mais silenciosamente escapa do controle. É barato por GB, então ninguém presta muita atenção — até o dia em que você olha para o bucket e vê terabytes de arquivos que não precisariam estar lá.

Trabalhei em uma aplicação nessa situação. O bucket tinha vários TBs acumulados. Quando analisamos o conteúdo, chegamos a uma conclusão desconfortável: **cerca de 90% daquilo poderia ter sido deletado faz tempo**.

---

## o que estava guardado lá

A aplicação era robusta, com vários processos assíncronos e geração de relatórios. Com o tempo, o storage foi crescendo sem critério. Ao categorizar os arquivos, o padrão ficou evidente:

**Arquivos de processamento assíncrono**
Quando um usuário disparava uma importação em massa ou um processamento pesado, a aplicação gerava arquivos intermediários — splits de CSV, lotes particionados, resultados parciais. Esses arquivos existiam para coordenar o processo entre serviços. Uma vez finalizado o job, eles não tinham mais nenhuma utilidade.

Estavam lá há meses.

**Relatórios gerados sob demanda**
A aplicação gerava PDFs e planilhas complexas que podiam levar minutos para processar. A estratégia era correta: processar de forma assíncrona e disponibilizar um link para download. O problema era que o link ficava válido para sempre e o arquivo nunca era removido.

Um relatório gerado um ano atrás, para um usuário que provavelmente nem trabalhava mais na empresa, ainda ocupava espaço.

**Exports e backups manuais**
Funcionalidades de "exportar tudo" geravam arquivos grandes que eram baixados uma vez e esquecidos. Alguns tinham mais de dois anos.

---

## o problema real não é o custo

Custo importa, mas não é o pior problema.

**O pior problema é o dado que não deveria mais existir.**

Relatórios com informações sensíveis de clientes, arquivos com dados pessoais de um processo que já encerrou, exports de bases inteiras — tudo isso com potencial de vazamento, escopo de auditoria e exposição regulatória (LGPD, GDPR).

Cada arquivo sem política de expiração é uma superfície de risco que cresce com o tempo.

---

## a solução: política de ciclo de vida para cada tipo de arquivo

A primeira mudança foi conceitual: **todo arquivo que sobe para o storage precisa ter uma classe de retenção definida antes de subir**. Não depois. Não "quando sobrar tempo".

Categorizamos os arquivos em três classes:

| Classe | Descrição | Retenção |
|---|---|---|
| **Temporário de processo** | Arquivos auxiliares de jobs assíncronos | Deletado ao fim do processo |
| **Temporário com prazo** | Relatórios, exports, downloads gerados | 30 dias |
| **Permanente** | Documentos de negócio, contratos, registros auditáveis | Indefinido (com revisão periódica) |

A grande maioria se encaixou nas duas primeiras classes.

---

## implementando: lifecycle policies nativas do storage

A forma mais simples e confiável de implementar retenção é usar as **lifecycle policies nativas** do provedor de storage. Elas rodam no nível da infraestrutura, sem depender de nenhum código da aplicação.

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

O OCI chama de *Object Lifecycle Policy* e pode ser configurado via console ou CLI:

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

**Azure Blob Storage** também possui lifecycle management nativo com regras baseadas em prefixo, tags e data de criação ou último acesso.

A chave é a **organização por prefixo (pasta)**. A política de retenção começa na hora de decidir onde o arquivo vai ser armazenado:

```
storage-bucket/
├── documents/          # permanente — sem política de expiração
├── reports/            # 30 dias
├── processing/
│   ├── temp/           # 1 dia
│   └── output/         # 7 dias
└── exports/            # 30 dias
```

---

## quando o storage não tem suporte a lifecycle policies

Nem todo storage tem suporte nativo a políticas de ciclo de vida. Nesse caso, a responsabilidade cai para a aplicação.

A abordagem mais robusta é criar um **processo automatizado de limpeza**, com duas partes:

**1. Registrar metadados no momento do upload**

Ao subir um arquivo, registrar em banco de dados o caminho, a classe de retenção e a data de expiração calculada:

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

**2. Job periódico de limpeza**

Um job agendado que busca arquivos expirados e os remove:

```java
@Component
public class StorageCleanupJob {

    private final StoredFileRepository repository;
    private final StorageService storageService;

    @Scheduled(cron = "0 0 2 * * *") // toda noite às 2h
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

Esse processo também serve como auditoria: você sabe exatamente o que foi deletado, quando e por qual política.

---

## deletando na finalização do processo

Para arquivos temporários de jobs assíncronos, a limpeza não deve esperar um job noturno. O arquivo deve ser deletado assim que o processo que o gerou terminar:

```java
@Service
public class ImportJobService {

    public void processImport(String jobId) {
        List<String> tempFiles = new ArrayList<>();
        try {
            // gera arquivos temporários
            String splitFile = splitService.split(jobId);
            tempFiles.add(splitFile);

            // processa
            processorService.process(splitFile);

        } finally {
            // garante limpeza independentemente de sucesso ou falha
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

O bloco `finally` garante que a limpeza acontece mesmo em caso de erro no processamento.

---

## o que mudou depois

Após implementar as políticas e rodar a limpeza retroativa no bucket existente, o volume caiu drasticamente. O custo mensal de storage reduziu de forma relevante, mas o ganho mais importante foi outro: **o bucket passou a conter apenas o que deveria estar lá**.

Auditorias de segurança ficaram mais simples. O escopo de dados sensíveis ficou menor. E qualquer novo arquivo que sobe já nasce com um destino definido.

---

## resumo

Storage barato cria a ilusão de que não precisa de gestão. Precisa.

Defina a classe de retenção de cada tipo de arquivo **antes** de implementar o upload. Use lifecycle policies nativas quando disponíveis — elas são confiáveis e não dependem de código. Quando não disponíveis, implemente o controle na aplicação com metadados e um job de limpeza.

O arquivo que não tem política de expiração não é permanente. É um problema em espera.
