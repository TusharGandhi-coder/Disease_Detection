import pandas as pd
import random
import os

random.seed(42)

# Define disease -> symptom probabilities (core symptoms high prob, others low)
disease_profiles = {
    "Common Cold": {"core": ["fever","cough","sore_throat","runny_nose","headache"], "prob_core": 0.85, "prob_other": 0.1},
    "Flu": {"core": ["fever","high_fever","cough","fatigue","sore_throat","chills","sweating"], "prob_core": 0.85, "prob_other": 0.08},
    "Pneumonia": {"core": ["fever","cough","shortness_of_breath","chest_pain","fatigue","high_fever"], "prob_core": 0.85, "prob_other": 0.07},
    "Migraine": {"core": ["headache","nausea","vomiting","dizziness","fatigue"], "prob_core": 0.85, "prob_other": 0.05},
    "Gastroenteritis": {"core": ["nausea","vomiting","diarrhea","abdominal_pain","fever"], "prob_core": 0.85, "prob_other": 0.06},
    "Bronchitis": {"core": ["cough","fatigue","shortness_of_breath","chest_pain","fever"], "prob_core": 0.85, "prob_other": 0.07},
    "Anemia": {"core": ["fatigue","dizziness","weight_loss","loss_of_appetite","abdominal_pain"], "prob_core": 0.8, "prob_other": 0.05},
    "Chickenpox": {"core": ["fever","rash","fatigue","sore_throat","joint_pain"], "prob_core": 0.85, "prob_other": 0.06},
    "Dengue": {"core": ["high_fever","headache","joint_pain","rash","sweating","chills"], "prob_core": 0.85, "prob_other": 0.05},
    "Diabetes": {"core": ["fatigue","weight_loss","loss_of_appetite","dizziness","nausea"], "prob_core": 0.8, "prob_other": 0.05},
    "Typhoid": {"core": ["high_fever","abdominal_pain","fatigue","headache","diarrhea"], "prob_core": 0.85, "prob_other": 0.05},
    "Malaria": {"core": ["high_fever","chills","sweating","headache","nausea","fatigue"], "prob_core": 0.85, "prob_other": 0.06},
}

all_symptoms = ["fever","cough","headache","fatigue","sore_throat","shortness_of_breath","chest_pain","nausea","vomiting","diarrhea","abdominal_pain","joint_pain","rash","weight_loss","loss_of_appetite","dizziness","high_fever","sweating","chills","runny_nose"]

rows = []
per_disease = 150  # 150 x 12 = 1800 rows

for disease, profile in disease_profiles.items():
    for _ in range(per_disease):
        row = {}
        for s in all_symptoms:
            if s in profile["core"]:
                row[s] = 1 if random.random() < profile["prob_core"] else 0
                # add noise: 10% chance to flip 0->1 even if core but missed
                if row[s]==0 and random.random()<0.05:
                    row[s]=1
            else:
                row[s] = 1 if random.random() < profile["prob_other"] else 0
        # Ensure at least 2 symptoms
        if sum(row.values()) < 2:
            core_samples = random.sample(profile["core"], 2)
            for cs in core_samples:
                row[cs]=1
        row["disease"] = disease
        rows.append(row)

df = pd.DataFrame(rows)
# Shuffle
df = df.sample(frac=1, random_state=42).reset_index(drop=True)

out_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dataset", "symptom_disease.csv")
df.to_csv(out_path, index=False)
print(f"Generated {df.shape[0]} rows, {df.shape[1]-1} symptoms -> {out_path}")
print(df["disease"].value_counts())
