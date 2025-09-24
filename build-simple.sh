#!/bin/bash

mkdir -p dist

cat > dist/index.html << 'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Alli Nutrition App</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; background: #fff; color: #111; }
    .container { max-width: 480px; margin: 0 auto; padding: 24px 20px 100px; }
    .logo { width: 80px; height: 80px; background: #B9A68D; border-radius: 20px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 28px; }
    h1 { color: #B9A68D; font-size: 24px; margin: 8px 0 4px; text-align: center; }
    .subtitle { color: #666; text-align: center; margin-bottom: 24px; }
    .button { background: #B9A68D; color: #fff; border: 0; border-radius: 10px; padding: 14px 16px; font-size: 16px; cursor: pointer; display: inline-block; margin: 6px 0; width: 100%; }
    .button:disabled { opacity: .6; cursor: default; }
    .card { border: 1px solid #eee; border-radius: 12px; padding: 16px; margin: 12px 0; background: #fff; }
    .title { color: #B9A68D; font-weight: 700; margin-bottom: 8px; }
    .nav { position: fixed; left: 0; right: 0; bottom: 0; height: 80px; border-top: 1px solid #eee; background: #fff; display: flex; align-items: center; justify-content: space-around; padding-bottom: 10px; }
    .nav a { color: #666; text-decoration: none; font-size: 12px; text-align: center; }
    .nav a.active { color: #B9A68D; font-weight: 600; }
    .hidden { display: none; }
    .macro-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 8px; }
    .macro { text-align: center; }
    .macro .v { font-weight: 700; }
    .food { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f1f1; }
    .food img { width: 48px; height: 48px; border-radius: 10px; object-fit: cover; margin-right: 12px; }
    .row { display: flex; align-items: center; }
    .muted { color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">A</div>
    <h1>Alli Nutrition</h1>
    <div class="subtitle">Your personal nutrition companion</div>

    <div id="screen-home" class="screen">
      <div class="card">
        <div class="title">Welcome</div>
        <div class="muted">Tap the tabs below to explore. We'll reintroduce each section one by one.</div>
      </div>
    </div>

    <div id="screen-nutrition" class="screen hidden">
      <div class="card">
        <div class="title">Food Picture Analyzer</div>
        <div class="muted">Take a food photo to estimate calories and macros.</div>
        <input id="file" type="file" accept="image/*;capture=camera" class="hidden" />
        <button id="takePhotoBtn" class="button">Take Food Photo</button>
        <div id="analyzing" class="muted hidden" style="margin-top:8px;">Analyzing…</div>
      </div>
      <div class="card">
        <div class="title">Today's Totals</div>
        <div class="macro-grid">
          <div class="macro"><div class="v" id="cal">0</div><div class="muted">Calories</div></div>
          <div class="macro"><div class="v" id="pro">0g</div><div class="muted">Protein</div></div>
          <div class="macro"><div class="v" id="car">0g</div><div class="muted">Carbs</div></div>
          <div class="macro"><div class="v" id="fat">0g</div><div class="muted">Fat</div></div>
        </div>
      </div>
      <div class="card">
        <div class="title">Food Log</div>
        <div id="log"></div>
      </div>
    </div>

    <div id="screen-alli" class="screen hidden">
      <div class="card"><div class="title">Alli (AI Chatbot)</div><div class="muted">Coming soon.</div></div>
    </div>
    <div id="screen-goals" class="screen hidden">
      <div class="card"><div class="title">Goals</div><div class="muted">Set your nutrition goals (coming soon).</div></div>
    </div>
    <div id="screen-account" class="screen hidden">
      <div class="card"><div class="title">Account</div><div class="muted">Profile & settings (coming soon).</div></div>
    </div>
  </div>

  <div class="nav">
    <a href="#" data-tab="home" class="active">Home</a>
    <a href="#" data-tab="nutrition">Nutrition</a>
    <a href="#" data-tab="alli">Alli</a>
    <a href="#" data-tab="goals">Goals</a>
    <a href="#" data-tab="account">Account</a>
  </div>

  <script>
    const screens = ['home','nutrition','alli','goals','account'];
    function show(tab){
      screens.forEach(t => {
        document.querySelector('#screen-'+t).classList.toggle('hidden', t!==tab);
        document.querySelector('[data-tab="'+t+'"]').classList.toggle('active', t===tab);
      });
      if(tab==='nutrition') initNutrition();
    }
    document.querySelectorAll('.nav a').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();show(a.dataset.tab)}));
    show('nutrition');

    // Nutrition logic (simple web implementation)
    let totals = { cal:0, pro:0, car:0, fat:0 };
    function updateTotals(){
      document.getElementById('cal').textContent = Math.round(totals.cal);
      document.getElementById('pro').textContent = Math.round(totals.pro)+'g';
      document.getElementById('car').textContent = Math.round(totals.car)+'g';
      document.getElementById('fat').textContent = Math.round(totals.fat)+'g';
    }
    function mockAnalyze(){
      // very simple pseudo-random macros
      const base = 200 + Math.random()*300;
      return { cal: base, pro: base*0.25/4, car: base*0.45/4, fat: base*0.30/9 };
    }
    function initNutrition(){
      const file = document.getElementById('file');
      const btn = document.getElementById('takePhotoBtn');
      const log = document.getElementById('log');
      const analyzing = document.getElementById('analyzing');
      if(btn.__wired) return; // idempotent
      btn.__wired = true;
      btn.addEventListener('click',()=> file.click());
      file.addEventListener('change',()=>{
        if(!file.files || !file.files[0]) return;
        analyzing.classList.remove('hidden');
        const imgURL = URL.createObjectURL(file.files[0]);
        setTimeout(()=>{
          const est = mockAnalyze();
          totals.cal += est.cal; totals.pro += est.pro; totals.car += est.car; totals.fat += est.fat;
          updateTotals();
          const row = document.createElement('div');
          row.className = 'food';
          const left = document.createElement('div'); left.className='row';
          const img = document.createElement('img'); img.src = imgURL; left.appendChild(img);
          const info = document.createElement('div');
          info.innerHTML = '<div><strong>Analyzed Meal</strong></div>'+
                           '<div class="muted">~'+Math.round(est.cal)+' cal · P '+Math.round(est.pro)+'g · C '+Math.round(est.car)+'g · F '+Math.round(est.fat)+'g</div>';
          left.appendChild(info);
          const rm = document.createElement('button'); rm.className='button'; rm.style.width='auto'; rm.style.padding='8px 12px'; rm.textContent='Remove';
          rm.addEventListener('click',()=>{ log.removeChild(row); totals.cal-=est.cal; totals.pro-=est.pro; totals.car-=est.car; totals.fat-=est.fat; updateTotals(); });
          row.appendChild(left); row.appendChild(rm);
          log.prepend(row);
          analyzing.classList.add('hidden');
          file.value = '';
        }, 1200);
      });
      updateTotals();
    }
  </script>
</body>
</html>
HTML

echo "Simple nutrition screen deployed"
