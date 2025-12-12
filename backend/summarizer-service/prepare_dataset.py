"""
Prepare training data for model retraining.
Generates SYNTHETIC diverse training data matching original training notebook.
This ensures the model sees diverse disorders, not just normal vitals from ES.
"""
import json
import os
import random
from tqdm import tqdm

# Configuration
NUM_PATIENTS = 100
TRAIN_SAMPLES = int(os.environ.get('TRAIN_SAMPLES', '5000'))  # Configurable, default 5000

def simulate_vitals():
    """Generate random vitals with wide variation - matches original training."""
    return {
        "hr": random.randint(50, 160),
        "spo2": random.randint(80, 100),
        "temp": round(random.uniform(36.0, 40.7), 1),
        "bp_sys": random.randint(90, 200),
        "bp_dia": random.randint(50, 130),
        "resp": random.randint(10, 35),
    }

def generate_alerts(v):
    """Generate alerts based on vitals - EXACT match to original training logic."""
    alerts = []

    if v["spo2"] < 90:
        alerts.append("severe hypoxia")
    elif v["spo2"] < 94:
        alerts.append("low oxygen saturation")

    if v["hr"] > 140:
        alerts.append("tachycardia")
    elif v["hr"] < 50:
        alerts.append("bradycardia")

    if v["temp"] > 39.0:
        alerts.append("high fever")
    elif v["temp"] > 38.0:
        alerts.append("fever")

    if v["bp_sys"] > 180 or v["bp_dia"] > 120:
        alerts.append("hypertensive crisis")

    if v["resp"] > 28:
        alerts.append("rapid breathing")
    elif v["resp"] < 12:
        alerts.append("slow respiration")

    return alerts

def generate_log_lines(patient_id, n_events=5):
    """Generate log lines for a patient - EXACT match to original training."""
    logs = []
    conditions = []

    for _ in range(n_events):
        v = simulate_vitals()
        alerts = generate_alerts(v)

        log = (
            f"Patient {patient_id}: HR={v['hr']}, SpO2={v['spo2']}, "
            f"Temp={v['temp']}, BP={v['bp_sys']}/{v['bp_dia']}, Resp={v['resp']}."
        )
        logs.append(log)
        conditions.extend(alerts)

    return logs, conditions

def generate_summary(patient_id, conditions):
    """Generate summary text - EXACT match to original training logic."""
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

def generate_dataset(num_samples):
    """Generate synthetic training dataset - EXACT match to original training."""
    dataset = []

    print(f"Generating {num_samples} training samples...")
    for i in range(num_samples):
        if i % 500 == 0:
            print(f"  Progress: {i}/{num_samples}")

        patient_id = random.randint(1, NUM_PATIENTS)
        logs, conditions = generate_log_lines(patient_id)
        dataset.append({
            "input": " ".join(logs),
            "summary": generate_summary(patient_id, conditions)
        })

    return dataset

def prepare_training_data():
    """Main function to prepare training data."""
    print(f"\n=== Generating Synthetic Training Data ===")
    print(f"Target samples: {TRAIN_SAMPLES}")

    # Generate synthetic data (matching original training notebook)
    train_data = generate_dataset(TRAIN_SAMPLES)

    # Count disorder vs stable
    disorders = sum(1 for d in train_data if "experienced" in d["summary"])
    stable = len(train_data) - disorders

    print(f"\nDataset statistics:")
    print(f"  - With disorders: {disorders} ({100*disorders/len(train_data):.1f}%)")
    print(f"  - Stable: {stable} ({100*stable/len(train_data):.1f}%)")

    # Save prepared dataset
    os.makedirs('training_output', exist_ok=True)
    with open('training_output/train_dataset.json', 'w') as f:
        json.dump(train_data, f, indent=2)

    print(f"\n✅ Saved {len(train_data)} training samples to training_output/train_dataset.json")

    # Show sample
    if train_data:
        print("\n=== Sample Training Pair ===")
        sample = train_data[0]
        print("INPUT:", sample['input'][:200], "...")
        print("SUMMARY:", sample['summary'])

    return len(train_data)

if __name__ == '__main__':
    prepare_training_data()
