
const lucide = require('lucide-react');
const icons = ['Printer', 'CalendarCheck', 'Target', 'BarChart3', 'Today'];

console.log('Checking icons:');
icons.forEach(icon => {
  console.log(`${icon}: ${lucide[icon] ? 'Found' : 'MISSING'}`);
});
