// Shared library functions for Healthcare AIOps Jenkins pipelines

def notifySlack(String status, String message) {
    def color = status == 'success' ? 'good' : 'danger'
    slackSend(color: color, message: message)
}

def buildDockerImage(String serviceName, String buildContext) {
    def tag = "${env.BUILD_VERSION}"
    docker.build("${env.DOCKER_REPO}/${serviceName}:${tag}", buildContext)
    return tag
}

def pushDockerImage(String serviceName, String tag) {
    // Push only latest tag (standardized)
    sh "docker tag ${env.DOCKER_REPO}/${serviceName}:${tag} ${env.DOCKER_REPO}/${serviceName}:latest"
    sh "docker push ${env.DOCKER_REPO}/${serviceName}:latest"
}

def deployToKubernetes(String serviceName, String namespace = 'healthcare') {
    // Use latest tag (matches K8s manifests)
    sh "kubectl set image deployment/${serviceName} ${serviceName}=${env.DOCKER_REPO}/${serviceName}:latest -n ${namespace}"
    sh "kubectl rollout status deployment/${serviceName} -n ${namespace} --timeout=300s"
}

def healthCheck(String serviceUrl) {
    def response = sh(script: "curl -sf ${serviceUrl}/health", returnStatus: true)
    return response == 0
}

return this
