// Writes verify-report/report.md from the collected rows.
import { writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ICON = { pass: 'PASS', fail: '**FAIL**', warn: 'WARN', skip: 'SKIP' };
const cell = v => String(v ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const short = (s, n = 220) => { s = cell(s); return s.length > n ? s.slice(0, n - 3) + '...' : s; };

function table(headers, rows) {
    return [`| ${headers.join(' | ')} |`, `|${headers.map(() => '---').join('|')}|`, ...rows.map(r => `| ${r.map(cell).join(' | ')} |`)].join('\n');
}

export function writeReport({ outDir, ref, cand, started, rows, links, notes }) {
    const counts = { pass: 0, fail: 0, warn: 0, skip: 0 };
    rows.forEach(r => counts[r.status]++);
    const failed = counts.fail > 0;
    const img = p => (p ? `[view](${relative(outDir, p)})` : '');

    const md = [];
    md.push(`# Verification report: ${failed ? 'FAIL' : 'PASS'}`, '');
    md.push(`- Reference: ${ref.label}`, `- Candidate: ${cand.label}`, `- Run: ${started.toISOString().replace('T', ' ').slice(0, 19)} UTC, took ${Math.round((Date.now() - started) / 1000)}s`);
    md.push(`- Totals: ${counts.pass} passed, ${counts.fail} failed, ${counts.warn} warnings, ${counts.skip} skipped`, '');

    const cats = [...new Set(rows.map(r => r.category))];
    md.push('## Summary', '', table(['Area', 'Pass', 'Fail', 'Warn', 'Skip'], cats.map(c => {
        const rs = rows.filter(r => r.category === c);
        return [c, ...['pass', 'fail', 'warn', 'skip'].map(s => rs.filter(r => r.status === s).length)];
    })), '');

    const fails = rows.filter(r => r.status === 'fail');
    if (fails.length) {
        md.push('## Failures', '', ...fails.map(r => `- ${r.category} / ${r.viewport || 'all'} / ${r.name}: ${short(r.detail, 400)}`), '');
    }

    for (const c of cats) {
        const rs = rows.filter(r => r.category === c);
        md.push(`## ${c}`, '');
        if (c === 'Visual') {
            md.push(table(['Viewport', 'Shot', 'Diff %', 'Masked %', 'Scroll y (ref / cand)', 'Result', 'Side by side', 'Diff', 'Notes'],
                rs.map(r => [r.viewport, r.name, r.percent ?? '', r.masked ?? '', r.scroll ?? '', ICON[r.status], img(r.sbs), img(r.diff), short(r.detail)])));
        } else {
            md.push(table(['Viewport', 'Check', 'Reference', 'Candidate', 'Result'],
                rs.map(r => [r.viewport || 'all', r.name, short(r.ref, 160), short(r.cand ?? r.detail), ICON[r.status]])));
        }
        md.push('');
    }

    if (links) {
        md.push('## Link and asset details (candidate homepage)', '');
        md.push(`Checked ${links.checked.length} same-origin URLs, ${links.failures.length} failed. ${links.anchors.length} in-page anchors, ${links.anchors.filter(a => !a.ok).length} broken. ${links.external.length} external hosts referenced (not fetched).`, '');
        if (links.failures.length) md.push(table(['Path', 'Status', 'Found in'], links.failures.map(f => [f.path, f.status || f.error, f.kinds.join(', ')])), '');
        const bad = links.anchors.filter(a => !a.ok);
        if (bad.length) md.push('Broken anchors: ' + bad.map(a => '`' + a.ref + '`').join(', '), '');
        if (links.skipped.length) md.push('Skipped on localhost:', '', ...links.skipped.map(s => `- \`${s.path}\`: ${s.why}`), '');
        md.push('<details><summary>All checked URLs</summary>', '', ...links.checked.map(c => `- ${c.status} \`${c.path}\` (${c.kinds.join(', ')})`), '', '</details>', '');
        md.push(`External hosts: ${links.external.join(', ') || 'none'}`, '');
    }

    if (notes.length) md.push('## Notes', '', ...notes.map(n => `- ${n}`), '');
    writeFileSync(join(outDir, 'report.md'), md.join('\n'));
    return { failed, counts };
}
