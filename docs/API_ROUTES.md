# Routes API Mental Journal - Guide Complet

Ce document liste **toutes les routes** de l'API avec exemples concrets et cas d'usage frontend.

## 📋 Table des matières

1. [Santé & Méta](#1-santé--méta)
2. [Upload & Ingestion](#2-upload--ingestion)
3. [Sessions & Semaines](#3-sessions--semaines)
4. [Rapports](#4-rapports)
5. [Orchestration](#5-orchestration)
6. [Flux complets](#6-flux-complets)

---

## 1. Santé & Méta

### GET `/healthz`

**Utilité :** Health check pour load balancer, monitoring uptime, scripts CI/CD

**Exemple :**
```bash
curl http://localhost:8080/healthz
```

**Réponse :**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-22T10:30:00Z",
  "service": "mental-journal-api"
}
```

**Frontend (Next.js) :**
```typescript
// Pas d'usage direct frontend, mais utile pour un status page
const { data: health } = useQuery({
  queryKey: ['health'],
  queryFn: () => fetch('/healthz').then(r => r.json()),
  refetchInterval: 30000 // Check toutes les 30s
});

return <StatusBadge status={health?.status} />;
```

---

### GET `/config`

**Utilité :** Afficher le contexte projet dans l'UI (settings, debug panel)

**Exemple :**
```bash
curl http://localhost:8080/config
```

**Réponse :**
```json
{
  "project_id": "mental-journal-dev",
  "region": "europe-west1",
  "buckets": {
    "raw": "mj-audio-raw-mental-journal-dev",
    "analytics": "mj-analytics-mental-journal-dev",
    "reports": "mj-reports-mental-journal-dev"
  },
  "gemini_model": "gemini-2.0-flash-exp",
  "location": "global"
}
```

**Frontend (Next.js) :**
```typescript
// Page Settings
const { data: config } = useQuery({
  queryKey: ['config'],
  queryFn: () => fetch('/config').then(r => r.json())
});

return (
  <Card>
    <h3>Configuration</h3>
    <dl>
      <dt>Projet GCP</dt>
      <dd>{config?.project_id}</dd>
      <dt>Région</dt>
      <dd>{config?.region}</dd>
      <dt>Modèle IA</dt>
      <dd>{config?.gemini_model}</dd>
    </dl>
  </Card>
);
```

---

## 2. Upload & Ingestion

### POST `/v1/sign-upload`

**Utilité :** Générer URL signée pour upload direct vers GCS (évite timeout API)

**Body :**
```json
{
  "week": "2025-W42",
  "session_id": "session_001",
  "content_type": "audio/wav"
}
```

**Réponse :**
```json
{
  "upload_url": "https://storage.googleapis.com/mj-audio-raw-mental-journal-dev/2025-W42/session_001.wav?X-Goog-Algorithm=...",
  "object_path": "2025-W42/session_001.wav",
  "bucket": "mj-audio-raw-mental-journal-dev",
  "expires_in_seconds": 3600
}
```

**Frontend (Next.js) :**
```typescript
// Composant d'upload audio
const uploadAudio = useMutation({
  mutationFn: async ({ file, week }: { file: File; week: string }) => {
    const sessionId = `session_${Date.now()}`;
    
    // 1. Obtenir URL signée
    const { upload_url, object_path } = await fetch('/v1/sign-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        week,
        session_id: sessionId,
        content_type: file.type
      })
    }).then(r => r.json());
    
    // 2. Upload direct vers GCS
    await fetch(upload_url, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type }
    });
    
    return { sessionId, objectPath: object_path };
  },
  onSuccess: ({ sessionId }) => {
    toast.success(`Audio uploadé : ${sessionId}`);
  }
});

// Utilisation
<input
  type="file"
  accept="audio/*"
  onChange={(e) => {
    const file = e.target.files?.[0];
    if (file) uploadAudio.mutate({ file, week: '2025-W42' });
  }}
/>
```

---

### POST `/v1/ingest/finish`

**Utilité :** Déclencher le traitement d'une session (STT + Prosody + NLU)

**Body :**
```json
{
  "week": "2025-W42",
  "session_id": "session_001"
}
```

**Réponse :**
```json
{
  "session_id": "session_001",
  "week": "2025-W42",
  "artifacts": {
    "transcript": "gs://mj-analytics-mental-journal-dev/2025-W42/session_001/transcript.json",
    "prosody": "gs://mj-analytics-mental-journal-dev/2025-W42/session_001/prosody_features.json",
    "nlu": "gs://mj-analytics-mental-journal-dev/2025-W42/session_001/events_emotions.json",
    "audio_uri": "gs://mj-audio-raw-mental-journal-dev/2025-W42/session_001.wav"
  }
}
```

**Frontend (Next.js) :**
```typescript
// Après upload, déclencher traitement
const processSession = useMutation({
  mutationFn: async ({ week, sessionId }: { week: string; sessionId: string }) => {
    const response = await fetch('/v1/ingest/finish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week, session_id: sessionId })
    });
    
    if (!response.ok) throw new Error('Processing failed');
    return response.json();
  },
  onSuccess: (data) => {
    toast.success('Session traitée avec succès !');
    queryClient.invalidateQueries(['sessions', data.week]);
  }
});

// Workflow complet upload + traitement
const handleAudioSubmit = async (file: File, week: string) => {
  // 1. Upload
  const { sessionId } = await uploadAudio.mutateAsync({ file, week });
  
  // 2. Traiter
  await processSession.mutateAsync({ week, sessionId });
};
```

---

## 3. Sessions & Semaines

### GET `/v1/weeks`

**Utilité :** Liste toutes les semaines disponibles (pour sélecteur)

**Réponse :**
```json
{
  "weeks": ["2025-W42", "2025-W41", "2025-W40"],
  "total": 3
}
```

**Frontend (Next.js) :**
```typescript
// Sélecteur de semaine
const { data } = useQuery({
  queryKey: ['weeks'],
  queryFn: () => fetch('/v1/weeks').then(r => r.json())
});

return (
  <Select value={selectedWeek} onValueChange={setSelectedWeek}>
    <SelectTrigger>
      <SelectValue placeholder="Choisir une semaine" />
    </SelectTrigger>
    <SelectContent>
      {data?.weeks.map(week => (
        <SelectItem key={week} value={week}>
          {week}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);
```

---

### GET `/v1/weeks/{week}/sessions`

**Utilité :** Liste les sessions d'une semaine avec statut des artefacts

**Réponse :**
```json
{
  "week": "2025-W42",
  "sessions": [
    {
      "session_id": "session_001",
      "artifacts": {
        "transcript": true,
        "prosody": true,
        "nlu": true
      }
    }
  ],
  "total": 1
}
```

**Frontend (Next.js) :**
```typescript
// Liste des sessions avec badges de statut
const { data } = useQuery({
  queryKey: ['sessions', week],
  queryFn: () => fetch(`/v1/weeks/${week}/sessions`).then(r => r.json()),
  enabled: !!week
});

return (
  <div className="space-y-2">
    {data?.sessions.map(session => (
      <Card key={session.session_id}>
        <div className="flex items-center justify-between">
          <span className="font-mono">{session.session_id}</span>
          <div className="flex gap-2">
            {session.artifacts.transcript && <Badge variant="success">✓ Transcript</Badge>}
            {session.artifacts.prosody && <Badge variant="success">✓ Prosody</Badge>}
            {session.artifacts.nlu && <Badge variant="success">✓ NLU</Badge>}
          </div>
        </div>
      </Card>
    ))}
  </div>
);
```

---

### GET `/v1/weeks/{week}/sessions/{session_id}`

**Utilité :** Récupérer toutes les données d'une session (détail)

**Réponse :**
```json
{
  "week": "2025-W42",
  "session_id": "session_001",
  "transcript": {
    "transcript": "Aujourd'hui j'ai eu une journée difficile...",
    "words": [...]
  },
  "prosody": {
    "pitch_mean": 180.5,
    "energy_mean": 0.045,
    "pause_count": 12
  },
  "nlu": {
    "events": ["Réunion difficile"],
    "emotions": [
      {"label": "stress", "confidence": 0.85}
    ],
    "themes": ["travail", "fatigue"]
  }
}
```

**Frontend (Next.js) :**
```typescript
// Page de détail session
const { data: session } = useQuery({
  queryKey: ['session', week, sessionId],
  queryFn: () => fetch(`/v1/weeks/${week}/sessions/${sessionId}`).then(r => r.json())
});

return (
  <div className="space-y-6">
    <Card>
      <h3>Transcription</h3>
      <p className="text-muted-foreground">{session?.transcript?.transcript}</p>
    </Card>
    
    <Card>
      <h3>Analyse prosodique</h3>
      <ProsodyChart data={session?.prosody} />
    </Card>
    
    <Card>
      <h3>Émotions détectées</h3>
      <EmotionsList emotions={session?.nlu?.emotions} />
    </Card>
    
    <Card>
      <h3>Événements</h3>
      <EventsTimeline events={session?.nlu?.events} />
    </Card>
  </div>
);
```

---

## 4. Rapports

### GET `/v1/weeks/{week}/report`

**Utilité :** Récupérer le rapport hebdomadaire (JSON)

**Réponse :**
```json
{
  "week": "2025-W42",
  "user_tz": "Europe/Paris",
  "sessions": 5,
  "emotion_index": 68.5,
  "trend": "up",
  "highlights": ["Réunion réussie", "Sortie entre amis"],
  "prosody_summary": {
    "pitch_mean": 185.2,
    "energy_mean": 0.048,
    "pause_rate": 0.15
  }
}
```

**Frontend (Next.js) :**
```typescript
// Dashboard hebdomadaire
const { data: report } = useQuery({
  queryKey: ['report', week],
  queryFn: () => fetch(`/v1/weeks/${week}/report`).then(r => r.json())
});

return (
  <div className="grid grid-cols-2 gap-6">
    <Card>
      <h3>Index émotionnel</h3>
      <EmotionGauge value={report?.emotion_index} trend={report?.trend} />
    </Card>
    
    <Card>
      <h3>Sessions cette semaine</h3>
      <div className="text-4xl font-bold">{report?.sessions}</div>
    </Card>
    
    <Card className="col-span-2">
      <h3>Points forts de la semaine</h3>
      <ul className="list-disc pl-4">
        {report?.highlights.map((h, i) => <li key={i}>{h}</li>)}
      </ul>
    </Card>
  </div>
);
```

---

### GET `/v1/weeks/{week}/report/pdf`

**Utilité :** Télécharger le PDF du rapport

**Frontend (Next.js) :**
```typescript
// Bouton de téléchargement
<Button
  onClick={() => {
    window.open(`/v1/weeks/${week}/report/pdf`, '_blank');
  }}
>
  <FileDown className="mr-2 h-4 w-4" />
  Télécharger PDF
</Button>
```

---

### GET `/v1/weeks/{week}/report/signed`

**Utilité :** URL signée pour afficher le PDF dans un viewer

**Réponse :**
```json
{
  "week": "2025-W42",
  "signed_url": "https://storage.googleapis.com/...",
  "expires_in_seconds": 3600
}
```

**Frontend (Next.js) :**
```typescript
// Viewer PDF intégré
const { data } = useQuery({
  queryKey: ['pdf-url', week],
  queryFn: () => fetch(`/v1/weeks/${week}/report/signed`).then(r => r.json())
});

return (
  <iframe
    src={data?.signed_url}
    className="w-full h-[800px] rounded-lg border"
    title={`Rapport ${week}`}
  />
);
```

---

### GET `/v1/reports/history`

**Utilité :** Liste l'historique des rapports

**Réponse :**
```json
{
  "reports": [
    {
      "week": "2025-W42",
      "json_url": "/v1/weeks/2025-W42/report",
      "pdf_url": "/v1/weeks/2025-W42/report/pdf",
      "has_pdf": true
    }
  ],
  "total": 1
}
```

**Frontend (Next.js) :**
```typescript
// Page historique
const { data } = useQuery({
  queryKey: ['reports-history'],
  queryFn: () => fetch('/v1/reports/history').then(r => r.json())
});

return (
  <div className="space-y-4">
    <h2>Historique des rapports</h2>
    {data?.reports.map(report => (
      <Card key={report.week} className="flex items-center justify-between">
        <Link href={`/dashboard/${report.week}`} className="font-mono">
          {report.week}
        </Link>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" asChild>
            <a href={report.json_url}>JSON</a>
          </Button>
          {report.has_pdf && (
            <Button size="sm" asChild>
              <a href={report.pdf_url} target="_blank">📄 PDF</a>
            </Button>
          )}
        </div>
      </Card>
    ))}
  </div>
);
```

---

### GET `/v1/reports/trends?weeks=4`

**Utilité :** Calculer les tendances multi-semaines

**Réponse :**
```json
{
  "trends": [
    {"week": "2025-W42", "emotion_index": 68.5, "num_sessions": 5},
    {"week": "2025-W41", "emotion_index": 55.2, "num_sessions": 4}
  ],
  "average_index": 61.85,
  "trend_direction": "up"
}
```

**Frontend (Next.js) :**
```typescript
// Graphique de tendance
const { data } = useQuery({
  queryKey: ['trends', weeksCount],
  queryFn: () => fetch(`/v1/reports/trends?weeks=${weeksCount}`).then(r => r.json())
});

return (
  <Card>
    <h3>Évolution de l'index émotionnel</h3>
    <LineChart
      data={data?.trends}
      index="week"
      categories={["emotion_index"]}
      colors={["blue"]}
      valueFormatter={(v) => `${v}/100`}
    />
    <TrendBadge direction={data?.trend_direction} />
  </Card>
);
```

---

## 5. Orchestration

### POST `/v1/run-week`

**Utilité :** Générer le rapport hebdomadaire (déclenche Cloud Run Job)

**Body :**
```json
{
  "week": "2025-W42"
}
```

**Réponse :**
```json
{
  "message": "Pipeline démarré pour la semaine 2025-W42",
  "week": "2025-W42",
  "execution_id": "projects/.../executions/...",
  "status": "running"
}
```

**Frontend (Next.js) :**
```typescript
// Bouton "Générer le rapport"
const generateReport = useMutation({
  mutationFn: async (week: string) => {
    const response = await fetch('/v1/run-week', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week })
    });
    return response.json();
  },
  onSuccess: (data) => {
    toast.success(`Génération du rapport ${data.week} démarrée`);
    // Démarrer le polling
    pollExecutionStatus(data.execution_id);
  }
});

<Button onClick={() => generateReport.mutate(currentWeek)}>
  ✨ Générer le rapport hebdomadaire
</Button>
```

---

### GET `/v1/pipeline/status/{execution_id}`

**Utilité :** Vérifier le statut d'une exécution (polling)

**Réponse :**
```json
{
  "execution_id": "...",
  "status": "RUNNING",
  "started_at": "2025-10-22T10:30:00Z",
  "completed_at": null,
  "exit_code": null
}
```

**Frontend (Next.js) :**
```typescript
// Polling du statut
const { data: status } = useQuery({
  queryKey: ['execution-status', executionId],
  queryFn: () => fetch(`/v1/pipeline/status/${executionId}`).then(r => r.json()),
  refetchInterval: (data) => {
    // Arrêter le polling si terminé
    if (data?.status === 'SUCCEEDED' || data?.status === 'FAILED') {
      return false;
    }
    return 5000; // Polling toutes les 5 secondes
  },
  enabled: !!executionId
});

if (status?.status === 'RUNNING') {
  return (
    <div className="flex items-center gap-2">
      <Loader2 className="animate-spin" />
      <span>Génération en cours...</span>
    </div>
  );
}

if (status?.status === 'SUCCEEDED') {
  queryClient.invalidateQueries(['report', week]);
  return <CheckCircle2 className="text-green-600" />;
}
```

---

### POST `/v1/pipeline/logs`

**Utilité :** Récupérer les logs du pipeline

**Body :**
```json
{
  "week": "2025-W42",
  "limit": 50
}
```

**Réponse :**
```json
{
  "logs": [
    {
      "timestamp": "2025-10-22T10:30:15Z",
      "severity": "INFO",
      "message": "🚀 Starting Mental Journal Pipeline for week: 2025-W42"
    }
  ],
  "total": 1
}
```

**Frontend (Next.js) :**
```typescript
// Console de logs en temps réel
const { data } = useQuery({
  queryKey: ['pipeline-logs', week],
  queryFn: () => fetch('/v1/pipeline/logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ week, limit: 100 })
  }).then(r => r.json()),
  refetchInterval: 3000 // Refresh toutes les 3 secondes
});

return (
  <Card>
    <CardHeader>
      <CardTitle>Logs du pipeline</CardTitle>
    </CardHeader>
    <CardContent>
      <pre className="bg-black text-green-400 p-4 rounded h-96 overflow-auto font-mono text-sm">
        {data?.logs.map((log, i) => (
          <div key={i} className={log.severity === 'ERROR' ? 'text-red-400' : ''}>
            [{log.timestamp}] {log.severity}: {log.message}
          </div>
        ))}
      </pre>
    </CardContent>
  </Card>
);
```

---

## 6. Flux complets

### Workflow 1 : Enregistrer une nouvelle session

```typescript
const recordAndProcessSession = async (audioBlob: Blob, week: string) => {
  const sessionId = `session_${Date.now()}`;
  
  // 1. Convertir Blob en File
  const audioFile = new File([audioBlob], `${sessionId}.wav`, { type: 'audio/wav' });
  
  // 2. Obtenir URL signée
  const { upload_url } = await fetch('/v1/sign-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ week, session_id: sessionId, content_type: 'audio/wav' })
  }).then(r => r.json());
  
  // 3. Upload vers GCS
  await fetch(upload_url, {
    method: 'PUT',
    body: audioFile,
    headers: { 'Content-Type': 'audio/wav' }
  });
  
  // 4. Traiter la session
  const result = await fetch('/v1/ingest/finish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ week, session_id: sessionId })
  }).then(r => r.json());
  
  return result;
};
```

### Workflow 2 : Générer le rapport hebdomadaire

```typescript
const generateWeeklyReport = async (week: string) => {
  // 1. Déclencher le pipeline
  const { execution_id } = await fetch('/v1/run-week', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ week })
  }).then(r => r.json());
  
  // 2. Polling du statut
  let status = 'RUNNING';
  while (status === 'RUNNING') {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Attendre 5s
    
    const result = await fetch(`/v1/pipeline/status/${execution_id}`)
      .then(r => r.json());
    status = result.status;
  }
  
  // 3. Récupérer le rapport
  if (status === 'SUCCEEDED') {
    const report = await fetch(`/v1/weeks/${week}/report`).then(r => r.json());
    return report;
  } else {
    throw new Error('Pipeline failed');
  }
};
```

### Workflow 3 : Dashboard complet

```typescript
const Dashboard = ({ week }: { week: string }) => {
  // Charger toutes les données en parallèle
  const { data: sessions } = useQuery({
    queryKey: ['sessions', week],
    queryFn: () => fetch(`/v1/weeks/${week}/sessions`).then(r => r.json())
  });
  
  const { data: report } = useQuery({
    queryKey: ['report', week],
    queryFn: () => fetch(`/v1/weeks/${week}/report`).then(r => r.json())
  });
  
  const { data: trends } = useQuery({
    queryKey: ['trends'],
    queryFn: () => fetch('/v1/reports/trends?weeks=4').then(r => r.json())
  });
  
  return (
    <div className="grid grid-cols-3 gap-6">
      <Card className="col-span-2">
        <EmotionIndexCard value={report?.emotion_index} trend={report?.trend} />
      </Card>
      
      <Card>
        <SessionsCountCard count={sessions?.total} />
      </Card>
      
      <Card className="col-span-3">
        <TrendsChart data={trends?.trends} />
      </Card>
      
      <Card className="col-span-3">
        <SessionsList sessions={sessions?.sessions} week={week} />
      </Card>
    </div>
  );
};
```

---

## 🎯 Résumé par use case

| Use case | Routes utilisées |
|----------|------------------|
| **Enregistrer une session** | `POST /v1/sign-upload` → Upload GCS → `POST /v1/ingest/finish` |
| **Voir le dashboard** | `GET /v1/weeks/{week}/report` + `GET /v1/weeks/{week}/sessions` |
| **Afficher une session** | `GET /v1/weeks/{week}/sessions/{sid}` |
| **Générer un rapport** | `POST /v1/run-week` → Polling `GET /v1/pipeline/status/{id}` |
| **Voir l'historique** | `GET /v1/reports/history` |
| **Analyser les tendances** | `GET /v1/reports/trends?weeks=N` |
| **Télécharger un PDF** | `GET /v1/weeks/{week}/report/pdf` |
| **Debug / Logs** | `POST /v1/pipeline/logs` |

---

**Total : 15 routes** couvrant tous les besoins du frontend Mental Journal ! 🚀
