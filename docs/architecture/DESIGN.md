# From Data Agent to ERP-Native Reasoning Engine: A Product-First Design

**Author:** Manus AI | **Date:** February 28, 2026 | **Version:** Final v4

---

## Table of Contents

1. [Part 1: The Vision & The Gap](#part-1-the-vision--the-gap)
2. [Part 2: The Product-First Architecture](#part-2-the-product-first-architecture)
3. [Part 3: The Three-Layered Knowledge Base](#part-3-the-three-layered-knowledge-base)
4. [Part 4: The Learning & Persona Layers](#part-4-the-learning--persona-layers)
5. [Part 5: The Reconciliation Engine (Tiered Model)](#part-5-the-reconciliation-engine)
6. [Part 6: LLM Usage Map](#part-6-llm-usage-map)
7. [Part 7: Monetization Strategy](#part-7-monetization-strategy)
8. [Part 8: Development Workflow & Kickoff Package](#part-8-development-workflow--kickoff-package)
9. [Part 9: Implementation Roadmap](#part-9-implementation-roadmap)

---

## Part 1: The Vision & The Gap

### 1.1. Introduction

The current D365 F&O Data Agent is a powerful tool for translating natural language questions into SQL queries. However, to evolve into a true reasoning engine that can answer complex, multi-faceted business questions like *"which customers are at risk of not paying their next bill and why?"*, a fundamental architectural shift is required. This document provides a comprehensive analysis of the current system and a detailed architectural proposal for a new **ERP-Native Reasoning Engine** — a self-contained, intelligent product.

### 1.2. The Vision: An Agentic Data Analyst

The goal is to transform the data agent into an **Agentic Data Analyst** capable of:

- **Decomposition:** Breaking down complex, high-level business questions into a series of smaller, manageable sub-tasks.
- **Multi-Step Reasoning:** Executing a sequence of steps, where the output of one step informs the input of the next.
- **Tool Use:** Leveraging a diverse set of tools (including, but not limited to, SQL generation) to accomplish its goals.
- **Self-Correction and Iteration:** Evaluating the results of its actions and adjusting its plan accordingly.
- **Explanation:** Articulating its reasoning process and the justification for its conclusions.

### 1.3. Gap Analysis: Current Architecture vs. Agentic Vision

The current architecture, while effective for single-shot query generation, has several limitations that prevent it from realizing the agentic vision.

| Capability | Current Architecture | Agentic Requirement | Gap |
| :--- | :--- | :--- | :--- |
| **Reasoning & Planning** | **Monolithic Pipeline:** Follows a fixed, linear sequence: Intent → Generate → Review → Execute. | **Dynamic Planning:** Decomposes complex queries into a multi-step plan. | The current system cannot create or execute dynamic, multi-step plans. |
| **Tool Use & Orchestration** | **Single Tool Focus:** The entire pipeline is optimized for a single tool: SQL query generation. | **Diverse Tool Library:** Requires a library of tools for data analysis, risk assessment, explanation, etc. | The current architecture lacks a mechanism for defining, selecting, and orchestrating multiple tools. |
| **Agent Loop** | **Request-Response Model:** Operates on a simple request-response model. | **ReAct Loop (Reason-Act-Observe):** Needs an iterative loop to reason, act, observe the outcome, and then reason again. | The current system lacks a core agent loop for iterative problem-solving. |
| **State Management** | **Stateless:** Each query is treated as an independent transaction. | **Stateful Execution:** Requires a state manager to maintain context and pass information between steps. | The current architecture has no concept of a multi-step state that persists across tool calls. |
| **Domain Ambiguity** | **Basic Clarification:** A client-side ambiguity detector checks for simple patterns. | **Deep Disambiguation:** Must understand that "delivery date" in D365 could mean confirmed date, receipt date, or packing slip date, and proactively ask the user. | The current system lacks deep ERP domain knowledge for disambiguation. |
| **Validation & Trust** | **No Validation:** The agent returns results without any verification against known-correct sources. | **Self-Reconciliation:** Must validate its answers against standard D365 reports (DP classes) and present a confidence score. | There is no reconciliation mechanism. |
| **Learning** | **Limited Auto-Learning:** Learns table/column descriptions from query results. | **Comprehensive Learning:** Must learn business rules, terminology preferences, disambiguation resolutions, and successful query patterns from every conversation. | The learning scope is too narrow. |

In essence, the current system is a **query generator**, not a **reasoning agent**.

---

## Part 2: The Product-First Architecture

### 2.1. Core Principle: Own Your Value

To be a product, not a feature, our architecture must be self-contained. Our core value proposition — the Reasoning Engine and the Knowledge Base — must be entirely our own IP, with zero dependency on third-party services for critical functionality. This ensures we control our destiny, our pricing, and our competitive advantage. Third-party MCP servers (such as the D365 ERP Analytics MCP or the D365 ERP MCP) are treated as **optional connectors**, not core dependencies.

### 2.2. The Architecture

![Overall Product Architecture](https://files.manuscdn.com/user_upload_by_module/session_file/310519663316655797/kvOreKtkeNOgNhEe.png)

The architecture is composed of three main parts:

**Core Product (Your Local Machine / Cloud):** The brain of the operation. It includes the Planner Agent, Tool Library (SQL Generator, Data Analyzer, Disambiguation, Explanation), the three-layered Knowledge Base, the Conversation Learning Agent, and our own Core Data Access Layer (direct SQL connection).

**Remote Backend (Tier 2 Environment):** The Tier 2 D365 environment serves as a passive backend. It hosts the Azure SQL database (AxDB) that the agent queries remotely via JIT access, and the X++ Companion Plugin that exposes DP class logic via OData for reconciliation.

**Metadata Source (X++ Source Code, Local Copy):** A local copy of the D365 X++ source code (originally from the Tier 1 dev box's K: drive) provides the raw metadata — table definitions, view definitions, data entity definitions, enum values, and report DP class logic — that the Knowledge Ingestion Service parses to build the agent's brain.

### 2.3. Environment Topology

Understanding the D365 environment landscape is critical. Microsoft defines specific "tiers" for D365 F&O environments:

| Environment | What It Is | SQL Server | Our Use |
| :--- | :--- | :--- | :--- |
| **Tier 1 (Dev Box)** | A single VM with everything: SQL Server, AOS, Visual Studio, X++ source code (K: drive). You have full admin/RDP access. | **Local SQL Server** on the same VM, full SA access. | **X++ Companion Plugin development and deployment.** We write the X++ code, you deploy it here via Visual Studio, then promote to Tier 2. Also the source of the X++ metadata files. |
| **Tier 2 (Sandbox/UAT)** | A multi-box, Microsoft-managed environment. Separate SQL and AOS. | **Azure SQL** — JIT access, credentials expire every 8 hours. | **Our primary testing and runtime backend.** Claude Code connects here remotely for SQL queries and OData calls. |
| **Tier 4/5 (Production)** | Full production, high availability. No direct access. | **Azure SQL** — no direct access. | **Not used directly.** Data is exported as `.bacpac` and imported into Tier 2 or Tier 1 for testing. |

### 2.4. Data Flow

The data flows through the system as follows:

> **X++ Source Code** (copied from Tier 1 K: drive to your local machine) → **Knowledge Ingestion Service** (parses XML, builds the KB) → **Three-Layered Knowledge Base** (stored locally or in cloud DB)
>
> **User Question** → **Planner Agent** (creates a plan) → **SQL Generator Agent** (generates SQL, informed by KB) → **Tier 2 Azure SQL** (executes query, returns results) → **Data Analyzer Agent** (analyzes results) → **Explanation Agent** (presents results with reasoning)
>
> **Reconciliation:** Agent's SQL results → compared against → **X++ Companion Plugin on Tier 2** (DP class output via OData) → **Confidence Score**

---

## Part 3: The Three-Layered Knowledge Base

The heart of the engine is its Knowledge Base (KB). Think of it like a new employee who needs three different "brains" to answer business questions effectively.

![KB Layers Overview](https://files.manuscdn.com/user_upload_by_module/session_file/310519663316655797/RYngYePUAOuVxVqx.png)

### 3.1. Layer 1: The Database Map (Structural / Graph DB)

**Analogy:** Like giving the new employee the complete ER diagram of the entire D365 database.

This layer is the **complete technical blueprint** of the D365 database. It's a perfect, structured map of every table, field, relationship, enum value, and view definition. It is populated by the **Knowledge Ingestion Service**, which parses the X++ source XML files (`AxTable`, `AxView`, `AxDataEntityView`, `AxEnum`).

> **It answers:** *"How do I join CustTable and SalesTable? What are the valid values for the CustPaymStatus enum?"*

**Technology:** A graph database (Neo4j or Cosmos DB Gremlin).

![Layer 1 Graph Example](https://files.manuscdn.com/user_upload_by_module/session_file/310519663316655797/AJTugiAAPeKEwMSu.png)

The graph above shows a concrete example: the `CustTransOpen` view is connected to `CustTable` via the `AccountNum` field. The `CustTable` has a `PaymTermId` field that links to `PaymTerm`. The `TransStatus` field maps to the `CustTransRefType` enum, which has specific values like `Pmt` (Payment), `Invoice`, `Interest`, etc.

### 3.2. Layer 2: The Search Engine (Semantic / Vector DB)

**Analogy:** Like a powerful search engine that translates plain English into the correct technical table and field names.

When a user says "overdue invoices," the system needs to figure out *which* tables and fields are relevant. The user didn't say `CustTransOpen` or `DueDate` — they said "overdue invoices" in plain English. Layer 2 converts that natural language into a vector and searches for the closest matching metadata. It finds that `CustTransOpen` (description: "open customer transactions") and `DueDate` (description: "payment due date") are the best matches.

> **It answers:** *"Which tables and fields are relevant to 'overdue invoices'?"*

**Technology:** A vector database (Pinecone, pgvector, or Azure AI Search).

**Data Sources:** Layer 2 is populated from two sources:
1. **X++ Metadata:** The names, labels, and help text of every table, field, view, and data entity, extracted by the Knowledge Ingestion Service.
2. **D365 Business Process Glossary:** 185K+ characters of D365-specific terminology from Microsoft's official glossary, providing rich semantic descriptions of business concepts.

### 3.3. Layer 3: The Consultant's Notes (Heuristic / Rules DB)

**Analogy:** Like a collection of sticky notes from your most senior D365 consultant, capturing the gotchas, best practices, and unwritten rules.

Even after Layer 2 finds the right tables and Layer 1 knows how to join them, there are still gotchas that only an experienced D365 consultant would know. For example:

- *"Always use `CustTransOpen` for open balances, never query `CustTrans` and filter by status — the settlement logic is different."*
- *"When the user says 'delivery date,' ask them whether they mean the confirmed date, the receipt date, or the packing slip date."*
- *"Charge Code in D365 means `MarkupTrans`/`MarkupTable`, not a GL account code."*
- *"For this specific customer, 'overdue' means DueDate < today() - 90, not the standard 30 days."*

> **It answers:** *"Are there any gotchas, best practices, or disambiguation rules I should apply?"*

**Technology:** A relational database (MySQL, PostgreSQL).

**Data Sources:** Layer 3 is populated from three sources:
1. **D365 Glossary (D365-specific nuances):** Terms whose meaning in D365 differs from generic ERP usage become explicit terminology rules.
2. **Human-authored rules:** A D365 functional consultant seeds the initial set of disambiguation rules, reconciliation mappings, and best practices.
3. **Conversation Learning Pipeline:** Over time, the system learns new rules from every user interaction (see Part 4).

### 3.4. How They Work Together: The Integrated Query Process

When a user asks a question, the three layers work together in sequence:

1. **Step 1 (Layer 2 — Semantic Search):** The user's question is converted to a vector and searched against Layer 2. Result: a list of candidate tables and fields (e.g., `CustTransOpen`, `DueDate`, `AmountCur`).

2. **Step 2 (Layer 1 — Graph Traversal):** The agent queries Layer 1 to understand how the candidate tables are related. It discovers the join path: `CustTransOpen.AccountNum → CustTable.AccountNum`. It also retrieves enum values and field types.

3. **Step 3 (Layer 3 — Rules Check):** The agent checks Layer 3 for any applicable rules. It finds: *"When querying open balances, always use CustTransOpen, not CustTrans filtered by status."* It also finds a disambiguation rule: *"For CompanyX, 'overdue' means > 90 days."*

4. **Step 4 (SQL Generation):** Armed with the correct tables, join paths, and business rules, the SQL Generator Agent produces an accurate, D365-aware SQL query.

### 3.5. Ingesting the D365 Business Process Glossary

The official Microsoft D365 Business Process Glossary is a rich source of domain knowledge. It is not simply dumped into one layer — it is **split and ingested into both Layer 2 and Layer 3**.

![Glossary Ingestion Flow](https://files.manuscdn.com/user_upload_by_module/session_file/310519663316655797/lqRectdIJsnVRzmG.png)

| Glossary Content | Goes Into | Why |
| :--- | :--- | :--- |
| **Descriptive text** of each term (e.g., "Aging periods define the time intervals used to analyze customer and vendor balances by due date") | **Layer 2 (Vector DB)** | Enriches the semantic search vocabulary so the agent can match natural language to the correct D365 concepts. |
| **D365-specific meaning** that differs from generic ERP usage (e.g., "Charge Code in D365 refers to miscellaneous charges on MarkupTrans/MarkupTable, not a GL account code") | **Layer 3 (Rules DB)** | Becomes explicit terminology and disambiguation rules that prevent the agent from making incorrect assumptions based on generic ERP knowledge. |

---

## Part 4: The Learning & Persona Layers

### 4.1. The Learning Flywheel: Conversation Learning Pipeline

Every user conversation is a free training session. The **Conversation Learning Pipeline** creates a powerful competitive moat by making the product smarter with every interaction.

![Conversation Learning Pipeline](https://files.manuscdn.com/user_upload_by_module/session_file/310519663316655797/mSUsKNedqXmcObta.png)

The pipeline works as follows:

**During Conversation:** The agent records user corrections and preferences in a scratchpad. For example, if the user says *"No, I only care about invoices over 90 days, not 30 days,"* this is captured as a potential new rule.

**Post-Conversation:** A **Learning Agent** (LLM-powered) analyzes the conversation history and extracts structured learnings:
- **Corrections** → saved as rules in Layer 3
- **Disambiguation resolutions** → saved as disambiguation rules in Layer 3
- **New terminology mappings** → saved in Layer 2 (embeddings) and Layer 3 (explicit rules)
- **Successful query patterns** → saved as "golden queries" in Layer 3 for future reuse

**Approval Gate (Hybrid Approach):**
- **Auto-approved (low-risk):** Terminology preferences, date interpretations that the user explicitly confirmed.
- **Admin-approved (high-risk):** Reconciliation rules, new join patterns, business logic corrections — these go into a "Pending Review" queue for an admin to approve before they become permanent rules.

**KB Update:** Approved learnings are permanently saved to the Knowledge Base, making the agent smarter for the next conversation. Over time, each customer's Layer 3 becomes increasingly personalized — this is the product's **moat**.

---

## Part 5: The Reconciliation Engine

The Reconciliation Engine is the most critical component for building user trust. It ensures that the agent's answers are not just plausible, but verifiably correct against D365's own business logic. This is achieved by using the report's Data Provider (DP) class as the "gold standard" for validation.

### 5.1. DP Class as the Gold Standard

For any given business question (e.g., "What are my overdue customer balances?"), there are two ways to get an answer:

1.  **The Agent's Way:** Generate a SQL query against the raw tables (`CustTrans`, `CustSettlement`, etc.). This is fast and flexible, but risks missing complex business logic.
2.  **The D365 Way:** Run the standard `CustAgingReport`, which uses the `CustAgingReportDP` class. This class contains the exact, Microsoft-certified business logic for calculating aging balances.

Our architecture uses the DP class as the definitive source of truth. If the agent's SQL query produces the same result as the DP class, the answer is considered **100% verified**.

### 5.2. The X++ Companion Plugin

To enable this, we need a small X++ project deployed on the Tier 1 box (and promoted to Tier 2) called the **X++ Companion Plugin**. Its sole purpose is to expose the DP classes as OData actions that our external agent can call.

This plugin contains a set of simple wrapper classes. For example:

```csharp
class AIAgentCustAgingService
{
    [SysODataActionAttribute("GetCustAgingReportData", false)]
    public static str GetCustAgingReportData(CustAgingReportContract _contract)
    {
        CustAgingReportDP dataProvider = new CustAgingReportDP();
        dataProvider.parmDataContract(_contract);
        dataProvider.processReport();
        return RetailCommonWebAPI::getTablesDataAsJson(dataProvider.getTempTableName());
    }
}
```

This code receives a request, runs the standard DP class, and returns the resulting temp table data as JSON. It does not modify any standard code; it simply makes the existing report logic callable from the outside.

### 5.3. The Tiered Reconciliation Model

Calling the DP class for every query would be too slow. Instead, we use a tiered approach that balances speed and accuracy:

![Tiered Reconciliation Model](https://files.manuscdn.com/user_upload_by_module/session_file/310519663316655797/FhEPNrFVpXJBQMZR.png)

**Tier 1: Golden Query Library (Instant)**

For the most common questions, we pre-validate the SQL query against the DP class **once** and save it as a "golden query." Future queries that match this pattern use the saved SQL directly, providing an instant, verified response.

**Tier 2: On-Demand Verification (User-Triggered)**

For ad-hoc queries, the agent returns results immediately based on its own SQL. The user sees a **"Verify" button**. If they click it, the system then calls the DP class and shows a side-by-side comparison.

**Tier 3: Background Verification & Report Saving (Async)**

For important queries, the system runs the DP class verification **in the background**. If the results match, the query is automatically promoted to the Golden Query Library. If they don't match, it flags the discrepancy for review. This creates a learning flywheel where the system's library of trusted, saved reports grows over time.

This tiered model provides the best of both worlds: instant responses for most queries, with the option for 100% verification when needed, all while continuously improving the system's accuracy and performance.

### 5.4. Deployment Path for the X++ Companion Plugin

The deployment follows the standard D365 promotion path:

1. **Manus generates the X++ code** — the wrapper classes for each DP class.
2. **You deploy to Tier 1** via RDP — build in Visual Studio, synchronize the database.
3. **You create a Deployable Package** from the Tier 1 build.
4. **You apply the package to Tier 2** via LCS (Lifecycle Services).
5. **Claude Code connects to Tier 2** and can now call the DP class wrappers via OData for reconciliation testing.

### 5.5. Sample X++ Code: CustAgingReport Service Wrapper

**File: `AIAgentCustAgingService.xpp`**
```xpp
class AIAgentCustAgingService
{
    [SysODataActionAttribute("GetCustAgingReportData", false)]
    public static str GetCustAgingReportData(CustAgingReportContract _contract)
    {
        CustAgingReportDP dataProvider = new CustAgingReportDP();
        dataProvider.parmDataContract(_contract);
        dataProvider.processReport();
        return RetailCommonWebAPI::getTablesDataAsJson(dataProvider.getTempTableName());
    }
}
```

This pattern can be replicated for any DP class (VendAgingReportDP, LedgerTrialBalanceDP, etc.).

### 5.6. Saved Reports & Future Reuse

Verified query results are saved in **our system** (Layer 3 of the Knowledge Base), not in D365's reporting system. Each saved report contains the SQL query, the parameters, the DP class mapping, and the verified output. Over time, this creates a growing library of trusted, instant-response reports.

In later phases, we will add **export capabilities** so users can consume these saved reports in their preferred format: Excel download, chart visualization, or Power BI dataset export. This positions our product as the **intelligence layer** — it figures out the answer, and the user chooses how to consume it.

---

## Part 6: LLM Usage Map

### 6.1. Every LLM Call Point in the Architecture

| # | Component | LLM Call Purpose | When It's Called | Model Size |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Planner Agent** | Decompose the user's question into a multi-step execution plan | Every user query | **Large** (GPT-4.1 / Claude Sonnet) |
| 2 | **SQL Generator Agent** | Translate a sub-task into a SQL query, using schema from Layer 1 and rules from Layer 3 | 1-3x per query | **Large** |
| 3 | **Data Analyzer Agent** | Analyze query results, identify patterns, calculate derived metrics, draw conclusions | Complex queries only | **Large** |
| 4 | **Disambiguation Agent** | Generate clarification questions when the user's question is ambiguous | When Layer 3 flags an ambiguous term | **Medium** (GPT-4.1-mini) |
| 5 | **Explanation Agent** | Generate human-readable reasoning for why certain results were selected | Every query | **Medium** |
| 6 | **Reconciliation Explainer** | Explain discrepancies between agent results and DP class output | Only when discrepancy found (rare) | **Medium** |
| 7 | **Conversation Learning Agent** | Extract new rules, terminology, and corrections from conversation history | Post-conversation batch | **Large** |
| 8 | **Embedding Model** | Generate vector embeddings for semantic search in Layer 2 | Every query + ingestion | **Small** (text-embedding-3-small) |

### 6.2. Cost Optimization Strategy

**Use a large model** (GPT-4.1, Claude Sonnet) only for the Planner and SQL Generator — these are the critical reasoning steps where accuracy is paramount.

**Use a smaller/cheaper model** (GPT-4.1-mini, Gemini Flash) for Explanation, Disambiguation, and Reconciliation — these are more templated tasks where a smaller model is sufficient.

**Batch the Learning Agent** — run it post-conversation (or every 10 messages), not per-message, to minimize calls.

**Cache aggressively** — if the same question (or a very similar one) has been asked before and a Golden Query exists, skip the LLM entirely and use the cached query. This is the most powerful cost optimization.

---

## Part 7: Monetization Strategy

### 7.1. Product, Not Feature

Our architecture directly supports a product-based monetization strategy. We license the **Core Product**, which works independently. Optional connectors are value-adds, not dependencies.

![Monetization Boundary](https://files.manuscdn.com/user_upload_by_module/session_file/310519663316655797/GOjHbnbqsIrZXFQG.png)

| What We License (Core Product) | What Is Optional |
| :--- | :--- |
| The Reasoning Engine (Planner, SQL Generator, Data Analyzer, Explanation) | D365 ERP Analytics MCP (requires BPA license from Microsoft) |
| The 3-Layer Knowledge Base | D365 ERP MCP (requires Microsoft Copilot license) |
| The Knowledge Ingestion Service | Community MCP servers (FlintsLabs, etc.) |
| The Conversation Learning Pipeline | |
| The Reconciliation Engine | |
| Our own Data Access Layer (direct SQL) | |

### 7.2. Licensing Risk Assessment

| MCP Server | License | Risk to Our Product |
| :--- | :--- | :--- |
| **D365 ERP Analytics MCP** | Requires BPA + Copilot license from Microsoft | If we depend on it, Microsoft controls our feature set and pricing. |
| **D365 ERP MCP** | Requires Copilot license | Same risk. Microsoft could build the same thing into Copilot. |
| **Community (FlintsLabs)** | Open source (MIT) | No licensing cost, but no SLA, no support, no guarantees. |

**Our moat is the Reasoning Engine + Knowledge Base + Conversation Learning.** This is what we own, what we charge for, and what no third party can replicate.

---

## Part 8: Development Workflow & Kickoff Package

### 8.1. The "Local-First, Tier 2 Backend" Model

All active development happens on your local machine using **Claude Code** as the AI coding agent. The **Tier 2 environment** acts as a passive, remote backend for SQL queries and OData calls. The **Tier 1 dev box** is used only for X++ compilation and deployment (via RDP).

![Development Workflow](https://files.manuscdn.com/user_upload_by_module/session_file/310519663316655797/ivaDXJAcghmjahFz.png)

### 8.2. Local Machine Setup

Your local machine needs only the following:

| Component | What It Is | How to Install |
| :--- | :--- | :--- |
| **Claude Code** | The AI coding agent | `npm install -g @anthropic-ai/claude-code` |
| **Node.js 22+ & pnpm** | Runtime for the AIDataAgent app | Standard Node.js installer |
| **X++ Source Files** | Local copy of D365 metadata (from Tier 1 K: drive) | Copy/clone from Tier 1 or Azure DevOps |
| **SQL MCP Server** | Lets Claude Code query the Tier 2 Azure SQL | `claude mcp add sql-server npx -y @anthropic-ai/mcp-server-mssql --connection-string "<TIER2_CONN_STRING>"` |
| **Filesystem MCP Server** | Lets Claude Code read the local X++ source files | `claude mcp add filesystem npx -y @anthropic-ai/mcp-server-filesystem /path/to/PackagesLocalDirectory` |

**No local SQL Server installation is needed.** Claude Code connects directly to the Tier 2 Azure SQL database remotely.

### 8.3. Tier 2 Connection Requirements

**For SQL Access (JIT):**
- You must request Just-In-Time database access through LCS every 8 hours.
- LCS provides a temporary connection string with credentials.
- You update the SQL MCP server configuration with the new credentials.

**For OData Access (X++ Companion Plugin):**
- Requires an **Azure AD App Registration** with Client ID, Client Secret, and permissions to call D365 OData endpoints.
- The local app acquires an OAuth token and includes it in the `Authorization` header of OData requests.

### 8.4. The Fully Autonomous Development Workflow

The development workflow is designed for **maximum autonomy** — Claude Code runs through tasks without needing Manus to review every commit.

**The key principle: Front-load the intelligence, not the review.**

| Step | Who | What Happens |
| :--- | :--- | :--- |
| **1. Design** | **Manus** (once) | Creates the architecture docs, `TASKS.md` (implementation plan), `CLAUDE.md` (skill package), and pushes to GitHub. |
| **2. Develop** | **Claude Code** (autonomous) | Reads `TASKS.md`, picks the next uncompleted task, writes code, tests against Tier 2 SQL, runs unit tests, marks task done, commits, picks next task. |
| **3. X++ Deploy** | **You** (via RDP, one-time per plugin version) | Pulls X++ code from GitHub, builds in Visual Studio on Tier 1, creates deployable package, applies to Tier 2 via LCS. |
| **4. E2E Test** | **Claude Code** (autonomous) | Tests OData endpoints on Tier 2, runs reconciliation tests, commits final code. |
| **5. Checkpoint** | **You** (periodic) | Every 5 tasks, review the overall state. Escalate to Manus if architectural drift is detected. |

**When Manus is needed:**
- New feature that requires architectural design → Manus updates `TASKS.md`
- Claude Code fails on a task after 3 attempts → You escalate to Manus
- Changing requirements from your team → You tell Manus → Manus updates the plan

### 8.5. The D365 Skill Package (`CLAUDE.md`)

This file is placed in the `.claude/` directory of the project. It teaches Claude Code how to be a D365-aware developer.

```markdown
# D365 AI Data Agent — Claude Code Skills

## Project Overview
You are building an AI data agent for D365 Finance & Operations.
Your primary goal is to implement the tasks defined in `TASKS.md`.

## MCP Servers Available
- `sql-server`: Connects to the Tier 2 Azure SQL (AxDB). Access is JIT
  and may need to be refreshed every 8 hours.
- `filesystem`: Reads the local X++ source code directory.

## Coding Standards
- All code must be written in TypeScript.
- Follow the existing project structure in `server/` and `client/`.
- All new modules must have corresponding unit tests using `vitest`.
- Use parameterized queries to prevent SQL injection.
- Always include the current date in prompts sent to the LLM.

## Skill: Reading X++ Metadata
When you need to understand a D365 table, view, or data entity:
1. Use the `filesystem` MCP to read the XML file from the local X++
   source directory (e.g., `ApplicationSuite/AxTable/CustTable.xml`).
2. Parse the XML to extract fields, relations, and properties.
3. Use the `xml2js` library (already installed).

## Skill: Generating SQL Queries
When you need to retrieve data from the D365 database:
1. Use the `sql-server` MCP to execute queries against AxDB.
2. Always use parameterized queries.
3. D365 SQL tables use RECID as the primary key (bigint).
4. Enum fields store integer values, not labels.

## Skill: Calling the X++ Companion Plugin
When you need to reconcile a query result against a D365 report:
1. The plugin is exposed as an OData service on the Tier 2 environment.
2. Acquire an Azure AD OAuth token first (use `@azure/identity`).
3. POST to the service endpoint with the token in the Authorization header.

## Skill: Task Completion
After implementing a feature:
1. Run `pnpm test` — all tests must pass.
2. Mark the task as `[x]` in `TASKS.md`.
3. Commit with a descriptive message: `feat: implement [task description]`.
4. Move to the next `[ ]` task.
```

### 8.6. The Implementation Plan (`TASKS.md`)

This is the master checklist that Claude Code reads and executes autonomously.

```markdown
# AIDataAgent Implementation Plan

## Phase 1: Foundational Setup

- [ ] **Task 1.1:** Install new dependencies: `xml2js`, `@azure/identity`,
      `neo4j-driver`, `pgvector`. Update `package.json`.
- [ ] **Task 1.2:** Create `server/knowledge/MetadataParser.ts` — parse
      AxTable XML files from the local X++ source directory. Extract table
      name, fields (name, type, EDT, label), relations (related table,
      field mapping, cardinality), and enum references.
- [ ] **Task 1.3:** Create `server/knowledge/ViewParser.ts` — parse AxView
      XML files. Extract the underlying SQL definition, source tables,
      and computed columns.
- [ ] **Task 1.4:** Create `server/knowledge/DataEntityParser.ts` — parse
      AxDataEntityView XML files. Extract field mappings from business-
      friendly names to underlying table fields.
- [ ] **Task 1.5:** Create `server/knowledge/EnumParser.ts` — parse AxEnum
      XML files. Extract enum name, integer values, and labels.
- [ ] **Task 1.6:** Create `server/knowledge/GraphKB.ts` — implement the
      Layer 1 graph schema (nodes: Table, Field, View, DataEntity, Enum;
      edges: HAS_FIELD, RELATES_TO, MAPS_TO, HAS_VALUE). Provide methods
      to ingest parsed metadata and query join paths.
- [ ] **Task 1.7:** Create `server/knowledge/VectorKB.ts` — implement the
      Layer 2 vector store. Embed table/field descriptions using OpenAI
      embeddings. Provide semantic search method.
- [ ] **Task 1.8:** Create `server/knowledge/RulesKB.ts` — implement the
      Layer 3 rules store. Schema: disambiguation_rules, terminology_rules,
      reconciliation_rules, golden_queries. Provide lookup methods.
- [ ] **Task 1.9:** Create `server/knowledge/GlossaryIngestor.ts` — scrape
      the Microsoft D365 Business Process Glossary. Split each term into
      descriptive text (→ Layer 2) and D365-specific nuance (→ Layer 3).

## Phase 2: Core Agent & SQL Generation

- [ ] **Task 2.1:** Create `server/agents/PlannerAgent.ts` — accepts a
      user question and produces a multi-step execution plan (JSON).
- [ ] **Task 2.2:** Refactor `server/queryGenerator.ts` into
      `server/agents/SQLGeneratorAgent.ts` — a standalone tool that
      accepts a sub-task, queries Layer 1 and Layer 3 for context,
      and generates a SQL query.
- [ ] **Task 2.3:** Create `server/agents/DataAnalyzerAgent.ts` — accepts
      query results and produces analysis (patterns, outliers, summaries).
- [ ] **Task 2.4:** Create `server/agents/AgentOrchestrator.ts` — the
      main ReAct loop that coordinates Planner, SQL Generator, and
      Data Analyzer. Maintains state across steps.
- [ ] **Task 2.5:** Create `server/auth/AzureADClient.ts` — OAuth client
      for acquiring tokens to call Tier 2 OData endpoints.

## Phase 3: Reconciliation & Learning

- [ ] **Task 3.1:** Create `server/reconciliation/DPClassClient.ts` —
      calls the X++ Companion Plugin OData actions on Tier 2.
- [ ] **Task 3.2:** Create `server/reconciliation/ReconciliationEngine.ts`
      — compares SQL Generator output with DP class output. Produces
      a confidence score and discrepancy report.
- [ ] **Task 3.3:** Create `server/agents/DisambiguationAgent.ts` —
      checks Layer 3 for ambiguous terms and generates clarification
      questions.
- [ ] **Task 3.4:** Create `server/agents/ExplanationAgent.ts` —
      generates human-readable reasoning for the agent's conclusions.
- [ ] **Task 3.5:** Create `server/learning/ConversationLearner.ts` —
      post-conversation analysis that extracts rules, terminology,
      and query patterns. Writes to an approval queue.
- [ ] **Task 3.6:** Create `server/learning/ApprovalQueue.ts` — admin
      interface for reviewing and approving/rejecting learned rules.

## Phase 4: Rendering & Polish

- [ ] **Task 4.1:** Update the client rendering layer to support user-
      selectable chart types (bar, line, pie) for query results.
- [ ] **Task 4.2:** Implement Excel file download for query results.
- [ ] **Task 4.3:** Build the initial Golden Query Library with 10
      pre-validated queries for common AR/AP questions.
- [ ] **Task 4.4:** End-to-end integration testing against Tier 2.
```

---

## Part 9: Implementation Roadmap

### 9.1. Phase Overview

| Phase | Duration | Key Deliverables | Dependencies |
| :--- | :--- | :--- | :--- |
| **Phase 1: Foundation** | 3-4 weeks | Knowledge Ingestion Service, 3-Layer KB, X++ Companion Plugin deployed to Tier 2 | X++ source files available locally, Tier 1 access for X++ deployment |
| **Phase 2: Core Agent** | 3-4 weeks | Planner Agent, SQL Generator Agent, Data Analyzer, ReAct orchestrator, Azure AD OAuth | Phase 1 complete, Tier 2 JIT access configured |
| **Phase 3: Trust & Learning** | 3-4 weeks | Reconciliation Engine, Disambiguation Agent, Explanation Agent, Conversation Learning Pipeline | Phase 2 complete, X++ Companion Plugin on Tier 2 |
| **Phase 4: Polish & Launch** | 2-3 weeks | Flexible rendering (charts, Excel), Golden Query Library, end-to-end testing | Phase 3 complete, D365 functional consultant for golden query validation |

### 9.2. Immediate Next Steps

1. **You:** Copy the X++ source files from the Tier 1 K: drive to your local machine (or clone from Azure DevOps). The small sample folder you have is sufficient to start.
2. **You:** Install Claude Code, Node.js, and the MCP servers on your local machine.
3. **You:** Configure JIT access to the Tier 2 Azure SQL database.
4. **Manus:** Push the `TASKS.md`, `CLAUDE.md`, and X++ Companion Plugin code to the GitHub repository.
5. **You:** Deploy the X++ Companion Plugin to Tier 1 (via RDP), then promote to Tier 2 (via LCS).
6. **Claude Code:** Begin executing `TASKS.md` autonomously.

---

*This document represents the complete architectural vision, development plan, and kickoff package for the D365 ERP-Native Reasoning Engine. All discussions regarding gap analysis, knowledge base design, reconciliation strategy, LLM usage, monetization, and development workflow have been consolidated into this single, definitive reference.*
