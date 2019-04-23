// window.onload = function() {
  function getUrlVars() {
    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
        vars[key] = value;
    });
    return vars;
  }
  var vars = getUrlVars();
  console.log(vars);

  var name = document.getElementById('name');
  name.textContent = decodeURI(vars.name);
  var amount = document.getElementById('amount');
  amount.textContent = decodeURI(vars.amount);
  var message = document.getElementById('msg');
  var msgcontain = document.getElementById('msgcontain');
  if (vars.msg == undefined) {
    msgcontain.style.display = 'none';
    message.textContent = '';
  } else {
    msgcontain.style.display = 'block';
    message.textContent = decodeURI(vars.msg);
  }
// }
