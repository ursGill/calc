// script.js - Scientific calculator logic
const displayEl = document.getElementById('display');
const exprEl = document.getElementById('expression');
const historyEl = document.getElementById('history');

let current = '';
let lastAnswer = null;

function updateScreen(){
  exprEl.textContent = current || '';
  displayEl.textContent = current ? current : '0';
}

// map user-friendly tokens to JS/Math equivalents safely
function normalizeExpression(s){
  // replace unicode operators
  s = s.replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-');
  // replace caret power notation: a^b -> pow(a,b)
  // convert occurrences like 2^3 or (2+1)^3
  s = s.replace(/(\S)\^(\S)/g, 'pow($1,$2)');

  // replace common constants
  s = s.replace(/\bpi\b/gi, 'PI');
  s = s.replace(/\be\b/gi, 'E');

  // function names: log -> log10, ln -> log (natural), pow, sqrt, sin, cos, tan, asin, acos, atan, exp, abs
  // Use a safe namespace object called M (defined below) so we can control allowed functions
  s = s.replace(/\blog10\b/gi, 'log10');
  s = s.replace(/\bln\b/gi, 'ln');
  return s;
}

// Allowed tokens check (digits, operators, letters for allowed names, parentheses, dot, comma, space)
function isSafe(s){
  return /^[0-9+\-*/()., %a-zA-Z_\^]*$/.test(s);
}

// Evaluate with a controlled function map
function safeEval(raw){
  if(!raw) throw new Error('Empty expression');
  let s = normalizeExpression(raw);
  if(!isSafe(s)) throw new Error('Invalid characters');

  // convert percent 'number%' to (number/100)

    E: Math.E
  };

  // for convenience allow using commas in pow and functions as JavaScript expects
  try{
    // eslint-disable-next-line no-new-func
    const fn = new Function('M', 'with(M){ return (' + s + '); }');
    const res = fn(M);
    if(!isFinite(res)) throw new Error('Result not finite');
    return res;
  } catch(e){
    throw new Error('Bad expression');
  }
}

function addHistory(text){
  const d = document.createElement('div'); d.className = 'hist-item'; d.textContent = text;
  historyEl.prepend(d);
  while(historyEl.children.length > 30) historyEl.removeChild(historyEl.lastChild);
}

function pressValue(v){
  // numbers, dots, parentheses and operators simply append
  // convert '^' to 'pow(' sequence handled in normalize step
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
    const rounded = Math.round((result + Number.EPSILON) * 1e12) / 1e12;
    addHistory(current + ' = ' + rounded);
    lastAnswer = rounded;
    current = String(rounded);
    updateScreen();
  } catch(e){
    displayEl.textContent = 'Error';
    setTimeout(updateScreen, 700);
  }
}

// Button handling
document.querySelectorAll('.controls .btn, .controls .row .btn').forEach(b => {
  b.addEventListener('click', ()=>{
    const v = b.getAttribute('data-value');
    const a = b.getAttribute('data-action');
    if(v) return pressValue(v);
    if(a === 'clear') return clearAll();
    if(a === 'back') return backspace();
    if(a === 'ans') return useAnswer();
    if(a === 'equals') return compute();
  });
});

// Keyboard support
window.addEventListener('keydown', (ev) => {
  if((ev.key >= '0' && ev.key <= '9') || ['+','-','*','/','(',')',',','%','.'].includes(ev.key)){
    pressValue(ev.key); ev.preventDefault();
  } else if(ev.key === 'Enter') { compute(); ev.preventDefault(); }
  else if(ev.key === 'Backspace'){ backspace(); ev.preventDefault(); }
  else if(ev.key === 'Escape'){ clearAll(); ev.preventDefault(); }
});

// init
updateScreen();
