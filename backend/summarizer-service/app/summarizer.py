"""Medical summarizer using custom fine-tuned Flan-T5 model from HuggingFace."""
import logging
import time
from typing import Optional, List, Dict
from datetime import datetime

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# Model settings
MODEL_NAME = "5unnySunny/medical-flan-t5-small-log-summarizer"

# Global model instance
_model = None
_tokenizer = None


def load_model():
    """Load the custom fine-tuned Flan-T5 model."""
    global _model, _tokenizer

    if _model is not None:
        return _model, _tokenizer

    try:
        from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

        logger.info(f"Loading custom Flan-T5 model: {MODEL_NAME}")

        _tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        _model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME)

        logger.info("Custom Flan-T5 model loaded successfully!")
        return _model, _tokenizer

    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        return None, None


def format_vitals_for_model(patient_id: str, vitals: List[Dict]) -> str:
    """Format vitals in the exact template used for training the model.

    Training format:
    Patient {id}: HR={heart_rate}, SpO2={spo2}, Temp={temp}, BP={systolic}/{diastolic}, Resp={resp}.
    """
    if not vitals:
        return ""

    parts = []
    # Use last 5 vitals readings (or all if less than 5)
    for vital in vitals[:5]:
        hr = int(vital.get("heart_rate", 0))
        spo2 = int(vital.get("spo2", 0))
        temp = round(vital.get("temperature", 0), 1)

        # Handle blood pressure - might be nested or flat
        bp = vital.get("blood_pressure", {})
        if isinstance(bp, dict):
            systolic = int(bp.get("systolic", 0))
            diastolic = int(bp.get("diastolic", 0))
        else:
            systolic = int(vital.get("systolic_bp", vital.get("systolic", 0)))
            diastolic = int(vital.get("diastolic_bp", vital.get("diastolic", 0)))

        resp = int(vital.get("respiratory_rate", 0))

        # Extract patient number from ID (e.g., "P001" -> "1")
        patient_num = patient_id.replace("P", "").lstrip("0") or "0"

        parts.append(f"Patient {patient_num}: HR={hr}, SpO2={spo2}, Temp={temp}, BP={systolic}/{diastolic}, Resp={resp}.")

    return " ".join(parts)


def generate_ml_summary(input_text: str) -> str:
    """Generate summary using the custom Flan-T5 model."""
    model, tokenizer = load_model()

    if model is None or tokenizer is None:
        return "Model not available. Unable to generate ML summary."

    try:
        logger.info(f"ML Model Input: {input_text}")

        inputs = tokenizer(
            input_text,
            return_tensors="pt",
            max_length=512,
            truncation=True
        )

        outputs = model.generate(
            inputs["input_ids"],
            max_length=150,
            min_length=20,
            num_beams=4,
            length_penalty=1.0,
            early_stopping=True,
            repetition_penalty=2.5,       # Penalize repeated tokens
            no_repeat_ngram_size=3,       # Prevent 3-gram repetition
            do_sample=False               # Deterministic output with beam search
        )

        summary = tokenizer.decode(outputs[0], skip_special_tokens=True)
        logger.info(f"ML Model Output: {summary}")

        return summary

    except Exception as e:
        logger.error(f"Error generating ML summary: {e}")
        return f"Error generating summary: {str(e)}"


def format_alerts_section(alerts: List[Dict]) -> str:
    """Format alerts into a readable section."""
    if not alerts:
        return "**Alerts:** No active alerts detected."

    parts = [f"**Active Alerts ({len(alerts)}):**"]

    critical = [a for a in alerts if a.get("severity") == "critical"]
    warning = [a for a in alerts if a.get("severity") == "warning"]

    if critical:
        parts.append("\n🔴 CRITICAL:")
        for alert in critical[:3]:
            parts.append(f"  • {alert.get('type', 'Unknown')}: {alert.get('message', 'No details')}")

    if warning:
        parts.append("\n🟡 WARNING:")
        for alert in warning[:3]:
            parts.append(f"  • {alert.get('type', 'Unknown')}: {alert.get('message', 'No details')}")

    return "\n".join(parts)


class MedicalSummarizer:
    """Medical summarization engine using custom fine-tuned Flan-T5."""

    def __init__(self):
        self.summaries: Dict[str, Dict] = {}
        logger.info(f"Initializing Medical Summarizer with model: {MODEL_NAME}")
        # Pre-load model on startup
        load_model()

    def generate_summary(self, patient_id: str, patient_name: str,
                        vitals: List[Dict], alerts: List[Dict]) -> Dict:
        """Generate a clinical summary combining ML and alerts."""

        start_time = time.time()

        # Format vitals for the ML model (using training template)
        model_input = format_vitals_for_model(patient_id, vitals)

        # Generate ML summary
        if model_input:
            ml_summary = generate_ml_summary(model_input)
        else:
            ml_summary = "No vitals data available for analysis."

        # Format alerts section
        alerts_section = format_alerts_section(alerts)

        # Combine into final summary
        summary_parts = [
            f"**Clinical Summary for {patient_name}**",
            "",
            "**AI Analysis (Flan-T5):**",
            ml_summary,
            "",
            alerts_section
        ]

        summary_text = "\n".join(summary_parts)
        processing_time = int((time.time() - start_time) * 1000)

        result = {
            "patient_id": patient_id,
            "patient_name": patient_name,
            "text": summary_text,
            "ml_summary": ml_summary,
            "vitals_count": len(vitals),
            "alerts_count": len(alerts),
            "processing_time_ms": processing_time,
            "timestamp": datetime.now().isoformat(),
            "model_name": MODEL_NAME,
            "model_version": "1.0.0"
        }

        # Cache the summary
        self.summaries[patient_id] = result

        return result

    def get_summary(self, patient_id: str) -> Optional[Dict]:
        """Get cached summary for a patient."""
        return self.summaries.get(patient_id)

    def get_all_summaries(self) -> List[Dict]:
        """Get all cached summaries."""
        return list(self.summaries.values())

    def get_model_info(self) -> Dict:
        """Get model information."""
        model, _ = load_model()
        return {
            "name": "Medical Flan-T5 Summarizer",
            "version": "1.0.0",
            "full_name": MODEL_NAME,
            "loaded": model is not None,
            "type": "fine-tuned-flan-t5",
            "description": "Custom fine-tuned Flan-T5 for medical log summarization",
            "lastUpdated": datetime.now().strftime("%Y-%m-%d")
        }


# Singleton instance
summarizer = MedicalSummarizer()
