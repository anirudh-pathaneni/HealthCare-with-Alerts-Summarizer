# AIOps Healthcare Monitoring System

An AIOps framework for self-learning log summarization in a healthcare monitoring system. This project implements a complete DevOps/MLOps pipeline with AI-powered clinical summarization, real-time patient vitals monitoring, and automated model retraining.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            React Frontend (Port 3000)                       │
│                    Dashboard │ Patient Details │ Real-time Vitals           │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │ REST / WebSocket
┌────────────────────────────────────┴────────────────────────────────────────┐
│                         Kubernetes Ingress Controller                        │
└───────┬─────────────────────────┬─────────────────────────┬─────────────────┘
        │                         │                         │
┌───────▼───────┐         ┌───────▼───────┐         ┌───────▼───────┐
│ Vitals Gen    │         │ Alert Engine  │         │  Summarizer   │
│ Service       │────────▶│ Service       │────────▶│  Service      │
│ (Port 8001)   │         │ (Port 8004)   │         │  (Port 8003)  │
└───────┬───────┘         └───────┬───────┘         └───────┬───────┘
        │                         │                         │
        │                         │              ┌──────────┴──────────┐
        │                         │              │  Flan-T5 Model      │
        │                         │              │  (HuggingFace Hub)  │
        │                         │              └─────────────────────┘
        └─────────────────────────┼─────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────────────┐
│                           ELK Stack                                          │
│  ┌─────────────────────┐ ┌─────────────────────┐ ┌────────────────────────┐ │
│  │   Elasticsearch     │ │     Logstash        │ │       Kibana           │ │
│  │   (Port 9200)       │ │     (Port 5044)     │ │       (Port 5601)      │ │
│  └─────────────────────┘ └─────────────────────┘ └────────────────────────┘ │
│  Indices: medical-vitals-*, medical-alerts-*, system-deployment-*           │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
healthcare-aiops/
├── backend/                         # FastAPI microservices
│   ├── vitals-generator/           # Patient vitals simulation service
│   ├── alert-engine/               # Clinical alert detection service
│   ├── auth-service/               # JWT authentication service
│   └── summarizer-service/         # AI-powered summarization
│       ├── app/summarizer.py       # Flan-T5 inference engine
│       ├── finetune.py             # Model training script
│       └── prepare_dataset.py      # Training data preparation
│
├── frontend/                        # React dashboard application
│   ├── src/
│   │   ├── components/             # Reusable UI components
│   │   ├── pages/                  # Dashboard & Patient Details
│   │   └── services/               # API clients
│   ├── Dockerfile
│   └── nginx.conf
│
├── ci-cd/
│   ├── jenkins/
│   │   ├── Jenkinsfile             # Main CI/CD pipeline (10 stages)
│   │   └── Jenkinsfile.retrain     # MLOps retraining pipeline
│   └── docker/                     # Test base images
│
├── infrastructure/
│   ├── ansible/
│   │   ├── playbooks/              # Deployment playbooks
│   │   └── roles/                  # Modular roles
│   │       ├── backend/            # App deployment templates
│   │       ├── elk/                # ELK Stack setup
│   │       ├── jenkins/            # CI/CD infrastructure
│   │       ├── kubernetes/         # K8s base resources
│   │       └── vault/              # Secrets management
│   ├── kubernetes/
│   │   ├── deployments/            # Service manifests
│   │   ├── hpa/                    # Autoscaling (3 HPAs)
│   │   ├── ingress/                # External traffic routing
│   │   ├── secrets/                # Credentials management
│   │   └── configmaps/             # Application configuration
│   └── elk/                        # Logstash configuration
│
├── docker-compose.yml              # Local development & testing
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Python 3.11+
- Minikube or Kubernetes cluster (for production)
- kubectl and Ansible

### Local Development

```bash
# Clone and start all services
git clone <repository>
cd healthcare-aiops

# Start ELK + all microservices
docker-compose up -d

# Access services:
# - Frontend:      http://localhost:3000
# - Vitals API:    http://localhost:8001
# - Alerts API:    http://localhost:8004
# - Summarizer:    http://localhost:8003
# - Kibana:        http://localhost:5601
# - Elasticsearch: http://localhost:9200
```

### Kubernetes Deployment

```bash
# Deploy using Ansible
cd infrastructure/ansible
ansible-playbook -i inventory/hosts playbooks/backend.yml

# Verify deployments
kubectl get deployments -n healthcare
kubectl get hpa -n healthcare
```

## 🏥 Features

### Patient Monitoring Dashboard
- Real-time patient grid with vital snapshots
- Color-coded alert severity indicators
- Click-through to detailed patient views

### Real-time Vitals Streaming
- Heart Rate, SpO₂, Blood Pressure, Temperature, Respiratory Rate
- WebSocket-based live updates
- Historical trend visualization

### Clinical Alert Engine
- **Tachycardia**: HR > 100 bpm
- **Bradycardia**: HR < 60 bpm
- **Hypoxia**: SpO₂ < 90%
- **Fever**: Temp > 38.0°C
- **Hypertensive Crisis**: Systolic BP > 180 mmHg
- **Sensor Disconnection**: Missing vitals detection

### AI-Powered Summaries
- Custom fine-tuned Flan-T5 transformer model
- Model hosted on HuggingFace Hub: `5unnySunny/medical-flan-t5-small-log-summarizer`
- Combines ML-generated summaries with clinical alerts
- Periodic summarization of patient conditions

## 🔧 CI/CD Pipeline

### Main Pipeline (Jenkinsfile) - 10 Stages:
1. **Build Test Images**: Creates Docker images for running tests
2. **Backend Unit Tests**: Parallel pytest execution for all services
3. **Build Frontend**: Production React bundle via npm
4. **Docker Build**: Versioned images (1.0.${BUILD_NUMBER})
5. **Docker Push**: Push to Docker Hub registry
6. **Local Agent Cleanup**: Remove old images
7. **Docker Compose Integration Test**: Full stack health checks
8. **Enable Minikube Addons**: metrics-server and ingress
9. **Deployment (Ansible)**: Deploy to Kubernetes via playbooks
10. **Post-Deployment Validation**: Verify rollout status

### MLOps Retrain Pipeline (Jenkinsfile.retrain):
1. **Collect Training Data**: Query Elasticsearch for recent vitals (7 days)
2. **Prepare Dataset**: Generate synthetic training samples
3. **Fine-tune Model**: Train Flan-T5 and push to HuggingFace Hub
4. **Restart Summarizer Service**: Rolling deployment
5. **Verify New Model**: Health checks
6. **Log Deployment**: Record event in Elasticsearch

**Trigger**: Every 6 hours (configurable) or manual

## ☸️ Kubernetes Resources

### Horizontal Pod Autoscaling (HPA)
Three HPAs configured in `infrastructure/kubernetes/hpa/hpa.yaml`:

| Service | Min | Max | CPU Target | Memory Target |
|---------|-----|-----|------------|---------------|
| summarizer-service | 1 | 10 | 70% | 80% |
| vitals-generator | 2 | 5 | 70% | - |
| alert-engine | 2 | 5 | 70% | - |

### Other Resources
- **Deployments**: All backend services + frontend
- **StatefulSets**: Elasticsearch for persistent storage
- **Services**: ClusterIP for internal DNS
- **Ingress**: External HTTP traffic routing
- **Secrets**: Docker Hub credentials, application secrets
- **DaemonSet**: Filebeat for log collection

## 📊 ELK Stack Integration

### Elasticsearch Indices
| Index Pattern | Description |
|--------------|-------------|
| `medical-vitals-*` | Patient vital signs |
| `medical-alerts-*` | Clinical alerts |
| `system-deployment-*` | Model retraining events |

### Log Collection
- **Filebeat DaemonSet**: Collects logs from all Kubernetes nodes
- **Logstash**: Processes and routes log data (medical.conf)
- **Kibana**: Visualization dashboards

## 🔐 Advanced Features

### Vault Integration
Ansible role for secrets management located in `infrastructure/ansible/roles/vault/`:
- Kubernetes Secrets for application credentials
- Docker Hub registry credentials (regcred)

### Modular Ansible Roles
Five roles for separation of concerns:
- `backend/` - Application deployment with Jinja2 templating
- `elk/` - Elasticsearch, Logstash, Kibana setup
- `jenkins/` - CI/CD infrastructure
- `kubernetes/` - Namespace and base resources
- `vault/` - Secrets management

### Zero-Downtime Deployments
- Kubernetes rolling updates
- APP_VERSION injected via Ansible templates
- Rollout status validation in Jenkins

## 📝 API Reference

### Vitals Generator Service (8001)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/patients` | GET | List all patients |
| `/api/patients/{id}/vitals` | GET | Get patient vitals |

### Alert Engine Service (8004)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/alerts` | GET | Get all active alerts |
| `/api/alerts/{patient_id}` | GET | Get patient alerts |

### Summarizer Service (8003)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/summaries` | GET | Get all summaries |
| `/api/summaries/{patient_id}` | GET | Get patient summary |
| `/api/model/info` | GET | Model version info |

## 🧪 Testing

```bash
# Backend tests (using pre-built Docker images)
docker run --rm -v $PWD/backend/alert-engine:/app healthcare-test-light python -m pytest tests/ -v
docker run --rm -v $PWD/backend/summarizer-service:/app healthcare-test-ml python -m pytest tests/ -v
docker run --rm -v $PWD/backend/vitals-generator:/app healthcare-test-light python -m pytest tests/ -v

# Or locally
cd backend/<service-name>
pip install -r requirements.txt
pytest tests/ -v
```

## 👥 Authors

- Lokesh A - IMT2022577
- Anirudh P - IMT2022505

## 📄 License

MIT License - See LICENSE file for details.
