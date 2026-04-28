// ── ANSI Strip ──
export function stripAnsi(str: string): string {
  return str.replace(
    /[][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
    '',
  );
}

// ── Newline Normalization ──
export function normalizeNewlines(str: string): string {
  return str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

// ── Blank Line Compression ──
export function compressBlankLines(str: string): string {
  return str.replace(/\n{3,}/g, '\n\n');
}

// ── Shell Prompt Stripping ──
export function stripShellPrompts(str: string): string {
  return str.replace(/\n?\S+@\S+[^%$#]*[%$#]\s*$/gm, '');
}

// ── Progress / Spinner Detection ──
export function isProgressOutput(str: string): boolean {
  if (/^[▓░█▏▎▍▌▋▊▉\s\-\\|/=>#.]+$/.test(str)) return true;
  if (/^\d+%/.test(str) && str.length < 20) return true;
  return false;
}

// ── Single-Line Code Detection ──
export function isCodeLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  const patterns = [
    /^\s*<\/?[a-zA-Z][^>]*>\s*$/,
    /^\s*<[a-zA-Z][^>]*>/,
    /^\s*<\/[a-zA-Z]+>/,
    /^\s*<!DOCTYPE/i,
    /^\s*(import |from |export |const |let |var |function |class |def |async |await )/,
    /^\s*(if\s*\(|for\s*\(|while\s*\(|switch\s*\(|try\s*\{)/,
    /^\s*[{}()\[\]];?\s*$/,
    /^\s*(\/\/|#!|\/\*|\*\/)/,
    /^\s*(return |throw |yield )/,
    /^\s*(print|println|printf|console\.log)\s*\(/,
    /^\s*if\s+__name__\s*==/,
    /^\s*(elif |else:|except |finally:)/,
    /^\s*(public|private|protected|static)\s/,
  ];
  return patterns.some(p => p.test(trimmed));
}

// ── Segment Type ──
export interface Segment {
  type: 'code' | 'text';
  text: string;
}

// ── Split Mixed Code/Text Output ──
export function splitCodeAndText(text: string): Segment[] {
  const lines = text.split('\n');
  const segments: Segment[] = [];
  let currentType: 'code' | 'text' | null = null;
  let currentLines: string[] = [];

  for (const line of lines) {
    const type = isCodeLine(line) ? 'code' : 'text';

    if (type !== currentType && currentLines.length > 0) {
      const joined = currentLines.join('\n').trim();
      if (joined) segments.push({ type: currentType!, text: joined });
      currentLines = [];
    }
    currentType = type;
    currentLines.push(line);
  }

  if (currentLines.length > 0) {
    const joined = currentLines.join('\n').trim();
    if (joined) segments.push({ type: currentType!, text: joined });
  }

  return segments.filter(s => s.text.length >= 2);
}

// ── Content Classification ──
export type ContentClass = 'code' | 'translate' | 'explain' | 'skip';

export function classifyContent(text: string): ContentClass {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length === 0) return 'skip';

  const codePatterns = [
    /^\s*(import |from |export |const |let |var |function |class |def |async |await )/,
    /^\s*(if\s*\(|for\s*\(|while\s*\(|switch\s*\(|try\s*\{|catch\s*\()/,
    /^\s*[{}()\[\]];?\s*$/,
    /^\s*(\/\/|#!|\/\*|\*\/|\*\s)/,
    /^\s*<\/?[a-zA-Z][^>]*>\s*$/,
    /^\s*<[a-zA-Z][^>]*>/,
    /^\s*<\/[a-zA-Z]+>\s*$/,
    /^\s*<!DOCTYPE/i,
    /^\s*(return |throw |yield |=>)/,
    /[{};]\s*$/,
    /^\s*(print|println|printf|console\.log|fmt\.Print)\s*\(/,
    /^\s*if\s+__name__\s*==\s*/,
    /^\s*(elif |else:|except |finally:)/,
    /^\s*\.(then|catch|finally)\(/,
    /^\s*(public|private|protected|static)\s/,
    /^\s*@\w+/,
  ];

  const claudeWriteKeywords = [
    /^Write\s+file:/i,
    /^Update\s+file:/i,
    /^Create\s+file:/i,
    /^Edit\s+file:/i,
  ];

  let codeCount = 0;
  let hasWriteKeyword = false;

  for (const line of lines) {
    if (claudeWriteKeywords.some(p => p.test(line))) {
      hasWriteKeyword = true;
    }
    if (codePatterns.some(p => p.test(line))) {
      codeCount++;
    }
  }

  if (hasWriteKeyword) return 'code';
  if (lines.length >= 3 && codeCount / lines.length > 0.5) return 'code';

  const simpleCommandPattern = /^(\/[\w\-./]+\s*$|total\s+\d+|drwx|[-rwx]{10}|\w+\s+\d+\s+\w+\s+\w+\s+\d+)/;
  if (lines.some(l => simpleCommandPattern.test(l.trim()))) return 'explain';

  return 'translate';
}

// ── Main Clean Pipeline ──
export function cleanTerminalOutput(raw: string): string {
  const cleaned = [stripAnsi, normalizeNewlines, compressBlankLines, stripShellPrompts]
    .reduce((acc, fn) => fn(acc), raw)
    .trim();

  if (!cleaned || cleaned.length < 2) return '';

  // Skip progress bars, spinners, single chars
  if (isProgressOutput(cleaned)) return '';

  // Classify content type — skip meaningless content
  const contentClass = classifyContent(cleaned);
  if (contentClass === 'skip') return '';

  return cleaned;
}
