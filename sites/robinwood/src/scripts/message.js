/* ---------------------------------------------------------------- the message form (a concept: nothing is sent) */
var msgf = document.getElementById("msg"), msgBtn = document.getElementById("msg-send");
msgf.addEventListener("input", function(){ msgBtn.disabled = !(msgf.mn.value.trim().length > 1 && msgf.mc.value.trim().length > 4 && msgf.mm.value.trim().length > 3); });
msgf.addEventListener("submit", function(e){ e.preventDefault(); if (msgBtn.disabled) return; document.getElementById("msg-done").hidden = false; msgBtn.disabled = true; msgBtn.textContent = "Sent (concept)"; });

