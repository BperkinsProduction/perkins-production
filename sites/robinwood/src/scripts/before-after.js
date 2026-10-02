/* ---------------------------------------------------------------- before and after */
document.querySelectorAll(".ba").forEach(function(ba){
  var inp = ba.querySelector("input"); inp.addEventListener("input", function(){ ba.style.setProperty("--pos", inp.value); });
});

