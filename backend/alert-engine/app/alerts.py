from datetime import datetime, timedelta
from typing import List, Optional, Dict
from pydantic import BaseModel
from enum import Enum
import random

from app.config import get_settings

settings = get_settings()


class AlertSeverity(str, Enum):
    CRITICAL = "critical"
    WARNING = "warning"
    INFO = "info"
    NORMAL = "normal"


class AlertType(str, Enum):
    TACHYCARDIA = "Tachycardia Alert"
    BRADYCARDIA = "Bradycardia Alert"
    HYPOXIA = "Hypoxia Alert"
    HYPERTENSIVE_CRISIS = "Hypertensive Crisis"
    HYPOTENSION = "Hypotension Alert"
    FEVER = "Fever Alert"
    HYPOTHERMIA = "Hypothermia Alert"
    TACHYPNEA = "Tachypnea Alert"
    BRADYPNEA = "Bradypnea Alert"
    SENSOR_DISCONNECT = "Sensor Disconnection"


class Alert(BaseModel):
    """Model for medical alert."""
    id: str
    patient_id: str
    type: str
    message: str
    severity: str
    vital_type: str
    vital_value: float
    threshold: float
    timestamp: str
    acknowledged: bool = False


class AlertEngine:
    """Rule-based clinical alert detection engine."""

    def __init__(self):
        self.active_alerts: Dict[str, List[Alert]] = {}
        self.alert_counter = 0
        # Seed initial alerts for each patient
        self._seed_initial_alerts()

    def _generate_alert_id(self) -> str:
        """Generate unique alert ID."""
        self.alert_counter += 1
        return f"ALT-{datetime.now().strftime('%Y%m%d')}-{self.alert_counter:05d}"

    def _seed_initial_alerts(self):
        """Create 5 random seed alerts per patient on startup."""
        patient_ids = [f"P{str(i).zfill(3)}" for i in range(1, 11)]  # P001-P010

        alert_templates = [
            (AlertType.TACHYCARDIA.value, "Elevated heart rate detected: {value} bpm", "heart_rate", AlertSeverity.WARNING.value, 75, 130),
            (AlertType.HYPOXIA.value, "Low oxygen saturation: {value}%", "spo2", AlertSeverity.WARNING.value, 88, 94),
            (AlertType.HYPERTENSIVE_CRISIS.value, "Elevated blood pressure: {value}/90 mmHg", "blood_pressure", AlertSeverity.WARNING.value, 140, 175),
            (AlertType.FEVER.value, "Elevated temperature: {value}°C", "temperature", AlertSeverity.WARNING.value, 38.0, 39.5),
            (AlertType.TACHYPNEA.value, "Elevated respiratory rate: {value}/min", "respiratory_rate", AlertSeverity.WARNING.value, 24, 28),
            (AlertType.BRADYCARDIA.value, "Low heart rate detected: {value} bpm", "heart_rate", AlertSeverity.CRITICAL.value, 42, 55),
        ]

        for patient_id in patient_ids:
            self.active_alerts[patient_id] = []
            # Create 5 random alerts for each patient
            for i in range(5):
                template = random.choice(alert_templates)
                value = round(random.uniform(template[4], template[5]), 1)
                timestamp = (datetime.now() - timedelta(minutes=random.randint(1, 30))).isoformat()

                alert = Alert(
                    id=self._generate_alert_id(),
                    patient_id=patient_id,
                    type=template[0],
                    message=template[1].format(value=value),
                    severity=template[3],
                    vital_type=template[2],
                    vital_value=value,
                    threshold=template[4],
                    timestamp=timestamp
                )
                self.active_alerts[patient_id].append(alert)

    def analyze_vitals(self, patient_id: str, vitals: dict) -> List[Alert]:
        """Analyze patient vitals and generate alerts."""
        alerts = []

        # Extract vitals (handle both camelCase and snake_case)
        heart_rate = vitals.get("heartRate") or vitals.get("heart_rate", 0)
        spo2 = vitals.get("spO2") or vitals.get("spo2", 100)
        bp = vitals.get("bloodPressure") or vitals.get("blood_pressure", {})
        systolic = bp.get("systolic", 120)
        diastolic = bp.get("diastolic", 80)
        temperature = vitals.get("temperature", 37.0)
        respiratory = vitals.get("respiratory") or vitals.get("respiratory_rate", 16)

        timestamp = datetime.now().isoformat()

        # Heart Rate Alerts
        if heart_rate >= settings.hr_high_critical:
            alerts.append(Alert(
                id=self._generate_alert_id(),
                patient_id=patient_id,
                type=AlertType.TACHYCARDIA.value,
                message=f"Critical tachycardia detected. Heart rate: {heart_rate} bpm (threshold: >{settings.hr_high_critical})",
                severity=AlertSeverity.CRITICAL.value,
                vital_type="heart_rate",
                vital_value=heart_rate,
                threshold=settings.hr_high_critical,
                timestamp=timestamp
            ))
        elif heart_rate >= settings.hr_high_warning:
            alerts.append(Alert(
                id=self._generate_alert_id(),
                patient_id=patient_id,
                type=AlertType.TACHYCARDIA.value,
                message=f"Elevated heart rate detected: {heart_rate} bpm (normal: 60-100)",
                severity=AlertSeverity.WARNING.value,
                vital_type="heart_rate",
                vital_value=heart_rate,
                threshold=settings.hr_high_warning,
                timestamp=timestamp
            ))

        if heart_rate <= settings.hr_low_critical and heart_rate > 0:
            alerts.append(Alert(
                id=self._generate_alert_id(),
                patient_id=patient_id,
                type=AlertType.BRADYCARDIA.value,
                message=f"Critical bradycardia detected. Heart rate: {heart_rate} bpm (threshold: <{settings.hr_low_critical})",
                severity=AlertSeverity.CRITICAL.value,
                vital_type="heart_rate",
                vital_value=heart_rate,
                threshold=settings.hr_low_critical,
                timestamp=timestamp
            ))
        elif heart_rate <= settings.hr_low_warning and heart_rate > 0:
            alerts.append(Alert(
                id=self._generate_alert_id(),
                patient_id=patient_id,
                type=AlertType.BRADYCARDIA.value,
                message=f"Low heart rate detected: {heart_rate} bpm (normal: 60-100)",
                severity=AlertSeverity.WARNING.value,
                vital_type="heart_rate",
                vital_value=heart_rate,
                threshold=settings.hr_low_warning,
                timestamp=timestamp
            ))

        # SpO2 Alerts
        if spo2 <= settings.spo2_critical:
            alerts.append(Alert(
                id=self._generate_alert_id(),
                patient_id=patient_id,
                type=AlertType.HYPOXIA.value,
                message=f"Critical hypoxia detected. SpO2: {spo2}% (threshold: <{settings.spo2_critical}%)",
                severity=AlertSeverity.CRITICAL.value,
                vital_type="spo2",
                vital_value=spo2,
                threshold=settings.spo2_critical,
                timestamp=timestamp
            ))
        elif spo2 <= settings.spo2_warning:
            alerts.append(Alert(
                id=self._generate_alert_id(),
                patient_id=patient_id,
                type=AlertType.HYPOXIA.value,
                message=f"Low oxygen saturation detected: {spo2}% (normal: >95%)",
                severity=AlertSeverity.WARNING.value,
                vital_type="spo2",
                vital_value=spo2,
                threshold=settings.spo2_warning,
                timestamp=timestamp
            ))

        # Blood Pressure Alerts
        if systolic >= settings.bp_systolic_critical:
            alerts.append(Alert(
                id=self._generate_alert_id(),
                patient_id=patient_id,
                type=AlertType.HYPERTENSIVE_CRISIS.value,
                message=f"Hypertensive crisis! BP: {systolic}/{diastolic} mmHg (threshold: >{settings.bp_systolic_critical})",
                severity=AlertSeverity.CRITICAL.value,
                vital_type="blood_pressure",
                vital_value=systolic,
                threshold=settings.bp_systolic_critical,
                timestamp=timestamp
            ))
        elif systolic >= settings.bp_systolic_warning:
            alerts.append(Alert(
                id=self._generate_alert_id(),
                patient_id=patient_id,
                type=AlertType.HYPERTENSIVE_CRISIS.value,
                message=f"Elevated blood pressure: {systolic}/{diastolic} mmHg (normal: <140/90)",
                severity=AlertSeverity.WARNING.value,
                vital_type="blood_pressure",
                vital_value=systolic,
                threshold=settings.bp_systolic_warning,
                timestamp=timestamp
            ))

        if systolic <= settings.bp_systolic_low_critical and systolic > 0:
            alerts.append(Alert(
                id=self._generate_alert_id(),
                patient_id=patient_id,
                type=AlertType.HYPOTENSION.value,
                message=f"Critical hypotension! BP: {systolic}/{diastolic} mmHg (threshold: <{settings.bp_systolic_low_critical})",
                severity=AlertSeverity.CRITICAL.value,
                vital_type="blood_pressure",
                vital_value=systolic,
                threshold=settings.bp_systolic_low_critical,
                timestamp=timestamp
            ))

        # Temperature Alerts
        if temperature >= settings.temp_critical:
            alerts.append(Alert(
                id=self._generate_alert_id(),
                patient_id=patient_id,
                type=AlertType.FEVER.value,
                message=f"High fever detected: {temperature}°C (threshold: >{settings.temp_critical}°C)",
                severity=AlertSeverity.CRITICAL.value,
                vital_type="temperature",
                vital_value=temperature,
                threshold=settings.temp_critical,
                timestamp=timestamp
            ))
        elif temperature >= settings.temp_warning:
            alerts.append(Alert(
                id=self._generate_alert_id(),
                patient_id=patient_id,
                type=AlertType.FEVER.value,
                message=f"Elevated temperature: {temperature}°C (normal: 36.1-37.2°C)",
                severity=AlertSeverity.WARNING.value,
                vital_type="temperature",
                vital_value=temperature,
                threshold=settings.temp_warning,
                timestamp=timestamp
            ))

        if temperature <= settings.temp_low_critical and temperature > 0:
            alerts.append(Alert(
                id=self._generate_alert_id(),
                patient_id=patient_id,
                type=AlertType.HYPOTHERMIA.value,
                message=f"Critical hypothermia: {temperature}°C (threshold: <{settings.temp_low_critical}°C)",
                severity=AlertSeverity.CRITICAL.value,
                vital_type="temperature",
                vital_value=temperature,
                threshold=settings.temp_low_critical,
                timestamp=timestamp
            ))

        # Respiratory Rate Alerts
        if respiratory >= settings.resp_high_critical:
            alerts.append(Alert(
                id=self._generate_alert_id(),
                patient_id=patient_id,
                type=AlertType.TACHYPNEA.value,
                message=f"Critical tachypnea: {respiratory}/min (threshold: >{settings.resp_high_critical})",
                severity=AlertSeverity.CRITICAL.value,
                vital_type="respiratory_rate",
                vital_value=respiratory,
                threshold=settings.resp_high_critical,
                timestamp=timestamp
            ))
        elif respiratory >= settings.resp_high_warning:
            alerts.append(Alert(
                id=self._generate_alert_id(),
                patient_id=patient_id,
                type=AlertType.TACHYPNEA.value,
                message=f"Elevated respiratory rate: {respiratory}/min (normal: 12-20)",
                severity=AlertSeverity.WARNING.value,
                vital_type="respiratory_rate",
                vital_value=respiratory,
                threshold=settings.resp_high_warning,
                timestamp=timestamp
            ))

        if respiratory <= settings.resp_low_critical and respiratory > 0:
            alerts.append(Alert(
                id=self._generate_alert_id(),
                patient_id=patient_id,
                type=AlertType.BRADYPNEA.value,
                message=f"Critical bradypnea: {respiratory}/min (threshold: <{settings.resp_low_critical})",
                severity=AlertSeverity.CRITICAL.value,
                vital_type="respiratory_rate",
                vital_value=respiratory,
                threshold=settings.resp_low_critical,
                timestamp=timestamp
            ))

        # Sensor disconnection (missing or zero values)
        if heart_rate == 0 or spo2 == 0:
            alerts.append(Alert(
                id=self._generate_alert_id(),
                patient_id=patient_id,
                type=AlertType.SENSOR_DISCONNECT.value,
                message="Vital signs sensor may be disconnected. Check patient monitoring equipment.",
                severity=AlertSeverity.WARNING.value,
                vital_type="sensor",
                vital_value=0,
                threshold=0,
                timestamp=timestamp
            ))

        # Store active alerts - ACCUMULATE instead of replace
        if alerts:
            if patient_id not in self.active_alerts:
                self.active_alerts[patient_id] = []
            # Add new alerts to the beginning
            self.active_alerts[patient_id] = alerts + self.active_alerts[patient_id]
            # Keep only the most recent 50 alerts per patient
            self.active_alerts[patient_id] = self.active_alerts[patient_id][:50]

        return alerts

    def get_patient_alerts(self, patient_id: str) -> List[Alert]:
        """Get alerts for a specific patient."""
        return self.active_alerts.get(patient_id, [])

    def get_all_alerts(self) -> List[Alert]:
        """Get all active alerts."""
        all_alerts = []
        for alerts in self.active_alerts.values():
            all_alerts.extend(alerts)
        return sorted(all_alerts, key=lambda x: x.timestamp, reverse=True)

    def acknowledge_alert(self, alert_id: str) -> bool:
        """Acknowledge an alert."""
        for patient_alerts in self.active_alerts.values():
            for alert in patient_alerts:
                if alert.id == alert_id:
                    alert.acknowledged = True
                    return True
        return False

    def clear_patient_alerts(self, patient_id: str):
        """Clear all alerts for a patient."""
        if patient_id in self.active_alerts:
            del self.active_alerts[patient_id]


# Singleton instance
alert_engine = AlertEngine()
