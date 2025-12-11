# Ansible Runner Docker Image
# Used by Jenkins to run Ansible playbooks for Kubernetes deployment

FROM python:3.11-slim

# Install kubectl and ansible
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/arm64/kubectl" \
    && install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl \
    && pip install --no-cache-dir ansible \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* kubectl

WORKDIR /ansible

# Copy ansible configuration
COPY . .

# Default command
CMD ["ansible-playbook", "--version"]
