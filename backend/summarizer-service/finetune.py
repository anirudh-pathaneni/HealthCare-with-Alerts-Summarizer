"""
Fine-tune the summarization model on medical data.
Matches the original training notebook format.
Pushes the fine-tuned model back to HuggingFace for continuous improvement.
"""
import json
import os
from datasets import Dataset
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, Trainer, TrainingArguments
from huggingface_hub import HfApi, login

MAX_INPUT_LENGTH = 512
MAX_TARGET_LENGTH = 128

def finetune_model():
    """Fine-tune the summarization model on medical data."""

    model_name = os.environ.get('MODEL_NAME', '5unnySunny/medical-flan-t5-small-log-summarizer')
    output_dir = 'finetuned_model'
    hf_token = os.environ.get('HF_TOKEN')
    push_to_hub = hf_token is not None

    # Load dataset
    dataset_file = 'training_output/train_dataset.json'
    if not os.path.exists(dataset_file):
        print("No training data found, skipping fine-tuning")
        return False

    with open(dataset_file, 'r') as f:
        data = json.load(f)

    if len(data) < 10:
        print(f"Insufficient training data ({len(data)} samples), need at least 10")
        return False

    print(f"\n=== Fine-tuning Configuration ===")
    print(f"Model: {model_name}")
    print(f"Training samples: {len(data)}")
    print(f"Output directory: {output_dir}")
    print(f"Push to HuggingFace: {push_to_hub}")

    print(f"\nLoading model: {model_name}")
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSeq2SeqLM.from_pretrained(model_name)

    # Convert to HuggingFace dataset
    dataset = Dataset.from_list(data)
    print(f"Loaded {len(dataset)} training examples")

    def preprocess_function(examples):
        # Add prefix matching original training
        inputs = ["Summarize the following medical monitoring events: " + i for i in examples["input"]]

        model_inputs = tokenizer(
            inputs,
            max_length=MAX_INPUT_LENGTH,
            truncation=True,
            padding="max_length"
        )

        # Tokenize targets
        with tokenizer.as_target_tokenizer():
            labels = tokenizer(
                examples["summary"],
                max_length=MAX_TARGET_LENGTH,
                truncation=True,
                padding="max_length"
            )

        # Replace pad token id by -100 for loss calculation
        labels_ids = labels["input_ids"]
        labels_ids = [
            [(l if l != tokenizer.pad_token_id else -100) for l in seq]
            for seq in labels_ids
        ]

        model_inputs["labels"] = labels_ids
        return model_inputs

    print("Tokenizing dataset...")
    tokenized_dataset = dataset.map(
        preprocess_function,
        batched=True,
        remove_columns=dataset.column_names
    )

    # Training arguments - reduced for local testing
    num_epochs = int(os.environ.get('NUM_EPOCHS', '1'))  # Default 1 for testing
    print(f"\nTraining for {num_epochs} epoch(s)...")

    training_args = TrainingArguments(
        output_dir=output_dir,
        per_device_train_batch_size=4,  # Smaller batch for CPU
        num_train_epochs=num_epochs,
        learning_rate=5e-5,
        logging_steps=10,
        save_strategy="epoch",
        report_to="none",
        # Show progress
        disable_tqdm=False,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_dataset,
        tokenizer=tokenizer,
    )

    print("\n=== Starting Fine-tuning ===")
    trainer.train()

    # Save fine-tuned model locally
    print(f"\nSaving model to {output_dir}...")
    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)

    # Push to HuggingFace Hub if token is available
    if push_to_hub:
        print(f"\n=== Pushing to HuggingFace Hub ===")
        try:
            login(token=hf_token)

            # Push model and tokenizer
            model.push_to_hub(model_name, token=hf_token, commit_message="Automated retrain from Jenkins pipeline")
            tokenizer.push_to_hub(model_name, token=hf_token, commit_message="Automated retrain from Jenkins pipeline")

            print(f"✅ Model pushed to HuggingFace: {model_name}")
        except Exception as e:
            print(f"⚠️ Failed to push to HuggingFace: {e}")
            print("Model saved locally but not pushed to HuggingFace")
    else:
        print("\n⚠️ HF_TOKEN not set - model saved locally only")
        print("Set HF_TOKEN environment variable to enable push to HuggingFace")

    print(f"\n✅ Model fine-tuned and saved to {output_dir}")
    return True

if __name__ == '__main__':
    finetune_model()
