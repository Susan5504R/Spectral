# Spectral: High-Performance Remote Code Execution Engine

Spectral is a scalable, distributed system designed to execute untrusted code in a secure, isolated sandbox. Built for platforms like Online Judges, LeetCode clones, and collaborative IDEs, Spectral ensures low-latency execution while maintaining strict resource limits and process isolation.

---

## Architectural Specification

Spectral follows a decoupled **Producer-Worker pattern** to handle heavy computational loads without blocking the API gateway.

### 1. API Gateway (Producer)
- **Role**: Receives submissions, persistence in DB, and job queuing.
- **Tech Stack**: Express.js, Sequelize (PostgreSQL), BullMQ.
- **Workflow**:
  - Generates a unique UUID for each submission.
  - Serializes source code and metadata into a Redis-backed job queue.
  - Returns a `202 Accepted` response immediately to the client.

### 2. Job Queue (State Management)
- **Role**: Manages job life-cycles, retries, and distribution.
- **Tech Stack**: Redis + BullMQ.
- **Mechanism**: Guaranteed at-least-once delivery with persistent storage for job metadata.

### 3. Execution Engine (Worker)
- **Role**: Consumes jobs, stages files, and manages Docker lifecycles.
- **Tech Stack**: Node.js, Docker SDK (via Spawn), Child Processes.
- **Sandboxing Logic**: Each submission is executed in a ephemeral container with zero network access and capped CPU/Memory.

---

## Feature & Language Matrix

| Feature | Support | Details |
| :--- | :--- | :--- |
| **Languages** | C, C++, Java, Python | Extensible via Language Executors |
| **Isolation** | Hard (Docker) | `--network=none`, `--memory=128m` |
| **Output Limit**| 1 MB | Prevents Disk/Buffer overflow (OLE) |
| **Time Limit** | 10 Seconds | Hard-kill on process timeout (TLE) |
| **Persistence** | PostgreSQL | Full submission history and status tracking |

### Execution Environment Details
- **Base Image**: `spectral-runner` (Ubuntu-based with compilers installed).
- **C++**: GCC 11+
- **Java**: OpenJDK 17+
- **Python**: Python 3.10+

---

## Security & Sandboxing Deep-Dive

Spectral prioritizes security given the risk of malicious user code (fork bombs, network probes, file system wipes).

### 1. Minimalistic Surface Area
Containers run with `--network=none`, preventing data exfiltration or internal network scanning.

### 2. Resource Capping
- **Memory**: Hard limit of 128MB.
- **CPU**: Capped at 0.5 vCPU to prevent CPU starvation on the host node.
- **Storage**: Execution happens in `/tmp` within the container. Host source code is mounted as **Read-Only** (`:ro`).

### 3. Signal-Based Termination
The worker monitors the child process. If the 10s window is exceeded, a `SIGKILL` is issued to the Docker container, ensuring cleanup of all zombie processes.

---

## Implementation Challenges & Solutions

### Challenge 1: Docker Path Mapping in Hybrid Environments
**Problem**: When running the API inside a Docker container (Docker-in-Docker), volume paths must refer to the *Host's* absolute path, not the container's path.
**Solution**: Implemented `HOST_PWD` environment variable detection. If provided, Spectral maps paths relative to the host machine, ensuring mount points are valid across nested environments.

### Challenge 2: Differentiating Compiler vs. Runtime Errors
**Problem**: Exit codes alone don't reveal *why* a program failed.
**Solution**: Implemented a two-stage regex analysis on `stderr`. If `stderr` contains standard GCC/Java compiler markers, the status is flagged as `Compilation Error`. Otherwise, it defaults to `Runtime Error` or `Accepted` based on exit code 0.

### Challenge 3: Output Limit Exceeded (OLE)
**Problem**: An infinite print loop could crash the worker memory or fill up logs.
**Solution**: Implemented a stream-based counter in `execute*.js`. As data arrives via `stdout`, we check the buffer size against `MAX_OUTPUT_SIZE`. If exceeded, the process is killed immediately before the buffer consumes host RAM.

---

## File-by-File Technical Breakdown

### Core Services
- **`server.js`**: The primary API gateway. It exposes two endpoints:
  - `POST /submit`: Accepts code, input, and language. Syncs with PostgreSQL and dispatches jobs to BullMQ.
  - `GET /status/:id`: Returns the current execution status and output/error from the database.
- **`worker.js`**: The consumer service. It listens for jobs in the `python-codes` queue, orchestrates file generation, calls specific executors, updates the database, and performs cleanup.
- **`producer.js`**: A utility script for manual job injection. Useful for testing the queue pipeline without hitting API endpoints.
- **`db.js`**: Database configuration using Sequelize. Defines the `Submission` schema including UUIDs, code blobs, status enums, and timestamped audit logs.

### Utilities & Helpers
- **`generateFile.js`**: Managed file creation for source code. Generates a unique UUID filename in the `/codes` directory to prevent collisions between concurrent submissions.
- **`generateInputFile.js`**: Similar to `generateFile.js` but dedicated to the `/inputs` directory for managing standard input streams.

### Executors (`/executors`)
- **`executeC.js` / `executeCpp.js`**: Handles GCC compilation and binary execution. Includes logic to differentiate between compiler errors vs. standard runtime crashes.
- **`executeJava.js`**: Manages the Java compilation lifecycle (`javac`) followed by JVM execution.
- **`executePython.js`**: Straightforward execution via the `python3` interpreter.

### Infrastructure & DevOps
- **`Dockerfile`**: Defines the production environment for the API and Worker nodes.
- **`Dockerfile.sandbox`**: Defines the specialized, hardened base image (`spectral-runner`) used for individual code executions.
- **`docker-compose.yml`**: Orchestrates the entire ecosystem (DB, Redis, API, Worker) and handles volume mounting for Docker-in-Docker support.

---

## Setup & Installation

### Prerequisites
- Docker & Docker Compose
- Node.js v18+
- Redis Server (or via Compose)
- PostgreSQL (or via Compose)

### Quick Start
1. **Clone the Repo**:
   ```bash
   git clone https://github.com/Susan5504R/Spectral.git
   cd Spectral
   ```
2. **Setup Runner Image**:
   ```bash
   docker build -t spectral-runner -f Dockerfile.sandbox .
   ```
3. **Launch Infrastructure**:
   ```bash
   docker-compose up -d
   ```
4. **Install Dependencies**:
   ```bash
   npm install
   ```
5. **Start Nodes**:
   ```bash
   # Terminal 1: API Server
   node server.js
   
   # Terminal 2: Worker Node
   node worker.js
   ```

---

## Future Roadmap

### Phase 1: Test Case Suite (Upcoming)
- Support for multiple `.in` / `.out` test cases per submission.
- Pass/Fail percentages and point-based scoring.

### Phase 2: User Dashboard
- React/Next.js frontend for submission history.
- Real-time status updates via WebSockets.

### Phase 3: Advanced Telemetry
- Monitoring for RAM usage peaks during execution.
- Prometheus/Grafana integration for worker health metrics.
