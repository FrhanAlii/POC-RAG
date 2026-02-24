# POC RAG: AI-Powered Automation Pipeline

POC RAG is a sophisticated automation framework that leverages Retrieval-Augmented Generation (RAG) to bridge the gap between Test Management (TestRail) and Automated Execution (Playwright/Cucumber).

## 🚀 Overview

This project provides an end-to-end pipeline:
1.  **Fetch**: Pulls test cases from TestRail via API.
2.  **Generate**: Uses OpenAI LLMs combined with local automation patterns stored in **ChromaDB** to generate accurate Gherkin (.feature) files.
3.  **Execute**: Runs the generated features using **Playwright** with stealth capabilities to handle complex web interactions.
4.  **Monitor**: Provides a React-based **Dashboard** to track test execution status and results.

## 🛠️ Tech Stack

- **Language**: TypeScript
- **Automation**: Playwright, Cucumber-js
- **AI/LLM**: OpenAI GPT-4o
- **Vector DB**: ChromaDB
- **Dashboard**: Vite, React, TailwindCSS
- **Tools**: ts-node, zod, axios

## 📋 Prerequisites

- Node.js (v18+)
- npm or yarn
- Git

## ⚙️ Setup

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/FrhanAlii/POC-RAG.git
    cd POC-RAG
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment**:
    Create a `.env` file based on `.env.example`:
    ```env
    TESTRAIL_BASE_URL=https://your-instance.testrail.io
    TESTRAIL_USER=your-email
    TESTRAIL_API_KEY=your-api-key
    OPENAI_API_KEY=your-openai-key
    CHROMA_PATH=./chroma_db
    ```

4.  **Ingest Patterns**:
    Bootstrap the RAG system with known automation patterns:
    ```bash
    npm run ingest-patterns
    ```

## 🏃 Running Tests

- **Generate & Run specific case (e.g., Case 38)**:
  ```bash
  npm run test:auto38
  ```
- **Run all automated cases**:
  ```bash
  npm run test:auto
  ```
- **Legacy manual execution**:
  ```bash
  npm run test:case38
  ```

## 📊 Dashboard

The dashboard provides a visual interface for test results.

1.  Navigate to the dashboard directory:
    ```bash
    cd ui-dashboard
    ```
2.  Install dependencies and run:
    ```bash
    npm install
    npm run dev
    ```

## 📂 Project Structure

- `src/`: Core logic for RAG, Playwright, and API integrations.
- `scripts/`: CLI tools for orchestration and pattern ingestion.
- `features/`: Generated Gherkin files.
- `ui-dashboard/`: React status dashboard.
- `chroma_db/`: Local vector database storage.

---
Created by Antigravity AI.
