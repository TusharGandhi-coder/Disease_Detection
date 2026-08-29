# Disease Detection - Symptom Based

## Structure
```
Disease Detection/
├── backend/
│   ├── app.py              # FastAPI API + serves frontend
│   ├── train_model.py      # Train RandomForest (88% accuracy)
│   ├── generate_dataset.py # Generates 1800 rows synthetic data
│   └── model/              # .pkl files
├── frontend/
│   ├── index.html          # No build needed - pure HTML/CSS/JS
│   ├── style.css
│   └── app.js
└── dataset/
    └── symptom_disease.csv # 1800 rows, 12 diseases, 20 symptoms
```

## How to Run (FIX for API not connecting)

### 1. Backend must be running FIRST
Open Terminal in `backend` folder:
```powershell
cd "C:\Users\gandh\OneDrive\Desktop\Disease Detection\backend"
python -m uvicorn app:app --reload --port 8000
```
Keep this terminal running. You should see:
```
Model loaded: 20 symptoms, 12 diseases
Uvicorn running on http://0.0.0.0:8000
```

### 2. Test API directly (verify before frontend)
Open another terminal:
```powershell
Invoke-RestMethod http://localhost:8000/api/health
Invoke-RestMethod http://localhost:8000/api/symptoms
```

Or open in browser: `http://localhost:8000/api/health` should show `{"status":"ok","model_loaded":true}`

### 3. Open Frontend
**Best (no CORS issue):** Open `http://localhost:8000/` in browser - frontend is served directly by FastAPI.

**Alternative:** Double-click `frontend/index.html` - it auto-detects API at `http://localhost:8000`

## Common "API not connecting" Fixes

| Problem | Fix |
|---------|-----|
| `❌ API NOT Connected` red banner | Backend not running - do step 1 |
| `ERR_CONNECTION_REFUSED` | Check port 8000 not used by other app. Try `netstat -ano \| findstr :8000` |
| CORS error in console (F12) | Use `http://localhost:8000/` (same origin) not `file://` |
| `Model not loaded` | Run `python train_model.py` in backend folder |
| `fastapi not found` | Run `python -m pip install fastapi uvicorn` |
| `npm registry` error | Not needed! This frontend has NO npm/build step |

## API Endpoints
- `GET /api/health` - check model
- `GET /api/symptoms` - list 20 symptoms
- `GET /api/diseases` - list 12 diseases
- `POST /api/predict` `{"symptoms":["fever","cough"]}`

## Test Prediction (PowerShell)
```powershell
Invoke-RestMethod -Uri http://localhost:8000/api/predict -Method Post -ContentType "application/json" -Body '{"symptoms":["fever","cough","sore_throat","runny_nose"]}'
# Should return Common Cold 99%
```
