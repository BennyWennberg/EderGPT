# EderGPT

Unternehmensinternes KI-Wissenssystem - Kontrolliert, Sicher, Transparent.

## 🎯 Was ist EderGPT?

EderGPT ist ein CompanyGPT, das allgemeines LLM-Wissen mit unternehmensspezifischem Wissen aus internen Dokumenten kombiniert. Das System ist keine frei generierende KI, sondern eine intelligente Wissensschnittstelle.

## 🏗️ Architektur

### Zwei-Wege-System
- **Admin-Bereich**: Vollständige Systemkontrolle
- **User-Bereich**: Minimalistisch, nur Chat

### Wissenslogik
- **Ordnerbasiert**: Jeder Ordner = abgegrenzter Wissensraum
- **Drei Modi**: LLM-only, Hybrid, RAG-only
- **Strikte Berechtigungen**: User sieht nur zugewiesene Ordner

## 🚀 Quick Start

### Voraussetzungen
- Docker & Docker Compose
- OpenAI API Key

### Installation

1. **Repository klonen**
```bash
git clone <repository-url>
cd EderGPT
```

2. **Umgebungsvariablen setzen**
```bash
cp env.example .env
# .env bearbeiten und OPENAI_API_KEY eintragen
```

3. **Container starten**
```bash
docker-compose up -d
```

4. **Datenbank initialisieren**
```bash
docker-compose exec backend npx prisma migrate dev
docker-compose exec backend npx prisma db seed
```

5. **Anwendung öffnen**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Qdrant Dashboard: http://localhost:6333/dashboard

### Default Login
- **Admin**: `admin` / `admin123`
- **User**: `user` / `user123`

## 📁 Projektstruktur

```
EderGPT/
├── backend/                 # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── routes/         # API-Endpoints
│   │   ├── services/       # Business-Logik
│   │   ├── middleware/     # Auth, Error-Handling
│   │   └── types/          # TypeScript-Typen
│   └── prisma/             # Datenbank-Schema
│
├── frontend/               # React + TypeScript + Vite
│   ├── src/
│   │   ├── pages/admin/   # Admin-Bereich
│   │   ├── pages/user/    # User-Bereich
│   │   ├── components/    # UI-Komponenten
│   │   └── stores/        # State Management
│
└── docker-compose.yml      # Container-Orchestrierung
```

## 🔧 Tech-Stack

| Bereich | Technologie |
|---------|-------------|
| Backend | Node.js, Express, TypeScript |
| Datenbank | PostgreSQL + Prisma ORM |
| Vektoren | Qdrant |
| LLM | OpenAI GPT-4 / Azure OpenAI |
| Frontend | React 18, Vite, Tailwind CSS |
| State | Zustand |
| Auth | JWT |

## 📖 Features

### Admin-Bereich
- Dashboard mit Statistiken
- User-Verwaltung mit Ordner-Zuweisung
- Knowledge-Explorer (Ordner & Dokumente)
- System Settings (LLM, RAG, Prompts, Logging)
- Audit-Logs & Analytics
- User-Vorschau (als User simulieren)

### User-Bereich
- Chat mit Quellenanzeige
- Chat-Historie
- Profil-Einstellungen
- Feedback-Funktion

### RAG-Pipeline
- Automatisches Chunking (semantisch)
- Embedding-Generierung
- Berechtigungsgefiltertes Retrieval
- Transparente Quellenangabe

## 🛡️ Sicherheit

- JWT-basierte Authentifizierung
- Rollenbasierte Zugriffskontrolle
- Strikte Admin/User-Trennung
- Audit-Logging aller Aktionen
- DSGVO-konform

## 📄 Lizenz

Proprietär - Nur für internen Unternehmenseinsatz.

