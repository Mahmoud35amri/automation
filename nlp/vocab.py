"""
Controlled vocabularies for the NLP/RFP extraction pipeline.

These exist so the LLM's output matches the RAG teammate's capability
index exactly (e.g. always "Kubernetes", never "K8s" in one record and
"Kubernetes" in another). Extend these lists as real/simulated OliveSoft
data reveals gaps — treat this file as a living config, not a constant.

If the LLM cannot confidently map a value to one of these, it should
use "other" (or "Other") and put the raw text in `missing_fields` or a
notes field, rather than inventing a new label.
"""

SECTORS = [
    "Finance",
    "Public",
    "Retail",
    "Healthcare",
    "Telecom",
    "Industry",
    "Energy",
    "Education",
    "Insurance",
    "Transportation",
    "Other",
]

PROJECT_TYPES = [
    "cloud_migration",
    "cloud_infrastructure",
    "web_development",
    "mobile_development",
    "data_platform",
    "ai_ml",
    "cybersecurity",
    "erp_crm",
    "devops_automation",
    "digital_transformation",
    "maintenance_support",
    "other",
]

# Grouped for readability; the LLM just sees the flat list.
TECHNOLOGIES = [
    # Cloud
    "AWS", "Azure", "Google Cloud Platform", "OVHcloud",
    # Containers / orchestration
    "Docker", "Kubernetes", "OpenShift",
    # CI/CD & DevOps
    "Jenkins", "GitLab CI", "GitHub Actions", "Terraform", "Ansible",
    # Languages
    "Python", "Java", "JavaScript", "TypeScript", "C#", "PHP", "Go",
    # Backend frameworks
    "Django", "FastAPI", "Spring Boot", ".NET", "Node.js", "Laravel",
    # Frontend frameworks
    "React", "Angular", "Vue.js", "Next.js",
    # Databases
    "PostgreSQL", "MySQL", "MongoDB", "Oracle", "Microsoft SQL Server", "Redis",
    # Data / ML
    "TensorFlow", "PyTorch", "Spark", "Kafka", "Airflow", "Power BI", "Tableau",
    # ERP / CRM
    "SAP", "Salesforce", "Odoo", "Microsoft Dynamics",
    # Other
    "Elasticsearch", "RabbitMQ", "GraphQL", "REST API",
    "Other",
]

REQUIREMENT_CATEGORIES = [
    "technical",
    "staffing",
    "references",
    "administrative",
    "other",
]

LANGUAGES = ["en", "fr", "ar"]
