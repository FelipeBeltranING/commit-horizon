// Creates the labels, milestones and issues listed in backlog.json using the GitHub CLI.
// Safe to run twice: labels are updated, existing milestones and issues are skipped.
// Usage: gh auth login   (once)
//        node scripts/create-issues.mjs [owner/repo]
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const repo = process.argv[2] ?? 'FelipeBeltranING/commit-horizon';
const { labels, milestones = [], issues } = JSON.parse(readFileSync(new URL('./backlog.json', import.meta.url), 'utf8'));
const run = (args) => execFileSync('gh', args, { encoding: 'utf8' }).trim();
const gh = (...args) => run([...args, '--repo', repo]);

for (const l of labels) {
  gh('label', 'create', l.name, '--color', l.color, '--description', l.description, '--force');
  console.log(`🏷️  ${l.name}`);
}

const haveMilestones = new Set(JSON.parse(run(['api', `repos/${repo}/milestones?state=all&per_page=100`])).map((m) => m.title));
for (const m of milestones) {
  if (haveMilestones.has(m.title)) { console.log(`⏭️  ${m.title} (already exists)`); continue; }
  run(['api', `repos/${repo}/milestones`, '-f', `title=${m.title}`, '-f', `description=${m.description}`]);
  console.log(`🎯 ${m.title}`);
}

const existing = new Set(JSON.parse(gh('issue', 'list', '--state', 'all', '--limit', '300', '--json', 'title')).map((i) => i.title));
for (const issue of issues) {
  if (existing.has(issue.title)) { console.log(`⏭️  ${issue.title} (already exists)`); continue; }
  const args = ['issue', 'create', '--title', issue.title, '--body', issue.body];
  for (const label of issue.labels) args.push('--label', label);
  if (issue.milestone) args.push('--milestone', issue.milestone);
  console.log(`✅ ${issue.title} → ${gh(...args)}`);
}
