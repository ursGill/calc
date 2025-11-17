// script.js - Scientific calculator logic (fixed & safer)
const displayEl = document.getElementById('display');
const exprEl = document.getElementById('expression');
const historyEl = document.getElementById('history');

let current = '';
let lastAnswer = null;

function updateScreen(){
  exprEl.textContent = current || '';
  displayEl.textContent = current ? current : '0';
}

// Map user-friendly tokens to JS/Math equivalents
function normalizeExpression(s){
  if(!s) return s;
  // common unicode replacements
  s = s.replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-');

  // handle percent: '50%' -> '(50/100)'
  s = s.replace(/([0-9.]+)\s*%/g, '($1/100)');

  // replace caret operator '^' with JS exponent operator '**'
  // We'll expose Math.pow as pow in the safe namespace as well.
  s = s.replace(/\^/g, '**');

  // constants
  s = s.replace(/\bpi\b/gi, 'PI');
  s = s.replace(/\be\b/gi, 'E');

  // function name normalizations
  s = s.replace(/\blog10\b/gi, 'log10');
  s = s.replace(/\bln\b/gi, 'ln'); // we'll map ln -> log (natural) in namespace
  // allow 'log' to mean base-10 if user types log10 explicitly; otherwise ln is natural
  // (we'll map ln -> natural log in namespace)
  return s;
}

// Allowed characters check (digits, operators, letters for allowed names, parentheses, dot, comma, whitespace)
function isSafe(s){
  // allow ** operator (two stars), percent parentheses from normalization, letters and underscores for function names
  return /^[0-9+\-*/().,%\s\*a-zA-Z_]*$/.test(s);
}

// Evaluate with a controlled function map
function safeEval(raw){
  if(!raw) throw new Error('Empty expression');
  let s = normalizeExpression(String(raw));

  if(!isSafe(s)) throw new Error('Invalid characters');

  // Build safe math namespace (M). Only expose these functions / constants.
  const M = {
    // constants
    PI: Math.PI,
    E: Math.E,
    // basic functions
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    asin: Math.asin,
    acos: Math.acos,
    atan: Math.atan,
    sqrt: Math.sqrt,
    abs: Math.abs,
    floor: Math.floor,
    ceil: Math.ceil,
    round: Math.round,
    max: Math.max,
    min: Math.min,
    pow: Math.pow,
    exp: Math.exp,
    // log/natural log and log10
    log: Math.log,         // natural log (ln)
    ln: Math.log,          // alias
    log10: Math.log10 ? Math.log10 : (x)=> Math.log(x)/Math.LN10,
    // helpers: allow using 'ANS' to insert previous answer
    ANS: (typeof lastAnswer === 'number') ? lastAnswer : 0
  };

  // If expression contains 'ANS' replace with numeric value (prevents lookup issues)
  if(/\bANS\b/.test(s)) {
    s = s.replace(/\bANS\b/g, String(M.ANS));
  }

  // Final sanity: prevent accidental double dots etc (basic)
  if(/\.\./.test(s)) throw new Error('Bad number format');

  try{
    // Create a function that evaluates expression inside the M namespace only.
    // eslint-disable-next-line no-new-func
    const fn = new Function('M', 'with(M){ return (' + s + '); }');
    const res = fn(M);
    if(typeof res === 'number' && isFinite(res)) return res;
    // allow arrays/results? we restrict to finite numbers
    throw new Error('Result not finite');
  } catch(err){
    // hide internal errors, return a generic message upstream
    throw new Error('Bad expression');
  }
}

function addHistory(text){
  const d = document.createElement('div');
  d.className = 'hist-item';
  d.textContent = text;
  if(historyEl) historyEl.prepend(d);
  // keep history length bounded
  try {
    while(historyEl && historyEl.children.length > 30) historyEl.removeChild(historyEl.lastChild);
  } catch {}
}

function pressValue(v){
  current += v;
  updateScreen();
}

function clearAll(){ current = ''; updateScreen(); }
function backspace(){ current = current.slice(0,-1); updateScreen(); }
function useAnswer(){ if(lastAnswer !== null) { current += String(lastAnswer); updateScreen(); } }

function compute(){
  if(!current) return;
  try{
    const result = safeEval(current);
    // Round to 12 decimal places safely
    const rounded = Math.round((result + Number.EPSILON) * 1e12) / 1e12;
    addHistory(current + ' = ' + rounded);
    lastAnswer = rounded;
    current = String(rounded);
    updateScreen();
  } catch(e){
    if(displayEl) displayEl.textContent = 'Error';
    setTimeout(updateScreen, 800);
  }
}

// Button handling (guards if elements are missing)
document.querySelectorAll('.controls .btn, .controls .row .btn').forEach(b => {
  b.addEventListener('click', ()=>{
    const v = b.getAttribute('data-value');
    const a = b.getAttribute('data-action');
    if(v) { pressValue(v); return; }
    if(a === 'clear') { clearAll(); return; }
    if(a === 'back') { backspace(); return; }
    if(a === 'ans') { useAnswer(); return; }
    if(a === 'equals') { compute(); return; }
  });
});

// Keyboard support
window.addEventListener('keydown', (ev) => {
  // digits
  if((ev.key >= '0' && ev.key <= '9') || ['+','-','*','/','(',')',',','%','.'].includes(ev.key)){
    pressValue(ev.key);
    ev.preventDefault();
    return;
  }
  // caret '^' support from keyboard: map to ^ and let normalize handle
  if(ev.key === '^'){ pressValue('^'); ev.preventDefault(); return; }

  if(ev.key === 'Enter'){ compute(); ev.preventDefault(); return; }
  if(ev.key === 'Backspace'){ backspace(); ev.preventDefault(); return; }
  if(ev.key === 'Escape'){ clearAll(); ev.preventDefault(); return; }
});

// init
updateScreen();
