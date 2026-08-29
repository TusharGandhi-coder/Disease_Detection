const API_BASE = window.location.port === "8000" ? window.location.origin : "http://localhost:8000";

let state = JSON.parse(localStorage.getItem("hh_state") || "null") || {
  profile: { name:"", gender:"", age:"", height:"", weight:"", history:"", activity:"1.55" },
  symptoms: [],
  prediction: null,
  nutrition: { goal: "muscle", diet: "veg" }
};
let allSymptoms = [];
let selected = new Set(state.symptoms);

function saveState(){ localStorage.setItem("hh_state", JSON.stringify(state)); }

// Dark mode
if(localStorage.getItem("theme")==="dark" || (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches)){
  document.documentElement.classList.add("dark");
  document.getElementById("darkIcon").className="fa-solid fa-sun";
}
function toggleDark(){
  document.documentElement.classList.toggle("dark");
  const isDark = document.documentElement.classList.contains("dark");
  localStorage.setItem("theme", isDark?"dark":"light");
  document.getElementById("darkIcon").className = isDark?"fa-solid fa-sun":"fa-solid fa-moon";
}

// Navigation
function goTo(n){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  const pg=document.getElementById("page"+n); if(pg) pg.classList.add("active");
  document.querySelectorAll(".step").forEach((s,i)=>{
    const idx=i+1;
    if(idx===n) s.className="step flex-1 py-2 px-2 rounded-lg text-sm font-semibold bg-blue-600 text-white";
    else if(idx < n) s.className="step flex-1 py-2 px-2 rounded-lg text-sm font-semibold bg-green-600 text-white";
    else s.className="step flex-1 py-2 px-2 rounded-lg text-sm font-semibold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300";
  });
  for(let i=1;i<=4;i++){ const el=document.getElementById("prog"+i); if(el) el.style.width = (n>i? "100%": n===i? "50%":"0%"); }
  if(n===2) { const g=document.getElementById("greetName"); if(g) g.textContent=state.profile.name||"there"; }
  if(n===3) { const nn=document.getElementById("nutriName"); if(nn) nn.textContent=state.profile.name||"you"; updateNutriHeader(); renderNutrition(); }
  if(n===4) renderReport();
  if(n===5) renderTracker();
  window.scrollTo({top:0, behavior:"smooth"});
}

// Page 1
function calcBMI(){
  const h=parseFloat(document.getElementById("pHeight").value), w=parseFloat(document.getElementById("pWeight").value);
  if(h && w){
    const bmi = w / ((h/100)*(h/100));
    document.getElementById("bmiVal").textContent = bmi.toFixed(1);
    let cat="Normal", cls="bg-green-100 text-green-700";
    if(bmi<18.5){cat="Underweight"; cls="bg-blue-100 text-blue-700";}
    else if(bmi>=25 && bmi<30){cat="Overweight"; cls="bg-amber-100 text-amber-700";}
    else if(bmi>=30){cat="Obese"; cls="bg-red-100 text-red-700";}
    const el=document.getElementById("bmiCat"); el.textContent=cat; el.className="text-xs px-2 py-0.5 rounded-full ml-2 "+cls;
  }
}
function loadProfile(){
  const p=state.profile;
  document.getElementById("pName").value=p.name; document.getElementById("pGender").value=p.gender;
  document.getElementById("pAge").value=p.age; document.getElementById("pHeight").value=p.height;
  document.getElementById("pWeight").value=p.weight; document.getElementById("pHistory").value=p.history;
  document.getElementById("pActivity").value=p.activity||"1.55";
  calcBMI();
}
function saveProfile(){
  const name=document.getElementById("pName").value.trim(), gender=document.getElementById("pGender").value,
        height=document.getElementById("pHeight").value, weight=document.getElementById("pWeight").value;
  const err=document.getElementById("pError");
  if(!name || !gender || !height || !weight){ err.textContent="Name, Gender, Height, Weight are required."; err.classList.remove("hidden"); return; }
  err.classList.add("hidden");
  state.profile = { name, gender, age: document.getElementById("pAge").value, height, weight, history: document.getElementById("pHistory").value, activity: document.getElementById("pActivity").value };
  saveState(); goTo(2);
}
function clearProfile(){ ["pName","pAge","pHeight","pWeight","pHistory"].forEach(id=>document.getElementById(id).value=""); document.getElementById("pGender").value=""; calcBMI(); }

// Page 2
async function init(){
  loadProfile();
  // API badge
  const badge=document.getElementById("apiBadge");
  try{
    const r=await fetch(`${API_BASE}/api/health`); const j=await r.json();
    badge.textContent = j.model_loaded ? "✅ API Ready" : "⚠️ Model not loaded";
    badge.className = j.model_loaded ? "text-xs px-3 py-1 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200" : "text-xs px-3 py-1 rounded-full bg-amber-100 text-amber-700";
  }catch(e){ badge.textContent="❌ API Offline"; badge.className="text-xs px-3 py-1 rounded-full bg-red-100 text-red-700"; }
  // load symptoms
  try{
    const r=await fetch(`${API_BASE}/api/symptoms`); const j=await r.json(); allSymptoms=j.symptoms; renderSymptoms();
  }catch(e){ document.getElementById("symptomsGrid").innerHTML=`<p class="col-span-4 text-red-600">Failed to load symptoms. Is backend running at ${API_BASE}?</p>`; }
  // restore nutrition selectors
  document.getElementById("goal").value=state.nutrition.goal;
  document.getElementById("diet").value=state.nutrition.diet;
}
function renderSymptoms(){
  const grid=document.getElementById("symptomsGrid"); grid.innerHTML="";
  allSymptoms.forEach(s=>{
    const pretty=s.replace(/_/g," ");
    const div=document.createElement("div");
    div.className="symptom-card cursor-pointer border dark:border-slate-600 rounded-xl p-3 flex items-center gap-2 bg-slate-50 dark:bg-slate-700 hover:border-blue-400 transition "+(selected.has(s)?"selected":"");
    div.innerHTML=`<input type="checkbox" ${selected.has(s)?"checked":""} class="accent-blue-600"> <span class="text-sm font-medium capitalize">${pretty}</span>`;
    div.onclick=()=>toggle(s);
    grid.appendChild(div);
  });
  updateCount();
}
function toggle(s){
  if(selected.has(s)) selected.delete(s); else selected.add(s);
  state.symptoms=[...selected]; saveState(); renderSymptoms();
}
function updateCount(){
  document.getElementById("selCount").textContent=`${selected.size} selected`;
  document.getElementById("predictBtn").disabled = selected.size===0;
}
function clearSymptoms(){ selected.clear(); state.symptoms=[]; saveState(); renderSymptoms(); document.getElementById("result").classList.add("hidden"); }

const DISEASE_CURE = {
  "Common Cold": { cure: "Rest, warm fluids, gargle, honey-ginger tea. Usually 3-5 days.", meds:"Paracetamol if fever. No antibiotics.", diet:"Vitamin C rich - citrus, warm soups." },
  "Flu": { cure: "Rest, hydration, isolation. Antiviral if early.", meds:"Paracetamol, consult doctor if high fever >3 days.", diet:"Light, protein + fluids, avoid cold." },
  "Pneumonia": { cure: "Urgent doctor + chest X-ray. Antibiotics if bacterial.", meds:"Doctor prescribed antibiotics, oxygen if needed.", diet:"High protein, warm fluids, no smoking." },
  "Migraine": { cure: "Dark quiet room, cold compress, avoid screen.", meds:"Doctor: ibuprofen/triptans. Track triggers.", diet:"Magnesium rich - nuts, hydrate, no caffeine excess." },
  "Gastroenteritis": { cure: "ORS, rest gut (khichdi, curd).", meds:"ORS, probiotics. Avoid antibiotics without doc.", diet:"BRAT diet - banana, rice, toast." },
  "Bronchitis": { cure: "Steam inhalation, avoid dust/smoke.", meds:"Cough syrup, bronchodilator if prescribed.", diet:"Warm fluids, honey, anti-inflammatory foods." },
  "Anemia": { cure: "Iron + B12 check, treat cause.", meds:"Iron supplements after blood test.", diet:"Spinach, beetroot, lentils, jaggery." },
  "Chickenpox": { cure: "Isolation 7-10 days, no scratching.", meds:"Calamine, antihistamine. Doctor if adult.", diet:"Soft, cool foods, neem bath." },
  "Dengue": { cure: "Urgent platelet monitoring, no self-medication.", meds:"Only Paracetamol. No ibuprofen/aspirin.", diet:"Papaya leaf, coconut water, hydrate." },
  "Diabetes": { cure: "Lifestyle + sugar control, regular walk.", meds:"Metformin etc only after test. Monitor HbA1c.", diet:"Low GI - millets, veggies, no sugar." },
  "Typhoid": { cure: "Antibiotics course full, hygiene.", meds:"Doctor antibiotics, rest.", diet:"Boiled water, light cooked food." },
  "Malaria": { cure: "Blood test + complete antimalarial course.", meds:"Chloroquine/ACT as per doctor.", diet:"Hydrate, light protein." },
};

async function predict(){
  const btn=document.getElementById("predictBtn"); btn.textContent="Predicting..."; btn.disabled=true;
  try{
    const r=await fetch(`${API_BASE}/api/predict`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({symptoms:[...selected]}) });
    if(!r.ok){ const e=await r.json(); throw new Error(e.detail); }
    const data=await r.json(); state.prediction=data; saveState(); showResult(data);
  }catch(e){ alert("Predict failed: "+e.message); } finally{ btn.innerHTML=`<i class="fa-solid fa-magnifying-glass mr-1"></i> Predict Disease`; btn.disabled=false; }
}
function showResult(data){
  const cure=DISEASE_CURE[data.predicted_disease] || {cure:data.info.precaution, meds:"Consult doctor", diet:"Balanced diet"};
  const topHtml=data.top_predictions.map((p,i)=>`
    <div class="flex justify-between items-center p-3 rounded-xl ${i===0?'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800':'bg-slate-50 dark:bg-slate-700'}">
      <span class="font-semibold">${i+1}. ${p.disease}</span><span class="font-bold text-blue-600">${p.probability}%</span>
    </div>
    <div class="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full -mt-1 mb-2"><div class="h-1.5 bg-blue-600 rounded-full" style="width:${p.probability}%"></div></div>
  `).join("");
  document.getElementById("result").innerHTML=`
    <div class="p-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
      <p class="text-sm opacity-90">Predicted for <b>${state.profile.name||"you"}</b> • Confidence ${data.confidence}%</p>
      <h3 class="text-2xl font-bold">${data.predicted_disease}</h3>
      <p class="text-sm opacity-90">${data.info.description} • Severity: ${data.info.severity}</p>
    </div>
    <div class="mt-4">${topHtml}</div>
    <div class="grid md:grid-cols-3 gap-3 mt-4 text-sm">
      <div class="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800"><b class="text-green-700 dark:text-green-300"><i class="fa-solid fa-heart-pulse mr-1"></i>Cure</b><p class="mt-1">${cure.cure}</p></div>
      <div class="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800"><b class="text-amber-700 dark:text-amber-300"><i class="fa-solid fa-pills mr-1"></i>Medication</b><p class="mt-1">${cure.meds}</p></div>
      <div class="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800"><b class="text-purple-700 dark:text-purple-300"><i class="fa-solid fa-apple-whole mr-1"></i>Diet Tip</b><p class="mt-1">${cure.diet}</p></div>
    </div>
    <p class="text-xs text-center mt-3 p-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg">⚠️ ${data.disclaimer}</p>
    <button onclick="goTo(3)" class="w-full mt-3 bg-slate-900 dark:bg-white dark:text-slate-900 text-white py-2.5 rounded-xl">Next: Nutrition for Recovery →</button>
  `;
  document.getElementById("result").classList.remove("hidden");
  document.getElementById("result").scrollIntoView({behavior:"smooth"});
}

// Page 3 Nutrition - 8 goals x 3 diets
const NUTRI_DB = {
  muscle: {
    veg: { cal:"2800 kcal", p:"130g Protein", meals:["Breakfast: Oats 80g + peanut butter 20g + banana + milk 300ml (650 kcal)","Lunch: Paneer 200g + brown rice 150g + dal + curd","Snack: Whey (veg) + roasted chana 50g + apple","Dinner: Tofu 150g + quinoa 100g + veggies + ghee roti"] },
    vegan: { cal:"2750 kcal", p:"120g Protein", meals:["Breakfast: Soy milk oats + chia 15g + peanut butter + banana","Lunch: Chickpea 200g + rice + tofu 100g","Snack: Pea protein shake + dates 4 + almonds 15g","Dinner: Lentil 100g + millet 80g + stir-fry + olive oil"] },
    nonveg: { cal:"3000 kcal", p:"160g Protein", meals:["Breakfast: 4 whole eggs + oats 80g + milk + banana","Lunch: Chicken breast 250g + rice 150g + dal","Snack: Whey 30g + peanut butter + fruit","Dinner: Fish 200g / Chicken 200g + sweet potato 200g + veggies"] },
  },
  weight_gain: {
    veg: { cal:"3000 kcal", p:"110g Protein", meals:["Breakfast: Paratha 2 + curd + banana shake (700 kcal)","Lunch: Rajma 150g + rice 200g + paneer 100g + ghee","Snack: Banana 2 + peanut butter + milk 300ml","Dinner: Dal + rice + paneer + nuts 30g before bed"] },
    vegan: { cal:"2950 kcal", p:"100g Protein", meals:["Breakfast: Oats + soy milk + banana + nuts + dates","Lunch: Chickpea + rice + avocado + tofu","Snack: Peanut butter sandwich + soy shake","Dinner: Lentils + quinoa + coconut curry"] },
    nonveg: { cal:"3200 kcal", p:"140g Protein", meals:["Breakfast: 3 eggs + oats + milk + honey","Lunch: Chicken 250g + rice 200g + eggs","Snack: Whey + banana + nuts","Dinner: Mutton/Chicken + rice + veggies + curd"] },
  },
  weight_loss: {
    veg: { cal:"1600 kcal", p:"80g Protein", meals:["Breakfast: Besan chilla 2 + curd 100g (300 kcal)","Lunch: Veg 200g + 1 roti + salad + dal 100g","Snack: Fruit + green tea (150 kcal)","Dinner: Soup + paneer 100g + sauté veggies"] },
    vegan: { cal:"1500 kcal", p:"75g Protein", meals:["Breakfast: Oats 40g + soy milk + berries","Lunch: Quinoa 80g + chickpea 100g salad","Snack: Nuts 10g + fruit","Dinner: Lentil soup + veggies + 1 millet roti"] },
    nonveg: { cal:"1700 kcal", p:"100g Protein", meals:["Breakfast: 2 egg whites + oats 40g","Lunch: Grilled chicken 150g + veggies 200g","Snack: Whey 20g + apple","Dinner: Fish 150g + salad + soup"] },
  },
  fat_loss: {
    veg: { cal:"1800 kcal", p:"110g Protein", meals:["Breakfast: Sprouts 100g + whey + black coffee","Lunch: Paneer 120g + 1 roti + salad + dal","Snack: Greek yogurt (veg) + fruit","Dinner: Tofu 120g + veggies + soup - no rice"] },
    vegan: { cal:"1750 kcal", p:"100g Protein", meals:["Breakfast: Tofu scramble + oats 30g + green tea","Lunch: Chickpea 120g + large salad + lemon","Snack: Pea protein + fruit","Dinner: Stir-fry veggies + lentil 80g"] },
    nonveg: { cal:"1900 kcal", p:"130g Protein", meals:["Breakfast: 3 egg whites + 1 yolk + oats 30g","Lunch: Chicken 180g + veggies (no rice)","Snack: Whey + nuts 10g","Dinner: Fish 180g + broccoli + soup"] },
  },
  maintenance: {
    veg: { cal:"2100 kcal", p:"70g Protein", meals:["Breakfast: Poha 100g + curd 100g + fruit","Lunch: 2 roti + dal 100g + sabzi 200g + curd","Snack: Nuts 15g + tea","Dinner: Khichdi 150g + veggies + papad"] },
    vegan: { cal:"2050 kcal", p:"65g Protein", meals:["Breakfast: Muesli 60g + soy milk 250ml","Lunch: Rice 120g + dal + veggies","Snack: Fruit + seeds 15g","Dinner: Millet 80g + lentil 80g"] },
    nonveg: { cal:"2200 kcal", p:"90g Protein", meals:["Breakfast: 2 eggs + toast + fruit","Lunch: Chicken 150g + rice 120g + veggies","Snack: Curd 150g + fruit","Dinner: Fish 120g + 1 roti + soup"] },
  },
  endurance: {
    veg: { cal:"2600 kcal", p:"95g Protein", meals:["Breakfast: Oats + banana + honey + milk + dates (carb load)","Lunch: Rice 150g + dal + paneer + curd","Snack: Electrolyte + fruit + nuts","Dinner: Pasta/Rice + veggies + paneer - pre run carbo"] },
    vegan: { cal:"2550 kcal", p:"85g Protein", meals:["Breakfast: Oats + soy milk + banana + chia + maple","Lunch: Quinoa + chickpea + veggies + tahini","Snack: Dates + nuts + coconut water","Dinner: Sweet potato + lentils + greens"] },
    nonveg: { cal:"2700 kcal", p:"110g Protein", meals:["Breakfast: 3 eggs + oats + banana + honey","Lunch: Chicken 200g + rice + veggies + curd","Snack: Whey + fruit + electrolytes","Dinner: Fish + rice + veggies"] },
  },
  immunity: {
    veg: { cal:"2100 kcal", p:"75g Protein", meals:["Breakfast: Amla juice + upma + curd + tulsi tea","Lunch: Dal + roti + turmeric sabzi + curd","Snack: Citrus fruit + nuts + ginger tea","Dinner: Khichdi + garlic tadka + veggies + haldi milk"] },
    vegan: { cal:"2050 kcal", p:"70g Protein", meals:["Breakfast: Citrus + oats + seeds + turmeric latte (soy)","Lunch: Millet + lentil + leafy greens + lemon","Snack: Berries + nuts + green tea","Dinner: Soup + quinoa + broccoli + garlic"] },
    nonveg: { cal:"2150 kcal", p:"90g Protein", meals:["Breakfast: Eggs + citrus + fortified milk","Lunch: Chicken soup + roti + veggies","Snack: Fruit + nuts + green tea","Dinner: Fish + veggies + chicken broth"] },
  },
  diabetic: {
    veg: { cal:"1800 kcal", p:"80g Protein", meals:["Breakfast: Besan chilla + curd (no sugar) + methi","Lunch: 1-2 millet roti + dal + green sabzi + salad","Snack: Roasted chana + buttermilk","Dinner: Dal + sabzi + 1 roti - early 7pm"] },
    vegan: { cal:"1750 kcal", p:"75g Protein", meals:["Breakfast: Oats + soy milk (unsweetened) + seeds","Lunch: Brown rice 80g + sambar + veggies","Snack: Nuts 10g + green tea","Dinner: Quinoa + lentil + greens"] },
    nonveg: { cal:"1850 kcal", p:"95g Protein", meals:["Breakfast: 2 eggs + veggies (no bread)","Lunch: Grilled chicken 150g + salad + 1 roti","Snack: Nuts + buttermilk","Dinner: Fish 150g + veggies + soup"] },
  }
};
function calcTDEE(){
  const p=state.profile;
  const h=parseFloat(p.height), w=parseFloat(p.weight), age=parseFloat(p.age)||25, act=parseFloat(p.activity)||1.55;
  if(!h||!w) return null;
  // Mifflin-St Jeor
  let bmr = 10*w + 6.25*h - 5*age + (p.gender==="Female" ? -161 : 5);
  if(p.gender==="Other") bmr = 10*w + 6.25*h -5*age -78; // avg
  const tdee = Math.round(bmr * act);
  return { bmr: Math.round(bmr), tdee };
}
function updateNutriHeader(){
  const h=parseFloat(state.profile.height), w=parseFloat(state.profile.weight);
  if(h&&w){ const bmi=(w/((h/100)*(h/100))).toFixed(1); document.getElementById("nutriBMI").textContent=`BMI ${bmi}`; }
  renderCalorieSuggest();
}
function renderCalorieSuggest(){
  const el=document.getElementById("calorieSuggest");
  const td=calcTDEE();
  if(!td){ el.classList.add("hidden"); return; }
  const goal=document.getElementById("goal").value;
  const offsets={ muscle:300, weight_gain:500, weight_loss:-400, fat_loss:-500, maintenance:0, endurance:200, immunity:0, diabetic:-300 };
  const target = td.tdee + (offsets[goal]||0);
  const planCal = parseInt(NUTRI_DB[goal][document.getElementById("diet").value].cal);
  const diff = planCal - target;
  const match = Math.abs(diff) < 150 ? "✅ Good match" : diff>0 ? `⚠️ Plan +${diff} kcal over target` : `⚠️ Plan ${Math.abs(diff)} kcal under target`;
  const bmi = (state.profile.weight/((state.profile.height/100)*(state.profile.height/100))).toFixed(1);
  let advice="";
  if(bmi<18.5 && goal!=="weight_gain") advice="• Your BMI is low → Weight Gain recommended.";
  else if(bmi>=25 && (goal==="muscle"||goal==="weight_gain")) advice="• BMI high → Weight/Fat Loss more suitable.";
  el.innerHTML=`
    <div class="flex justify-between items-center flex-wrap gap-2">
      <span class="text-sm"><b><i class="fa-solid fa-fire text-orange-500 mr-1"></i> Auto Suggest:</b> BMR ${td.bmr} • TDEE <b>${td.tdee} kcal</b> → <b>${goal.replace("_"," ")}</b> target <b class="text-blue-600">${target} kcal</b></span>
      <span class="text-xs px-2 py-1 rounded-full ${Math.abs(diff)<150?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700'}">${match}</span>
    </div>
    <p class="text-xs text-slate-600 dark:text-slate-300 mt-1">Plan provides ${planCal} kcal. ${advice} Formula: Mifflin-St Jeor (10×W + 6.25×H -5×Age ${state.profile.gender==="Female"?"-161":"+5"}) × activity ${state.profile.activity}</p>
  `;
  el.classList.remove("hidden");
}
let currentTab = "diet";
function switchTab(tab){
  currentTab=tab;
  document.getElementById("dietTab").classList.toggle("hidden", tab!=="diet");
  document.getElementById("workoutTab").classList.toggle("hidden", tab!=="workout");
  document.getElementById("tabDiet").className = tab==="diet" ? "flex-1 py-2 rounded-lg font-semibold bg-white dark:bg-slate-800 shadow text-blue-600" : "flex-1 py-2 rounded-lg font-semibold text-slate-600 dark:text-slate-300";
  document.getElementById("tabWorkout").className = tab==="workout" ? "flex-1 py-2 rounded-lg font-semibold bg-white dark:bg-slate-800 shadow text-blue-600" : "flex-1 py-2 rounded-lg font-semibold text-slate-600 dark:text-slate-300";
  if(tab==="workout") renderWorkout();
}
const EXERCISE_DB = {
  muscle: {
    title: "Push-Pull-Legs Hypertrophy", freq:"4-5×/week • 60 min", cal:"~300 kcal/session",
    schedule: ["Mon: Push - Chest/Shoulders/Triceps","Tue: Pull - Back/Biceps","Thu: Legs - Quads/Glutes","Sat: Full Body + Arms"],
    exercises: ["Bench Press 4×8-12","Overhead Press 3×10","Pull-ups/Lat Pulldown 4×8","Barbell Row 4×10","Squats 4×8-12","Deadlift 3×6","Plank 3×60s"],
    note: "Progressive overload + 1.6-2g protein/kg. Rest 60-90s."
  },
  weight_gain: {
    title: "Strength + Mass Gain", freq:"4×/week • 45 min + no extra cardio", cal:"~250 kcal/session",
    schedule: ["Mon: Upper Strength","Tue: Lower Strength","Thu: Upper Hypertrophy","Sat: Lower Hypertrophy"],
    exercises: ["Squats 5×5","Bench 5×5","Deadlift 3×5","Overhead Press 3×8","Rows 4×8","Leg Press 3×12","Calf Raises 3×15"],
    note: "Heavy weights, long rest 2min, avoid excess cardio to stay in surplus."
  },
  weight_loss: {
    title: "Full Body Fat Burn", freq:"5×/week • 45 min", cal:"~400 kcal/session",
    schedule: ["Mon: Full Body Circuit","Tue: Cardio + Core","Wed: Full Body","Fri: HIIT 20min","Sun: Walk 10k steps"],
    exercises: ["Squats 3×15","Push-ups 3×15","Lunges 3×12/leg","Burpees 3×10","Mountain Climbers 3×30s","Plank 3×45s","Brisk Walk 30min"],
    note: "Circuit style, rest 30s, keep heart rate 130-150. 10k steps daily."
  },
  fat_loss: {
    title: "Cutting - HIIT + Weights", freq:"5-6×/week • 50 min", cal:"~450 kcal/session",
    schedule: ["Mon: Upper Weights + HIIT","Tue: HIIT 25min","Wed: Lower Weights","Thu: HIIT + Abs","Sat: Full Body Circuit"],
    exercises: ["HIIT Sprints 8×30s","Kettlebell Swings 4×15","Jump Squats 3×12","Push-ups 4×15","Burpees 4×10","Russian Twists 3×20","Treadmill Incline 15min"],
    note: "High intensity, short rest 20s. Fasted morning cardio optional."
  },
  maintenance: {
    title: "Balanced Fitness", freq:"3-4×/week • 40 min", cal:"~250 kcal/session",
    schedule: ["Mon: Full Body","Wed: Cardio + Yoga","Fri: Full Body","Sun: Walk/Yoga"],
    exercises: ["Squats 3×12","Push-ups 3×12","Rows 3×12","Lunges 3×10","Plank 3×45s","Sun Salutation 10min","Walk 30min"],
    note: "Moderate, sustainable. Focus on mobility + daily activity."
  },
  endurance: {
    title: "Stamina & Cardio", freq:"5×/week • 45-60 min", cal:"~500 kcal/session",
    schedule: ["Mon: Run 5km","Tue: Strength + Core","Wed: Interval Run 8×400m","Thu: Cycling/Swim 45min","Sat: Long Run 8-10km"],
    exercises: ["Running 30-60min","Intervals 5×1km","Burpees 3×15","Core Circuit 15min","Jump Rope 10min","Stretch 10min"],
    note: "80% Zone2 easy, 20% hard intervals. Carbs before long run."
  },
  immunity: {
    title: "Immunity & Recovery", freq:"4×/week • 30 min gentle", cal:"~180 kcal/session",
    schedule: ["Mon: Yoga + Walk","Tue: Light Cardio","Thu: Yoga + Breathing","Sat: Walk + Stretch"],
    exercises: ["Sun Salutation 12×","Pranayama 10min","Brisk Walk 30min","Light Squats 2×12","Stretch 15min","Meditation 10min"],
    note: "Low intensity, stress reduction, 7-8h sleep, no overtraining."
  },
  diabetic: {
    title: "Diabetes-Friendly", freq:"5×/week • 30 min post-meal", cal:"~220 kcal/session",
    schedule: ["Daily: Walk 30min after lunch/dinner","Mon: Full Body Light","Wed: Yoga","Fri: Strength Light"],
    exercises: ["Post-meal Walk 30min (key)","Squats 2×12","Push-ups 2×10","Resistance Band Rows 3×12","Yoga 20min","Stretch daily"],
    note: "Walk after meals lowers sugar. No high sugar before workout. Check sugar pre/post."
  }
};
function renderWorkout(){
  const goal=document.getElementById("goal").value, diet=document.getElementById("diet").value;
  const w=EXERCISE_DB[goal];
  const bmi = state.profile.height && state.profile.weight ? (state.profile.weight/((state.profile.height/100)*(state.profile.height/100))).toFixed(1) : null;
  let bmiNote="";
  if(bmi){
    if(bmi>=30) bmiNote='<span class="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full ml-2">BMI ≥30: Low impact only - no jumping/sprints, use cycling/swim</span>';
    else if(bmi>=25) bmiNote='<span class="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full ml-2">BMI 25-30: Joint-friendly - prefer incline walk over running</span>';
    else if(bmi<18.5) bmiNote='<span class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full ml-2">BMI <18.5: No extra cardio - focus strength</span>';
  }
  let dietNote="";
  if(diet==="vegan") dietNote=" + Ensure B12 + protein timing post-workout.";
  else if(diet==="veg") dietNote=" + Whey (veg) post-workout helps recovery.";
  document.getElementById("workoutPlan").innerHTML=`
    <div class="p-4 rounded-xl border dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50">
      <div class="flex flex-wrap justify-between items-center gap-2"><h3 class="font-bold">${w.title}</h3><span class="text-xs bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-2 py-1 rounded-full">${w.freq} • ${w.cal}</span></div>
      <p class="text-sm text-slate-600 dark:text-slate-300 mt-1">${w.note}${dietNote} ${bmiNote}</p>
      <div class="mt-3">
        <p class="text-xs font-semibold text-slate-500 mb-1">WEEKLY SPLIT</p>
        <div class="grid gap-1">${w.schedule.map(s=>`<div class="text-sm p-2 bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700">${s}</div>`).join("")}</div>
      </div>
      <div class="mt-3">
        <p class="text-xs font-semibold text-slate-500 mb-1">KEY EXERCISES</p>
        <div class="flex flex-wrap gap-1.5">${w.exercises.map(e=>`<span class="text-xs px-2.5 py-1 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-full">${e}</span>`).join("")}</div>
      </div>
      <p class="text-xs text-slate-500 mt-3"><i class="fa-solid fa-circle-info mr-1"></i> Tip: Start light, track reps. Rest 48h per muscle. Stop if pain. Videos: search exercise name on YouTube.</p>
    </div>
  `;
  document.getElementById("workoutTip").innerHTML=`<b><i class="fa-solid fa-heart-pulse text-blue-600 mr-1"></i> For ${goal.replace("_"," ")}:</b> ${w.note} • Hydrate 3L • Protein within 1h post workout.`;
}
function renderNutrition(){
  const goal=document.getElementById("goal").value, diet=document.getElementById("diet").value;
  state.nutrition={goal,diet}; saveState();
  renderCalorieSuggest();
  if(currentTab==="workout") renderWorkout();
  const plan=NUTRI_DB[goal][diet];
  const pred = state.prediction ? `<span class="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 px-2 py-1 rounded-full">For ${state.prediction.predicted_disease} recovery: high protein + hydration</span>` : "";
  document.getElementById("nutritionPlan").innerHTML=`
    <div class="p-4 rounded-xl border dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50">
      <div class="flex justify-between items-center"><h3 class="font-bold capitalize">${goal.replace("_"," ")} • ${diet}</h3> ${pred}</div>
      <p class="text-sm mt-1"><b>${plan.cal}</b> • <b>${plan.p}</b> • 4 meals</p>
      <div class="mt-3 space-y-2">
        ${plan.meals.map((m,i)=>`<div class="flex gap-3 p-2 bg-white dark:bg-slate-800 rounded-lg"><span class="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">${i+1}</span><span class="text-sm">${m}</span></div>`).join("")}
      </div>
    </div>
  `;
  const tips={
    muscle:"Surplus 300 kcal + progressive strength 4x/week + 1.6-2g protein/kg + 3L water.",
    weight_gain:"Surplus 500 kcal + 6 meals + strength + 8h sleep. Add ghee/nuts for calories.",
    weight_loss:"Deficit 400 kcal + 10k steps + no sugar/cold drink + protein at each meal.",
    fat_loss:"Deficit 500 kcal + HIIT 3x + high protein 2g/kg + no liquid calories.",
    maintenance:"Balanced thali: 50% veg, 25% protein, 25% millet. Walk daily.",
    endurance:"60% carbs + hydrate electrolytes + beetroot/banana pre-workout.",
    immunity:"Turmeric, citrus, garlic, leafy greens + 7h sleep + zinc.",
    diabetic:"Low GI millets, no sugar, fiber first, walk 30min post meal, monitor sugar."
  };
  document.getElementById("nutritionTip").innerHTML=`<b><i class="fa-solid fa-lightbulb text-amber-600 mr-1"></i> Tip:</b> ${tips[goal]||tips.maintenance} ${diet==="vegan"?" + B12 supplement must.":""}`;
}

// Page 4 Report
function renderReport(){
  const now=new Date().toLocaleString(); document.getElementById("reportDate").textContent=now;
  document.getElementById("reportId").textContent="HH"+Date.now().toString().slice(-6);
  const p=state.profile, pred=state.prediction, nut=state.nutrition;
  const bmi = (p.height&&p.weight) ? (p.weight/((p.height/100)*(p.height/100))).toFixed(1) : "--";
  const w = EXERCISE_DB[nut.goal] || EXERCISE_DB.maintenance;
  document.getElementById("reportContent").innerHTML=`
    <div class="grid md:grid-cols-2 gap-3">
      <div class="p-3 border dark:border-slate-600 rounded-xl"><b>Profile</b><p>Name: ${p.name||"-"} (${p.gender}, ${p.age}y)</p><p>Height ${p.height}cm, Weight ${p.weight}kg, BMI ${bmi}</p><p class="text-xs text-slate-500">History: ${p.history||"None"}</p></div>
      <div class="p-3 border dark:border-slate-600 rounded-xl"><b>Symptoms</b><p>${state.symptoms.length? state.symptoms.join(", ").replace(/_/g," ") : "None selected"}</p><p class="text-xs text-slate-500">${state.symptoms.length} symptoms</p></div>
    </div>
    <div class="p-3 border dark:border-slate-600 rounded-xl ${pred?"bg-blue-50 dark:bg-blue-900/20":""}">
      <b>Prediction</b>
      ${pred? `<p class="font-bold text-lg">${pred.predicted_disease} (${pred.confidence}%)</p><p class="text-xs">${pred.info.description}</p><p class="mt-1">Top3: ${pred.top_predictions.map(x=>x.disease+" "+x.probability+"%").join(" | ")}</p>` : "<p class='text-slate-500'>No prediction yet - go to Symptoms page.</p>"}
    </div>
    <div class="p-3 border dark:border-slate-600 rounded-xl">
      <b>Nutrition Plan</b><p>Goal: ${nut.goal} • Diet: ${nut.diet} • <span class="text-xs">${NUTRI_DB[nut.goal][nut.diet].cal}</span></p>
      <ul class="list-disc ml-5 mt-1">${NUTRI_DB[nut.goal][nut.diet].meals.map(m=>`<li>${m}</li>`).join("")}</ul>
    </div>
    <div class="p-3 border dark:border-slate-600 rounded-xl">
      <b>Workout Plan</b><p>${w.title} • ${w.freq}</p>
      <ul class="list-disc ml-5 mt-1">${w.schedule.map(s=>`<li>${s}</li>`).join("")}<li class="mt-1"><b>Exercises:</b> ${w.exercises.join(", ")}</li></ul>
    </div>
  `;
}
async function downloadPDF(){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const p=state.profile, pred=state.prediction, nut=state.nutrition;
  const bmi = (p.height&&p.weight) ? (p.weight/((p.height/100)*(p.height/100))).toFixed(1) : "--";
  doc.setFontSize(16); doc.text("HealthHub - Health Report", 10, 15);
  doc.setFontSize(9); doc.text(`Date: ${new Date().toLocaleString()} | ID: HH${Date.now().toString().slice(-6)}`, 10, 22);
  doc.setFontSize(11); doc.text(`Profile: ${p.name} (${p.gender}, ${p.age}y) H:${p.height}cm W:${p.weight}kg BMI:${bmi}`, 10, 32);
  doc.text(`History: ${p.history||"None"}`, 10, 38);
  doc.text(`Symptoms (${state.symptoms.length}): ${state.symptoms.join(", ")}`, 10, 45, {maxWidth:190});
  let y=55;
  if(pred){
    doc.setFontSize(12); doc.text(`Prediction: ${pred.predicted_disease} (${pred.confidence}%)`, 10, y); y+=7;
    doc.setFontSize(9); doc.text(`Info: ${pred.info.description} | Severity: ${pred.info.severity}`, 10, y, {maxWidth:190}); y+=10;
    doc.text(`Top3: ${pred.top_predictions.map(x=>x.disease+":"+x.probability+"%").join(" | ")}`, 10, y, {maxWidth:190}); y+=10;
    const cure = DISEASE_CURE[pred.predicted_disease];
    if(cure){ doc.text(`Cure: ${cure.cure}`, 10, y, {maxWidth:190}); y+=12; doc.text(`Meds: ${cure.meds}`, 10, y, {maxWidth:190}); y+=10; }
  } else { doc.text("Prediction: Not done", 10, y); y+=10; }
  doc.text(`Nutrition: Goal ${nut.goal} Diet ${nut.diet} ${NUTRI_DB[nut.goal][nut.diet].cal}`, 10, y); y+=7;
  NUTRI_DB[nut.goal][nut.diet].meals.forEach((m,i)=>{ doc.text(`${i+1}. ${m}`, 10, y, {maxWidth:190}); y+=7; if(y>270){ doc.addPage(); y=15; } });
  y+=4; const w2=EXERCISE_DB[nut.goal]; doc.setFontSize(11); doc.text(`Workout: ${w2.title} ${w2.freq}`, 10, y); y+=6; doc.setFontSize(9); w2.schedule.forEach(s=>{ doc.text(`- ${s}`, 10, y, {maxWidth:190}); y+=5; if(y>270){doc.addPage(); y=15;} }); doc.text(`Exercises: ${w2.exercises.join(", ")}`, 10, y, {maxWidth:190}); y+=10;
  doc.setFontSize(7); doc.text("Disclaimer: AI prediction, not medical advice. Consult doctor.", 10, y);
  doc.save(`HealthReport_${p.name||"user"}.pdf`);
}

// Voice Control - merged Flask voice (client side + /api/voice) - manual tap only
let recognition=null, isListening=false;
function speakText(t){ if('speechSynthesis' in window){ speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(t); u.lang='en-IN'; u.rate=1; speechSynthesis.speak(u); } }
let profileFilling=false, currentField=null;
function getNextMissingField(){
  if(!document.getElementById("pName").value.trim()) return "name";
  if(!document.getElementById("pGender").value) return "gender";
  if(!document.getElementById("pAge").value) return "age";
  if(!document.getElementById("pHeight").value) return "height";
  if(!document.getElementById("pWeight").value) return "weight";
  if(!document.getElementById("pActivity").value) return "activity";
  if(!document.getElementById("pHistory").value.trim()) return "history"; // optional last
  return null;
}
function promptNextField(){
  const field=getNextMissingField();
  const trans=document.getElementById("voiceTranscript");
  if(!field){
    trans.innerHTML+=`<br>✅ All entries done! Say "save profile" or tap Save.`;
    speakText("All welcome entries completed. Say save profile to continue.");
    profileFilling=false; currentField=null;
    return;
  }
  currentField=field;
  const prompts={
    name:"What is your full name?",
    gender:"What is your gender? Say male, female or other.",
    age:"What is your age?",
    height:"What is your height in centimeters?",
    weight:"What is your weight in kilograms?",
    activity:"Activity level? Say sedentary, light, moderate, active or athlete.",
    history:"Any prior disease history? Say none or describe."
  };
  trans.innerHTML+=`<br>👉 ${prompts[field]}`;
  speakText(prompts[field]);
  // auto restart listening for answer in 1.5s (no wake word needed)
  setTimeout(()=>{ if(profileFilling && !isListening) toggleVoice(); }, 1800);
}
function toggleVoice(){
  const btn=document.getElementById("voiceBtn"), icon=document.getElementById("voiceIcon"), trans=document.getElementById("voiceTranscript");
  if(!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)){ alert("Voice not supported in this browser. Use Chrome/Edge."); return; }
  if(isListening){ if(recognition) recognition.stop(); return; }
  recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang='en-IN'; recognition.interimResults=false; recognition.maxAlternatives=1;
  recognition.onstart=()=>{ isListening=true; icon.className="fa-solid fa-stop"; btn.classList.add("bg-red-600"); trans.classList.remove("hidden"); if(!profileFilling) trans.textContent="🎤 Listening... say: 'fill my welcome entries' or 'fever and cough'"; };
  recognition.onend=()=>{
    isListening=false; icon.className="fa-solid fa-microphone"; btn.classList.remove("bg-red-600");
    // continuous fill mode: keep listening without wake word until page 1 done
    if(profileFilling && currentField){
      setTimeout(()=>{ if(profileFilling && !isListening) toggleVoice(); }, 800);
    } else if(profileFilling && !currentField){
      // prompt next
      setTimeout(promptNextField, 500);
    }
  };
  recognition.onerror=(e)=>{ trans.textContent="Error: "+e.error; isListening=false; if(profileFilling) setTimeout(()=>toggleVoice(), 1200); };
  recognition.onresult=async (e)=>{
    const raw=e.results[0][0].transcript; const cmd=raw.toLowerCase().trim();
    // show raw for debugging
    trans.innerHTML=`You: <b>${raw}</b><br>Processing...`; console.log("VOICE CMD:",cmd," filling:",profileFilling," field:",currentField);
    // start fill mode trigger - must be before field handling
    if(!profileFilling && cmd.includes("fill") && (cmd.includes("welcome")||cmd.includes("profile")||cmd.includes("entries"))){
      profileFilling=true; currentField=null; goTo(1);
      trans.innerHTML=`🎤 Fill mode started<br>You: <b>${raw}</b><br>Starting...`;
      speakText("Starting welcome entries. I'll ask one by one. No need to say Hey Health again.");
      // let onend handle prompt - just return and onend will call promptNextField
      return;
    }
    // if in profile filling mode, treat as answer for current field
    if(profileFilling && currentField){
      let handled=false;
      if(currentField==="name"){ document.getElementById("pName").value=cmd.split(" ").map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(" "); trans.innerHTML+=`<br>✅ Name: ${cmd}`; handled=true; }
      else if(currentField==="gender"){ let g=""; if(cmd.includes("male")&&!cmd.includes("female")) g="Male"; else if(cmd.includes("female")) g="Female"; else if(cmd.includes("other")) g="Other"; if(g){ document.getElementById("pGender").value=g; trans.innerHTML+=`<br>✅ Gender: ${g}`; handled=true; } else { trans.innerHTML+=`<br>❌ Say male/female/other`; speakText("Please say male, female or other"); setTimeout(()=>toggleVoice(),1500); return; } }
      else if(currentField==="age"){ const m=cmd.match(/(\d+)/); if(m){ document.getElementById("pAge").value=m[1]; trans.innerHTML+=`<br>✅ Age: ${m[1]}`; handled=true; } }
      else if(currentField==="height"){ const m=cmd.match(/(\d{2,3})/); if(m){ document.getElementById("pHeight").value=m[1]; calcBMI(); trans.innerHTML+=`<br>✅ Height: ${m[1]} cm`; handled=true; } }
      else if(currentField==="weight"){ const m=cmd.match(/(\d{2,3})/); if(m){ document.getElementById("pWeight").value=m[1]; calcBMI(); trans.innerHTML+=`<br>✅ Weight: ${m[1]} kg`; handled=true; } }
      else if(currentField==="activity"){ let act="1.55"; if(cmd.includes("sedentary")) act="1.2"; else if(cmd.includes("light")) act="1.375"; else if(cmd.includes("moderate")) act="1.55"; else if(cmd.includes("active")) act="1.725"; else if(cmd.includes("athlete")) act="1.9"; else { trans.innerHTML+=`<br>❌ Say sedentary, light, moderate, active or athlete`; speakText("Say sedentary, light, moderate, active or athlete"); setTimeout(()=>toggleVoice(),1500); return; } document.getElementById("pActivity").value=act; trans.innerHTML+=`<br>✅ Activity set`; handled=true; }
      else if(currentField==="history"){ document.getElementById("pHistory").value=cmd==="none"?"":cmd; trans.innerHTML+=`<br>✅ History: ${cmd}`; handled=true; }
      if(handled){ currentField=null; speakText("Okay"); return; }
    }
    // (fill mode already handled above)
    // local quick commands (no server)
    if(handleLocalVoice(cmd, trans)) {
      // if was filling and still has fields, continue loop (onend will restart)
      return;
    }
    // fallback to server /api/voice (Flask logic)
    try{
      const r=await fetch(`${API_BASE}/api/voice`, {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({command:cmd})});
      const j=await r.json(); trans.innerHTML=`You: <b>${cmd}</b><br>Assistant: ${j.response}`; speakText(j.response);
      if(j.action==="open_url" && j.url) window.open(j.url, "_blank");
      if(j.action==="navigate") goTo(parseInt(j.url));
      if(j.action==="predict") predict();
      if(j.action==="darkmode") toggleDark();
    }catch(err){ trans.textContent="Server error: "+err.message; }
  };
  recognition.start();
}
function handleLocalVoice(cmd, trans){
  // Page 3 tab switching (fix workout not opening)
  if(cmd.includes("workout") || cmd.includes("exercise")){
    if(cmd.includes("open")||cmd.includes("show")||cmd.includes("go")){
      goTo(3); setTimeout(()=>switchTab('workout'),200); speakText("Opening workout plan"); trans.innerHTML=`You: <b>${cmd}</b><br>✅ Workout tab`; return true;
    }
  }
  if(cmd.includes("diet plan")|| (cmd.includes("diet") && cmd.includes("open"))){ goTo(3); setTimeout(()=>switchTab('diet'),200); speakText("Diet plan"); trans.innerHTML=`You: <b>${cmd}</b><br>✅ Diet tab`; return true; }
  // symptoms voice: "i have fever and cough"
  const matched = allSymptoms.filter(s=> cmd.includes(s.replace(/_/g," ")) || cmd.includes(s.replace(/_/g,"")));
  if(cmd.includes("fever")||cmd.includes("cough")||cmd.includes("headache")||cmd.includes("fatigue")||cmd.includes("pain")||cmd.includes("nausea")||cmd.includes("vomit")||cmd.includes("diarrhea")){
    if(matched.length>0){
      matched.forEach(s=> selected.add(s)); state.symptoms=[...selected]; saveState(); renderSymptoms();
      const msg=`Added symptoms: ${matched.join(", ")}`; trans.innerHTML=`You: <b>${cmd}</b><br>✅ ${msg}`; speakText(msg); goTo(2);
      return true;
    }
  }
  // Page 1 voice fill - name, gender, age, height, weight, history
  if(cmd.startsWith("my name is") || cmd.startsWith("name is")){
    const name=cmd.replace("my name is","").replace("name is","").trim(); if(name){ document.getElementById("pName").value=name.split(" ").map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(" "); speakText(`Name set to ${name}`); trans.innerHTML=`You: <b>${cmd}</b><br>✅ Name set to ${name}`; }
    return true;
  }
  if(cmd.includes("gender is") || cmd.includes("i am male") || cmd.includes("i am female") || cmd.includes("i am other")){
    let g=""; if(cmd.includes("male") && !cmd.includes("female")) g="Male"; else if(cmd.includes("female")) g="Female"; else if(cmd.includes("other")) g="Other";
    if(g){ document.getElementById("pGender").value=g; speakText(`Gender set to ${g}`); trans.innerHTML=`You: <b>${cmd}</b><br>✅ Gender ${g}`; return true; }
  }
  if(cmd.includes("age is") || cmd.match(/i am \d+/)){
    const m=cmd.match(/(\d+)\s*(years|year)?/); if(m){ const age=m[1]; document.getElementById("pAge").value=age; speakText(`Age set to ${age}`); trans.innerHTML=`You: <b>${cmd}</b><br>✅ Age ${age}`; return true; }
  }
  if(cmd.includes("height is") || cmd.includes("height")){
    const m=cmd.match(/height.*?(\d{2,3})/); if(m){ document.getElementById("pHeight").value=m[1]; calcBMI(); speakText(`Height ${m[1]} cm`); trans.innerHTML=`You: <b>${cmd}</b><br>✅ Height ${m[1]} cm`; return true; }
  }
  if(cmd.includes("weight is") || cmd.includes("weight")){
    const m=cmd.match(/weight.*?(\d{2,3})/); if(m){ document.getElementById("pWeight").value=m[1]; calcBMI(); speakText(`Weight ${m[1]} kg`); trans.innerHTML=`You: <b>${cmd}</b><br>✅ Weight ${m[1]} kg`; return true; }
  }
  if(cmd.includes("history is") || cmd.includes("i have history")){
    const h=cmd.replace("history is","").replace("my history is","").trim(); document.getElementById("pHistory").value=h; speakText("History noted"); trans.innerHTML=`You: <b>${cmd}</b><br>✅ History set`; return true;
  }
  if(cmd.includes("activity is")){
    let act="1.55"; if(cmd.includes("sedentary")) act="1.2"; else if(cmd.includes("light")) act="1.375"; else if(cmd.includes("moderate")) act="1.55"; else if(cmd.includes("active")) act="1.725"; else if(cmd.includes("athlete")) act="1.9";
    document.getElementById("pActivity").value=act; speakText("Activity set"); trans.innerHTML=`You: <b>${cmd}</b><br>✅ Activity`; return true;
  }
  if(cmd.includes("save profile")||cmd.includes("save and continue")){ 
    // if in filling mode, finish it
    profileFilling=false; currentField=null;
    saveProfile(); speakText("Profile saved"); return true; 
  }
  if(cmd.includes("go to profile")){ goTo(1); speakText("Profile"); return true; }
  if(cmd.includes("go to symptom")){ goTo(2); speakText("Symptoms"); return true; }
  if(cmd.includes("go to nutrition")||cmd.includes("go to diet")||cmd.includes("lifestyle")){ goTo(3); speakText("Nutrition"); return true; }
  if(cmd.includes("go to report")){ goTo(4); speakText("Report"); return true; }
  if(cmd.includes("go to tracker")){ goTo(5); speakText("Tracker"); return true; }
  if(cmd.includes("predict disease")){ predict(); speakText("Predicting"); return true; }
  if(cmd.includes("clear symptoms")){ clearSymptoms(); speakText("Cleared"); return true; }
  if(cmd.includes("dark mode")){ toggleDark(); speakText("Dark mode toggled"); return true; }
  return false;
}

// Progress Tracker
let chart=null;
function getLogs(){ return JSON.parse(localStorage.getItem("hh_logs")||"[]"); }
function saveLogs(logs){ localStorage.setItem("hh_logs", JSON.stringify(logs)); }
function renderTracker(){
  const logs=getLogs(); const h=parseFloat(state.profile.height);
  // stats
  if(logs.length){
    const start=logs[0].weight, curr=logs[logs.length-1].weight, diff=(curr-start).toFixed(1);
    document.getElementById("trackerStart").textContent=start+" kg";
    document.getElementById("trackerChange").textContent=(diff>0?"+":"")+diff+" kg";
    document.getElementById("trackerChange").className="text-xl font-bold "+(diff>0?"text-red-600": diff<0?"text-green-600":"");
    const bmi=(curr/((h/100)*(h/100))).toFixed(1); document.getElementById("trackerBMI").textContent=bmi; document.getElementById("trackerCat").textContent=bmi<18.5?"Under": bmi<25?"Normal": bmi<30?"Over":"Obese";
  } else if(h && state.profile.weight){
    const bmi=(state.profile.weight/((h/100)*(h/100))).toFixed(1); document.getElementById("trackerBMI").textContent=bmi;
  }
  // table
  const tbody=document.getElementById("logTable"); if(!tbody) return;
  tbody.innerHTML = logs.length ? logs.map((l,i)=>`<tr class="border-t dark:border-slate-600"><td class="p-2">${l.date}</td><td class="p-2 text-center font-semibold">${l.weight}</td><td class="p-2 text-center">${l.bmi}</td><td class="p-2 text-center"><button onclick="delLog(${i})" class="text-red-600"><i class="fa-solid fa-trash"></i></button></td></tr>`).join("") : `<tr><td colspan="4" class="p-4 text-center text-slate-400">No logs yet. Add weight above.</td></tr>`;
  // chart
  const ctx=document.getElementById("progressChart"); if(!ctx) return;
  if(chart) chart.destroy();
  chart = new Chart(ctx, { type:'line', data:{ labels: logs.map(l=>l.date.slice(5)), datasets:[{label:'Weight kg', data: logs.map(l=>l.weight), borderColor:'#2563eb', backgroundColor:'rgba(37,99,235,0.1)', tension:0.3, fill:true},{label:'BMI', data: logs.map(l=>l.bmi), borderColor:'#10b981', tension:0.3, yAxisID:'y1'}] }, options:{ responsive:true, maintainAspectRatio:false, scales:{ y:{position:'left'}, y1:{position:'right', grid:{display:false}} } } });
  // set default date
  const d=document.getElementById("logDate"); if(d && !d.value) d.valueAsDate=new Date();
}
function addLog(){
  const w=parseFloat(document.getElementById("logWeight").value), d=document.getElementById("logDate").value;
  if(!w||!d) return alert("Enter weight and date");
  const h=parseFloat(state.profile.height); if(!h) return alert("Set height in Profile first");
  const bmi=(w/((h/100)*(h/100))).toFixed(1);
  const logs=getLogs(); logs.push({date:d, weight:w, bmi}); logs.sort((a,b)=>a.date.localeCompare(b.date)); saveLogs(logs); document.getElementById("logWeight").value=""; renderTracker();
}
function delLog(i){ const logs=getLogs(); logs.splice(i,1); saveLogs(logs); renderTracker(); }
function clearLogs(){ if(confirm("Clear all logs?")){ localStorage.removeItem("hh_logs"); renderTracker(); } }
function exportTrackerPDF(){
  const { jsPDF }=window.jspdf; const doc=new jsPDF(); const p=state.profile; doc.text(`Progress Tracker - ${p.name||"User"}`,10,15);
  doc.setFontSize(9); doc.text(`Height ${p.height}cm • Goal ${state.nutrition.goal}`,10,22);
  const logs=getLogs(); if(logs.length===0) doc.text("No logs",10,30); else logs.forEach((l,i)=> doc.text(`${l.date} - ${l.weight}kg BMI ${l.bmi}`,10,30+i*7));
  doc.save(`Tracker_${p.name||"user"}.pdf`);
}

init();
loadProfile();
renderNutrition();
renderTracker();
document.getElementById("logDate").valueAsDate=new Date();
