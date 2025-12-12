"""
Prepare training data from collected medical vitals.
Matches the original training notebook format.
"""
import json
import os

MAX_TRAINING_SAMPLES = int(os.environ.get('MAX_TRAINING_SAMPLES', '50'))

def generate_alerts(v):
    """Generate alerts based on vitals - matches original training logic."""
    alerts = []

    if v.get("spo2", 100) < 90:
        alerts.append("severe hypoxia")
    elif v.get("spo2", 100) < 94:
        alerts.append("low oxygen saturation")

    if v.get("hr", 70) > 140:
        alerts.append("tachycardia")
    elif v.get("hr", 70) < 50:
        alerts.append("bradycardia")

    if v.get("temp", 37) > 39.0:
        alerts.append("high fever")
    elif v.get("temp", 37) > 38.0:
        alerts.append("fever")

    bp_sys = v.get("bp_systolic", v.get("systolic", 120))
    bp_dia = v.get("bp_diastolic", v.get("diastolic", 80))
    if bp_sys > 180 or bp_dia > 120:
        alerts.append("hypertensive crisis")

    if v.get("resp", v.get("respiratory_rate", 16)) > 28:
        alerts.append("rapid breathing")
    elif v.get("resp", v.get("respiratory_rate", 16)) < 12:
        alerts.append("slow respiration")

    return alerts

def generate_summary(patient_id, conditions):
    """Generate summary text - matches original training logic."""
    if not conditions:
        return (
            f"Patient {patient_id} remained stable with no critical abnormalities "
            f"detected during the monitoring period."
        )

    conditions = list(set(conditions))
    issues = ", ".join(conditions)

    return (
        f"Patient {patient_id} experienced {issues} during the monitoring period "
        f"and requires continued medical observation."
    )

def prepare_training_data():
    """Prepare training data from collected medical vitals."""
    training_pairs = []

    vitals_file = 'training_data/vitals.json'

    if not os.path.exists(vitals_file):
        print("No vitals data found")
        return 0

    with open(vitals_file, 'r') as f:
        vitals_data = json.load(f)

    hits = vitals_data.get('hits', {}).get('hits', [])
    print(f"Found {len(hits)} vitals records")

    # Group vitals by patient_id
    patient_vitals = {}
    for hit in hits:
        source = hit.get('_source', {})
        patient_id = source.get('patient_id', 'Unknown')

        if patient_id not in patient_vitals:
            patient_vitals[patient_id] = []
        patient_vitals[patient_id].append(source)

    print(f"Found {len(patient_vitals)} unique patients")

    # Create training pairs - group 5 vitals readings per training sample
    for patient_id, vitals_list in patient_vitals.items():
        # Process in groups of 5
        for i in range(0, len(vitals_list), 5):
            if len(training_pairs) >= MAX_TRAINING_SAMPLES:
                break

            group = vitals_list[i:i+5]
            if len(group) < 2:  # Need at least 2 readings
                continue

            # Build input text (multiple vitals readings)
            logs = []
            all_alerts = []
            for v in group:
                hr = v.get('heart_rate', v.get('hr', 72))
                spo2 = v.get('spo2', v.get('oxygen_saturation', 98))
                temp = v.get('temperature', v.get('temp', 37.0))
                bp_sys = v.get('systolic_bp', v.get('bp_systolic', v.get('systolic', 120)))
                bp_dia = v.get('diastolic_bp', v.get('bp_diastolic', v.get('diastolic', 80)))
                resp = v.get('respiratory_rate', v.get('resp', 16))

                log = f"Patient {patient_id}: HR={hr}, SpO2={spo2}, Temp={temp}, BP={bp_sys}/{bp_dia}, Resp={resp}."
                logs.append(log)

                # Generate alerts for this reading
                alerts = generate_alerts({
                    'hr': hr, 'spo2': spo2, 'temp': temp,
                    'bp_systolic': bp_sys, 'bp_diastolic': bp_dia,
                    'resp': resp
                })
                all_alerts.extend(alerts)

            # Build output text (summary)
            summary = generate_summary(patient_id, all_alerts)

            training_pairs.append({
                'input': ' '.join(logs),
                'summary': summary
            })

        if len(training_pairs) >= MAX_TRAINING_SAMPLES:
            break

    # Save prepared dataset
    os.makedirs('training_output', exist_ok=True)
    with open('training_output/train_dataset.json', 'w') as f:
        json.dump(training_pairs, f, indent=2)

    print(f"Prepared {len(training_pairs)} training examples (limit: {MAX_TRAINING_SAMPLES})")

    # Show sample
    if training_pairs:
        print("\n=== Sample Training Pair ===")
        print("INPUT:", training_pairs[0]['input'][:200], "...")
        print("SUMMARY:", training_pairs[0]['summary'])

    return len(training_pairs)

if __name__ == '__main__':
    prepare_training_data()
