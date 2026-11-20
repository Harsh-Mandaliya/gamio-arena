// Runs before the app so a saved light/dark choice applies without a flash.
try {
  var saved = localStorage.getItem('gamio.theme');
  if (saved === 'light' || saved === 'dark') document.documentElement.dataset.theme = saved;
} catch (e) {}
