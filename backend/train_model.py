import pandas as pd
import joblib
import os
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(os.path.dirname(BASE_DIR), "dataset", "symptom_disease.csv")
MODEL_DIR = os.path.join(BASE_DIR, "model")
MODEL_PATH = os.path.join(MODEL_DIR, "disease_model.pkl")
SYMPTOMS_PATH = os.path.join(MODEL_DIR, "symptoms.pkl")
DISEASES_PATH = os.path.join(MODEL_DIR, "diseases.pkl")

os.makedirs(MODEL_DIR, exist_ok=True)

# Load dataset
df = pd.read_csv(DATASET_PATH)
print(f"Dataset loaded: {df.shape}")

X = df.drop("disease", axis=1)
y = df["disease"]

symptoms = X.columns.tolist()
diseases = sorted(y.unique().tolist())

print(f"Symptoms ({len(symptoms)}): {symptoms}")
print(f"Diseases ({len(diseases)}): {diseases}")

# Split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Evaluate
y_pred = model.predict(X_test)
acc = accuracy_score(y_test, y_pred)
print(f"\nAccuracy: {acc*100:.2f}%")
print(classification_report(y_test, y_pred, zero_division=0))

# Save
joblib.dump(model, MODEL_PATH)
joblib.dump(symptoms, SYMPTOMS_PATH)
joblib.dump(diseases, DISEASES_PATH)

print(f"\nModel saved to {MODEL_PATH}")
print(f"Symptoms saved to {SYMPTOMS_PATH}")

# Feature importance
importances = model.feature_importances_
feat_imp = sorted(zip(symptoms, importances), key=lambda x: x[1], reverse=True)
print("\nTop Symptoms by Importance:")
for f, imp in feat_imp[:10]:
    print(f"  {f}: {imp:.3f}")
