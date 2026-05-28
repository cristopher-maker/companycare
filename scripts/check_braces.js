const fs = require('fs');
const p = 'src/app/pages/care-experts/care-experts.page.scss';
const s = fs.readFileSync(p, 'utf8');
let stack = [];
let issues = [];
const lines = s.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let ch of line) {
    if (ch === '{') stack.push(i + 1);
    else if (ch === '}') {
      if (stack.length) stack.pop();
      else issues.push([i + 1, 'extra_closing']);
    }
  }
}
if (stack.length) issues.push([stack[stack.length - 1], 'unclosed_from_here']);
console.log('issues_count', issues.length);
issues.forEach(it => console.log(it));
console.log('total_lines', lines.length);
if (issues.length) {
  const ln = issues[issues.length - 1][0];
  const start = Math.max(1, ln - 6);
  const end = Math.min(lines.length, ln + 6);
  console.log('\nContext around line', ln);
  for (let j = start; j <= end; j++) console.log(j + ': ' + lines[j - 1]);
} else console.log('No issues found');
