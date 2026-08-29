from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Dict
import joblib
import os
import pandas as pd
import numpy as np

app = FastAPI(title="Disease Detection API", version="1.0.0")

# CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "model", "disease_model.pkl")
SYMPTOMS_PATH = os.path.join(BASE_DIR, "model", "symptoms.pkl")
DISEASES_PATH = os.path.join(BASE_DIR, "model", "diseases.pkl")

# Load model if exists, else use fallback
model = None
SYMPTOMS = []
DISEASES = []
DISEASE_INFO = {
    "Common Cold": {"description": "Viral infection of upper respiratory tract", "precaution": "Rest, hydrate, avoid cold exposure", "severity": "Low"},
    "Flu": {"description": "Influenza viral infection", "precaution": "Rest, fluids, consult doctor if high fever persists", "severity": "Medium"},
    "Pneumonia": {"description": "Infection inflaming air sacs in lungs", "precaution": "Seek immediate medical attention, chest X-ray needed", "severity": "High"},
    "Migraine": {"description": "Neurological condition causing intense headache", "precaution": "Rest in dark room, avoid triggers, consult neurologist", "severity": "Medium"},
    "Gastroenteritis": {"description": "Inflammation of stomach and intestines", "precaution": "Hydrate, avoid spicy food, ORS", "severity": "Medium"},
    "Bronchitis": {"description": "Inflammation of bronchial tubes", "precaution": "Avoid smoking, steam inhalation, doctor consultation", "severity": "Medium"},
    "Anemia": {"description": "Lack of healthy red blood cells", "precaution": "Iron-rich diet, check hemoglobin, consult doctor", "severity": "Medium"},
    "Chickenpox": {"description": "Highly contagious viral infection", "precaution": "Isolation, calamine lotion, avoid scratching", "severity": "Medium"},
    "Dengue": {"description": "Mosquito-borne viral infection", "precaution": "Urgent medical care, platelet monitoring, hydrate", "severity": "High"},
    "Diabetes": {"description": "Metabolic disorder with high blood sugar", "precaution": "Blood sugar monitoring, diet control, exercise", "severity": "High"},
}

try:
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
        SYMPTOMS = joblib.load(SYMPTOMS_PATH)
        DISEASES = joblib.load(DISEASES_PATH)
        print(f"Model loaded: {len(SYMPTOMS)} symptoms, {len(DISEASES)} diseases")
    else:
        # Fallback symptoms if model not trained yet
        SYMPTOMS = ["fever","cough","headache","fatigue","sore_throat","shortness_of_breath","chest_pain","nausea","vomiting","diarrhea","abdominal_pain","joint_pain","rash","weight_loss","loss_of_appetite","dizziness","high_fever","sweating","chills","runny_nose"]
        DISEASES = list(DISEASE_INFO.keys())
        print("Model not found - using fallback. Run train_model.py first!")
except Exception as e:
    print(f"Error loading model: {e}")
    SYMPTOMS = ["fever","cough","headache","fatigue","sore_throat","shortness_of_breath","chest_pain","nausea","vomiting","diarrhea","abdominal_pain","joint_pain","rash","weight_loss","loss_of_appetite","dizziness","high_fever","sweating","chills","runny_nose"]
    DISEASES = list(DISEASE_INFO.keys())

class SymptomInput(BaseModel):
    symptoms: List[str]

@app.get("/api")
def root():
    return {"message": "Disease Detection API is running", "symptoms_count": len(SYMPTOMS), "diseases_count": len(DISEASES)}

# Serve frontend static files (if exists) - MUST be after API routes
FRONTEND_DIR = os.path.join(os.path.dirname(BASE_DIR), "frontend")
if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

    @app.get("/")
    def serve_frontend():
        index_path = os.path.join(FRONTEND_DIR, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        return {"message": "Frontend not found, API at /api"}
else:
    @app.get("/")
    def root_fallback():
        return {"message": "Disease Detection API is running", "symptoms_count": len(SYMPTOMS), "diseases_count": len(DISEASES), "frontend": "not found - create frontend/index.html"}

@app.get("/api/symptoms")
def get_symptoms():
    return {"symptoms": SYMPTOMS}

@app.get("/api/diseases")
def get_diseases():
    return {"diseases": DISEASES, "info": DISEASE_INFO}

@app.post("/api/predict")
def predict(data: SymptomInput):
    if not data.symptoms:
        raise HTTPException(status_code=400, detail="No symptoms provided")
    
    # Validate symptoms
    invalid = [s for s in data.symptoms if s not in SYMPTOMS]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Invalid symptoms: {invalid}")

    if model is None:
        raise HTTPException(status_code=500, detail="Model not trained yet. Run python train_model.py")

    # Create input vector
    input_vector = [1 if s in data.symptoms else 0 for s in SYMPTOMS]
    input_df = pd.DataFrame([input_vector], columns=SYMPTOMS)

    # Predict
    prediction = model.predict(input_df)[0]
    probabilities = model.predict_proba(input_df)[0]
    
    # Get top 3 predictions
    classes = model.classes_
    prob_map = {cls: float(prob) for cls, prob in zip(classes, probabilities)}
    sorted_probs = sorted(prob_map.items(), key=lambda x: x[1], reverse=True)
    top3 = [{"disease": k, "probability": round(v*100, 2)} for k, v in sorted_probs[:3]]

    info = DISEASE_INFO.get(prediction, {"description": "Consult doctor", "precaution": "Seek medical advice", "severity": "Unknown"})

    return {
        "predicted_disease": prediction,
        "confidence": round(float(max(probabilities))*100, 2),
        "top_predictions": top3,
        "info": info,
        "input_symptoms": data.symptoms,
        "disclaimer": "This is an AI prediction, not medical advice. Consult a healthcare professional."
    }

@app.get("/api/health")
def health():
    return {"status": "ok", "model_loaded": model is not None}

# Voice control - merged from Flask voice app (C:\Users\gandh\OneDrive\Desktop\voice control using flask\app.py)
import datetime
class VoiceInput(BaseModel):
    command: str

@app.post("/api/voice")
def voice_command(data: VoiceInput):
    command = data.command.lower()
    response = ""
    action = "none"
    url = None
    # Wikipedia search
    if 'who is' in command or 'what is' in command or 'wikipedia' in command:
        query = command.replace("wikipedia","").replace("who is","").replace("what is","").strip()
        response = f"Searching Wikipedia for {query}"
        url = f"https://en.wikipedia.org/wiki/{query.replace(' ','_')}"
        action = "wikipedia"
    elif 'search youtube' in command:
        q = command.replace("search youtube","").strip()
        response = f"Opening YouTube for {q}" if q else "What to search on YouTube?"
        url = f"https://www.youtube.com/results?search_query={q}" if q else "https://youtube.com"
        action = "open_url"
    elif 'open youtube' in command:
        response = "Opening YouTube"
        url = "https://youtube.com"
        action = "open_url"
    elif 'search google' in command:
        q = command.replace("search google","").strip()
        response = f"Searching Google for {q}" if q else "What to search on Google?"
        url = f"https://www.google.com/search?q={q}" if q else "https://google.com"
        action = "open_url"
    elif 'open google' in command:
        response = "Opening Google"
        url = "https://google.com"
        action = "open_url"
    elif 'time' in command:
        response = f"The current time is {datetime.datetime.now().strftime('%I:%M %p')}"
    elif 'day' in command:
        response = f"Today is {datetime.datetime.now().strftime('%A')}"
    elif 'date' in command:
        response = f"Today's date is {datetime.datetime.now().strftime('%B %d, %Y')}"
    elif 'bye' in command:
        response = "Bye Human. See you soon"
    # HealthHub specific voice commands (client also handles these directly)
    elif 'go to profile' in command or 'open profile' in command:
        response = "Opening Profile page"; action="navigate"; url="1"
    elif 'go to symptom' in command or 'open symptom' in command:
        response = "Opening Symptoms page"; action="navigate"; url="2"
    elif 'go to nutrition' in command or 'open nutrition' in command or 'go to diet' in command:
        response = "Opening Nutrition page"; action="navigate"; url="3"
    elif 'go to report' in command:
        response = "Opening Report page"; action="navigate"; url="4"
    elif 'go to tracker' in command or 'open tracker' in command:
        response = "Opening Tracker page"; action="navigate"; url="5"
    elif 'predict' in command:
        response = "Predicting disease"; action="predict"
    elif 'dark mode' in command:
        response = "Toggling dark mode"; action="darkmode"
    else:
        response = f"You said: {command}. Try say: open youtube, search google, time, go to symptoms, predict disease."
    return {"response": response, "action": action, "url": url, "command": command}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
